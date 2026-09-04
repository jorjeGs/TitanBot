import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { createEmbed } from '../../../utils/embeds.js';
import {
  getCommandAccessSnapshot,
  disableCategory,
  enableCategory,
  disableCommand,
  enableCommand,
  resetCategoryCommands,
} from '../../../services/commandAccessService.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { t } from '../../../utils/i18n/index.js';

export const DASHBOARD_CATEGORY_SELECT = 'cmdaccess_category';
export const DASHBOARD_COMMAND_SELECT = 'cmdaccess_command';
export const DASHBOARD_TOGGLE_CATEGORY = 'cmdaccess_toggle_category';
export const DASHBOARD_ENABLE_ALL = 'cmdaccess_enable_all';
export const DASHBOARD_DISABLE_ALL = 'cmdaccess_disable_all';
export const DASHBOARD_RESET_COMMANDS = 'cmdaccess_reset_commands';
export const DASHBOARD_REFRESH = 'cmdaccess_refresh';
export const DASHBOARD_HOME = 'cmdaccess_home';

const STATUS = {
  enabled: '🟢',
  partial: '🟡',
  disabled: '🔴',
};

function customId(base, guildId, suffix = '') {
  return suffix ? `${base}:${guildId}:${suffix}` : `${base}:${guildId}`;
}

function getCategoryStatus(category) {
  if (category.categoryDisabled) {
    return STATUS.disabled;
  }
  if (category.disabledCount === 0) {
    return STATUS.enabled;
  }
  return STATUS.partial;
}

function formatCommandLabel(command) {
  if (command.isSubcommand) {
    return `\`${command.name.replace(/ /g, ' ')}\``;
  }
  return `\`${command.name}\``;
}

function chunkLines(lines, maxLength = 980) {
  const chunks = [];
  let current = '';

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function buildOverviewEmbed(snapshot, guild, target = null) {
  const fullyEnabled = snapshot.categories.filter((c) => !c.categoryDisabled && c.disabledCount === 0).length;
  const partial = snapshot.categories.filter((c) => !c.categoryDisabled && c.disabledCount > 0).length;
  const disabled = snapshot.categories.filter((c) => c.categoryDisabled).length;

  const categoryLines = snapshot.categories.map((category) => {
    const icon = getCategoryStatus(category);
    const subcommandNote = category.commands.some((c) => c.isSubcommand) ? ' · incl. subcommands' : '';
    return `${icon} ${category.icon} **${category.displayName}** — ${category.enabledCount}/${category.totalCount}${subcommandNote}`;
  });

  const fields = [
    {
      name: t('core.commands_dashboard.summary_title', {}, target),
      value: [
        t('core.commands_dashboard.summary_entries', { enabled: snapshot.enabledTotal, total: snapshot.totalCommands }, target),
        t('core.commands_dashboard.summary_status', { on: STATUS.enabled, fullyEnabled, partial, off: STATUS.disabled, disabled }, target),
      ].join('\n'),
      inline: false,
    },
    {
      name: t('core.commands_dashboard.legend_title', {}, target),
      value: t('core.commands_dashboard.legend_text', { on: STATUS.enabled, partial: STATUS.partial, off: STATUS.disabled }, target),
      inline: false,
    },
  ];

  const chunks = chunkLines(categoryLines);
  chunks.forEach((chunk, index) => {
    fields.push({
      name: index === 0 ? t('core.commands_dashboard.categories_title', {}, target) : t('core.commands_dashboard.categories_cont', {}, target),
      value: chunk,
      inline: false,
    });
  });

  fields.push({
    name: t('core.commands_dashboard.how_to_use_title', {}, target),
    value: t('core.commands_dashboard.how_to_use_overview', {}, target),
  });

  return createEmbed({
    title: t('core.commands_dashboard.title', {}, target),
    description: t('core.commands_dashboard.description', { server: guild.name }, target),
    color: 'info',
    fields,
    footer: t('core.commands_dashboard.footer', {}, target),
  });
}

export function buildCategoryEmbed(category, guild, target = null) {
  const statusIcon = getCategoryStatus(category);
  const statusText = category.categoryDisabled
    ? t('core.commands_dashboard.status_disabled', {}, target)
    : category.disabledCount === 0
      ? t('core.commands_dashboard.status_all_enabled', {}, target)
      : t('core.commands_dashboard.status_partial', { disabledCount: category.disabledCount, totalCount: category.totalCount }, target);

  const commandLines = category.commands.map((command) => {
    const enabled = category.enabledCommands.includes(command.name);
    const icon = enabled ? STATUS.enabled : STATUS.disabled;
    const lock = command.protected ? ' 🔒' : '';
    return `${icon} ${formatCommandLabel(command)}${lock}`;
  });

  const fields = [
    {
      name: `${statusIcon} ${t('core.commands_dashboard.status_label', {}, target)}`,
      value: statusText,
      inline: true,
    },
    {
      name: `📈 ${t('core.commands_dashboard.count_label', {}, target)}`,
      value: t('core.commands_dashboard.count_enabled', { enabledCount: category.enabledCount, totalCount: category.totalCount }, target),
      inline: true,
    },
  ];

  const chunks = chunkLines(commandLines);
  chunks.forEach((chunk, index) => {
    fields.push({
      name: index === 0 ? t('core.commands_dashboard.commands_field_title', {}, target) : t('core.commands_dashboard.commands_field_cont', {}, target),
      value: chunk,
      inline: false,
    });
  });

  fields.push({
    name: t('core.commands_dashboard.how_to_use_title', {}, target),
    value: t('core.commands_dashboard.how_to_use_category', {}, target),
  });

  return createEmbed({
    title: `${category.icon} ${category.displayName}`,
    description: t('core.commands_dashboard.category_desc', { server: guild.name }, target),
    color: category.categoryDisabled ? 'error' : category.disabledCount > 0 ? 'warning' : 'success',
    fields,
    footer: t('core.commands_dashboard.category_footer', {}, target),
  });
}

export function buildOverviewComponents(guildId, snapshot, target = null) {
  const categoryOptions = snapshot.categories.slice(0, 25).map((category) => {
    const status = getCategoryStatus(category);
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${category.displayName}`.slice(0, 100))
      .setDescription(`${status} ${category.enabledCount}/${category.totalCount} enabled`.slice(0, 100))
      .setValue(category.key)
      .setEmoji(category.icon);
  });

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId(DASHBOARD_CATEGORY_SELECT, guildId))
        .setPlaceholder(t('core.commands_dashboard.select_category_placeholder', {}, target))
        .addOptions(categoryOptions),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(customId(DASHBOARD_REFRESH, guildId))
        .setLabel(t('core.commands_dashboard.btn_refresh', {}, target))
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildCategoryComponents(guildId, category, target = null) {
  const toggleableCommands = category.commands.filter((command) => !command.protected);
  const commandOptions = toggleableCommands.slice(0, 25).map((command) => {
    const enabled = category.enabledCommands.includes(command.name);
    const label = command.isSubcommand
      ? command.name.replace(' ', ' · ').slice(0, 100)
      : command.name.slice(0, 100);

    return new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setDescription((enabled ? '🟢 Enabled — click to disable' : '🔴 Disabled — click to enable').slice(0, 100))
      .setValue(command.name);
  });

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(customId(DASHBOARD_HOME, guildId))
        .setLabel(t('core.commands_dashboard.btn_back_overview', {}, target))
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(customId(DASHBOARD_TOGGLE_CATEGORY, guildId, category.key))
        .setLabel(category.categoryDisabled ? t('core.commands_dashboard.btn_enable_all', {}, target) : t('core.commands_dashboard.btn_disable_all', {}, target))
        .setEmoji(category.categoryDisabled ? '🟢' : '🔴')
        .setStyle(category.categoryDisabled ? ButtonStyle.Success : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(customId(DASHBOARD_ENABLE_ALL, guildId, category.key))
        .setLabel(t('core.commands_dashboard.btn_enable_all', {}, target))
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(customId(DASHBOARD_DISABLE_ALL, guildId, category.key))
        .setLabel(t('core.commands_dashboard.btn_disable_all', {}, target))
        .setEmoji('⛔')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(customId(DASHBOARD_RESET_COMMANDS, guildId, category.key))
        .setLabel(t('core.commands_dashboard.btn_clear_overrides', {}, target))
        .setEmoji('🧹')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  if (commandOptions.length > 0) {
    rows.unshift(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(customId(DASHBOARD_COMMAND_SELECT, guildId, category.key))
          .setPlaceholder(t('core.commands_dashboard.select_command_placeholder', {}, target))
          .addOptions(commandOptions),
      ),
    );
  }

  return rows;
}

export async function buildDashboardView(client, guildId, guild, view = 'overview', categoryKey = null, target = null) {
  const config = await getGuildConfig(client, guildId);
  const snapshot = getCommandAccessSnapshot(client, config);

  if (view === 'category' && categoryKey) {
    const category = snapshot.categories.find((entry) => entry.key === categoryKey);
    if (!category) {
      return {
        embed: buildOverviewEmbed(snapshot, guild, target),
        components: buildOverviewComponents(guildId, snapshot, target),
      };
    }

    return {
      embed: buildCategoryEmbed(category, guild, target),
      components: buildCategoryComponents(guildId, category, target),
      categoryKey,
    };
  }

  return {
    embed: buildOverviewEmbed(snapshot, guild, target),
    components: buildOverviewComponents(guildId, snapshot, target),
  };
}

export async function handleDashboardComponent(interaction, client) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const guildId = parts[1];
  const suffix = parts[2] || null;

  if (guildId !== interaction.guildId) {
    return interaction.reply({
      content: 'This dashboard belongs to another server.',
      ephemeral: true,
    });
  }

  if (action === DASHBOARD_COMMAND_SELECT) {
    const categoryKey = suffix;
    const commandName = interaction.values[0];
    const config = await getGuildConfig(client, guildId);
    const snapshot = getCommandAccessSnapshot(client, config);
    const category = snapshot.categories.find((entry) => entry.key === categoryKey);
    const enabled = category?.enabledCommands.includes(commandName);

    if (enabled) {
      await disableCommand(client, guildId, commandName);
    } else {
      await enableCommand(client, guildId, commandName);
    }

    const view = await buildDashboardView(client, guildId, interaction.guild, 'category', categoryKey, interaction);
    return interaction.update({ embeds: [view.embed], components: view.components });
  }

  if (action === DASHBOARD_CATEGORY_SELECT) {
    const categoryKey = interaction.values[0];
    const view = await buildDashboardView(client, guildId, interaction.guild, 'category', categoryKey, interaction);
    return interaction.update({ embeds: [view.embed], components: view.components });
  }

  await interaction.deferUpdate();

  if (action === DASHBOARD_REFRESH || action === DASHBOARD_HOME) {
    const view = await buildDashboardView(client, guildId, interaction.guild, 'overview', null, interaction);
    return interaction.editReply({ embeds: [view.embed], components: view.components });
  }

  if (action === DASHBOARD_TOGGLE_CATEGORY) {
    const categoryKey = suffix;
    const config = await getGuildConfig(client, guildId);
    const snapshot = getCommandAccessSnapshot(client, config);
    const category = snapshot.categories.find((entry) => entry.key === categoryKey);

    if (category?.categoryDisabled) {
      await enableCategory(client, guildId, categoryKey);
    } else {
      await disableCategory(client, guildId, categoryKey);
    }

    const view = await buildDashboardView(client, guildId, interaction.guild, 'category', categoryKey, interaction);
    return interaction.editReply({ embeds: [view.embed], components: view.components });
  }

  if (action === DASHBOARD_ENABLE_ALL) {
    await enableCategory(client, guildId, suffix);
    await resetCategoryCommands(client, guildId, suffix);
    const view = await buildDashboardView(client, guildId, interaction.guild, 'category', suffix, interaction);
    return interaction.editReply({ embeds: [view.embed], components: view.components });
  }

  if (action === DASHBOARD_DISABLE_ALL) {
    await disableCategory(client, guildId, suffix);
    const view = await buildDashboardView(client, guildId, interaction.guild, 'category', suffix, interaction);
    return interaction.editReply({ embeds: [view.embed], components: view.components });
  }

  if (action === DASHBOARD_RESET_COMMANDS) {
    await enableCategory(client, guildId, suffix);
    await resetCategoryCommands(client, guildId, suffix);
    const view = await buildDashboardView(client, guildId, interaction.guild, 'category', suffix, interaction);
    return interaction.editReply({ embeds: [view.embed], components: view.components });
  }

  return interaction.editReply({ content: t('core.commands_dashboard.dashboard_failed', {}, interaction), embeds: [], components: [] });
}

export function isCommandAccessCustomId(customIdValue) {
  return customIdValue.startsWith('cmdaccess_');
}

export function createDashboardCollectorFilter(userId, guildId) {
  return (componentInteraction) =>
    componentInteraction.user.id === userId &&
    componentInteraction.customId.includes(`:${guildId}`);
}
