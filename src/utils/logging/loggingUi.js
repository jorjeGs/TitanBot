// loggingUi.js

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { EVENT_TYPES } from '../../services/loggingService.js';

const EVENT_TYPES_BY_CATEGORY = Object.values(EVENT_TYPES).reduce((accumulator, eventType) => {
  const [category] = eventType.split('.');
  if (!accumulator[category]) {
    accumulator[category] = [];
  }
  accumulator[category].push(eventType);
  return accumulator;
}, {});

export const DASHBOARD_CATEGORIES = [
  'moderation',
  'message',
  'role',
  'member',
  'leveling',
  'reactionrole',
  'giveaway',
  'counter',
  'application',
  'report',
];

const DASHBOARD_CATEGORY_EMOJIS = {
  moderation: '🔨',
  message: '✉️',
  role: '🏷️',
  member: '👥',
  leveling: '📈',
  reactionrole: '🎭',
  giveaway: '🎁',
  counter: '📊',
  application: '📝',
  report: '🚨',
};

import { t } from '../i18n/index.js';

export const DASHBOARD_CATEGORY_LABELS = {
  moderation: 'Moderation',
  message: 'Messages',
  role: 'Roles',
  member: 'Members',
  leveling: 'Leveling',
  reactionrole: 'Reaction Roles',
  giveaway: 'Giveaways',
  counter: 'Counters',
  application: 'Applications',
  report: 'Reports',
};

function createBackButton(target = null) {
  return new ButtonBuilder()
    .setCustomId('log_dash_back')
    .setLabel(t('logging.btn_back', {}, target))
    .setStyle(ButtonStyle.Secondary);
}

function createCategoryToggleButtons(enabledEvents = {}, loggingEnabled = false, target = null) {
  const buttons = DASHBOARD_CATEGORIES.map((category) => {
    const wildcardDisabled = enabledEvents[`${category}.*`] === false;
    const categoryEvents = EVENT_TYPES_BY_CATEGORY[category] || [];
    const allEnabled = categoryEvents.length === 0
      ? true
      : categoryEvents.every((t) => enabledEvents[t] !== false);
    const isEnabled = loggingEnabled && !wildcardDisabled && allEnabled;
    const emoji = DASHBOARD_CATEGORY_EMOJIS[category] || '📌';
    const label = t(`logging.cat_${category}`, {}, target) || DASHBOARD_CATEGORY_LABELS[category] || category;

    return new ButtonBuilder()
      .setCustomId(`log_dash_toggle:${category}.*`)
      .setLabel(`${emoji} ${label}`)
      .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Danger);
  });

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

export function createLoggingMainMenuSelect(target = null) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('log_dash_menu')
      .setPlaceholder(t('logging.select_placeholder', {}, target))
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_set_audit_label', {}, target))
          .setDescription(t('logging.opt_set_audit_desc', {}, target))
          .setValue('set:audit')
          .setEmoji('🧾'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_set_apps_label', {}, target))
          .setDescription(t('logging.opt_set_apps_desc', {}, target))
          .setValue('set:applications')
          .setEmoji('📝'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_set_reports_label', {}, target))
          .setDescription(t('logging.opt_set_reports_desc', {}, target))
          .setValue('set:reports')
          .setEmoji('🚨'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_clear_audit', {}, target))
          .setValue('clear:audit')
          .setEmoji('🗑️'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_clear_apps', {}, target))
          .setValue('clear:applications')
          .setEmoji('🗑️'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_clear_reports', {}, target))
          .setValue('clear:reports')
          .setEmoji('🗑️'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_view_categories_label', {}, target))
          .setDescription(t('logging.opt_view_categories_desc', {}, target))
          .setValue('view:categories')
          .setEmoji('📋'),
        new StringSelectMenuOptionBuilder()
          .setLabel(t('logging.opt_view_filters_label', {}, target))
          .setDescription(t('logging.opt_view_filters_desc', {}, target))
          .setValue('view:filters')
          .setEmoji('🔇'),
      ),
  );
}

export function createLoggingMainActionRow(loggingEnabled = false, target = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('log_dash_toggle:audit_enabled')
      .setLabel(t('logging.btn_audit_logging', {}, target))
      .setStyle(loggingEnabled ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('log_dash_refresh')
      .setLabel(t('logging.btn_refresh', {}, target))
      .setStyle(ButtonStyle.Primary),
  );
}

export function createLoggingDashboardComponents(_enabledEvents, loggingEnabled = false, target = null) {
  return [
    createLoggingMainMenuSelect(target),
    createLoggingMainActionRow(loggingEnabled, target),
  ];
}

export function createLoggingCategoryViewComponents(enabledEvents, loggingEnabled = false, target = null) {
  const categoryRows = createCategoryToggleButtons(enabledEvents, loggingEnabled, target);

  const actionRow = new ActionRowBuilder().addComponents(
    createBackButton(target),
    new ButtonBuilder()
      .setCustomId('log_dash_toggle:all')
      .setLabel(t('logging.btn_toggle_all', {}, target))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('log_dash_refresh')
      .setLabel(t('logging.btn_refresh', {}, target))
      .setStyle(ButtonStyle.Primary),
  );

  return [...categoryRows, actionRow];
}

export function createLoggingFilterComponents(target = null) {
  return [
    new ActionRowBuilder().addComponents(
      createBackButton(target),
      new ButtonBuilder()
        .setCustomId('log_dash_add_filter:user')
        .setLabel(t('logging.btn_add_user_filter', {}, target))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('log_dash_add_filter:channel')
        .setLabel(t('logging.btn_add_channel_filter', {}, target))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('log_dash_remove_filter')
        .setLabel(t('logging.btn_remove_filter', {}, target))
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

export { EVENT_TYPES_BY_CATEGORY };
