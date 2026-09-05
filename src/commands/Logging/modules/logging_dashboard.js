import { EmbedBuilder, MessageFlags, PermissionsBitField } from 'discord.js';
import { getColor } from '../../../config/bot.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { getLoggingStatus } from '../../../services/loggingService.js';
import {
  createLoggingDashboardComponents,
  createLoggingCategoryViewComponents,
  createLoggingFilterComponents,
  DASHBOARD_CATEGORIES,
  DASHBOARD_CATEGORY_LABELS,
  EVENT_TYPES_BY_CATEGORY,
} from '../../../utils/logging/loggingUi.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';
import { t } from '../../../utils/i18n/index.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';

export function getCategoryStatus(enabledEvents, category, auditEnabled) {
  if (!auditEnabled) return false;
  const events = enabledEvents || {};
  if (events[`${category}.*`] === false) return false;
  const categoryEvents = EVENT_TYPES_BY_CATEGORY[category] || [];
  if (categoryEvents.length === 0) return true;
  return categoryEvents.every((eventType) => events[eventType] !== false);
}

async function formatChannelMention(guild, id, target = null) {
  if (!id) return t('logging.not_configured', {}, target);
  const channel = guild.channels.cache.get(id) ?? await guild.channels.fetch(id).catch(() => null);
  return channel ? channel.toString() : t('logging.missing_channel', { id }, target);
}

function countEnabledCategories(enabledEvents, auditEnabled) {
  const enabled = DASHBOARD_CATEGORIES.filter((key) =>
    getCategoryStatus(enabledEvents, key, auditEnabled),
  ).length;
  return { enabled, total: DASHBOARD_CATEGORIES.length };
}

export async function buildLoggingDashboardView(interaction, client) {
  const guildConfig = await getGuildConfig(client, interaction.guildId);
  const loggingStatus = await getLoggingStatus(client, interaction.guildId);

  const auditEnabled = Boolean(loggingStatus.enabled);
  const channels = loggingStatus.channels || {};

  const auditChannel = await formatChannelMention(interaction.guild, channels.audit, interaction);
  const applicationsChannel = await formatChannelMention(interaction.guild, channels.applications, interaction);
  const reportsChannel = await formatChannelMention(interaction.guild, channels.reports, interaction);
  const lifecycleChannel = await formatChannelMention(interaction.guild, guildConfig.ticketLogsChannelId, interaction);
  const transcriptChannel = await formatChannelMention(interaction.guild, guildConfig.ticketTranscriptChannelId, interaction);

  const ignore = loggingStatus.ignore || { users: [], channels: [] };
  const { enabled: enabledCount, total } = countEnabledCategories(loggingStatus.enabledEvents, auditEnabled);

  const embed = new EmbedBuilder()
    .setTitle(t('logging.dash_title', {}, interaction))
    .setDescription(t('logging.dash_desc', { server: interaction.guild.name }, interaction))
    .setColor(auditEnabled ? getColor('success') : getColor('warning'))
    .addFields(
      {
        name: t('logging.status_field', {}, interaction),
        value: auditEnabled ? t('logging.status_enabled', {}, interaction) : t('logging.status_disabled', {}, interaction),
        inline: true,
      },
      {
        name: t('logging.categories_field', {}, interaction),
        value: auditEnabled
          ? t('logging.categories_summary', { enabled: enabledCount, total }, interaction)
          : t('logging.categories_disabled', {}, interaction),
        inline: true,
      },
      {
        name: t('logging.filters_field', {}, interaction),
        value: t('logging.filters_summary', { users: ignore.users?.length || 0, channels: ignore.channels?.length || 0 }, interaction),
        inline: true,
      },
      {
        name: t('logging.channels_field', {}, interaction),
        value: t('logging.channels_val', { audit: auditChannel, apps: applicationsChannel, reports: reportsChannel }, interaction),
        inline: false,
      },
      {
        name: t('logging.ticket_channels_field', {}, interaction),
        value: t('logging.ticket_channels_val', { logs: lifecycleChannel, transcripts: transcriptChannel }, interaction),
        inline: false,
      },
    )
    .setFooter({ text: t('logging.dash_footer', {}, interaction) })
    .setTimestamp();

  const components = createLoggingDashboardComponents(loggingStatus.enabledEvents, auditEnabled, interaction);
  return { embed, components };
}

export async function buildLoggingCategoriesView(interaction, client) {
  const loggingStatus = await getLoggingStatus(client, interaction.guildId);
  const auditEnabled = Boolean(loggingStatus.enabled);

  const categoryLines = DASHBOARD_CATEGORIES.map((key) => {
    const on = getCategoryStatus(loggingStatus.enabledEvents, key, auditEnabled);
    const labelKey = `logging.cat_${key}`;
    const label = t(labelKey, {}, interaction) || DASHBOARD_CATEGORY_LABELS[key] || key;
    return `${on ? '✅' : '❌'} ${label}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(t('logging.categories_title', {}, interaction))
    .setDescription(
      auditEnabled
        ? t('logging.categories_desc_on', {}, interaction)
        : t('logging.categories_desc_off', {}, interaction),
    )
    .setColor(getColor('info'))
    .addFields({ name: t('logging.categories_status_field', {}, interaction), value: categoryLines, inline: false })
    .setFooter({ text: t('logging.categories_footer', {}, interaction) })
    .setTimestamp();

  const components = createLoggingCategoryViewComponents(loggingStatus.enabledEvents, auditEnabled, interaction);
  return { embed, components };
}

export async function buildLoggingFilterView(interaction, client) {
  const loggingStatus = await getLoggingStatus(client, interaction.guildId);
  const ignore = loggingStatus.ignore || { users: [], channels: [] };

  const userLines = (ignore.users || []).length
    ? ignore.users.map((id) => `• User \`${id}\``).join('\n')
    : t('logging.filters_no_users', {}, interaction);

  const channelLines = (ignore.channels || []).length
    ? ignore.channels.map((id) => `• Channel \`${id}\``).join('\n')
    : t('logging.filters_no_channels', {}, interaction);

  const embed = new EmbedBuilder()
    .setTitle(t('logging.filters_title', {}, interaction))
    .setDescription(t('logging.filters_desc', {}, interaction))
    .setColor(getColor('info'))
    .addFields(
      { name: t('logging.filters_ignored_users', {}, interaction), value: userLines.slice(0, 1024), inline: false },
      { name: t('logging.filters_ignored_channels', {}, interaction), value: channelLines.slice(0, 1024), inline: false },
    )
    .setFooter({ text: t('logging.filters_footer', {}, interaction) })
    .setTimestamp();

  const components = createLoggingFilterComponents(interaction);
  return { embed, components };
}

export function isCategoriesView(interaction) {
  const title = interaction.message?.embeds?.[0]?.title || '';
  return title.includes('📋') || title === 'Event Categories';
}

export function isFilterView(interaction) {
  const title = interaction.message?.embeds?.[0]?.title || '';
  return title.includes('🔇') || title === 'Log Ignore Filters';
}

export async function refreshDashboardMessage(interaction, client) {
  let view;
  if (isCategoriesView(interaction)) {
    view = await buildLoggingCategoriesView(interaction, client);
  } else if (isFilterView(interaction)) {
    view = await buildLoggingFilterView(interaction, client);
  } else {
    view = await buildLoggingDashboardView(interaction, client);
  }

  await interaction.message.edit({
    embeds: [view.embed],
    components: view.components,
    content: null,
  }).catch(() => {});
}

export default {
  prefixOnly: false,
  async execute(interaction, config, client) {
    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: t('logging.err_manage_guild', {}, interaction) });
      }

      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      const { embed, components } = await buildLoggingDashboardView(interaction, client);
      await InteractionHelper.safeEditReply(interaction, { embeds: [embed], components });
    } catch (error) {
      logger.error('logging_dashboard error:', error);
      await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('logging.err_load_dashboard', {}, interaction) });
    }
  },
};
