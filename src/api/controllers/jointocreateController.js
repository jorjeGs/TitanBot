import { ChannelType } from 'discord.js';
import {
  getJoinToCreateConfig,
  saveJoinToCreateConfig,
} from '../../utils/database.js';
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
    const { guildId } = req;
    const config = await getJoinToCreateConfig(req.client, guildId);

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
      },
    });
  } catch (error) {
    logger.error('Error fetching Join-to-Create settings:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Failed to fetch Join-to-Create settings' });
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
        message: tmplErr.message || 'Invalid channel name template',
      });
    }

    const userLimit = parseInt(body.userLimit ?? 0, 10);
    if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'User limit must be between 0 (no limit) and 99',
      });
    }

    const bitrate = parseInt(body.bitrate ?? 64000, 10);
    if (isNaN(bitrate) || bitrate < 8000 || bitrate > 384000) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Bitrate must be between 8,000 and 384,000 bps (8-384 kbps)',
      });
    }

    // Category validation
    if (body.categoryId) {
      const cat = guild.channels?.cache?.get(body.categoryId);
      if (!cat || (cat.type !== ChannelType.GuildCategory && cat.type !== 4)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'The selected category is invalid or not a category channel',
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
        message: parsed.error.issues[0]?.message || 'Invalid Join to Create configuration',
      });
    }

    await saveJoinToCreateConfig(req.client, guildId, parsed.data);
    logger.info(`Join-to-Create config updated for guild ${guildId}`);

    return res.json({
      success: true,
      message: 'Join to Create settings saved successfully',
      joinToCreate: parsed.data,
    });
  } catch (error) {
    logger.error('Error updating Join-to-Create settings:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Failed to update Join to Create settings' });
  }
}
