// tests/unit/i18n.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    t,
    normalizeLocale,
    resolveLocale,
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    localizeSlashCommand,
} from '../../src/utils/i18n/index.js';
import { GUILD_CONFIG_DEFAULTS } from '../../src/config/guild/guildConfigDefaults.js';
import { normalizeGuildConfig } from '../../src/utils/schemas.js';
import helpCommand from '../../src/commands/Core/help.js';
import languageCommand from '../../src/commands/Core/language.js';

test('i18n: Locale Normalization', async (tContext) => {
    await tContext.test('returns exact supported locales', () => {
        assert.equal(normalizeLocale('en-US'), 'en-US');
        assert.equal(normalizeLocale('es-419'), 'es-419');
        assert.equal(normalizeLocale('de'), 'de');
    });

    await tContext.test('maps regional Spanish variants to es-419', () => {
        assert.equal(normalizeLocale('es-ES'), 'es-419');
        assert.equal(normalizeLocale('es'), 'es-419');
        assert.equal(normalizeLocale('es-MX'), 'es-419');
    });

    await tContext.test('maps English variants to en-US', () => {
        assert.equal(normalizeLocale('en-GB'), 'en-US');
        assert.equal(normalizeLocale('en'), 'en-US');
    });

    await tContext.test('maps German variants to de', () => {
        assert.equal(normalizeLocale('de-DE'), 'de');
        assert.equal(normalizeLocale('de-AT'), 'de');
    });

    await tContext.test('falls back to en-US for unsupported locales', () => {
        assert.equal(normalizeLocale('ja'), 'en-US');
        assert.equal(normalizeLocale('fr'), 'en-US');
        assert.equal(normalizeLocale(null), 'en-US');
        assert.equal(normalizeLocale(undefined), 'en-US');
        assert.equal(normalizeLocale(''), 'en-US');
    });
});

test('i18n: Contextual Resolution', async (tContext) => {
    await tContext.test('resolves based on user interaction locale in auto mode', () => {
        const interaction = { locale: 'es-419' };
        assert.equal(resolveLocale(interaction), 'es-419');

        const interactionSpain = { locale: 'es-ES' };
        assert.equal(resolveLocale(interactionSpain), 'es-419');

        const interactionGerman = { locale: 'de' };
        assert.equal(resolveLocale(interactionGerman), 'de');
    });

    await tContext.test('respects forced guild locale over user interaction locale', () => {
        const interaction = { locale: 'es-419' };
        const forcedConfig = { locale: 'de' };
        assert.equal(resolveLocale(interaction, forcedConfig), 'de');

        const autoConfig = { locale: 'auto' };
        assert.equal(resolveLocale(interaction, autoConfig), 'es-419');
    });

    await tContext.test('resolves for guild preferredLocale in auto mode', () => {
        const guild = { preferredLocale: 'de' };
        assert.equal(resolveLocale(guild), 'de');
    });
});

test('i18n: Translation and Interpolation', async (tContext) => {
    await tContext.test('translates strings correctly for each language', () => {
        const enTitle = t('core.help.title', { botName: 'TitanBot' }, 'en-US');
        assert.equal(enTitle, '📖 TitanBot Help');

        const esTitle = t('core.help.title', { botName: 'TitanBot' }, 'es-419');
        assert.equal(esTitle, '📖 Ayuda de TitanBot');

        const deTitle = t('core.help.title', { botName: 'TitanBot' }, 'de');
        assert.equal(deTitle, '📖 TitanBot Hilfe');
    });

    await tContext.test('falls back to en-US when key is missing in another language', () => {
        // If a key only exists in en-US, it falls back seamlessly
        const fallbackValue = t('core.help.title', { botName: 'TestBot' }, 'non-existent-locale');
        assert.equal(fallbackValue, '📖 TestBot Help');
    });

    await tContext.test('replaces variable placeholders properly without errors on null/undefined', () => {
        const result = t('core.language.view_desc', { server: 'StreamerHQ' }, 'es-419');
        assert.match(result, /StreamerHQ/);

        const safeEmpty = t('core.language.view_desc', { server: null }, 'es-419');
        assert.ok(typeof safeEmpty === 'string');
    });

    await tContext.test('returns raw key if translation does not exist at all', () => {
        const unknownKey = 'non.existent.path.key';
        assert.equal(t(unknownKey, {}, 'es-419'), unknownKey);
    });
});

test('i18n: Slash Command Localizations', async (tContext) => {
    await tContext.test('/help has name and description localizations', () => {
        const json = helpCommand.data.toJSON();
        assert.equal(json.name, 'help');
        assert.deepEqual(json.name_localizations, {
            'es-419': 'ayuda',
            'de': 'hilfe',
        });
        assert.ok(json.description_localizations['es-419']);
        assert.ok(json.description_localizations['de']);
    });

    await tContext.test('/language has subcommand and option localizations', () => {
        const json = languageCommand.data.toJSON();
        assert.equal(json.name, 'language');
        assert.deepEqual(json.name_localizations, {
            'es-419': 'idioma',
            'de': 'sprache',
        });

        // Subcommands check
        const viewSub = json.options.find(opt => opt.name === 'view');
        assert.ok(viewSub);
        assert.deepEqual(viewSub.name_localizations, {
            'es-419': 'ver',
            'de': 'anzeigen',
        });

        const setSub = json.options.find(opt => opt.name === 'set');
        assert.ok(setSub);
        assert.deepEqual(setSub.name_localizations, {
            'es-419': 'establecer',
            'de': 'einstellen',
        });
    });
});

test('i18n: Guild Config Schema & Persistence', async (tContext) => {
    await tContext.test('default guild config includes locale: auto', () => {
        assert.equal(GUILD_CONFIG_DEFAULTS.locale, 'auto');
    });

    await tContext.test('normalizeGuildConfig accepts valid locales', () => {
        const configEs = normalizeGuildConfig({ locale: 'es-419' });
        assert.equal(configEs.locale, 'es-419');

        const configDe = normalizeGuildConfig({ locale: 'de' });
        assert.equal(configDe.locale, 'de');

        const configAuto = normalizeGuildConfig({});
        assert.equal(configAuto.locale, 'auto');
    });
});
