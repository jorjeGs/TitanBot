import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { db } from '../../utils/database/wrapper.js';
import { logger } from '../../utils/logger.js';
import { InteractiveEmbedPayloadSchema } from '../../utils/schemas.js';

/**
 * Maps string button styles to Discord.js ButtonStyle enum
 */
export function mapButtonStyle(style) {
  switch (style) {
    case 'primary':
      return ButtonStyle.Primary;
    case 'secondary':
      return ButtonStyle.Secondary;
    case 'success':
      return ButtonStyle.Success;
    case 'danger':
      return ButtonStyle.Danger;
    case 'link':
      return ButtonStyle.Link;
    default:
      return ButtonStyle.Primary;
  }
}

/**
 * Builds ActionRowBuilder arrays from button definitions.
 */
export async function buildInteractiveComponents(buttons = [], guildId) {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    return [];
  }

  if (!db.initialized) {
    await db.initialize();
  }

  const rows = [];
  let currentRow = new ActionRowBuilder();

  for (let i = 0; i < buttons.length && i < 25; i++) {
    const btn = buttons[i];
    const buttonBuilder = new ButtonBuilder();

    if (btn.label) {
      buttonBuilder.setLabel(String(btn.label).slice(0, 80));
    }

    if (btn.emoji) {
      try {
        buttonBuilder.setEmoji(btn.emoji);
      } catch {
        // Ignore malformed emoji
      }
    }

    if (btn.disabled) {
      buttonBuilder.setDisabled(true);
    }

    if (btn.style === 'link' || btn.actionType === 'link') {
      buttonBuilder.setStyle(ButtonStyle.Link);
      buttonBuilder.setURL(btn.url || 'https://discord.com');
    } else {
      buttonBuilder.setStyle(mapButtonStyle(btn.style));

      let customId = `titan_btn:${btn.actionType}:${btn.id}`;
      if (btn.actionType === 'toggle_role') {
        customId = `titan_btn:toggle_role:${btn.roleId || 'none'}:${btn.id}`;
      } else if (btn.actionType === 'open_ticket') {
        customId = `titan_btn:open_ticket:${btn.id}`;
      } else if (btn.actionType === 'ephemeral_message') {
        customId = `titan_btn:msg:${btn.id}`;
      }

      buttonBuilder.setCustomId(customId);

      // Persist button definition in database for future interaction lookups
      if (guildId && btn.id) {
        try {
          const btnKey = `guild:${guildId}:interactive_btn:${btn.id}`;
          await db.set(btnKey, {
            id: btn.id,
            actionType: btn.actionType,
            roleId: btn.roleId || null,
            customMessage: btn.customMessage || null,
            label: btn.label,
            updatedAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.warn(`Failed to cache interactive button ${btn.id}:`, err.message);
        }
      }
    }

    currentRow.addComponents(buttonBuilder);

    // Discord limits max 5 buttons per action row
    if (currentRow.components.length === 5 || i === buttons.length - 1) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
  }

  return rows;
}

/**
 * Builds standard Discord Embed from payload
 */
export function buildDiscordEmbed(embedData = {}) {
  const embed = new EmbedBuilder();

  if (embedData.title) embed.setTitle(embedData.title);
  if (embedData.description) embed.setDescription(embedData.description);

  if (embedData.color) {
    if (typeof embedData.color === 'string' && embedData.color.startsWith('#')) {
      embed.setColor(parseInt(embedData.color.replace('#', ''), 16));
    } else if (typeof embedData.color === 'number') {
      embed.setColor(embedData.color);
    }
  }

  if (Array.isArray(embedData.fields)) {
    for (const f of embedData.fields) {
      if (f.name && f.value) {
        embed.addFields({
          name: String(f.name).slice(0, 256),
          value: String(f.value).slice(0, 1024),
          inline: Boolean(f.inline),
        });
      }
    }
  }

  if (embedData.imageUrl) {
    try {
      embed.setImage(embedData.imageUrl);
    } catch {}
  }

  if (embedData.thumbnailUrl) {
    try {
      embed.setThumbnail(embedData.thumbnailUrl);
    } catch {}
  }

  if (embedData.footerText) {
    embed.data.footer = {
      text: String(embedData.footerText).slice(0, 2048),
      ...(embedData.footerIconUrl ? { icon_url: embedData.footerIconUrl } : {}),
    };
  }

  if (embedData.authorName) {
    embed.setAuthor({
      name: String(embedData.authorName).slice(0, 256),
      iconURL: embedData.authorIconUrl || undefined,
    });
  }

  if (embedData.timestamp) {
    embed.data.timestamp = new Date().toISOString();
  }

  return embed;
}

/**
 * Sends an interactive embed with Discord buttons to a channel
 */
export async function sendInteractiveEmbed(client, guildId, payload) {
  const parsed = InteractiveEmbedPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Validation failed: ${parsed.error.message}`);
  }

  const { targetChannelId, content, embed: rawEmbed, buttons } = parsed.data;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error('Guild not found or bot is not in the guild');
  }

  const channel = guild.channels.cache.get(targetChannelId) || (await guild.channels.fetch(targetChannelId).catch(() => null));
  if (!channel) {
    throw new Error('Target channel not found in this guild');
  }

  // Check bot permissions in target channel
  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (botMember && channel.permissionsFor) {
    const permissions = channel.permissionsFor(botMember);
    if (!permissions.has(PermissionFlagsBits.SendMessages)) {
      throw new Error('Bot lacks SendMessages permission in target channel');
    }
    if (!permissions.has(PermissionFlagsBits.EmbedLinks)) {
      throw new Error('Bot lacks EmbedLinks permission in target channel');
    }
  }

  const embed = buildDiscordEmbed(rawEmbed);
  const rows = await buildInteractiveComponents(buttons, guildId);

  const messageOptions = {
    content: content || undefined,
    embeds: [embed],
    components: rows.length > 0 ? rows : undefined,
  };

  const sentMessage = await channel.send(messageOptions);

  return {
    success: true,
    messageId: sentMessage.id,
    channelId: channel.id,
    url: sentMessage.url,
  };
}
