// scheduledMessageService.js — Scheduled messages and periodic announcements for TitanBot
import { logger } from '../../utils/logger.js';
import { createEmbed } from '../../utils/embeds.js';
import { getGuildConfig, updateGuildConfig } from '../config/guildConfig.js';

/**
 * Interpolate placeholders into text
 */
function interpolateVariables(text, { guild, channel }) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\{server\}/gi, guild?.name || 'Server')
    .replace(/\{guild\}/gi, guild?.name || 'Server')
    .replace(/\{channel\}/gi, channel ? `<#${channel.id}>` : '#channel')
    .replace(/\{memberCount\}/gi, String(guild?.memberCount || 0));
}

/**
 * Determine if a scheduled message is due for execution
 */
export function isScheduledMessageDue(scheduled, now = new Date()) {
  if (!scheduled || scheduled.enabled === false) {
    return false;
  }

  const scheduleType = scheduled.scheduleType || 'daily';

  if (scheduleType === 'interval') {
    const intervalHours = scheduled.intervalHours || 24;
    if (!scheduled.lastRunAt) {
      return true;
    }
    const lastRun = new Date(scheduled.lastRunAt).getTime();
    return now.getTime() - lastRun >= intervalHours * 3600 * 1000;
  }

  const [targetHour, targetMinute] = (scheduled.timeOfDay || '12:00')
    .split(':')
    .map((v) => parseInt(v, 10));

  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const isTimeMatch = currentHour === targetHour && currentMinute === targetMinute;

  if (!isTimeMatch) {
    return false;
  }

  // Prevent multiple runs in the same minute
  if (scheduled.lastRunAt) {
    const last = new Date(scheduled.lastRunAt);
    if (
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate() &&
      last.getUTCHours() === now.getUTCHours() &&
      last.getUTCMinutes() === now.getUTCMinutes()
    ) {
      return false;
    }
  }

  if (scheduleType === 'daily') {
    return true;
  }

  if (scheduleType === 'weekly') {
    const days = Array.isArray(scheduled.daysOfWeek) ? scheduled.daysOfWeek : [1];
    return days.includes(now.getUTCDay());
  }

  // Fallback for custom cron or simple daily
  return true;
}

/**
 * Dispatch a scheduled message to Discord
 */
export async function sendScheduledMessage(client, guild, scheduled) {
  try {
    const channel =
      guild.channels?.cache?.get(scheduled.channelId) ||
      (await client.channels?.fetch(scheduled.channelId).catch(() => null));

    if (!channel || !channel.isTextBased()) {
      logger.warn(`Scheduled message "${scheduled.name}" failed: Channel ${scheduled.channelId} not found or not text`);
      return false;
    }

    const varContext = { guild, channel };
    let payload = {};

    if (scheduled.type === 'embed') {
      const embedConfig = scheduled.embed || {};
      const title = interpolateVariables(embedConfig.title, varContext);
      const description = interpolateVariables(embedConfig.description, varContext);
      const footer = embedConfig.footer ? interpolateVariables(embedConfig.footer, varContext) : '';

      const embed = createEmbed({
        title: title || undefined,
        description: description || undefined,
        color: embedConfig.color || '#5865F2',
        footer: footer || undefined,
        image: embedConfig.image || undefined,
        thumbnail: embedConfig.thumbnail || undefined,
      });

      payload.embeds = [embed];
      if (scheduled.content) {
        payload.content = interpolateVariables(scheduled.content, varContext);
      }
    } else {
      payload.content = interpolateVariables(scheduled.content || '⏰ Scheduled Announcement', varContext);
    }

    await channel.send(payload);
    logger.info(`Scheduled message "${scheduled.name}" dispatched to #${channel.name} (${guild.name})`);
    return true;
  } catch (error) {
    logger.error(`Failed to send scheduled message "${scheduled.name}":`, error);
    return false;
  }
}

/**
 * Periodic cron runner called every minute
 */
export async function checkScheduledMessages(client, now = new Date()) {
  try {
    if (!client || !client.guilds?.cache) return;

    for (const [guildId, guild] of client.guilds.cache) {
      const guildConfig = await getGuildConfig(client, guildId);
      const scheduledList = guildConfig?.automations?.scheduledMessages || [];

      let hasUpdates = false;
      const updatedList = [];

      for (const item of scheduledList) {
        if (isScheduledMessageDue(item, now)) {
          const sent = await sendScheduledMessage(client, guild, item);
          if (sent) {
            hasUpdates = true;
            updatedList.push({
              ...item,
              lastRunAt: now.toISOString(),
            });
            continue;
          }
        }
        updatedList.push(item);
      }

      if (hasUpdates) {
        await updateGuildConfig(client, guildId, {
          automations: {
            ...guildConfig.automations,
            scheduledMessages: updatedList,
          },
        });
      }
    }
  } catch (error) {
    logger.error('Error during checkScheduledMessages execution:', error);
  }
}

/**
 * Immediately trigger a scheduled message for testing from the dashboard
 */
export async function triggerScheduledMessageNow(client, guildId, messageId) {
  const guild = client.guilds?.cache?.get(guildId) || (await client.guilds?.fetch(guildId).catch(() => null));
  if (!guild) {
    throw new Error('Guild not found');
  }

  const guildConfig = await getGuildConfig(client, guildId);
  const scheduledList = guildConfig?.automations?.scheduledMessages || [];
  const target = scheduledList.find((item) => item.id === messageId);

  if (!target) {
    throw new Error('Scheduled message not found');
  }

  const success = await sendScheduledMessage(client, guild, target);
  if (!success) {
    throw new Error('Failed to send message to Discord channel. Please verify bot permissions.');
  }

  // Update lastRunAt timestamp
  const now = new Date();
  const updatedList = scheduledList.map((item) =>
    item.id === messageId ? { ...item, lastRunAt: now.toISOString() } : item
  );

  await updateGuildConfig(client, guildId, {
    automations: {
      ...guildConfig.automations,
      scheduledMessages: updatedList,
    },
  });

  return { success: true, timestamp: now.toISOString() };
}
