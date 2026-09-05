import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, AttachmentBuilder, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed } from '../utils/embeds.js';
import { createTicket, closeTicket, claimTicket, updateTicketPriority } from '../services/ticket.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { logTicketEvent } from '../utils/ticket/ticketLogging.js';
import { logger } from '../utils/logger.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { replyUserError, ErrorTypes, handleInteractionError, createError } from '../utils/errorHandler.js';
import { getTicketPermissionContext } from '../utils/ticket/ticketPermissions.js';
import { t } from '../utils/i18n/index.js';

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function ensureGuildContext(interaction) {
  if (interaction.inGuild()) {
    return true;
  }

  if (!interaction.replied && !interaction.deferred) {
    await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.guild_only', interaction) });
  }

  return false;
}

async function assertTicketPermission(interaction, client, actionLabel, options = {}, timeoutMs = 2500) {
  const { allowTicketCreator = false } = options;

  let context;
  try {
    const contextPromise = getTicketPermissionContext({ client, interaction });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );
    context = await Promise.race([contextPromise, timeoutPromise]);
  } catch (error) {
    if (error.message === 'Timeout') {
      throw createError(
        'Ticket permission timeout',
        ErrorTypes.RATE_LIMIT,
        'The permission check took too long. Please try again.'
      );
    }
    throw createError(
      'Ticket permission check failed',
      ErrorTypes.UNKNOWN,
      `Failed to check permissions: ${error.message}`
    );
  }

  if (!context.ticketData) {
    throw createError(
      'Not a ticket channel',
      ErrorTypes.VALIDATION,
      t('ticket.errors.not_ticket_channel', interaction)
    );
  }

  const allowed = allowTicketCreator ? context.canCloseTicket : context.canManageTicket;
  if (!allowed) {
    const permKey = allowTicketCreator ? 'ticket.errors.perm_close_denied' : 'ticket.errors.perm_denied';
    throw createError(
      'Ticket permission denied',
      ErrorTypes.PERMISSION,
      t(permKey, { action: actionLabel }, interaction)
    );
  }

  return context;
}

async function ensureTicketPermission(interaction, client, actionLabel, options = {}) {
  const { allowTicketCreator = false } = options;

  const context = await getTicketPermissionContext({ client, interaction });

  if (!context.ticketData) {
    await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.not_ticket_channel', interaction) });
    return null;
  }

  const allowed = allowTicketCreator ? context.canCloseTicket : context.canManageTicket;
  if (!allowed) {
    const permKey = allowTicketCreator ? 'ticket.errors.perm_close_denied' : 'ticket.errors.perm_denied';
    await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: t(permKey, { action: actionLabel }, interaction) });
    return null;
  }

  return context;
}

const createTicketHandler = {
  name: 'create_ticket',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      const rateLimitKey = `${interaction.user.id}:create_ticket`;
      const allowed = await checkRateLimit(rateLimitKey, 3, 60000);
      if (!allowed) {
        await replyUserError(interaction, { type: ErrorTypes.RATE_LIMIT, message: t('ticket.errors.rate_limited', interaction) });
        return;
      }

      const config = await getGuildConfig(client, interaction.guildId);
      const maxTicketsPerUser = config.maxTicketsPerUser || 3;
      
      const { getUserTicketCount } = await import('../services/ticket.js');
      const currentTicketCount = await getUserTicketCount(interaction.guildId, interaction.user.id);
      
      if (currentTicketCount >= maxTicketsPerUser) {
        return await replyUserError(interaction, {
          type: ErrorTypes.UNKNOWN,
          message: t('ticket.errors.max_tickets', { max: maxTicketsPerUser, current: currentTicketCount }, interaction)
        });
      }
      
      const modal = new ModalBuilder()
        .setCustomId('create_ticket_modal')
        .setTitle(t('ticket.modals.create_title', interaction));

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel(t('ticket.modals.create_reason_label', interaction))
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(t('ticket.modals.create_reason_placeholder', interaction))
        .setRequired(true)
        .setMaxLength(1000);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    } catch (error) {
      logger.error('Error creating ticket modal:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_create', interaction) });
      }
    }
  }
};

const createTicketModalHandler = {
  name: 'create_ticket_modal',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;
      
      const reason = interaction.fields.getTextInputValue('reason');
      const config = await getGuildConfig(client, interaction.guildId);
      const categoryId = config.ticketCategoryId || null;
      
      const { channel } = await createTicket(
        interaction.guild,
        interaction.member,
        categoryId,
        reason
      );
      await interaction.editReply({
        embeds: [successEmbed(
          t('ticket.ticket.created_title', interaction),
          t('ticket.ticket.created_desc', { channel: channel.toString() }, interaction)
        )]
      });
    } catch (error) {
      await handleInteractionError(interaction, error, { type: 'button', handler: 'ticket', customId: interaction.customId });
    }
  }
};

const closeTicketHandler = {
  name: 'ticket_close',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'close this ticket', { allowTicketCreator: true }, 2000);

      const modal = new ModalBuilder()
        .setCustomId('ticket_close_modal')
        .setTitle(t('ticket.modals.close_title', interaction));

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel(t('ticket.modals.close_reason_label', interaction))
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(t('ticket.modals.close_reason_placeholder', interaction))
        .setRequired(false)
        .setMaxLength(1000);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    } catch (error) {
      logger.error('Error closing ticket:', error);

      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_close', interaction) });
      }
    }
  }
};

const closeTicketModalHandler = {
  name: 'ticket_close_modal',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'close this ticket', { allowTicketCreator: true }, 2000);

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;

      const providedReason = interaction.fields.getTextInputValue('reason')?.trim();
      const reason = providedReason || 'Closed via ticket button without a specific reason.';

      await closeTicket(interaction.channel, interaction.user, reason);
      await interaction.editReply({
        embeds: [
          successEmbed(
            t('ticket.ticket.closed_title', interaction),
            t('ticket.ticket.closed_desc', { closer: interaction.user.toString(), reason, dmNotice: '' }, interaction)
          )
        ]
      });
    } catch (error) {
      logger.error('Error submitting close ticket modal:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_close', interaction) });
      } else if (interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_close', interaction) });
      }
    }
  }
};

const claimTicketHandler = {
  name: 'ticket_claim',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'claim tickets', {}, 2000);

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;
      
      await claimTicket(interaction.channel, interaction.user);
      await interaction.editReply({
        embeds: [
          successEmbed(
            t('ticket.ticket.claimed_title', interaction),
            t('ticket.ticket.claimed_desc', { claimer: interaction.user.toString() }, interaction)
          )
        ]
      });
    } catch (error) {
      logger.error('Error claiming ticket:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_claim', interaction) });
      } else if (interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_claim', interaction) });
      }
    }
  }
};

const priorityTicketHandler = {
  name: 'ticket_priority',
  async execute(interaction, client, args) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'change ticket priority', {}, 2000);

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;
      
      const priority = args?.[0];
      if (!priority) {
        await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'A priority value is required.' });
        return;
      }

      await updateTicketPriority(interaction.channel, priority, interaction.user);
      await interaction.editReply({
        embeds: [
          successEmbed(
            t('ticket.ticket.priority_title', interaction),
            t('ticket.ticket.priority_desc', { priority: priority.toUpperCase() }, interaction)
          )
        ]
      });
    } catch (error) {
      logger.error('Error updating ticket priority:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_priority', interaction) });
      } else if (interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_priority', interaction) });
      }
    }
  }
};

const pinTicketHandler = {
  name: 'ticket_pin',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'pin tickets', {}, 2000);

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;

      const channel = interaction.channel;
      const category = channel.parent;

      if (!category) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.not_in_category', interaction) });
        return;
      }

      const hasPingEmoji = channel.name.startsWith('📌');
      
      if (hasPingEmoji) {
        
        const newName = channel.name.replace(/^📌\s*/, '');
        await channel.edit({
          name: newName,
          position: 999 
        });

        await interaction.editReply({
          embeds: [createEmbed({
            title: t('ticket.ticket.unpinned_title', interaction),
            description: t('ticket.ticket.unpinned_desc', interaction),
            color: 0x95A5A6
          })],
          flags: MessageFlags.Ephemeral
        });

        logger.info('Ticket unpinned', {
          guildId: interaction.guildId,
          channelId: channel.id,
          channelName: newName,
          userId: interaction.user.id
        });
      } else {
        
        const pinnedName = `📌 ${channel.name}`;
        await channel.edit({
          name: pinnedName,
          position: 0 
        });

        await interaction.editReply({
          embeds: [createEmbed({
            title: t('ticket.ticket.pinned_title', interaction),
            description: t('ticket.ticket.pinned_desc', interaction),
            color: 0x3498db
          })],
          flags: MessageFlags.Ephemeral
        });

        logger.info('Ticket pinned', {
          guildId: interaction.guildId,
          channelId: channel.id,
          channelName: pinnedName,
          userId: interaction.user.id
        });
      }

      await logTicketEvent({
        client: interaction.client,
        guildId: interaction.guildId,
        event: {
          type: hasPingEmoji ? 'unpin' : 'pin',
          ticketId: channel.id,
          ticketNumber: channel.name.replace(/[^0-9]/g, ''),
          userId: interaction.user.id,
          executorId: interaction.user.id,
          metadata: {
            isPinned: !hasPingEmoji,
            newChannelName: hasPingEmoji ? channel.name.replace(/^📌\s*/, '') : `📌 ${channel.name}`
          }
        }
      });

    } catch (error) {
      logger.error('Error pinning/unpinning ticket:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Failed to pin/unpin the ticket.' });
      } else if (interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Failed to pin/unpin the ticket.' });
      }
    }
  }
};

const unclaimTicketHandler = {
  name: 'ticket_unclaim',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'unclaim tickets', {}, 2000);

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;
      
      const { unclaimTicket } = await import('../services/ticket.js');
      await unclaimTicket(interaction.channel, interaction.member);
      await interaction.editReply({
        embeds: [
          successEmbed(
            t('ticket.ticket.unclaimed_title', interaction),
            t('ticket.ticket.unclaimed_desc', { unclaimer: interaction.member.toString() }, interaction)
          )
        ]
      });
    } catch (error) {
      logger.error('Error unclaiming ticket:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_unclaim', interaction) });
      } else if (interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_unclaim', interaction) });
      }
    }
  }
};

const reopenTicketHandler = {
  name: 'ticket_reopen',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'reopen tickets', {}, 2000);

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;
      
      const { reopenTicket } = await import('../services/ticket.js');
      const { movedToOpenCategory, openCategoryMoveFailed } = await reopenTicket(interaction.channel, interaction.member);
      const warning = openCategoryMoveFailed ? t('ticket.ticket.reopened_move_failed', interaction) : '';
      await interaction.editReply({
        embeds: [
          successEmbed(
            t('ticket.ticket.reopened_title', interaction),
            t('ticket.ticket.reopened_desc', { reopener: interaction.member.toString(), warning }, interaction)
          )
        ]
      });
    } catch (error) {
      logger.error('Error reopening ticket:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_reopen', interaction) });
      } else if (interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_reopen', interaction) });
      }
    }
  }
};

const deleteTicketHandler = {
  name: 'ticket_delete',
  async execute(interaction, client) {
    try {
      if (!(await ensureGuildContext(interaction))) return;

      await assertTicketPermission(interaction, client, 'delete tickets', {}, 2000);

      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) return;
      
      const { deleteTicket } = await import('../services/ticket.js');
      await deleteTicket(interaction.channel, interaction.member);
      await interaction.editReply({
        embeds: [
          successEmbed(
            t('ticket.ticket.delete_title', interaction),
            t('ticket.ticket.delete_desc', { seconds: 3 }, interaction)
          )
        ]
      });
    } catch (error) {
      logger.error('Error deleting ticket:', error);
      if (!interaction.replied && !interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_delete', interaction) });
      } else if (interaction.deferred) {
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('ticket.errors.failed_delete', interaction) });
      }
    }
  }
};

export default createTicketHandler;
export { 
  createTicketModalHandler, 
  closeTicketModalHandler,
  closeTicketHandler, 
  claimTicketHandler, 
  priorityTicketHandler,
  pinTicketHandler,
  unclaimTicketHandler,
  reopenTicketHandler,
  deleteTicketHandler 
};