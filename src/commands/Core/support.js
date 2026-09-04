import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t, localizeSlashCommand } from '../../utils/i18n/index.js';

const SUPPORT_SERVER_URL = "https://discord.gg/QnWNz2dKCE";

export default {
  data: localizeSlashCommand(
    new SlashCommandBuilder()
      .setName("support")
      .setDescription("Get link to the support server"),
    'support',
  ),

  async execute(interaction) {
    try {
      const supportButton = new ButtonBuilder()
        .setLabel(t('core.support.join_button', {}, interaction))
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_SERVER_URL);

      const actionRow = new ActionRowBuilder().addComponents(supportButton);

      await InteractionHelper.safeReply(interaction, {
        embeds: [
          createEmbed({
            title: t('core.support.title', {}, interaction),
            description: t('core.support.description', {}, interaction),
          }),
        ],
        components: [actionRow],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error('Support command error:', error);
      
      try {
        return await InteractionHelper.safeReply(interaction, {
          embeds: [createEmbed({ title: t('core.support.error_title', {}, interaction), description: t('core.support.error_desc', {}, interaction), color: 'error' })],
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};