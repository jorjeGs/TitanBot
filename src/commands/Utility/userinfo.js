import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';
export default {
    data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get detailed information about a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to inspect (defaults to you)"),
    ),

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) {
      logger.warn(`UserInfo interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'userinfo'
      });
      return;
    }

    const user = interaction.options.getUser("target") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
    const joinedTimestamp = member?.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;

    const embed = createEmbed({ title: t('utility.userinfo_title', { user: user.username }, interaction) })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: t('utility.userinfo_id', {}, interaction), value: user.id, inline: true },
        { name: t('utility.userinfo_bot', {}, interaction), value: user.bot ? t('utility.userinfo_yes', {}, interaction) : t('utility.userinfo_no', {}, interaction), inline: true },
        {
          name: t('utility.userinfo_roles', {}, interaction),
          value:
            member && member.roles.cache.size > 1
              ? member.roles.cache
                  .map((r) => r.name)
                  .slice(0, 5)
                  .join(",")
              : t('utility.userinfo_none', {}, interaction),
          inline: true,
        },
        {
          name: t('utility.userinfo_account_created', {}, interaction),
          value: `<t:${createdTimestamp}:R>`,
          inline: false,
        },
        {
          name: t('utility.userinfo_joined_server', {}, interaction),
          value: joinedTimestamp ? `<t:${joinedTimestamp}:R>` : t('utility.userinfo_not_in_server', {}, interaction),
          inline: false,
        },
        {
          name: t('utility.userinfo_highest_role', {}, interaction),
          value: member?.roles?.highest?.name || t('utility.userinfo_none', {}, interaction),
          inline: true,
        },
      );

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.info(`UserInfo command executed`, {
      userId: interaction.user.id,
      targetUserId: user.id,
      guildId: interaction.guildId
    });
  },
};