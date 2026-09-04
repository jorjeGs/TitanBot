import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t, localizeSlashCommand } from '../../utils/i18n/index.js';

export default {
  data: localizeSlashCommand(
    new SlashCommandBuilder()
      .setName("uptime")
      .setDescription("Check how long the bot has been online"),
    'uptime',
  ),

  async execute(interaction) {
    try {
      await InteractionHelper.safeDefer(interaction);
      
      let totalSeconds = interaction.client.uptime / 1000;
      let days = Math.floor(totalSeconds / 86400);
      totalSeconds %= 86400;
      let hours = Math.floor(totalSeconds / 3600);
      totalSeconds %= 3600;
      let minutes = Math.floor(totalSeconds / 60);
      let seconds = Math.floor(totalSeconds % 60);

      const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({ 
          title: t('core.uptime.title', {}, interaction), 
          description: `\`\`\`${uptimeStr}\`\`\`` 
        })],
      });
    } catch (error) {
      logger.error('Uptime command error:', error);
      
      try {
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [createEmbed({ title: t('core.uptime.error_title', {}, interaction), description: t('core.uptime.error_desc', {}, interaction), color: 'error' })],
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};