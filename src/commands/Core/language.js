// src/commands/Core/language.js
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildLocale, setGuildLocale } from '../../services/config/guildConfig.js';
import {
    t,
    resolveLocale,
    localizeSlashCommand,
    localizeSubcommand,
    localizeOption,
} from '../../utils/i18n/index.js';

const LOCALE_CHOICES = [
    { name: '🌐 Auto (Discord)', value: 'auto' },
    { name: '🇺🇸 English (US)', value: 'en-US' },
    { name: '🇨🇴 Español (Latinoamérica)', value: 'es-419' },
    { name: '🇩🇪 Deutsch', value: 'de' },
];

const commandBuilder = new SlashCommandBuilder()
    .setName('language')
    .setDescription('View or configure the bot server language')
    .addSubcommand((subcommand) => {
        subcommand
            .setName('view')
            .setDescription('View current language configuration for this server');
        localizeSubcommand(subcommand, 'language', 'view');
        return subcommand;
    })
    .addSubcommand((subcommand) => {
        subcommand
            .setName('set')
            .setDescription('Set the server language')
            .addStringOption((option) => {
                option
                    .setName('locale')
                    .setDescription('Choose the server language')
                    .setRequired(true)
                    .addChoices(...LOCALE_CHOICES);
                localizeOption(option, 'language', 'locale', 'set');
                return option;
            });
        localizeSubcommand(subcommand, 'language', 'set');
        return subcommand;
    });

localizeSlashCommand(commandBuilder, 'language');

export default {
    data: commandBuilder,
    slashOnly: true,

    async execute(interaction, guildConfig, client) {
        try {
            await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'view') {
                const currentConfigLocale = await getGuildLocale(client, interaction.guildId);
                const effectiveUserLocale = resolveLocale(interaction, guildConfig);

                const embed = createEmbed({
                    title: t('core.language.view_title', {}, interaction, guildConfig),
                    description: t(
                        'core.language.view_desc',
                        { server: interaction.guild?.name || 'Server' },
                        interaction,
                        guildConfig
                    ),
                    color: 'primary',
                    fields: [
                        {
                            name: `⚙️ ${t('core.language.configured_label', {}, interaction, guildConfig)}`,
                            value: currentConfigLocale === 'auto'
                                ? `🌐 ${t('core.language.auto_desc', {}, interaction, guildConfig)}`
                                : `\`${currentConfigLocale}\``,
                            inline: true,
                        },
                        {
                            name: `👤 ${t('core.language.effective_label', {}, interaction, guildConfig)}`,
                            value: `\`${effectiveUserLocale}\``,
                            inline: true,
                        },
                    ],
                });

                return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            }

            if (subcommand === 'set') {
                if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                    return replyUserError(interaction, {
                        type: ErrorTypes.PERMISSION,
                        message: t('common.errors.manage_guild', {}, interaction, guildConfig),
                    });
                }

                const chosenLocale = interaction.options.getString('locale');
                const validLocales = ['auto', 'en-US', 'es-419', 'de'];

                if (!validLocales.includes(chosenLocale)) {
                    return replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message: t('core.language.invalid_locale', {}, interaction, guildConfig),
                    });
                }

                await setGuildLocale(client, interaction.guildId, chosenLocale);

                const embed = createEmbed({
                    title: t('core.language.view_title', {}, interaction, { locale: chosenLocale }),
                    description: t(
                        'core.language.set_success',
                        { locale: chosenLocale },
                        interaction,
                        { locale: chosenLocale }
                    ),
                    color: 'success',
                });

                return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            }
        } catch (error) {
            return replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: t('common.errors.unknown', {}, interaction, guildConfig),
            });
        }
    },
};
