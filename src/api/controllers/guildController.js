import { fetchDiscordUserGuilds } from '../utils/oauthHelper.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { isBotOwner } from '../../config/bot.js';
import config from '../../config/application.js';
import { logger } from '../../utils/logger.js';
import { PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { formatWelcomeMessage } from '../../utils/welcome.js';
import { resolveEmbedColor } from './embedController.js';
import { generateWelcomeCard } from '../../services/image/welcomeCardService.js';
import { translateWelcomeText } from '../../services/translation/welcomeTranslator.js';

const ADMIN_PERMISSION = 0x8n;
const MANAGE_GUILD_PERMISSION = 0x20n;

/**
 * Returns all guilds the authenticated user can manage.
 */
export async function getUserGuilds(req, res) {
  try {
    const accessToken = req.user?.accessToken;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No Discord access token found in session. Please log in again.',
      });
    }

    const discordGuilds = await fetchDiscordUserGuilds(accessToken);
    const client = req.client;
    const clientId = config.bot?.clientId || process.env.CLIENT_ID;
    const isOwner = isBotOwner(req.user.id);

    const manageableGuilds = discordGuilds.filter((g) => {
      if (isOwner) return true;
      if (g.owner) return true;
      try {
        const perms = BigInt(g.permissions);
        return (perms & ADMIN_PERMISSION) === ADMIN_PERMISSION || (perms & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;
      } catch {
        return false;
      }
    });

    const results = manageableGuilds.map((g) => {
      const botGuild = client?.guilds?.cache?.get(g.id);
      const botInGuild = Boolean(botGuild);
      const inviteUrl = botInGuild
        ? null
        : `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=8&guild_id=${g.id}&disable_guild_select=true`;

      return {
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        owner: g.owner,
        botInGuild,
        inviteUrl,
      };
    });

    return res.json({
      success: true,
      guilds: results,
    });
  } catch (error) {
    logger.error('Failed to fetch user guilds:', error);
    return res.status(500).json({
      success: false,
      error: 'DiscordError',
      message: 'Failed to retrieve server list from Discord.',
    });
  }
}

/**
 * Returns metadata of the selected guild.
 */
export function getGuildDetails(req, res) {
  const guild = req.guild;
  if (!guild) {
    return res.status(404).json({
      success: false,
      error: 'NotFound',
      message: 'Guild not found',
    });
  }

  return res.json({
    success: true,
    guild: {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL?.() || null,
      memberCount: guild.memberCount || 0,
      ownerId: guild.ownerId,
    },
  });
}

/**
 * Returns text channels of the selected guild.
 */
export function getGuildChannels(req, res) {
  const guild = req.guild;
  if (!guild) {
    return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found' });
  }

  const channelList = guild.channels?.cache?.values ? Array.from(guild.channels.cache.values()) : [];
  const channels = channelList
    .filter((c) => {
      if (c.isDMBased?.() || c.isThread?.()) return false;
      return true;
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: typeof c.type === 'number' ? c.type : (c.isVoiceBased?.() ? 2 : (c.isTextBased?.() ? 0 : 0)),
      position: c.position || 0,
      parentId: c.parentId || null,
    }))
    .sort((a, b) => a.position - b.position);

  return res.json({
    success: true,
    channels,
  });
}

/**
 * Returns roles of the selected guild.
 */
export function getGuildRoles(req, res) {
  const guild = req.guild;
  if (!guild) {
    return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found' });
  }

  const botMember = guild.members?.me || (req.client?.user?.id ? guild.members?.cache?.get(req.client.user.id) : null);
  const botHighestPosition = botMember?.roles?.highest?.position ?? (botMember ? 0 : Infinity);
  const botHasManageRoles = botMember
    ? Boolean(
        botMember.permissions?.has?.(PermissionFlagsBits.ManageRoles) ||
        botMember.permissions?.has?.(PermissionFlagsBits.Administrator)
      )
    : true;

  const roleList = guild.roles?.cache?.values ? Array.from(guild.roles.cache.values()) : [];
  const roles = roleList
    .filter((r) => !r.managed && r.id !== guild.id)
    .map((r) => {
      const canManage = Boolean(
        botMember
          ? (botHasManageRoles && r.position < botHighestPosition)
          : true
      );
      return {
        id: r.id,
        name: r.name,
        color: r.hexColor || '#99aab5',
        position: r.position || 0,
        canManage,
      };
    })
    .sort((a, b) => b.position - a.position);

  return res.json({
    success: true,
    roles,
  });
}

/**
 * Returns stored guild configuration from PostgreSQL.
 */
export async function getGuildConfigHandler(req, res) {
  try {
    const { guildId } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);
    const welcomeConfig = await getWelcomeConfig(req.client, guildId).catch(() => null);

    const mergedConfig = {
      ...guildConfig,
      welcomeEnabled: guildConfig.welcomeEnabled !== undefined ? guildConfig.welcomeEnabled : (welcomeConfig ? Boolean(welcomeConfig.enabled) : true),
      welcomeChannel: guildConfig.welcomeChannel ?? welcomeConfig?.channelId ?? null,
      testChannelId: guildConfig.testChannelId ?? null,
      welcomeMessage: guildConfig.welcomeMessage || welcomeConfig?.welcomeMessage || 'Welcome {user} to {server}!',
      welcomeType: guildConfig.welcomeType || welcomeConfig?.welcomeType || 'text',
      welcomeEmbed: guildConfig.welcomeEmbed || welcomeConfig?.welcomeEmbed || {
        title: '🎉 Welcome to the Server!',
        description: guildConfig.welcomeMessage || welcomeConfig?.welcomeMessage || 'Welcome {user} to {server}!',
        color: '#5865F2',
        footer: `Welcome to ${req.guild?.name || 'Server'}`,
        image: '',
        thumbnail: true,
      },
      welcomePing: guildConfig.welcomePing !== undefined ? guildConfig.welcomePing : Boolean(welcomeConfig?.welcomePing),
      welcomeTranslate: Boolean(guildConfig.welcomeTranslate),
      welcomeCard: guildConfig.welcomeCard || {
        enabled: false,
        background: '',
        borderColor: '#FFFFFF',
        title: '¡BIENVENIDO!',
        subtitle: 'Eres el miembro #{memberCount}',
      },
      goodbyeEnabled: guildConfig.goodbyeEnabled !== undefined ? guildConfig.goodbyeEnabled : Boolean(welcomeConfig?.goodbyeEnabled),
      goodbyeChannelId: guildConfig.goodbyeChannelId ?? welcomeConfig?.goodbyeChannelId ?? null,
      goodbyeTranslate: Boolean(guildConfig.goodbyeTranslate),
      leaveMessage: guildConfig.leaveMessage || welcomeConfig?.leaveMessage || '{user} has left the server.',
      leaveType: guildConfig.leaveType || welcomeConfig?.leaveType || 'text',
      leaveEmbed: guildConfig.leaveEmbed || welcomeConfig?.leaveEmbed || {
        title: '👋 Farewell!',
        description: guildConfig.leaveMessage || welcomeConfig?.leaveMessage || '{user} has left the server.',
        color: '#ED4245',
        footer: `Goodbye from ${req.guild?.name || 'Server'}`,
        image: '',
        thumbnail: true,
      },
      leaveCard: guildConfig.leaveCard || {
        enabled: false,
        background: '',
        borderColor: '#ED4245',
        title: '¡HASTA LUEGO!',
        subtitle: '{username} ha salido del servidor',
      },
      goodbyePing: guildConfig.goodbyePing !== undefined ? guildConfig.goodbyePing : Boolean(welcomeConfig?.goodbyePing),
      autoRoleDelay: guildConfig.autoRoleDelay ?? welcomeConfig?.autoRoleDelay ?? 0,
      autoRoles: Array.isArray(guildConfig.autoRoles) && guildConfig.autoRoles.length > 0
        ? guildConfig.autoRoles
        : (Array.isArray(welcomeConfig?.roleIds) && welcomeConfig.roleIds.length > 0 ? welcomeConfig.roleIds : (guildConfig.autoRole ? [guildConfig.autoRole] : [])),
    };

    return res.json({
      success: true,
      config: mergedConfig,
    });
  } catch (error) {
    logger.error(`Failed to get config for guild ${req.params.guildId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'DatabaseError',
      message: 'Failed to retrieve server configuration.',
    });
  }
}

/**
 * Updates partial guild configuration in PostgreSQL.
 */
export async function updateGuildConfigHandler(req, res) {
  try {
    const { guildId } = req.params;
    const patch = req.body;

    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid configuration payload.',
      });
    }

    const sanitized = {};

    // Validate locale
    if (patch.locale !== undefined) {
      const allowedLocales = ['en-US', 'es-419', 'de', 'auto'];
      if (!allowedLocales.includes(patch.locale)) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: `Invalid locale. Must be one of: ${allowedLocales.join(', ')}`,
        });
      }
      sanitized.locale = patch.locale;
    }

    // Validate prefix
    if (patch.prefix !== undefined) {
      if (typeof patch.prefix !== 'string' || patch.prefix.length < 1 || patch.prefix.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Prefix must be a string between 1 and 5 characters.',
        });
      }
      sanitized.prefix = patch.prefix.trim();
    }

    // Validate welcomeMessage
    if (patch.welcomeMessage !== undefined) {
      if (typeof patch.welcomeMessage !== 'string' || patch.welcomeMessage.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Welcome message must be 2000 characters or fewer.',
        });
      }
      sanitized.welcomeMessage = patch.welcomeMessage;
    }

    // Validate snowflakes or null
    const snowflakeFields = [
      'welcomeChannel',
      'goodbyeChannelId',
      'testChannelId',
      'adminRole',
      'modRole',
      'birthdayChannelId',
      'birthdayRoleId',
      'premiumRoleId',
      'reportChannelId',
    ];
    for (const field of snowflakeFields) {
      if (patch[field] !== undefined) {
        sanitized[field] = patch[field] ? String(patch[field]).trim() : null;
      }
    }

    // Validate welcome toggles and formats
    if (patch.welcomeEnabled !== undefined) {
      sanitized.welcomeEnabled = Boolean(patch.welcomeEnabled);
    }

    if (patch.welcomeType !== undefined) {
      sanitized.welcomeType = patch.welcomeType === 'embed' ? 'embed' : 'text';
    }

    if (patch.welcomeEmbed && typeof patch.welcomeEmbed === 'object') {
      let cleanImage = '';
      if (typeof patch.welcomeEmbed.image === 'string') {
        const trimmed = patch.welcomeEmbed.image.trim();
        if (trimmed) {
          try {
            const parsedUrl = new URL(trimmed);
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
              cleanImage = trimmed;
            }
          } catch {}
        }
      }

      sanitized.welcomeEmbed = {
        title: typeof patch.welcomeEmbed.title === 'string' ? patch.welcomeEmbed.title.slice(0, 256) : '🎉 Welcome to the Server!',
        description: typeof patch.welcomeEmbed.description === 'string' ? patch.welcomeEmbed.description.slice(0, 4096) : (patch.welcomeMessage || ''),
        color: typeof patch.welcomeEmbed.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(patch.welcomeEmbed.color) ? patch.welcomeEmbed.color : '#5865F2',
        footer: typeof patch.welcomeEmbed.footer === 'string' ? patch.welcomeEmbed.footer.slice(0, 2048) : '',
        image: cleanImage,
        thumbnail: patch.welcomeEmbed.thumbnail !== undefined ? Boolean(patch.welcomeEmbed.thumbnail) : true,
      };
    }

    if (patch.welcomePing !== undefined) {
      sanitized.welcomePing = Boolean(patch.welcomePing);
    }

    if (patch.welcomeTranslate !== undefined) {
      sanitized.welcomeTranslate = Boolean(patch.welcomeTranslate);
    }

    if (patch.welcomeCard && typeof patch.welcomeCard === 'object') {
      let cleanBg = '';
      if (typeof patch.welcomeCard.background === 'string') {
        const trimmed = patch.welcomeCard.background.trim();
        if (trimmed && /^https?:\/\//i.test(trimmed)) {
          cleanBg = trimmed;
        }
      }
      sanitized.welcomeCard = {
        enabled: Boolean(patch.welcomeCard.enabled),
        background: cleanBg,
        borderColor: typeof patch.welcomeCard.borderColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(patch.welcomeCard.borderColor)
          ? patch.welcomeCard.borderColor
          : '#FFFFFF',
        title: typeof patch.welcomeCard.title === 'string' ? patch.welcomeCard.title.slice(0, 100) : '¡BIENVENIDO!',
        subtitle: typeof patch.welcomeCard.subtitle === 'string' ? patch.welcomeCard.subtitle.slice(0, 150) : 'Eres el miembro #{memberCount}',
      };
    }

    if (patch.autoRoleDelay !== undefined) {
      const parsedDelay = parseInt(patch.autoRoleDelay, 10);
      sanitized.autoRoleDelay = isNaN(parsedDelay) ? 0 : Math.max(0, Math.min(300, parsedDelay));
    }

    // Validate goodbye toggles and formats
    if (patch.goodbyeEnabled !== undefined) {
      sanitized.goodbyeEnabled = Boolean(patch.goodbyeEnabled);
    }

    if (patch.leaveType !== undefined) {
      sanitized.leaveType = patch.leaveType === 'embed' ? 'embed' : 'text';
    }

    if (patch.leaveMessage !== undefined) {
      sanitized.leaveMessage = typeof patch.leaveMessage === 'string' ? patch.leaveMessage.slice(0, 2000) : '';
    }

    if (patch.leaveEmbed && typeof patch.leaveEmbed === 'object') {
      let cleanImage = '';
      if (typeof patch.leaveEmbed.image === 'string') {
        const trimmed = patch.leaveEmbed.image.trim();
        if (trimmed) {
          try {
            const parsedUrl = new URL(trimmed);
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
              cleanImage = trimmed;
            }
          } catch {}
        }
      }

      sanitized.leaveEmbed = {
        title: typeof patch.leaveEmbed.title === 'string' ? patch.leaveEmbed.title.slice(0, 256) : '👋 Farewell!',
        description: typeof patch.leaveEmbed.description === 'string' ? patch.leaveEmbed.description.slice(0, 4096) : (patch.leaveMessage || ''),
        color: typeof patch.leaveEmbed.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(patch.leaveEmbed.color) ? patch.leaveEmbed.color : '#ED4245',
        footer: typeof patch.leaveEmbed.footer === 'string' ? patch.leaveEmbed.footer.slice(0, 2048) : '',
        image: cleanImage,
        thumbnail: patch.leaveEmbed.thumbnail !== undefined ? Boolean(patch.leaveEmbed.thumbnail) : true,
      };
    }

    if (patch.goodbyePing !== undefined) {
      sanitized.goodbyePing = Boolean(patch.goodbyePing);
    }

    if (patch.goodbyeTranslate !== undefined) {
      sanitized.goodbyeTranslate = Boolean(patch.goodbyeTranslate);
    }

    if (patch.leaveCard && typeof patch.leaveCard === 'object') {
      let cleanBg = '';
      if (typeof patch.leaveCard.background === 'string') {
        const trimmed = patch.leaveCard.background.trim();
        if (trimmed && /^https?:\/\//i.test(trimmed)) {
          cleanBg = trimmed;
        }
      }
      sanitized.leaveCard = {
        enabled: Boolean(patch.leaveCard.enabled),
        background: cleanBg,
        borderColor: typeof patch.leaveCard.borderColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(patch.leaveCard.borderColor)
          ? patch.leaveCard.borderColor
          : '#ED4245',
        title: typeof patch.leaveCard.title === 'string' ? patch.leaveCard.title.slice(0, 100) : '¡HASTA LUEGO!',
        subtitle: typeof patch.leaveCard.subtitle === 'string' ? patch.leaveCard.subtitle.slice(0, 150) : '{username} ha salido del servidor',
      };
    }

    if (patch.dmOnClose !== undefined) {
      sanitized.dmOnClose = Boolean(patch.dmOnClose);
    }

    if (patch.birthdayMessage !== undefined) {
      sanitized.birthdayMessage = typeof patch.birthdayMessage === 'string' ? patch.birthdayMessage.slice(0, 1000) : null;
    }

    // Validate autoRoles (array of snowflakes) and sync autoRole
    if (patch.autoRoles !== undefined) {
      if (Array.isArray(patch.autoRoles)) {
        sanitized.autoRoles = patch.autoRoles
          .map((id) => String(id).trim())
          .filter((id) => /^\d{17,19}$/.test(id))
          .slice(0, 10);
        sanitized.autoRole = sanitized.autoRoles.length > 0 ? sanitized.autoRoles[0] : null;
      } else if (patch.autoRoles === null) {
        sanitized.autoRoles = [];
        sanitized.autoRole = null;
      }
    } else if (patch.autoRole !== undefined) {
      const cleanRole = patch.autoRole ? String(patch.autoRole).trim() : null;
      sanitized.autoRole = cleanRole;
      sanitized.autoRoles = cleanRole ? [cleanRole] : [];
    }

    // Validate logging nested object
    if (patch.logging && typeof patch.logging === 'object') {
      sanitized.logging = {
        enabled: Boolean(patch.logging.enabled),
        channels: {
          audit: patch.logging.channels?.audit ? String(patch.logging.channels.audit).trim() : null,
          reports: patch.logging.channels?.reports ? String(patch.logging.channels.reports).trim() : null,
          applications: patch.logging.channels?.applications ? String(patch.logging.channels.applications).trim() : null,
        },
      };

      if (patch.logging.enabledEvents && typeof patch.logging.enabledEvents === 'object') {
        sanitized.logging.enabledEvents = {};
        for (const [evt, val] of Object.entries(patch.logging.enabledEvents)) {
          if (typeof val === 'boolean') {
            sanitized.logging.enabledEvents[evt] = val;
          }
        }
      }

      if (patch.logging.ignore && typeof patch.logging.ignore === 'object') {
        sanitized.logging.ignore = {
          channels: Array.isArray(patch.logging.ignore.channels)
            ? patch.logging.ignore.channels.map(String).map((s) => s.trim()).filter((id) => /^\d{17,19}$/.test(id))
            : [],
          users: Array.isArray(patch.logging.ignore.users)
            ? patch.logging.ignore.users.map(String).map((s) => s.trim()).filter((id) => /^\d{17,19}$/.test(id))
            : [],
        };
      }
    }

    // Validate verification nested object
    if (patch.verification && typeof patch.verification === 'object') {
      const v = patch.verification;
      sanitized.verification = {
        enabled: Boolean(v.enabled),
        channelId: v.channelId ? String(v.channelId).trim() : null,
        roleId: v.roleId ? String(v.roleId).trim() : null,
        unverifiedRoleId: v.unverifiedRoleId ? String(v.unverifiedRoleId).trim() : null,
        messageId: v.messageId ? String(v.messageId).trim() : null,
        message: typeof v.message === 'string' ? v.message.slice(0, 2000) : null,
        buttonText: typeof v.buttonText === 'string' ? v.buttonText.slice(0, 80) : 'Verify',
      };

      if (v.autoVerify && typeof v.autoVerify === 'object') {
        const av = v.autoVerify;
        const rawAge = parseInt(av.accountAgeDays ?? av.minAccountAge ?? 7, 10);
        const accountAgeDays = Number.isFinite(rawAge) ? Math.max(1, Math.min(365, rawAge)) : 7;
        sanitized.verification.autoVerify = {
          enabled: Boolean(av.enabled),
          criteria: av.criteria === 'account_age' || av.criteria === 'none' ? av.criteria : (av.enabled ? 'account_age' : 'none'),
          accountAgeDays,
          roleId: av.roleId ? String(av.roleId).trim() : sanitized.verification.roleId,
        };
      }
    }

    // Validate disabledCommands
    if (patch.disabledCommands !== undefined && typeof patch.disabledCommands === 'object' && patch.disabledCommands !== null) {
      sanitized.disabledCommands = {};
      for (const [cmd, val] of Object.entries(patch.disabledCommands)) {
        if (typeof val === 'boolean') {
          sanitized.disabledCommands[String(cmd).trim().toLowerCase()] = val;
        }
      }
    }

    // Validate disabledCategories
    if (patch.disabledCategories !== undefined && typeof patch.disabledCategories === 'object' && patch.disabledCategories !== null) {
      sanitized.disabledCategories = {};
      for (const [cat, val] of Object.entries(patch.disabledCategories)) {
        if (typeof val === 'boolean') {
          sanitized.disabledCategories[String(cat).trim()] = val;
        }
      }
    }

    const updated = await patchGuildConfig(req.client, guildId, sanitized);

    // Sync all welcome and goodbye settings to welcomeConfig for bot event parity
    const welcomeUpdates = {};
    if (sanitized.welcomeEnabled !== undefined) welcomeUpdates.enabled = sanitized.welcomeEnabled;
    if (sanitized.welcomeChannel !== undefined) welcomeUpdates.channelId = sanitized.welcomeChannel;
    if (sanitized.welcomeMessage !== undefined) welcomeUpdates.welcomeMessage = sanitized.welcomeMessage;
    if (sanitized.welcomeType !== undefined) welcomeUpdates.welcomeType = sanitized.welcomeType;
    if (sanitized.welcomeEmbed !== undefined) welcomeUpdates.welcomeEmbed = sanitized.welcomeEmbed;
    if (sanitized.welcomePing !== undefined) welcomeUpdates.welcomePing = sanitized.welcomePing;
    if (sanitized.goodbyeEnabled !== undefined) welcomeUpdates.goodbyeEnabled = sanitized.goodbyeEnabled;
    if (sanitized.goodbyeChannelId !== undefined) welcomeUpdates.goodbyeChannelId = sanitized.goodbyeChannelId;
    if (sanitized.leaveMessage !== undefined) welcomeUpdates.leaveMessage = sanitized.leaveMessage;
    if (sanitized.leaveType !== undefined) welcomeUpdates.leaveType = sanitized.leaveType;
    if (sanitized.leaveEmbed !== undefined) welcomeUpdates.leaveEmbed = sanitized.leaveEmbed;
    if (sanitized.goodbyePing !== undefined) welcomeUpdates.goodbyePing = sanitized.goodbyePing;
    if (sanitized.autoRoles !== undefined) welcomeUpdates.roleIds = sanitized.autoRoles;
    if (sanitized.autoRoleDelay !== undefined) welcomeUpdates.autoRoleDelay = sanitized.autoRoleDelay;

    if (Object.keys(welcomeUpdates).length > 0) {
      await updateWelcomeConfig(req.client, guildId, welcomeUpdates).catch((err) => {
        logger.debug('Non-critical: Failed to sync welcomeConfig:', err?.message);
      });
    }

    const changedKeys = Object.keys(sanitized);
    import('../../services/audit/auditLogService.js')
      .then(({ logAuditEvent }) =>
        logAuditEvent({
          guildId,
          user: req.user,
          action: 'CONFIG_UPDATE',
          category: 'general',
          details: `Actualizó configuración del servidor: ${changedKeys.join(', ')}`,
          metadata: { fields: changedKeys },
          ip: req.ip,
        })
      )
      .catch(() => {});

    return res.json({
      success: true,
      config: updated,
    });
  } catch (error) {
    logger.error(`Failed to update config for guild ${req.params.guildId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'DatabaseError',
      message: 'Failed to save server configuration.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/welcome/test
 * Dispatches a simulated welcome or goodbye message to Discord for preview & testing.
 */
export async function testWelcomeMessageHandler(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'GuildNotFound',
        message: 'Servidor no encontrado o TitanBot no está presente.',
      });
    }

    const { channelId, type = 'welcome', config: draftConfig } = req.body || {};
    const isGoodbye = type === 'goodbye';

    // Fetch existing stored configurations as fallbacks
    const guildConfig = await getGuildConfig(req.client, guildId).catch(() => ({}));
    const welcomeConfig = await getWelcomeConfig(req.client, guildId).catch(() => null);

    // Resolve target channel:
    // 1) Explicit channelId passed in request
    // 2) Draft or stored testChannelId
    // 3) Default goodbye/welcome channel from draft or storage
    const targetChannelId = channelId
      || draftConfig?.testChannelId
      || guildConfig?.testChannelId
      || (isGoodbye
          ? (draftConfig?.goodbyeChannelId || guildConfig?.goodbyeChannelId || welcomeConfig?.goodbyeChannelId)
          : (draftConfig?.welcomeChannel || guildConfig?.welcomeChannel || welcomeConfig?.channelId));

    if (!targetChannelId) {
      return res.status(400).json({
        success: false,
        error: 'ChannelNotSpecified',
        message: 'No se encontró ningún canal de destino para enviar la prueba. Selecciona un canal o configura un Canal de Pruebas.',
      });
    }

    const channel = guild.channels.cache.get(targetChannelId);
    if (!channel || !channel.isTextBased?.()) {
      return res.status(404).json({
        success: false,
        error: 'ChannelNotFound',
        message: 'El canal seleccionado no existe o no es un canal de texto válido en este servidor.',
      });
    }

    const me = guild.members?.me || {
      id: req.client?.user?.id || 'bot',
      user: req.client?.user || { id: 'bot', username: 'TitanBot' },
    };
    const permissions = typeof channel.permissionsFor === 'function'
      ? channel.permissionsFor(me)
      : { has: () => true };

    if (!permissions || (typeof permissions.has === 'function' && !permissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]))) {
      return res.status(403).json({
        success: false,
        error: 'MissingPermissions',
        message: `TitanBot no tiene permisos suficientes para ver o enviar mensajes en #${channel.name}.`,
      });
    }

    // Resolve test member & user (prefer caller, fallback to bot itself)
    const testMember = (req.user?.id && guild.members?.cache?.get?.(req.user.id)) || me;
    const testUser = testMember?.user || (testMember ? {
      id: testMember.id,
      username: req.user?.username || 'User',
      toString: () => `<@${testMember.id}>`,
      displayAvatarURL: () => null,
    } : (me?.user || { id: '0', username: 'User', toString: () => '<@0>', displayAvatarURL: () => null }));
    const formatData = { user: testUser, guild, member: testMember };

    // Resolve settings based on type
    const mode = isGoodbye
      ? (draftConfig?.leaveType || guildConfig?.leaveType || welcomeConfig?.leaveType || 'text')
      : (draftConfig?.welcomeType || guildConfig?.welcomeType || welcomeConfig?.welcomeType || 'text');

    const rawTemplate = isGoodbye
      ? (draftConfig?.leaveMessage ?? guildConfig?.leaveMessage ?? welcomeConfig?.leaveMessage ?? '{user} has left the server.')
      : (draftConfig?.welcomeMessage ?? guildConfig?.welcomeMessage ?? welcomeConfig?.welcomeMessage ?? 'Welcome {user} to {server}!');

    const embedConfig = isGoodbye
      ? (draftConfig?.leaveEmbed || guildConfig?.leaveEmbed || welcomeConfig?.leaveEmbed || {
          title: '👋 Farewell!',
          description: '{user} has left the server.',
          color: '#ED4245',
          footer: `Goodbye from ${guild.name}`,
          thumbnail: true,
        })
      : (draftConfig?.welcomeEmbed || guildConfig?.welcomeEmbed || welcomeConfig?.welcomeEmbed || {
          title: '🎉 Welcome to the Server!',
          description: 'Welcome {user} to {server}!',
          color: '#5865F2',
          footer: `Welcome to ${guild.name}`,
          thumbnail: true,
        });

    const shouldPing = isGoodbye
      ? Boolean(draftConfig?.goodbyePing ?? guildConfig?.goodbyePing ?? welcomeConfig?.goodbyePing)
      : Boolean(draftConfig?.welcomePing ?? guildConfig?.welcomePing ?? welcomeConfig?.welcomePing);

    const shouldTranslate = isGoodbye
      ? Boolean(draftConfig?.goodbyeTranslate ?? guildConfig?.goodbyeTranslate)
      : Boolean(draftConfig?.welcomeTranslate ?? guildConfig?.welcomeTranslate);

    let templateToUse = rawTemplate;
    if (shouldTranslate) {
      const targetLocale = draftConfig?.locale || guildConfig?.locale || 'es-419';
      templateToUse = await translateWelcomeText({
        text: rawTemplate,
        targetLocale,
        guildConfig,
      });
    }

    const formattedTextMessage = formatWelcomeMessage(templateToUse, formatData);
    const testBadge = `🧪 **[Prueba de ${isGoodbye ? 'Despedida' : 'Bienvenida'} — Dashboard]**`;
    const userMentionStr = typeof testUser?.toString === 'function' ? testUser.toString() : `<@${testUser?.id || '0'}>`;

    // Dynamic Welcome / Goodbye Graphic Card generator
    const cardConfig = isGoodbye
      ? (draftConfig?.leaveCard || guildConfig?.leaveCard || {})
      : (draftConfig?.welcomeCard || guildConfig?.welcomeCard || {});

    let cardAttachment = null;
    if (cardConfig.enabled) {
      try {
        const cardTitle = formatWelcomeMessage(
          cardConfig.title || (isGoodbye ? '¡HASTA LUEGO!' : '¡BIENVENIDO!'),
          formatData
        );
        const cardSubtitle = formatWelcomeMessage(
          cardConfig.subtitle || (isGoodbye ? '{username} ha salido del servidor' : 'Eres el miembro #{memberCount}'),
          formatData
        );
        const avatarUrl = typeof testUser?.displayAvatarURL === 'function'
          ? testUser.displayAvatarURL({ extension: 'png', size: 256 })
          : null;

        const cardBuffer = await generateWelcomeCard({
          avatarUrl,
          username: testUser.username || testUser.tag || 'Usuario',
          title: cardTitle,
          subtitle: cardSubtitle,
          backgroundUrl: cardConfig.background || '',
          borderColor: cardConfig.borderColor || (isGoodbye ? '#ED4245' : '#FFFFFF'),
        });

        if (cardBuffer) {
          cardAttachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });
        }
      } catch (cardErr) {
        logger.warn('Failed to generate welcome card in test:', cardErr?.message);
      }
    }

    let sentMessage;
    if (mode === 'embed') {
      if (typeof permissions.has === 'function' && !permissions.has(PermissionFlagsBits.EmbedLinks)) {
        return res.status(403).json({
          success: false,
          error: 'MissingPermissions',
          message: `El modo Embed requiere el permiso "Insertar enlaces" (Embed Links) para TitanBot en #${channel.name}.`,
        });
      }

      const embedTitle = formatWelcomeMessage(
        embedConfig.title || (isGoodbye ? '👋 Farewell!' : '🎉 Welcome to the Server!'),
        formatData
      );
      const embedDesc = formatWelcomeMessage(
        embedConfig.description || templateToUse,
        formatData
      );
      const embedFooter = embedConfig.footer
        ? formatWelcomeMessage(embedConfig.footer, formatData)
        : (isGoodbye ? `Goodbye from ${guild.name}` : `Welcome to ${guild.name}`);

      const embedColor = resolveEmbedColor(
        embedConfig.color || (isGoodbye ? '#ED4245' : '#5865F2')
      );

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(embedTitle ? embedTitle.slice(0, 256) : null)
        .setDescription(embedDesc ? embedDesc.slice(0, 4096) : '')
        .setTimestamp()
        .setFooter({ text: `🧪 Prueba • ${embedFooter}`.slice(0, 2048) });

      if (embedConfig.thumbnail !== false && typeof testUser?.displayAvatarURL === 'function') {
        const avatar = testUser.displayAvatarURL();
        if (avatar) embed.setThumbnail(avatar);
      }

      if (cardAttachment) {
        embed.setImage('attachment://welcome-card.png');
      } else {
        const cleanImage = typeof embedConfig.image === 'string' ? embedConfig.image.trim() : '';
        if (cleanImage) {
          try {
            const u = new URL(cleanImage);
            if (u.protocol === 'http:' || u.protocol === 'https:') {
              embed.setImage(cleanImage);
            }
          } catch {}
        }
      }

      const messageContent = shouldPing
        ? `${testBadge}\n${userMentionStr}`
        : testBadge;

      sentMessage = await channel.send({
        content: messageContent,
        embeds: [embed],
        files: cardAttachment ? [cardAttachment] : [],
      });
    } else {
      const pingLine = shouldPing ? `${userMentionStr}\n` : '';
      sentMessage = await channel.send({
        content: `${testBadge}\n${pingLine}${formattedTextMessage}`.slice(0, 2000),
        files: cardAttachment ? [cardAttachment] : [],
      });
    }

    return res.json({
      success: true,
      channelId: channel.id,
      channelName: channel.name,
      messageId: sentMessage.id,
      type: isGoodbye ? 'goodbye' : 'welcome',
    });
  } catch (error) {
    logger.error('Failed to dispatch test welcome/goodbye message:', error);
    return res.status(500).json({
      success: false,
      error: 'DiscordSendError',
      message: error?.message || 'Error al enviar el mensaje de prueba a Discord.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/logging/test
 * Dispatches a simulated event log embed into a configured logging channel to verify permissions & connectivity.
 */
export async function testLoggingHandler(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'GuildNotFound',
        message: 'Servidor no encontrado o TitanBot no está presente.',
      });
    }

    const { destination = 'audit', category = 'moderation', channelId: explicitChannelId } = req.body || {};

    const guildConfig = await getGuildConfig(req.client, guildId).catch(() => ({}));
    const loggingConfig = guildConfig.logging || {};
    const loggingChannels = loggingConfig.channels || {};

    const targetChannelId = explicitChannelId || loggingChannels[destination] || loggingChannels.audit;

    if (!targetChannelId) {
      return res.status(400).json({
        success: false,
        error: 'ChannelNotConfigured',
        message: `No hay ningún canal configurado para "${destination}". Por favor selecciona un canal de texto.`,
      });
    }

    const channel = guild.channels.cache.get(targetChannelId) || (await guild.channels.fetch(targetChannelId).catch(() => null));
    if (!channel || !channel.isTextBased?.()) {
      return res.status(404).json({
        success: false,
        error: 'ChannelNotFound',
        message: 'El canal de destino especificado no existe o no es un canal de texto en este servidor.',
      });
    }

    const me = guild.members?.me || {
      id: req.client?.user?.id || 'bot',
      user: req.client?.user || { id: 'bot', username: 'TitanBot' },
    };
    const permissions = typeof channel.permissionsFor === 'function'
      ? channel.permissionsFor(me)
      : { has: () => true };

    const requiredPerms = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks];
    if (permissions && typeof permissions.has === 'function' && !permissions.has(requiredPerms)) {
      return res.status(403).json({
        success: false,
        error: 'MissingPermissions',
        message: `TitanBot no tiene permisos suficientes (Ver Canal, Enviar Mensajes, Insertar Enlaces) en #${channel.name}.`,
      });
    }

    const colorMap = {
      moderation: 0xED4245,
      message: 0xFEE75C,
      role: 0x5865F2,
      member: 0x57F287,
      leveling: 0x9B59B6,
      giveaway: 0xF1C40F,
    };

    const titleMap = {
      moderation: '🔨 [PRUEBA] Usuario Sancionado | Ban',
      message: `✏️ [PRUEBA] Mensaje Editado | #${channel.name}`,
      role: '➕ [PRUEBA] Rol Creado | @Moderador',
      member: '👋 [PRUEBA] Miembro Unido al Servidor',
      leveling: '📈 [PRUEBA] Subida de Nivel | Nivel 10',
      giveaway: '🎉 [PRUEBA] Ganador de Sorteo Seleccionado',
    };

    const fieldsMap = {
      moderation: [
        { name: 'Usuario', value: `${req.user?.username || 'Usuario'} (ID: ${req.user?.id || '123456789012345678'})`, inline: true },
        { name: 'Moderador', value: 'TitanBot Dashboard Test', inline: true },
        { name: 'Razón', value: 'Envío de prueba de verificación de canal de auditoría desde el panel web.', inline: false },
      ],
      message: [
        { name: 'Autor', value: `${req.user?.username || 'Usuario'} (ID: ${req.user?.id || '123456789012345678'})`, inline: true },
        { name: 'Canal', value: `<#${channel.id}>`, inline: true },
        { name: 'Contenido previo', value: 'Mensaje de ejemplo antes de la edición', inline: false },
        { name: 'Contenido nuevo', value: 'Mensaje de ejemplo actualizado y verificado', inline: false },
      ],
      role: [
        { name: 'Rol', value: '@Moderador (ID: 998877665544332211)', inline: true },
        { name: 'Creado por', value: `${req.user?.username || 'Staff'}`, inline: true },
        { name: 'Permisos asignados', value: '+ Gestionar Mensajes, + Silenciar Miembros', inline: false },
      ],
      member: [
        { name: 'Usuario', value: `${req.user?.username || 'NuevoMiembro'}`, inline: true },
        { name: 'Cuenta Creada', value: 'Hace 3 meses', inline: true },
        { name: 'Total Miembros', value: `${guild.memberCount || 1} miembros`, inline: true },
      ],
      leveling: [
        { name: 'Usuario', value: `${req.user?.username || 'Usuario'}`, inline: true },
        { name: 'Nuevo Nivel', value: 'Nivel 10 (5,000 XP)', inline: true },
        { name: 'Rol Desbloqueado', value: '@Habitual del Chat', inline: true },
      ],
      giveaway: [
        { name: 'Premio', value: 'Discord Nitro (1 Mes)', inline: true },
        { name: 'Ganador', value: `@${req.user?.username || 'Ganador'}`, inline: true },
        { name: 'Participantes', value: '42 miembros', inline: true },
      ],
    };

    const testEmbed = new EmbedBuilder()
      .setColor(colorMap[category] || 0x5865F2)
      .setTitle(titleMap[category] || '🧪 [PRUEBA] Registro de Evento TitanBot')
      .setDescription('Este es un registro de prueba enviado desde el **Dashboard de TitanBot** para confirmar la conectividad y permisos del canal.')
      .addFields(fieldsMap[category] || [
        { name: 'Estado', value: 'Canal verificado correctamente ✅', inline: true },
        { name: 'Destino', value: destination, inline: true },
      ])
      .setFooter({ text: `TitanBot Logging System • Solicitado por ${req.user?.username || 'Staff'}` })
      .setTimestamp();

    await channel.send({ embeds: [testEmbed] });

    // Record in staff audit logs
    import('../../services/audit/auditLogService.js')
      .then(({ logAuditEvent }) =>
        logAuditEvent({
          guildId,
          user: req.user,
          action: 'LOGGING_TEST_SENT',
          category: 'general',
          details: `Envío de registro de prueba (${category}) al canal #${channel.name}`,
          metadata: { destination, category, channelId: channel.id, channelName: channel.name },
          ip: req.ip,
        })
      )
      .catch(() => {});

    return res.json({
      success: true,
      message: `¡Registro de prueba enviado exitosamente al canal #${channel.name}!`,
      channelId: channel.id,
      channelName: channel.name,
    });
  } catch (error) {
    logger.error('Error sending test log:', error);
    return res.status(500).json({
      success: false,
      error: 'TestLogFailed',
      message: error?.message || 'Error al enviar el registro de prueba a Discord.',
    });
  }
}

