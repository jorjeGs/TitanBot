// autoResponderService.js — Custom triggers and auto-responses for TitanBot
import { logger } from '../../utils/logger.js';
import { createEmbed } from '../../utils/embeds.js';
import { getGuildConfig } from '../config/guildConfig.js';

// Cooldown tracking per user and rule
const userCooldowns = new Map();

/**
 * Interpolate placeholders into text
 */
function interpolateVariables(text, { guild, channel, author }) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\{user\}/gi, author ? `<@${author.id}>` : '@User')
    .replace(/\{username\}/gi, author?.username || 'User')
    .replace(/\{server\}/gi, guild?.name || 'Server')
    .replace(/\{guild\}/gi, guild?.name || 'Server')
    .replace(/\{channel\}/gi, channel ? `<#${channel.id}>` : '#channel')
    .replace(/\{memberCount\}/gi, String(guild?.memberCount || 0));
}

/**
 * Check if message content matches rule trigger safely
 */
export function matchTrigger(content, rule) {
  if (!content || !rule || !rule.trigger) return false;

  const trigger = rule.trigger.trim();
  const caseSensitive = rule.caseSensitive === true;
  const testContent = caseSensitive ? content : content.toLowerCase();
  const testTrigger = caseSensitive ? trigger : trigger.toLowerCase();

  const matchType = rule.matchType || 'contains';

  if (matchType === 'exact') {
    return testContent.trim() === testTrigger.trim();
  }

  if (matchType === 'contains') {
    return testContent.includes(testTrigger);
  }

  if (matchType === 'regex') {
    // ReDoS protection: limit pattern length and guard against dangerous nested repetition
    if (trigger.length > 100) return false;
    if (/([*+?])\1|\([^)]*[+*]\)[+*]/.test(trigger)) {
      return false;
    }

    try {
      const regex = new RegExp(trigger, caseSensitive ? '' : 'i');
      return regex.test(content);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Process message against configured auto-responders
 */
export async function handleAutoResponders(message, client) {
  try {
    if (!message || !message.guild || !message.channel || message.author?.bot) {
      return false;
    }

    const guildConfig = await getGuildConfig(client, message.guild.id);
    const rules = guildConfig?.automations?.autoResponders || [];
    if (!Array.isArray(rules) || rules.length === 0) {
      return false;
    }

    const now = Date.now();

    for (const rule of rules) {
      if (rule.enabled === false) continue;

      // 1. Channel filter (if specified)
      if (Array.isArray(rule.allowedChannels) && rule.allowedChannels.length > 0) {
        if (!rule.allowedChannels.includes(message.channel.id)) continue;
      }

      // 2. Role exclusions (e.g. staff/moderators ignored)
      if (Array.isArray(rule.ignoredRoles) && rule.ignoredRoles.length > 0 && message.member?.roles?.cache) {
        const rolesCache = message.member.roles.cache;
        const hasIgnoredRole =
          typeof rolesCache.some === 'function'
            ? rolesCache.some((r) => rule.ignoredRoles.includes(r.id || r))
            : Array.from(rolesCache.values ? rolesCache.values() : rolesCache).some((r) =>
                rule.ignoredRoles.includes(r.id || r)
              );
        if (hasIgnoredRole) continue;
      }

      // 3. User Cooldown check
      const cooldownKey = `${rule.id}_${message.author.id}`;
      const lastUsed = userCooldowns.get(cooldownKey) || 0;
      const cooldownMs = (rule.cooldownSeconds || 5) * 1000;
      if (now - lastUsed < cooldownMs) continue;

      // 4. Trigger match evaluation
      if (!matchTrigger(message.content, rule)) continue;

      // Match found! Update cooldown
      userCooldowns.set(cooldownKey, now);

      // Build payload
      const varContext = {
        guild: message.guild,
        channel: message.channel,
        author: message.author,
      };

      let payload = {};

      if (rule.type === 'embed') {
        const embedConfig = rule.embed || {};
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
        if (rule.content) {
          payload.content = interpolateVariables(rule.content, varContext);
        }
      } else {
        payload.content = interpolateVariables(rule.content || '🤖 Auto-Response', varContext);
      }

      // Dispatch either via DM or in channel
      if (rule.replyType === 'dm') {
        await message.author.send(payload).catch(() => {
          logger.debug(`Could not send auto-response DM to user ${message.author.id} (DMs closed)`);
        });
      } else {
        await message.channel.send(payload).catch((err) => {
          logger.warn(`Could not send auto-response in channel ${message.channel.id}:`, err?.message);
        });
      }

      // Trigger matched and executed, stop processing further rules for this message
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error in handleAutoResponders:', error);
    return false;
  }
}

/**
 * Reset in-memory cooldowns (for test purposes)
 */
export function resetAutoResponderCooldowns() {
  userCooldowns.clear();
}
