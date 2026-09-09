import { ChannelType } from 'discord.js';
import {
  getJoinToCreateConfig,
  saveJoinToCreateConfig,
} from '../../utils/database.js';
import { updateGuildConfig } from '../../services/config/guildConfig.js';
import {
  validateChannelNameTemplate,
  validateUserLimit,
  validateBitrate,
} from '../../services/joinToCreateService.js';
import { logger } from '../../utils/logger.js';
import { JoinToCreateConfigSchema } from '../../utils/schemas.js';

/**
 * GET /api/guilds/:guildId/jointocreate
 * Returns current Join-to-Create configuration for the guild.
 */
export async function getJoinToCreateSettings(req, res) {
  try {
    const { guild, guildId } = req;
    const config = await getJoinToCreateConfig(req.client, guildId);

    const rawTempChannels = config.temporaryChannels || {};
    const activeRooms = [];

    for (const [channelId, tempInfo] of Object.entries(rawTempChannels)) {
      const ch = guild?.channels?.cache?.get(channelId);
      if (ch) {
        const ownerMember = guild?.members?.cache?.get(tempInfo?.ownerId);
        activeRooms.push({
          channelId,
          channelName: ch.name,
          ownerId: tempInfo?.ownerId,
          ownerName: ownerMember?.displayName || ownerMember?.user?.username || 'Usuario',
          membersCount: ch.members?.size || 0,
          userLimit: ch.userLimit || 0,
          bitrate: ch.bitrate || 64000,
          createdAt: tempInfo?.createdAt || null,
        });
      }
    }

    return res.json({
      success: true,
      joinToCreate: {
        enabled: Boolean(config.enabled),
        triggerChannels: Array.isArray(config.triggerChannels) ? config.triggerChannels : [],
        categoryId: config.categoryId || null,
        channelNameTemplate: config.channelNameTemplate || "{username}'s Room",
        userLimit: typeof config.userLimit === 'number' ? config.userLimit : 0,
        bitrate: typeof config.bitrate === 'number' ? config.bitrate : 64000,
        temporaryChannels: config.temporaryChannels || {},
        activeRooms,
      },
    });
  } catch (error) {
    logger.error('Error fetching Join-to-Create settings:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Error al obtener la configuración de Join to Create.' });
  }
}

/**
 * PATCH /api/guilds/:guildId/jointocreate
 * Updates Join-to-Create configuration with template, limit, bitrate and category validation.
 */
export async function updateJoinToCreateSettings(req, res) {
  try {
    const { guild, guildId } = req;
    const body = req.body || {};

    const template = body.channelNameTemplate || "{username}'s Room";
    try {
      validateChannelNameTemplate(template);
    } catch (tmplErr) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'La plantilla de nombre contiene caracteres no válidos o variables desconocidas. Usa variables válidas como {username}, {displayName}, etc.',
      });
    }

    const userLimit = parseInt(body.userLimit ?? 0, 10);
    if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'El límite de usuarios debe ser un número entero entre 0 (sin límite) y 99 miembros.',
      });
    }

    const bitrate = parseInt(body.bitrate ?? 64000, 10);
    if (isNaN(bitrate) || bitrate < 8000 || bitrate > 384000) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'La calidad de audio (bitrate) debe estar entre 8,000 y 384,000 bps (8-384 kbps).',
      });
    }

    // Category validation
    if (body.categoryId) {
      const cat = guild.channels?.cache?.get(body.categoryId);
      if (!cat || (cat.type !== ChannelType.GuildCategory && cat.type !== 4)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'La categoría seleccionada no existe o no es una categoría válida en tu servidor de Discord.',
        });
      }
    }

    const updatedConfig = {
      enabled: Boolean(body.enabled),
      triggerChannels: Array.isArray(body.triggerChannels) ? body.triggerChannels : [],
      categoryId: body.categoryId || null,
      channelNameTemplate: template,
      userLimit,
      bitrate,
    };

    const parsed = JoinToCreateConfigSchema.safeParse(updatedConfig);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        message: parsed.error.issues[0]?.message || 'La configuración de Join to Create contiene valores no válidos.',
      });
    }

    await saveJoinToCreateConfig(req.client, guildId, parsed.data);
    await updateGuildConfig(req.client, guildId, { joinToCreate: parsed.data }).catch((err) => {
      logger.debug('Non-critical: Failed to sync joinToCreate into guildConfig:', err?.message);
    });
    logger.info(`Join-to-Create config updated for guild ${guildId}`);

    return res.json({
      success: true,
      message: '¡Configuración de salas de voz temporales guardada exitosamente!',
      joinToCreate: parsed.data,
    });
  } catch (error) {
    logger.error('Error updating Join-to-Create settings:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Error al actualizar la configuración de salas temporales.' });
  }
}

/**
 * DELETE /api/guilds/:guildId/jointocreate/rooms/:channelId
 * Deletes an active temporary voice channel and removes it from tracking.
 */
export async function deleteActiveRoom(req, res) {
  try {
    const { guild, guildId } = req;
    const { channelId } = req.params;
    const config = await getJoinToCreateConfig(req.client, guildId);

    const ch = guild?.channels?.cache?.get(channelId);
    if (ch) {
      await ch.delete('Sala temporal cerrada manualmente desde el panel de TitanBot').catch((delErr) => {
        logger.warn('Could not delete Discord channel directly:', delErr.message);
      });
    }

    if (config.temporaryChannels && config.temporaryChannels[channelId]) {
      delete config.temporaryChannels[channelId];
      await saveJoinToCreateConfig(req.client, guildId, config);
    }

    return res.json({
      success: true,
      message: 'Sala de voz temporal eliminada correctamente.',
    });
  } catch (error) {
    logger.error('Error deleting active room:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Error al eliminar la sala temporal.' });
  }
}
