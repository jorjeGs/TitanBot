import {
  PermissionFlagsBits,
  ChannelSelectMenuBuilder,
  ChannelType,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import {
  toggleEventLogging,
  getLoggingStatus,
  EVENT_TYPES,
  setLoggingEnabled,
  setLogChannel,
  updateIgnoreList,
  getIgnoreList,
} from '../services/loggingService.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { successEmbed } from '../utils/embeds.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  buildLoggingDashboardView,
  buildLoggingCategoriesView,
  buildLoggingFilterView,
  isCategoriesView,
  isFilterView,
  refreshDashboardMessage,
} from '../commands/Logging/modules/logging_dashboard.js';
import { t } from '../services/i18n.js';

const LOGGING_CATEGORIES = [...new Set(Object.values(EVENT_TYPES).map((eventType) => eventType.split('.')[0]))];

const DESTINATION_LABELS = {
  audit: 'Audit Log',
  applications: 'Applications',
  reports: 'Reports',
};

function getDestinationLabel(destination, target) {
  const map = {
    audit: 'logging.dest_audit',
    applications: 'logging.dest_applications',
    reports: 'logging.dest_reports',
  };
  return map[destination] ? t(map[destination], {}, target) : (DESTINATION_LABELS[destination] || destination);
}

export default {
  customIds: [
    'log_dash_toggle',
    'log_dash_refresh',
    'log_dash_back',
    'log_dash_add_filter',
    'log_dash_remove_filter',
  ],

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: `❌ ${t('logging.err_manage_guild', {}, interaction)}`,
          ephemeral: true,
        });
      }

      if (interaction.customId === 'log_dash_refresh') {
        return handleRefresh(interaction);
      }

      if (interaction.customId === 'log_dash_back') {
        return handleBackToMain(interaction);
      }

      if (interaction.customId === 'log_dash_remove_filter') {
        return handleRemoveFilterModal(interaction);
      }

      if (interaction.customId.startsWith('log_dash_add_filter:')) {
        return handleAddFilterModal(interaction);
      }

      if (interaction.customId.startsWith('log_dash_toggle')) {
        return handleToggle(interaction);
      }
    } catch (error) {
      await handleInteractionError(interaction, error, {
        type: 'button',
        customId: interaction.customId,
        handler: 'logging',
      });
    }
  },
};

async function handleRefresh(interaction) {
  if (isCategoriesView(interaction)) {
    const { embed, components } = await buildLoggingCategoriesView(interaction, interaction.client);
    return interaction.update({ embeds: [embed], components, content: null });
  }

  if (isFilterView(interaction)) {
    const { embed, components } = await buildLoggingFilterView(interaction, interaction.client);
    return interaction.update({ embeds: [embed], components, content: null });
  }

  const { embed, components } = await buildLoggingDashboardView(interaction, interaction.client);
  await interaction.update({ embeds: [embed], components, content: null });
}

async function handleBackToMain(interaction) {
  const { embed, components } = await buildLoggingDashboardView(interaction, interaction.client);
  await interaction.update({ embeds: [embed], components, content: null });
}

async function handleToggle(interaction) {
  const eventType = interaction.customId.replace('log_dash_toggle:', '');
  if (!eventType) {
    return interaction.reply({ content: `❌ ${t('logging.err_invalid_event_type', {}, interaction)}`, ephemeral: true });
  }

  const status = await getLoggingStatus(interaction.client, interaction.guildId);
  const onCategoriesView = isCategoriesView(interaction);

  if (eventType === 'audit_enabled') {
    await setLoggingEnabled(interaction.client, interaction.guildId, !Boolean(status.enabled));
  } else if (eventType === 'all') {
    const newState = !Object.values(status.enabledEvents).every((v) => v !== false);
    const allTypes = Object.values(EVENT_TYPES);
    const categoryTypes = LOGGING_CATEGORIES.map((c) => `${c}.*`);
    await toggleEventLogging(interaction.client, interaction.guildId, [...allTypes, ...categoryTypes], newState);
  } else {
    const currentState = status.enabledEvents[eventType] !== false;
    await toggleEventLogging(interaction.client, interaction.guildId, eventType, !currentState);
  }

  if (onCategoriesView || (eventType !== 'audit_enabled' && eventType.includes('.*'))) {
    const { embed, components } = await buildLoggingCategoriesView(interaction, interaction.client);
    return interaction.update({ embeds: [embed], components, content: null });
  }

  const { embed, components } = await buildLoggingDashboardView(interaction, interaction.client);
  await interaction.update({ embeds: [embed], components, content: null });
}

async function handleAddFilterModal(interaction) {
  const filterType = interaction.customId.replace('log_dash_add_filter:', '');
  if (filterType !== 'user' && filterType !== 'channel') {
    return interaction.reply({ content: `❌ ${t('logging.err_invalid_filter_type', {}, interaction)}`, ephemeral: true });
  }

  const modalCustomId = `log_dash_filter_modal:add:${filterType}`;

  let modal;
  if (filterType === 'user') {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('ignore_user')
      .setPlaceholder(t('logging.modal_user_placeholder', {}, interaction))
      .setMinValues(1)
      .setMaxValues(1);

    const userLabel = new LabelBuilder()
      .setLabel(t('logging.modal_user_label', {}, interaction))
      .setDescription(t('logging.modal_user_desc', {}, interaction))
      .setUserSelectMenuComponent(userSelect);

    modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle(t('logging.modal_add_user_title', {}, interaction))
      .addLabelComponents(userLabel);
  } else {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('ignore_channel')
      .setPlaceholder(t('logging.modal_channel_placeholder', {}, interaction))
      .setMinValues(1)
      .setMaxValues(1)
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice);

    const channelLabel = new LabelBuilder()
      .setLabel(t('logging.modal_channel_label', {}, interaction))
      .setDescription(t('logging.modal_channel_desc', {}, interaction))
      .setChannelSelectMenuComponent(channelSelect);

    modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle(t('logging.modal_add_channel_title', {}, interaction))
      .addLabelComponents(channelLabel);
  }

  await interaction.showModal(modal);

  try {
    const modalSubmission = await interaction.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id && i.customId === modalCustomId,
    });

    let id;
    if (filterType === 'user') {
      id = modalSubmission.fields.getField('ignore_user')?.values?.[0];
    } else {
      id = modalSubmission.fields.getField('ignore_channel')?.values?.[0];
    }

    const typeName = filterType === 'user'
      ? (t('logging.type_user', {}, modalSubmission) || 'User')
      : (t('logging.type_channel', {}, modalSubmission) || 'Channel');

    if (!id) {
      return replyUserError(modalSubmission, {
        type: ErrorTypes.VALIDATION,
        message: t('logging.err_select_target', { type: typeName.toLowerCase() }, modalSubmission),
      });
    }

    await updateIgnoreList(interaction.client, interaction.guildId, { action: 'add', type: filterType, id });

    await modalSubmission.reply({
      embeds: [successEmbed(
        t('logging.filter_added_title', {}, modalSubmission),
        t('logging.filter_added_desc', { type: typeName, id }, modalSubmission),
      )],
      flags: MessageFlags.Ephemeral,
    });

    if (isFilterView(interaction)) {
      await refreshDashboardMessage(interaction, interaction.client);
    }
  } catch (error) {
    if (error.code === 'INTERACTION_TIMEOUT') {
      return;
    }
    logger.error('Error in add filter modal:', error);
  }
}

async function handleRemoveFilterModal(interaction) {
  const config = await getGuildConfig(interaction.client, interaction.guildId);
  const ignore = getIgnoreList(config);
  const options = [];

  for (const userId of ignore.users || []) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(`User ${userId}`)
        .setDescription('Remove this user from the ignore list')
        .setValue(`user:${userId}`),
    );
  }

  for (const channelId of ignore.channels || []) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(`Channel ${channelId}`)
        .setDescription('Remove this channel from the ignore list')
        .setValue(`channel:${channelId}`),
    );
  }

  if (options.length === 0) {
    return replyUserError(interaction, {
      type: ErrorTypes.USER_INPUT,
      message: t('logging.err_no_filters', {}, interaction),
    });
  }

  const modalCustomId = 'log_dash_filter_modal:remove';

  const filterSelect = new StringSelectMenuBuilder()
    .setCustomId('filter_entry')
    .setPlaceholder(t('logging.modal_remove_placeholder', {}, interaction))
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options.slice(0, 25));

  const filterLabel = new LabelBuilder()
    .setLabel(t('logging.modal_remove_label', {}, interaction))
    .setDescription(t('logging.modal_remove_desc', {}, interaction))
    .setStringSelectMenuComponent(filterSelect);

  const modal = new ModalBuilder()
    .setCustomId(modalCustomId)
    .setTitle(t('logging.modal_remove_filter_title', {}, interaction))
    .addLabelComponents(filterLabel);

  await interaction.showModal(modal);

  try {
    const modalSubmission = await interaction.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id && i.customId === modalCustomId,
    });

    const entry = modalSubmission.fields.getField('filter_entry')?.values?.[0];
    if (!entry) {
      return replyUserError(modalSubmission, {
        type: ErrorTypes.VALIDATION,
        message: t('logging.modal_remove_placeholder', {}, modalSubmission),
      });
    }

    const [type, id] = entry.split(':');
    await updateIgnoreList(interaction.client, interaction.guildId, { action: 'remove', type, id });

    const typeName = type === 'user'
      ? (t('logging.type_user', {}, modalSubmission) || 'User')
      : (t('logging.type_channel', {}, modalSubmission) || 'Channel');

    await modalSubmission.reply({
      embeds: [successEmbed(
        t('logging.filter_removed_title', {}, modalSubmission),
        t('logging.filter_removed_desc', { type: typeName, id }, modalSubmission),
      )],
      flags: MessageFlags.Ephemeral,
    });

    if (isFilterView(interaction)) {
      await refreshDashboardMessage(interaction, interaction.client);
    }
  } catch (error) {
    if (error.code === 'INTERACTION_TIMEOUT') {
      return;
    }
    logger.error('Error in remove filter modal:', error);
  }
}

async function showChannelModal(interaction, destination) {
  const label = getDestinationLabel(destination, interaction);
  const modalCustomId = `log_dash_channel_modal:${destination}`;

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('log_channel')
    .setPlaceholder(t('logging.modal_set_channel_placeholder', {}, interaction))
    .setMinValues(1)
    .setMaxValues(1)
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setRequired(true);

  const channelLabel = new LabelBuilder()
    .setLabel(t('logging.modal_set_channel_label', { destination: label }, interaction))
    .setDescription(t('logging.modal_set_channel_desc', { destination: label }, interaction))
    .setChannelSelectMenuComponent(channelSelect);

  const modal = new ModalBuilder()
    .setCustomId(modalCustomId)
    .setTitle(t('logging.modal_set_channel_title', { destination: label }, interaction))
    .addLabelComponents(channelLabel);

  await interaction.showModal(modal);

  try {
    const modalSubmission = await interaction.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id && i.customId === modalCustomId,
    });

    const channelId = modalSubmission.fields.getField('log_channel').values[0];
    const channel = interaction.guild.channels.cache.get(channelId)
      ?? await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return modalSubmission.reply({
        content: `❌ ${t('logging.err_channel_not_found', {}, modalSubmission)}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const botPerms = channel.permissionsFor(interaction.guild.members.me);
    if (!botPerms?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
      return modalSubmission.reply({
        content: `❌ ${t('logging.err_channel_perms', {}, modalSubmission)}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await setLogChannel(interaction.client, interaction.guildId, destination, channel.id);

    await modalSubmission.reply({
      embeds: [successEmbed(
        t('logging.channel_updated_modal_title', {}, modalSubmission),
        t('logging.channel_updated_modal_desc', { destination: label, channel: channel.toString() }, modalSubmission),
      )],
      flags: MessageFlags.Ephemeral,
    });

    await refreshDashboardMessage(interaction, interaction.client);
  } catch (error) {
    if (error.code === 'INTERACTION_TIMEOUT') {
      return;
    }
    await handleInteractionError(interaction, error, {
      type: 'modal',
      customId: interaction.customId,
      handler: 'logging_channel',
    });
  }
}

export async function handleLoggingMenuSelect(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: `❌ ${t('logging.err_manage_guild', {}, interaction)}`,
      ephemeral: true,
    });
  }

  const value = interaction.values[0];

  if (value.startsWith('set:')) {
    const destination = value.replace('set:', '');
    return showChannelModal(interaction, destination);
  }

  if (value.startsWith('clear:')) {
    const destination = value.replace('clear:', '');
    await setLogChannel(interaction.client, interaction.guildId, destination, null);
    const { embed, components } = await buildLoggingDashboardView(interaction, interaction.client);
    return interaction.update({
      embeds: [embed],
      components,
      content: null,
    });
  }

  if (value === 'view:categories') {
    const { embed, components } = await buildLoggingCategoriesView(interaction, interaction.client);
    return interaction.update({ embeds: [embed], components, content: null });
  }

  if (value === 'view:filters') {
    const { embed, components } = await buildLoggingFilterView(interaction, interaction.client);
    return interaction.update({ embeds: [embed], components, content: null });
  }

  return interaction.reply({ content: `❌ ${t('logging.err_unknown_option', {}, interaction)}`, ephemeral: true });
}
