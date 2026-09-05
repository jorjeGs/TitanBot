import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { getGuildBirthdays, deleteBirthday as dbDeleteBirthday, getMonthName } from '../../utils/database.js';
import { UpdateBirthdayConfigSchema } from '../../utils/schemas.js';
import { logger } from '../../utils/logger.js';

/**
 * Calculates days remaining until the next occurrence of a birthday.
 */
function calculateDaysUntil(month, day) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create dates at midnight for consistent day delta calculation
  const today = new Date(currentYear, now.getMonth(), now.getDate());
  let nextBday = new Date(currentYear, month - 1, day);

  if (nextBday < today) {
    nextBday = new Date(currentYear + 1, month - 1, day);
  }

  const diffMs = nextBday.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/guilds/:guildId/birthdays
 * Lists birthday configuration and registered member birthdays.
 */
export async function getBirthdays(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    const config = await getGuildConfig(req.client, guildId);
    const rawBirthdays = (await getGuildBirthdays(req.client, guildId)) || {};

    const birthdaysList = [];

    for (const [userId, data] of Object.entries(rawBirthdays)) {
      if (!data || !data.month || !data.day) continue;

      const member = guild?.members?.cache?.get(userId);
      const daysUntil = calculateDaysUntil(data.month, data.day);

      birthdaysList.push({
        userId,
        month: data.month,
        day: data.day,
        monthName: getMonthName(data.month),
        username: member?.user?.username || `User-${userId.slice(-4)}`,
        displayName:
          member?.displayName ||
          member?.user?.globalName ||
          member?.user?.username ||
          `User-${userId.slice(-4)}`,
        avatar: member?.user?.displayAvatarURL?.({ size: 64 }) || null,
        daysUntil,
        isToday: daysUntil === 0,
      });
    }

    // Sort chronologically by days remaining until next birthday
    birthdaysList.sort((a, b) => a.daysUntil - b.daysUntil);

    const channel = config.birthdayChannelId
      ? guild?.channels?.cache?.get(config.birthdayChannelId)
      : null;
    const role = config.birthdayRoleId
      ? guild?.roles?.cache?.get(config.birthdayRoleId)
      : null;

    return res.json({
      success: true,
      config: {
        birthdayChannelId: config.birthdayChannelId || null,
        birthdayChannelName: channel?.name || null,
        birthdayRoleId: config.birthdayRoleId || null,
        birthdayRoleName: role?.name || null,
        birthdayMessage:
          config.birthdayMessage ||
          '🎉 ¡Feliz Cumpleaños {user}! Te deseamos un gran día en {server}! 🎂',
      },
      birthdays: birthdaysList,
      totalCount: birthdaysList.length,
    });
  } catch (error) {
    logger.error('Error fetching birthdays:', error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to load birthdays configuration',
    });
  }
}

/**
 * PATCH /api/guilds/:guildId/birthdays/config
 * Updates channel, celebration role, and announcement message.
 */
export async function updateBirthdayConfig(req, res) {
  try {
    const { guildId } = req.params;
    const validation = UpdateBirthdayConfigSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'ValidationError',
        message: validation.error.errors[0]?.message || 'Invalid birthday configuration',
        issues: validation.error.errors,
      });
    }

    const { birthdayChannelId, birthdayRoleId, birthdayMessage } = validation.data;
    const currentConfig = await getGuildConfig(req.client, guildId);

    if (birthdayChannelId !== undefined) {
      currentConfig.birthdayChannelId = birthdayChannelId;
    }
    if (birthdayRoleId !== undefined) {
      currentConfig.birthdayRoleId = birthdayRoleId;
    }
    if (birthdayMessage !== undefined) {
      currentConfig.birthdayMessage = birthdayMessage;
    }

    await setGuildConfig(req.client, guildId, currentConfig);

    logger.info(`Birthday configuration updated for guild ${guildId}`);

    return res.json({
      success: true,
      config: {
        birthdayChannelId: currentConfig.birthdayChannelId,
        birthdayRoleId: currentConfig.birthdayRoleId,
        birthdayMessage: currentConfig.birthdayMessage,
      },
    });
  } catch (error) {
    logger.error('Error updating birthday config:', error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to save birthday configuration',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/birthdays/:userId
 * Removes a user's birthday entry from the guild.
 */
export async function deleteBirthdayRecord(req, res) {
  try {
    const { guildId, userId } = req.params;

    const birthdays = (await getGuildBirthdays(req.client, guildId)) || {};
    if (!birthdays[userId]) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'No birthday record found for this user in the specified guild',
      });
    }

    const success = await dbDeleteBirthday(req.client, guildId, userId);

    if (!success) {
      return res.status(500).json({
        error: 'InternalError',
        message: 'Failed to delete birthday record from database',
      });
    }

    logger.info(`Birthday removed via web dashboard for user ${userId} in guild ${guildId}`);

    return res.json({
      success: true,
      message: 'Birthday deleted successfully',
      userId,
    });
  } catch (error) {
    logger.error('Error deleting birthday record:', error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to delete birthday record',
    });
  }
}
