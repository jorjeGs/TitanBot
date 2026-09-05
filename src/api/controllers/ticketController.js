import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { patchGuildConfig, getGuildConfig } from '../../services/config/guildConfig.js';
import { getTicketPanelStatus } from '../../utils/panelStatus.js';
import { getColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

/**
 * Returns ticket settings and active panel status for the guild.
 */
export async function getTicketSettings(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found.' });
    }

    const config = await getGuildConfig(req.client, guild.id);
    let panelStatus = { exists: false, reason: 'unconfigured' };

    if (config.ticketPanelChannelId) {
      try {
        const status = await getTicketPanelStatus(req.client, guild, config);
        panelStatus = {
          exists: Boolean(status?.exists),
          channelId: status?.channel?.id || config.ticketPanelChannelId || null,
          messageId: status?.message?.id || config.ticketPanelMessageId || null,
          reason: status?.reason || null,
        };
      } catch (e) {
        logger.warn('Failed to inspect ticket panel status:', e);
      }
    }

    return res.json({
      success: true,
      tickets: {
        ticketPanelChannelId: config.ticketPanelChannelId || null,
        ticketPanelMessageId: config.ticketPanelMessageId || null,
        ticketPanelMessage: config.ticketPanelMessage || 'Para abrir un ticket de soporte, haz clic en el botón de abajo.',
        ticketButtonLabel: config.ticketButtonLabel || 'Crear Ticket',
        ticketCategoryId: config.ticketCategoryId || null,
        ticketClosedCategoryId: config.ticketClosedCategoryId || null,
        ticketStaffRoleId: config.ticketStaffRoleId || null,
        maxTicketsPerUser: config.maxTicketsPerUser || 3,
        dmOnClose: config.dmOnClose !== false,
        panelStatus,
      },
    });
  } catch (error) {
    logger.error('Error fetching ticket settings:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch ticket settings.',
    });
  }
}

/**
 * Publishes an interactive ticket panel (Embed + Create Ticket Button) to the selected channel
 * and updates ticket configuration in PostgreSQL.
 */
export async function publishTicketPanel(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found.' });
    }

    const {
      panelChannelId,
      panelMessage,
      buttonLabel,
      categoryId,
      closedCategoryId,
      staffRoleId,
      maxTicketsPerUser = 3,
      dmOnClose = true,
    } = req.body;

    if (!panelChannelId || typeof panelChannelId !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Panel channel is required.' });
    }

    const channel = guild.channels?.cache?.get(panelChannelId);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Selected channel not found in this server.' });
    }

    const botMember = guild.members?.me || (req.client?.user?.id ? guild.members?.cache?.get(req.client.user.id) : null);
    const botHighestPosition = botMember?.roles?.highest?.position ?? (botMember ? 0 : Infinity);

    // Verify bot channel permissions
    if (botMember && typeof channel.permissionsFor === 'function') {
      const perms = channel.permissionsFor(botMember);
      if (
        !perms.has(PermissionFlagsBits.ViewChannel) ||
        !perms.has(PermissionFlagsBits.SendMessages) ||
        !perms.has(PermissionFlagsBits.EmbedLinks)
      ) {
        return res.status(403).json({
          success: false,
          error: 'MissingChannelPermissions',
          message: 'Bot lacks View Channel, Send Messages, or Embed Links permissions in the selected channel.',
        });
      }
    }

    // Role hierarchy check for staff role if provided
    let staffRole = null;
    if (staffRoleId) {
      staffRole = guild.roles?.cache?.get(staffRoleId);
      if (!staffRole) {
        return res.status(404).json({ success: false, error: 'NotFound', message: 'Staff role not found in this server.' });
      }

      if (botMember && staffRole.position >= botHighestPosition) {
        return res.status(422).json({
          success: false,
          error: 'HierarchyError',
          message: `Role "${staffRole.name}" is equal to or higher than TitanBot's highest role.`,
        });
      }
    }

    // Validate category channels if provided
    if (categoryId) {
      const cat = guild.channels?.cache?.get(categoryId);
      if (!cat) {
        return res.status(404).json({ success: false, error: 'NotFound', message: 'Ticket opening category not found in this server.' });
      }
      if (cat.type !== 4 && cat.type !== ChannelType.GuildCategory) {
        return res.status(400).json({ success: false, error: 'Validation', message: 'Opening target must be a category channel.' });
      }
    }

    if (closedCategoryId) {
      const closedCat = guild.channels?.cache?.get(closedCategoryId);
      if (!closedCat) {
        return res.status(404).json({ success: false, error: 'NotFound', message: 'Ticket closed category not found in this server.' });
      }
      if (closedCat.type !== 4 && closedCat.type !== ChannelType.GuildCategory) {
        return res.status(400).json({ success: false, error: 'Validation', message: 'Closed target must be a category channel.' });
      }
    }

    const messageText =
      typeof panelMessage === 'string' && panelMessage.trim().length > 0
        ? panelMessage.trim().slice(0, 2000)
        : 'Para abrir un ticket de soporte, haz clic en el botón de abajo.';

    const btnText =
      typeof buttonLabel === 'string' && buttonLabel.trim().length > 0
        ? buttonLabel.trim().slice(0, 80)
        : 'Crear Ticket';

    // Construct Discord Embed & Button
    const embedColor = getColor ? getColor('info') : 0x5865f2;
    const embed = new EmbedBuilder()
      .setTitle('🎫 Sistema de Tickets de Soporte')
      .setDescription(messageText)
      .setColor(embedColor)
      .setTimestamp()
      .setFooter({ text: `TitanBot Tickets • ${guild.name}` });

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel(btnText)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📩')
    );

    const sentMessage = await channel.send({
      embeds: [embed],
      components: [buttonRow],
    });

    // Save ticket configuration to PostgreSQL
    const parsedMaxTickets = parseInt(maxTicketsPerUser, 10);
    const finalMaxTickets = Number.isFinite(parsedMaxTickets) ? Math.max(1, Math.min(10, parsedMaxTickets)) : 3;

    const ticketConfigUpdates = {
      ticketPanelChannelId: channel.id,
      ticketPanelMessageId: sentMessage.id,
      ticketPanelMessage: messageText,
      ticketButtonLabel: btnText,
      ticketCategoryId: categoryId || null,
      ticketClosedCategoryId: closedCategoryId || null,
      ticketStaffRoleId: staffRoleId || null,
      maxTicketsPerUser: finalMaxTickets,
      dmOnClose: Boolean(dmOnClose),
    };

    await patchGuildConfig(req.client, guild.id, ticketConfigUpdates);

    logger.info(`Published ticket panel in guild ${guild.id}, channel ${channel.id}, message ${sentMessage.id}`);

    return res.json({
      success: true,
      message: 'Ticket panel published successfully.',
      panel: {
        messageId: sentMessage.id,
        channelId: channel.id,
        messageUrl: `https://discord.com/channels/${guild.id}/${channel.id}/${sentMessage.id}`,
      },
    });
  } catch (error) {
    logger.error('Error publishing ticket panel:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to publish ticket panel to Discord.',
    });
  }
}

/**
 * Deletes the active ticket panel from Discord and removes its IDs from configuration.
 */
export async function deleteTicketPanel(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found.' });
    }

    const currentConfig = await getGuildConfig(req.client, guild.id);

    if (currentConfig.ticketPanelChannelId && currentConfig.ticketPanelMessageId) {
      try {
        const channel =
          guild.channels?.cache?.get(currentConfig.ticketPanelChannelId) ||
          (await guild.channels?.fetch?.(currentConfig.ticketPanelChannelId).catch(() => null));
        if (channel && channel.messages?.fetch) {
          const message = await channel.messages.fetch(currentConfig.ticketPanelMessageId).catch(() => null);
          if (message && typeof message.delete === 'function') {
            await message.delete().catch(() => null);
          }
        }
      } catch (err) {
        logger.warn('Failed to delete ticket panel message from Discord:', err);
      }
    }

    await patchGuildConfig(req.client, guild.id, {
      ticketPanelChannelId: null,
      ticketPanelMessageId: null,
    });

    logger.info(`Deleted ticket panel for guild ${guild.id}`);

    return res.json({
      success: true,
      message: 'Ticket panel deleted successfully.',
    });
  } catch (error) {
    logger.error('Error deleting ticket panel:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to delete ticket panel.',
    });
  }
}
