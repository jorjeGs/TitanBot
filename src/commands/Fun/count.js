import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
  getCountingGameConfig,
  activateCountingGame,
  disableCountingGame,
  resetCountingGame,
  buildCountingLeaderboard,
  getCountingSystemChoices,
  getCountingSystemLabel,
  getExpectedCountValue,
} from '../../services/countingGameService.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { t } from '../../utils/i18n/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('count')
    .setDescription('Manage the server counting game')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Start a counting game in a text channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('The channel where counting will take place')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option
            .setName('system')
            .setDescription('The counting system to use')
            .setRequired(true)
            .addChoices(...getCountingSystemChoices()),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('disable').setDescription('Disable the counting game for this server'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('View current counting game status'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reset')
        .setDescription('Reset the current counting sequence')
        .addIntegerOption((option) =>
          option
            .setName('start')
            .setDescription('The number to start at after reset')
            .setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('leaderboard').setDescription('Show the counting game leaderboard'),
    ),
  category: 'Fun',

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) {
        logger.warn('Count command defer failed', { userId: interaction.user.id, guildId: interaction.guildId });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: t('fun.count_perm', interaction) });
      }

      const guildId = interaction.guildId;
      const subcommand = interaction.options.getSubcommand();
      const config = await getCountingGameConfig(interaction.client, guildId);

      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel');
        const system = interaction.options.getString('system');
        if (!channel || channel.type !== ChannelType.GuildText) {
          return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: t('fun.count_channel_required', interaction) });
        }

        if (config.enabled && config.channelId && config.channelId !== channel.id) {
          return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('fun.count_already_active', { channel: config.channelId }, interaction) });
        }

        await activateCountingGame(interaction.client, guildId, channel.id, system);
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            successEmbed(
              t('fun.count_enabled_title', interaction),
              t('fun.count_enabled_desc', {
                channel: `${channel}`,
                system: getCountingSystemLabel(system)
              }, interaction),
            ),
          ],
        });
      }

      if (subcommand === 'disable') {
        if (!config.enabled) {
          return await InteractionHelper.safeEditReply(interaction, {
            embeds: [infoEmbed(t('fun.count_already_disabled_title', interaction), t('fun.count_already_disabled_desc', interaction))],
          });
        }

        await disableCountingGame(interaction.client, guildId);
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [successEmbed(t('fun.count_already_disabled_title', interaction), t('fun.count_disabled_desc', interaction))],
        });
      }

      if (subcommand === 'status') {
        const fields = [
          { name: t('fun.count_status_enabled', interaction), value: config.enabled ? t('fun.count_status_yes', interaction) : t('fun.count_status_no', interaction), inline: true },
          { name: t('fun.count_status_channel', interaction), value: config.channelId ? `<#${config.channelId}>` : t('fun.count_status_not_configured', interaction), inline: true },
          { name: t('fun.count_status_system', interaction), value: getCountingSystemLabel(config.system), inline: true },
          { name: t('fun.count_status_next', interaction), value: getExpectedCountValue(config), inline: true },
          { name: t('fun.count_status_streak', interaction), value: `${config.currentStreak}`, inline: true },
          { name: t('fun.count_status_best', interaction), value: `${config.bestStreak || 0}`, inline: true },
          { name: t('fun.count_status_last', interaction), value: config.lastUserId ? `<@${config.lastUserId}>` : t('fun.count_status_none', interaction), inline: true },
        ];

        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: t('fun.count_status_title', interaction),
              description: t('fun.count_status_desc', interaction),
              fields,
              color: 'primary',
            }),
          ],
        });
      }

      if (subcommand === 'reset') {
        if (!config.enabled) {
          return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('fun.count_reset_first', interaction) });
        }

        const startNumber = interaction.options.getInteger('start') || 1;
        await resetCountingGame(interaction.client, guildId, startNumber);

        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            successEmbed(
              t('fun.count_reset_title', interaction),
              t('fun.count_reset_desc', { start: startNumber, channel: config.channelId }, interaction),
            ),
          ],
        });
      }

      if (subcommand === 'leaderboard') {
        const leaderboard = buildCountingLeaderboard(config, interaction.guild);

        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: t('fun.count_leaderboard_title', interaction),
              description: leaderboard.length > 0 ? leaderboard.join('\n') : t('fun.count_leaderboard_empty', interaction),
              color: 'primary',
            }),
          ],
        });
      }

      return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: t('fun.count_choose_action', interaction) });
    } catch (error) {
      logger.error('Count command error:', error);
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('fun.count_error', interaction) });
    }
  },
};
