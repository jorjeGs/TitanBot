// src/utils/i18n/commandLocalizer.js
import { getCatalog, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './loader.js';

/**
 * Applies name and description localizations to a SlashCommandBuilder or SubcommandBuilder.
 * @param {object} builder - Discord.js SlashCommandBuilder or SlashCommandSubcommandBuilder
 * @param {string} commandKey - Key in commands.json (e.g. 'help', 'language')
 * @returns {object} The modified builder
 */
export function localizeSlashCommand(builder, commandKey) {
    if (!builder || typeof builder.setNameLocalizations !== 'function') {
        return builder;
    }

    const nameLocalizations = {};
    const descriptionLocalizations = {};

    for (const locale of SUPPORTED_LOCALES) {
        if (locale === DEFAULT_LOCALE) continue; // Base name and description are already in English

        const catalog = getCatalog(locale, 'commands');
        const entry = catalog?.[commandKey];

        if (entry) {
            if (entry.name && typeof entry.name === 'string') {
                nameLocalizations[locale] = entry.name.toLowerCase();
            }
            if (entry.description && typeof entry.description === 'string') {
                descriptionLocalizations[locale] = entry.description.slice(0, 100);
            }
        }
    }

    if (Object.keys(nameLocalizations).length > 0) {
        builder.setNameLocalizations(nameLocalizations);
    }
    if (Object.keys(descriptionLocalizations).length > 0) {
        builder.setDescriptionLocalizations(descriptionLocalizations);
    }

    return builder;
}

/**
 * Applies localizations to a subcommand.
 * @param {object} subcommandBuilder - SlashCommandSubcommandBuilder
 * @param {string} parentCommandKey - Key in commands.json of the parent command (e.g. 'language')
 * @param {string} subcommandKey - Key in commands.json (e.g. 'view', 'set')
 * @returns {object}
 */
export function localizeSubcommand(subcommandBuilder, parentCommandKey, subcommandKey) {
    if (!subcommandBuilder || typeof subcommandBuilder.setNameLocalizations !== 'function') {
        return subcommandBuilder;
    }

    const nameLocalizations = {};
    const descriptionLocalizations = {};

    for (const locale of SUPPORTED_LOCALES) {
        if (locale === DEFAULT_LOCALE) continue;

        const catalog = getCatalog(locale, 'commands');
        const entry = catalog?.[parentCommandKey]?.subcommands?.[subcommandKey];

        if (entry) {
            if (entry.name && typeof entry.name === 'string') {
                nameLocalizations[locale] = entry.name.toLowerCase();
            }
            if (entry.description && typeof entry.description === 'string') {
                descriptionLocalizations[locale] = entry.description.slice(0, 100);
            }
        }
    }

    if (Object.keys(nameLocalizations).length > 0) {
        subcommandBuilder.setNameLocalizations(nameLocalizations);
    }
    if (Object.keys(descriptionLocalizations).length > 0) {
        subcommandBuilder.setDescriptionLocalizations(descriptionLocalizations);
    }

    return subcommandBuilder;
}

/**
 * Applies localizations to an option.
 * @param {object} optionBuilder - Option builder (e.g. StringOptionBuilder)
 * @param {string} parentCommandKey - Key of the parent command
 * @param {string} optionKey - Key of the option
 * @param {string|null} subcommandKey - Optional subcommand key if option belongs to a subcommand
 * @returns {object}
 */
export function localizeOption(optionBuilder, parentCommandKey, optionKey, subcommandKey = null) {
    if (!optionBuilder || typeof optionBuilder.setNameLocalizations !== 'function') {
        return optionBuilder;
    }

    const nameLocalizations = {};
    const descriptionLocalizations = {};

    for (const locale of SUPPORTED_LOCALES) {
        if (locale === DEFAULT_LOCALE) continue;

        const catalog = getCatalog(locale, 'commands');
        const entry = subcommandKey
            ? catalog?.[parentCommandKey]?.subcommands?.[subcommandKey]?.options?.[optionKey]
            : catalog?.[parentCommandKey]?.options?.[optionKey];

        if (entry) {
            if (entry.name && typeof entry.name === 'string') {
                nameLocalizations[locale] = entry.name.toLowerCase();
            }
            if (entry.description && typeof entry.description === 'string') {
                descriptionLocalizations[locale] = entry.description.slice(0, 100);
            }
        }
    }

    if (Object.keys(nameLocalizations).length > 0) {
        optionBuilder.setNameLocalizations(nameLocalizations);
    }
    if (Object.keys(descriptionLocalizations).length > 0) {
        optionBuilder.setDescriptionLocalizations(descriptionLocalizations);
    }

    return optionBuilder;
}
