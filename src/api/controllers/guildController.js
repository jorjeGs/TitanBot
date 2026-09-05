import { fetchDiscordUserGuilds } from '../utils/oauthHelper.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';
import { updateWelcomeConfig } from '../../utils/database.js';
import { isBotOwner } from '../../config/bot.js';
import config from '../../config/application.js';
import { logger } from '../../utils/logger.js';
import { PermissionFlagsBits } from 'discord.js';

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
    .filter((c) => (typeof c.isTextBased === 'function' ? c.isTextBased() : true) && !c.isDMBased?.() && !c.isThread?.())
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      position: c.position || 0,
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

    return res.json({
      success: true,
      config: guildConfig,
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
    const snowflakeFields = ['welcomeChannel', 'adminRole', 'modRole', 'birthdayChannelId'];
    for (const field of snowflakeFields) {
      if (patch[field] !== undefined) {
        sanitized[field] = patch[field] ? String(patch[field]).trim() : null;
      }
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

    if (sanitized.autoRoles !== undefined) {
      await updateWelcomeConfig(req.client, guildId, { roleIds: sanitized.autoRoles }).catch((err) => {
        logger.debug('Non-critical: Failed to sync welcomeConfig roleIds:', err?.message);
      });
    }

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
