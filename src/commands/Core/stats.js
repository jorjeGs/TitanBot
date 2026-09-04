import { SlashCommandBuilder, version, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t, localizeSlashCommand } from '../../utils/i18n/index.js';

export default {
  data: localizeSlashCommand(
    new SlashCommandBuilder()
      .setName("stats")
      .setDescription("View bot statistics"),
    'stats',
  ),

  async execute(interaction) {
    try {
      await InteractionHelper.safeDefer(interaction);
      
      const totalGuilds = interaction.client.guilds.cache.size;
      const totalMembers = interaction.client.guilds.cache.reduce(
        (acc, guild) => acc + guild.memberCount,
        0,
      );
      const nodeVersion = process.version;

      const embed = createEmbed({
        title: t('core.stats.title', {}, interaction),
        description: t('core.stats.description', {}, interaction),
      }).addFields(
        { name: t('core.stats.servers', {}, interaction), value: `${totalGuilds}`, inline: true },
        { name: t('core.stats.users', {}, interaction), value: `${totalMembers}`, inline: true },
        { name: t('core.stats.nodejs', {}, interaction), value: `${nodeVersion}`, inline: true },
        { name: t('core.stats.discordjs', {}, interaction), value: `v${version}`, inline: true },
        {
          name: t('core.stats.memory', {}, interaction),
          value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
          inline: true,
        },
      );

      await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    } catch (error) {
      logger.error('Stats command error:', error);
      return InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({ title: t('core.stats.error_title', {}, interaction), description: t('core.stats.error_desc', {}, interaction), color: 'error' })],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};