import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { successEmbed } from '../utils/embeds.js';
import { WarningService } from '../services/moderation/warningService.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { logger } from '../utils/logger.js';
import { replyUserError, ErrorTypes } from '../utils/errorHandler.js';
import { t } from '../utils/i18n/index.js';

const warningDeleteSpecificHandler = {
  name: 'warning_delete_specific',
  async execute(interaction, client) {
    try {
      const [, targetUserId, originalModeratorId] = interaction.customId.split(':');
      
      if (interaction.user.id !== originalModeratorId) {
        return await replyUserError(interaction, {
          type: ErrorTypes.PERMISSION,
          message: t('moderation.warning_handlers.perm_only_mod_delete', {}, interaction),
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`warning_delete_modal:${targetUserId}:${interaction.user.id}`)
        .setTitle(t('moderation.warning_handlers.modal_delete_title', {}, interaction));

      const warningNumberInput = new TextInputBuilder()
        .setCustomId('warning_number')
        .setLabel(t('moderation.warning_handlers.modal_delete_number_label', {}, interaction))
        .setPlaceholder(t('moderation.warning_handlers.modal_delete_number_placeholder', {}, interaction))
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10);

      const actionRow = new ActionRowBuilder().addComponents(warningNumberInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    } catch (error) {
      logger.error('Warning delete specific button error:', error);
      await replyUserError(interaction, {
        type: ErrorTypes.UNKNOWN,
        message: t('moderation.warning_handlers.failed_open_modal', {}, interaction),
      });
    }
  }
};

const warningClearAllHandler = {
  name: 'warning_clear_all',
  async execute(interaction, client) {
    try {
      const [, targetUserId, originalModeratorId] = interaction.customId.split(':');
      
      if (interaction.user.id !== originalModeratorId) {
        return await replyUserError(interaction, {
          type: ErrorTypes.PERMISSION,
          message: t('moderation.warning_handlers.perm_only_mod_clear', {}, interaction),
        });
      }

      const clearModal = new ModalBuilder()
        .setCustomId(`warning_clear_confirm_modal:${targetUserId}:${interaction.user.id}`)
        .setTitle(t('moderation.warning_handlers.modal_clear_title', {}, interaction))
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('delete_confirmation')
              .setLabel(t('moderation.warning_handlers.modal_clear_label', {}, interaction))
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('DELETE')
              .setMaxLength(6)
              .setMinLength(6)
              .setRequired(true)
          )
        );

      await interaction.showModal(clearModal);
    } catch (error) {
      logger.error('Warning clear all button error:', error);
      await replyUserError(interaction, {
        type: ErrorTypes.UNKNOWN,
        message: t('moderation.warning_handlers.failed_open_confirm', {}, interaction),
      });
    }
  }
};

async function warningDeleteModalHandler(interaction, client) {
  try {
    const [, targetUserId, originalModeratorId] = interaction.customId.split(':');
    
    if (interaction.user.id !== originalModeratorId) {
      return await replyUserError(interaction, {
        type: ErrorTypes.PERMISSION,
        message: t('moderation.warning_handlers.perm_only_mod_delete', {}, interaction),
      });
    }

    const warningNumberInput = interaction.fields.getTextInputValue('warning_number');
    const warningNumber = parseInt(warningNumberInput.replace('#', '').trim(), 10);

    if (isNaN(warningNumber) || warningNumber < 1) {
      return await replyUserError(interaction, {
        type: ErrorTypes.VALIDATION,
        message: t('moderation.warning_handlers.invalid_warning_number', {}, interaction),
      });
    }

    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) return;

    const guildId = interaction.guildId;
    const warnings = await WarningService.getWarnings(guildId, targetUserId);

    if (warningNumber > warnings.length) {
      return await replyUserError(interaction, {
        type: ErrorTypes.USER_INPUT,
        message: t('moderation.warning_handlers.warning_not_found', { number: warningNumber, total: warnings.length }, interaction),
      });
    }

    const warningToDelete = warnings[warningNumber - 1];
    await WarningService.removeWarning(guildId, targetUserId, warningToDelete.id);

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    const targetName = targetUser ? targetUser.username : 'the user';

    logger.info(`[MODERATION] Warning deleted for ${targetUserId} in ${guildId} by ${interaction.user.id}`, {
      warningId: warningToDelete.id,
      reason: warningToDelete.reason,
      warningNumber
    });

    await interaction.editReply({
      embeds: [
        successEmbed(
          t('moderation.warning_handlers.deleted_title', {}, interaction),
          t('moderation.warning_handlers.deleted_desc', {
            number: warningNumber,
            user: targetName,
            reason: warningToDelete.reason.substring(0, 100)
          }, interaction)
        )
      ]
    });
  } catch (error) {
    logger.error('Warning delete modal handler error:', error);
    await replyUserError(interaction, {
      type: ErrorTypes.UNKNOWN,
      message: t('moderation.warning_handlers.failed_delete', {}, interaction),
    });
  }
}

async function warningClearConfirmModalHandler(interaction, client) {
  try {
    const [, targetUserId, originalModeratorId] = interaction.customId.split(':');
    
    if (interaction.user.id !== originalModeratorId) {
      return await replyUserError(interaction, {
        type: ErrorTypes.PERMISSION,
        message: t('moderation.warning_handlers.perm_only_mod_clear', {}, interaction),
      });
    }

    const confirmation = interaction.fields.getTextInputValue('delete_confirmation').trim();

    if (confirmation !== 'DELETE') {
      return await replyUserError(interaction, {
        type: ErrorTypes.UNKNOWN,
        message: t('moderation.warning_handlers.confirm_must_type_delete', {}, interaction),
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    const { count } = await WarningService.clearWarnings(guildId, targetUserId);

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    const targetName = targetUser ? targetUser.username : 'the user';

    logger.info(`[MODERATION] All warnings cleared for ${targetUserId} in ${guildId} by ${interaction.user.id}`);

    await interaction.editReply({
      embeds: [
        successEmbed(
          t('moderation.warning_handlers.cleared_title', {}, interaction),
          t('moderation.warning_handlers.cleared_desc', { user: targetName, count }, interaction)
        )
      ]
    });
  } catch (error) {
    logger.error('Warning clear confirm modal handler error:', error);
    await replyUserError(interaction, {
      type: ErrorTypes.UNKNOWN,
      message: t('moderation.warning_handlers.failed_clear', {}, interaction),
    });
  }
}

export {
  warningDeleteSpecificHandler,
  warningClearAllHandler,
  warningDeleteModalHandler,
  warningClearConfirmModalHandler,
};

export default {
  name: 'warning_delete_modal',
  execute: warningDeleteModalHandler
};
