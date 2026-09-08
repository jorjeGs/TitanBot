import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { SendEmbedSchema, SaveEmbedTemplateSchema, formatZodError } from '../../utils/schemas.js';
import { getColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

/**
 * Resolves a hex code or named theme into a valid Discord color integer.
 */
export function resolveEmbedColor(color) {
  if (!color) return getColor('primary') || 0x336699;
  if (typeof color === 'number' && Number.isFinite(color)) return color;
  const str = String(color).trim();
  if (/^#?[0-9A-Fa-f]{6}$/.test(str)) {
    return parseInt(str.replace('#', ''), 16);
  }
  try {
    const fromConfig = getColor(str.toLowerCase());
    if (typeof fromConfig === 'number') return fromConfig;
  } catch {
    // fallback
  }
  return 0x336699;
}

/**
 * POST /api/guilds/:guildId/embeds/send
 * Validates embed parameters and permissions, then sends the embed to the target channel.
 */
export async function sendEmbedHandler(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'GuildNotFound',
        message: 'No se encontró el servidor o TitanBot no es miembro del mismo.',
      });
    }

    const parsed = SendEmbedSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: formatZodError(parsed.error),
        issues: parsed.error.issues,
      });
    }

    const {
      channelId,
      title,
      description,
      color,
      author,
      footer,
      thumbnail,
      image,
      timestamp,
      fields,
    } = parsed.data;

    let targetChannel = guild.channels?.cache?.get(channelId);
    if (!targetChannel && typeof guild.channels?.fetch === 'function') {
      targetChannel = await guild.channels.fetch(channelId).catch(() => null);
    }

    if (!targetChannel) {
      return res.status(404).json({
        success: false,
        error: 'ChannelNotFound',
        message: 'El canal seleccionado no existe o no fue encontrado en este servidor.',
      });
    }

    if (typeof targetChannel.isTextBased === 'function' && !targetChannel.isTextBased()) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'El canal de destino debe ser un canal de texto.',
      });
    }

    // Verify bot permissions in channel
    const botMember = guild.members?.me || guild.members?.cache?.get(req.client?.user?.id);
    if (botMember && typeof targetChannel.permissionsFor === 'function') {
      const perms = targetChannel.permissionsFor(botMember);
      const missing = [];
      if (!perms.has(PermissionFlagsBits.ViewChannel)) missing.push('ViewChannel');
      if (!perms.has(PermissionFlagsBits.SendMessages)) missing.push('SendMessages');
      if (!perms.has(PermissionFlagsBits.EmbedLinks)) missing.push('EmbedLinks');

      if (missing.length > 0) {
        const permNames = {
          ViewChannel: 'Ver canal',
          SendMessages: 'Enviar mensajes',
          EmbedLinks: 'Incrustar enlaces',
        };
        const missingLabels = missing.map((m) => permNames[m] || m).join(', ');
        return res.status(422).json({
          success: false,
          error: 'ChannelPermissionError',
          message: `TitanBot no tiene los permisos necesarios en #${targetChannel.name || channelId}: ${missingLabels}. Por favor asigna estos permisos al rol del bot.`,
          missingPermissions: missing,
        });
      }
    }

    // Build the Discord Embed
    const embed = new EmbedBuilder();

    if (title) embed.setTitle(title.substring(0, 256));
    if (description) embed.setDescription(description.substring(0, 4096));
    embed.setColor(resolveEmbedColor(color));

    if (author?.name) {
      const authorObj = { name: author.name.substring(0, 256) };
      if (author.iconUrl) authorObj.iconURL = author.iconUrl;
      if (author.url) authorObj.url = author.url;
      embed.setAuthor(authorObj);
    }

    if (footer?.text) {
      const footerObj = { text: footer.text.substring(0, 2048) };
      if (footer.iconUrl) footerObj.iconURL = footer.iconUrl;
      embed.setFooter(footerObj);
    }

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (timestamp) embed.setTimestamp();

    if (Array.isArray(fields) && fields.length > 0) {
      embed.addFields(
        fields.slice(0, 25).map((f) => ({
          name: String(f.name).substring(0, 256),
          value: String(f.value).substring(0, 1024),
          inline: Boolean(f.inline),
        }))
      );
    }

    const sentMessage = await targetChannel.send({ embeds: [embed] });

    return res.json({
      success: true,
      messageId: sentMessage.id,
      channelId: targetChannel.id,
      channelName: targetChannel.name,
      messageUrl: `https://discord.com/channels/${guildId}/${targetChannel.id}/${sentMessage.id}`,
    });
  } catch (error) {
    logger.error('Error sending embed to channel:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to publish embed.',
    });
  }
}

async function getDbInstance(client) {
  if (client?.db) return client.db;
  try {
    return (await import('../../utils/database.js')).db;
  } catch {
    return null;
  }
}

/**
 * GET /api/guilds/:guildId/embeds/templates
 * Retrieves custom embed templates for the guild.
 */
export async function getEmbedTemplatesHandler(req, res) {
  try {
    const { guildId } = req.params;
    const database = await getDbInstance(req.client);
    const templates = database ? (await database.get(`guild:${guildId}:embed_templates`)) || [] : [];
    return res.json({
      success: true,
      templates: Array.isArray(templates) ? templates : [],
    });
  } catch (error) {
    logger.error('Error retrieving embed templates:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to retrieve embed templates.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/embeds/templates
 * Saves a new custom embed template.
 */
export async function saveEmbedTemplateHandler(req, res) {
  try {
    const { guildId } = req.params;
    const parsed = SaveEmbedTemplateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: formatZodError(parsed.error),
        issues: parsed.error.issues,
      });
    }

    const database = await getDbInstance(req.client);
    if (!database) {
      return res.status(500).json({
        success: false,
        error: 'DatabaseUnavailable',
        message: 'La base de datos no está disponible actualmente.',
      });
    }

    const templates = (await database.get(`guild:${guildId}:embed_templates`)) || [];
    const templateList = Array.isArray(templates) ? templates : [];

    const newTemplate = {
      id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: parsed.data.name,
      embed: parsed.data.embed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    templateList.push(newTemplate);
    await database.set(`guild:${guildId}:embed_templates`, templateList);

    return res.json({
      success: true,
      template: newTemplate,
    });
  } catch (error) {
    logger.error('Error saving embed template:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Error al guardar la plantilla del embed.',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/embeds/templates/:templateId
 * Deletes an existing embed template.
 */
export async function deleteEmbedTemplateHandler(req, res) {
  try {
    const { guildId, templateId } = req.params;
    const database = await getDbInstance(req.client);
    if (!database) {
      return res.status(500).json({
        success: false,
        error: 'DatabaseUnavailable',
        message: 'La base de datos no está disponible actualmente.',
      });
    }

    const templates = (await database.get(`guild:${guildId}:embed_templates`)) || [];
    const templateList = Array.isArray(templates) ? templates : [];

    const filtered = templateList.filter((t) => t.id !== templateId);
    await database.set(`guild:${guildId}:embed_templates`, filtered);

    return res.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    logger.error('Error deleting embed template:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Error al eliminar la plantilla.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/embeds/send-interactive
 * Sends an interactive embed with Discord buttons to a channel and records an audit event.
 */
export async function sendInteractiveEmbedHandler(req, res) {
  try {
    const { guildId } = req.params;
    const { sendInteractiveEmbed } = await import('../../services/embed/interactiveEmbedService.js');
    const { logAuditEvent } = await import('../../services/audit/auditLogService.js');

    const result = await sendInteractiveEmbed(req.client, guildId, req.body);

    const buttonCount = Array.isArray(req.body.buttons) ? req.body.buttons.length : 0;
    const channelName = req.body.targetChannelId;

    await logAuditEvent({
      guildId,
      user: req.user,
      action: 'EMBED_INTERACTIVE_SEND',
      category: 'embeds',
      details: `Envió embed interactivo con ${buttonCount} botón(es) al canal <#${channelName}>.`,
      metadata: { channelId: channelName, buttonCount, messageId: result.messageId },
      ip: req.ip,
    });

    return res.json(result);
  } catch (error) {
    logger.error('Error sending interactive embed:', error);
    const isValidation = error.name === 'ValidationError' || error.message?.includes('obligatorio') || error.message?.includes('permisos') || error.message?.includes('canal');
    return res.status(isValidation ? 400 : 500).json({
      success: false,
      error: error.name || 'SendInteractiveEmbedError',
      message: error.message || 'Error al enviar el embed interactivo a Discord.',
    });
  }
}
