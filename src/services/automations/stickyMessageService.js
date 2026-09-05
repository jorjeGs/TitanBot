// stickyMessageService.js — Sticky messages automation for TitanBot
import { logger } from '../../utils/logger.js';
import { createEmbed } from '../../utils/embeds.js';
import { getGuildConfig, updateGuildConfig } from '../config/guildConfig.js';

// In-memory counters and locks per channel
const channelCounters = new Map();
const channelLocks = new Map();
const lastSentTimes = new Map();

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
 * Process incoming message for sticky message checks
 */
export async function handleStickyMessage(message, client) {
  try {
    if (!message || !message.guild || !message.channel || message.author?.bot) {
      return;
    }

    const channelId = message.channel.id;
    const guildConfig = await getGuildConfig(client, message.guild.id);
    const stickyMessages = guildConfig?.automations?.stickyMessages || [];

    const sticky = stickyMessages.find((s) => s.channelId === channelId && s.enabled !== false);
    if (!sticky) {
      return;
    }

    // Increment message counter for this channel
    const currentCount = (channelCounters.get(channelId) || 0) + 1;
    channelCounters.set(channelId, currentCount);

    const threshold = sticky.messageCountThreshold || 3;
    if (currentCount < threshold) {
      return;
    }

    // Check anti-spam cooldown
    const now = Date.now();
    const lastSent = lastSentTimes.get(channelId) || 0;
    const cooldownMs = (sticky.cooldownSeconds || 5) * 1000;
    if (now - lastSent < cooldownMs) {
      return;
    }

    // Concurrency lock per channel
    if (channelLocks.get(channelId)) {
      return;
    }
    channelLocks.set(channelId, true);

    try {
      // 1. Attempt to delete the previous sticky message if it exists
      if (sticky.lastMessageId) {
        try {
          const oldMsg = await message.channel.messages.fetch(sticky.lastMessageId).catch(() => null);
          if (oldMsg && oldMsg.deletable) {
            await oldMsg.delete().catch(() => {});
          }
        } catch {
          // Ignore 10008: Unknown Message
        }
      }

      // 2. Build message payload
      const varContext = { guild: message.guild, channel: message.channel };
      let payload = {};

      if (sticky.type === 'embed') {
        const embedConfig = sticky.embed || {};
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
        if (sticky.content) {
          payload.content = interpolateVariables(sticky.content, varContext);
        }
      } else {
        payload.content = interpolateVariables(sticky.content || '📌 Sticky Message', varContext);
      }

      // 3. Send new sticky message
      const sent = await message.channel.send(payload);

      // 4. Update lastMessageId in guild config and reset counter
      channelCounters.set(channelId, 0);
      lastSentTimes.set(channelId, now);

      const updatedStickies = stickyMessages.map((item) =>
        item.id === sticky.id ? { ...item, lastMessageId: sent.id } : item
      );

      await updateGuildConfig(client, message.guild.id, {
        automations: {
          ...guildConfig.automations,
          stickyMessages: updatedStickies,
        },
      });

      logger.debug(`Sticky message re-posted in channel ${channelId} (${message.guild.name})`);
    } finally {
      channelLocks.delete(channelId);
    }
  } catch (error) {
    logger.error('Error handling sticky message:', error);
  }
}

/**
 * Reset in-memory tracking for a channel or test
 */
export function resetStickyTracking(channelId = null) {
  if (channelId) {
    channelCounters.delete(channelId);
    channelLocks.delete(channelId);
    lastSentTimes.delete(channelId);
  } else {
    channelCounters.clear();
    channelLocks.clear();
    lastSentTimes.clear();
  }
}
