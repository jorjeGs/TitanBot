import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';

export default {
    data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Get detailed information about the server"),

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) {
      logger.warn(`ServerInfo interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'serverinfo'
      });
      return;
    }

    const guild = interaction.guild;
    const owner = await guild.fetchOwner();

    const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);

    const embed = createEmbed({
      title: t('utility.serverinfo_title', { name: guild.name }, interaction),
      description: t('utility.serverinfo_id', { id: guild.id }, interaction),
    })
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: t('utility.serverinfo_owner', {}, interaction), value: owner.user.tag, inline: true },
        { name: t('utility.serverinfo_members', {}, interaction), value: `${guild.memberCount}`, inline: true },
        {
          name: t('utility.serverinfo_channels', {}, interaction),
          value: `${guild.channels.cache.size}`,
          inline: true,
        },
        { name: t('utility.serverinfo_roles', {}, interaction), value: `${guild.roles.cache.size}`, inline: true },
        {
          name: t('utility.serverinfo_boosts', {}, interaction),
          value: t('utility.serverinfo_boost_level', { level: guild.premiumTier, count: guild.premiumSubscriptionCount }, interaction),
          inline: true,
        },
        {
          name: t('utility.serverinfo_created', {}, interaction),
          value: `<t:${createdTimestamp}:R>`,
          inline: true,
        },
      );

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.info(`ServerInfo command executed`, {
      userId: interaction.user.id,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount
    });
  },
};