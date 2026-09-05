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
import pingCommand from '../../src/commands/Core/ping.js';
import uptimeCommand from '../../src/commands/Core/uptime.js';
import supportCommand from '../../src/commands/Core/support.js';
import statsCommand from '../../src/commands/Core/stats.js';
import commandsCommand from '../../src/commands/Core/commands.js';

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

        // Core ping, uptime, stats, commands translations
        assert.equal(t('core.ping.pong', {}, 'es-419'), '¡Pong!');
        assert.equal(t('core.uptime.title', {}, 'es-419'), 'Tiempo de Actividad del Sistema');
        assert.equal(t('core.support.join_button', {}, 'es-419'), 'Unirse al Servidor de Soporte');
        assert.equal(t('core.stats.servers', {}, 'es-419'), 'Servidores');
        assert.equal(t('core.commands.category_disabled_title', {}, 'de'), 'Kategorie deaktiviert');
        assert.equal(t('core.commands_dashboard.title', {}, 'de'), '⚙️ Befehlszugriff');

        // Moderation translations
        assert.equal(t('moderation.ban.success_title', { user: 'BadUser#0001' }, 'es-419'), '🚫 **Baneado** BadUser#0001');
        assert.equal(t('moderation.ban.success_title', { user: 'BadUser#0001' }, 'de'), '🚫 **Gebannt** BadUser#0001');
        assert.equal(t('moderation.unban.success_title', {}, 'es-419'), '✅ Usuario desbaneado');
        assert.equal(t('moderation.unban.success_title', {}, 'de'), '✅ Benutzer entbannt');
        assert.equal(t('moderation.lock.success_title', {}, 'es-419'), '🔒 **Canal bloqueado**');
        assert.equal(t('moderation.lock.success_title', {}, 'de'), '🔒 **Kanal gesperrt**');
        assert.equal(t('moderation.warnings.btn_delete_specific', {}, 'es-419'), 'Eliminar advertencia específica');
        assert.equal(t('moderation.warnings.btn_delete_specific', {}, 'de'), 'Spezifische Verwarnung löschen');
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

test('i18n: Moderation Commands Localization', async (tContext) => {
    const { default: banCommand } = await import('../../src/commands/Moderation/ban.js');
    const { default: unbanCommand } = await import('../../src/commands/Moderation/unban.js');
    const { default: kickCommand } = await import('../../src/commands/Moderation/kick.js');
    const { default: timeoutCommand } = await import('../../src/commands/Moderation/timeout.js');
    const { default: warnCommand } = await import('../../src/commands/Moderation/warn.js');
    const { default: lockCommand } = await import('../../src/commands/Moderation/lock.js');
    const { default: purgeCommand } = await import('../../src/commands/Moderation/purge.js');
    const { default: usernotesCommand } = await import('../../src/commands/Moderation/usernotes.js');
    const { default: massbanCommand } = await import('../../src/commands/Moderation/massban.js');
    const { default: masskickCommand } = await import('../../src/commands/Moderation/masskick.js');

    await tContext.test('/ban has name and option localizations', () => {
        const json = banCommand.data.toJSON();
        assert.equal(json.name, 'ban');
        assert.deepEqual(json.name_localizations, { 'es-419': 'ban', 'de': 'bannen' });
        const targetOpt = json.options.find(o => o.name === 'target');
        assert.ok(targetOpt);
        assert.deepEqual(targetOpt.name_localizations, { 'es-419': 'usuario', 'de': 'benutzer' });
    });

    await tContext.test('/unban has name and option localizations', () => {
        const json = unbanCommand.data.toJSON();
        assert.equal(json.name, 'unban');
        assert.deepEqual(json.name_localizations, { 'es-419': 'desbanear', 'de': 'entbannen' });
    });

    await tContext.test('/kick and /timeout have localized names and options', () => {
        const kickJson = kickCommand.data.toJSON();
        assert.equal(kickJson.name, 'kick');
        assert.deepEqual(kickJson.name_localizations, { 'es-419': 'expulsar', 'de': 'kicken' });

        const timeoutJson = timeoutCommand.data.toJSON();
        assert.equal(timeoutJson.name, 'timeout');
        assert.deepEqual(timeoutJson.name_localizations, { 'es-419': 'aislar', 'de': 'timeout' });
    });

    await tContext.test('/lock and /purge have localized names', () => {
        const lockJson = lockCommand.data.toJSON();
        assert.equal(lockJson.name, 'lock');
        assert.deepEqual(lockJson.name_localizations, { 'es-419': 'bloquear-canal', 'de': 'sperren' });

        const purgeJson = purgeCommand.data.toJSON();
        assert.equal(purgeJson.name, 'purge');
        assert.deepEqual(purgeJson.name_localizations, { 'es-419': 'purgar', 'de': 'bereinigen' });
    });

    await tContext.test('/usernotes has subcommand and option localizations', () => {
        const json = usernotesCommand.data.toJSON();
        assert.equal(json.name, 'usernotes');
        assert.deepEqual(json.name_localizations, { 'es-419': 'notas', 'de': 'notizen' });

        const addSub = json.options.find(o => o.name === 'add');
        assert.ok(addSub);
        assert.deepEqual(addSub.name_localizations, { 'es-419': 'agregar', 'de': 'hinzufuegen' });

        const targetOpt = addSub.options.find(o => o.name === 'target');
        assert.ok(targetOpt);
        assert.deepEqual(targetOpt.name_localizations, { 'es-419': 'usuario', 'de': 'benutzer' });
    });

    await tContext.test('/massban and /masskick have name and option localizations', () => {
        const massbanJson = massbanCommand.data.toJSON();
        assert.equal(massbanJson.name, 'massban');
        assert.deepEqual(massbanJson.name_localizations, { 'es-419': 'baneo-masivo', 'de': 'massenban' });

        const masskickJson = masskickCommand.data.toJSON();
        assert.equal(masskickJson.name, 'masskick');
        assert.deepEqual(masskickJson.name_localizations, { 'es-419': 'expulsion-masiva', 'de': 'massenkick' });
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

    await tContext.test('Core commands (ping, uptime, support, stats, commands) are localized', () => {
        const pingJson = pingCommand.data.toJSON();
        assert.equal(pingJson.name, 'ping');
        assert.deepEqual(pingJson.name_localizations, { 'es-419': 'ping', 'de': 'ping' });

        const uptimeJson = uptimeCommand.data.toJSON();
        assert.equal(uptimeJson.name, 'uptime');
        assert.deepEqual(uptimeJson.name_localizations, { 'es-419': 'actividad', 'de': 'onlinezeit' });

        const supportJson = supportCommand.data.toJSON();
        assert.equal(supportJson.name, 'support');
        assert.deepEqual(supportJson.name_localizations, { 'es-419': 'soporte', 'de': 'support' });

        const statsJson = statsCommand.data.toJSON();
        assert.equal(statsJson.name, 'stats');
        assert.deepEqual(statsJson.name_localizations, { 'es-419': 'estadisticas', 'de': 'statistiken' });

        const commandsJson = commandsCommand.data.toJSON();
        assert.equal(commandsJson.name, 'commands');
        assert.deepEqual(commandsJson.name_localizations, { 'es-419': 'comandos', 'de': 'befehle' });

        const dashSub = commandsJson.options.find(opt => opt.name === 'dashboard');
        assert.ok(dashSub);
        assert.deepEqual(dashSub.name_localizations, { 'es-419': 'panel', 'de': 'dashboard' });

        const disableSub = commandsJson.options.find(opt => opt.name === 'disable');
        assert.ok(disableSub);
        assert.deepEqual(disableSub.name_localizations, { 'es-419': 'desactivar', 'de': 'deaktivieren' });

        const enableSub = commandsJson.options.find(opt => opt.name === 'enable');
        assert.ok(enableSub);
        assert.deepEqual(enableSub.name_localizations, { 'es-419': 'activar', 'de': 'aktivieren' });
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

test('i18n: Complete 100 Commands & 21 Domains Coverage', async (tContext) => {
    const { loadCatalogs, getCatalog } = await import('../../src/utils/i18n/loader.js');
    const { default: birthdayCommand } = await import('../../src/commands/Birthday/birthday.js');
    const catalogs = loadCatalogs(true);

    await tContext.test('all 3 locales have all 21 domain catalogs loaded', () => {
        const expectedDomains = [
            'birthday', 'commands', 'common', 'community', 'core', 'economy', 'fun',
            'giveaway', 'jointocreate', 'leveling', 'logging', 'moderation', 'music',
            'reactroles', 'search', 'serverstats', 'ticket', 'tools', 'utility',
            'verification', 'welcome'
        ];

        for (const loc of ['en-US', 'es-419', 'de']) {
            assert.ok(catalogs[loc], `Missing locale catalog for ${loc}`);
            for (const domain of expectedDomains) {
                assert.ok(catalogs[loc][domain], `Missing domain ${domain} in ${loc}`);
            }
        }
    });

    await tContext.test('commands.json has exactly 100 commands with valid Discord naming regex in all locales', () => {
        const DISCORD_NAME_REGEX = /^[a-z0-9_-]{1,32}$/;

        for (const loc of ['en-US', 'es-419', 'de']) {
            const cat = getCatalog(loc, 'commands');
            assert.ok(cat, `commands catalog missing for ${loc}`);
            const commandKeys = Object.keys(cat);
            assert.equal(commandKeys.length, 100, `Expected 100 commands in ${loc}, got ${commandKeys.length}`);

            for (const [cKey, cmd] of Object.entries(cat)) {
                assert.ok(DISCORD_NAME_REGEX.test(cmd.name), `Invalid name for command ${cKey} in ${loc}: ${cmd.name}`);
                assert.ok(cmd.description.length <= 100, `Description too long for ${cKey} in ${loc}: ${cmd.description.length}`);

                if (cmd.subcommands) {
                    for (const [sKey, sub] of Object.entries(cmd.subcommands)) {
                        assert.ok(DISCORD_NAME_REGEX.test(sub.name), `Invalid name for subcommand ${cKey}.${sKey} in ${loc}: ${sub.name}`);
                        assert.ok(sub.description.length <= 100, `Description too long for subcommand ${cKey}.${sKey} in ${loc}`);

                        if (sub.options) {
                            for (const [oKey, opt] of Object.entries(sub.options)) {
                                assert.ok(DISCORD_NAME_REGEX.test(opt.name), `Invalid name for option ${cKey}.${sKey}.${oKey} in ${loc}: ${opt.name}`);
                            }
                        }
                    }
                }

                if (cmd.options) {
                    for (const [oKey, opt] of Object.entries(cmd.options)) {
                        assert.ok(DISCORD_NAME_REGEX.test(opt.name), `Invalid name for option ${cKey}.${oKey} in ${loc}: ${opt.name}`);
                    }
                }
            }
        }
    });

    await tContext.test('/birthday command schema is fully localized', () => {
        const json = birthdayCommand.data.toJSON();
        assert.equal(json.name, 'birthday');
        assert.deepEqual(json.name_localizations, { 'es-419': 'cumpleanos', 'de': 'geburtstag' });

        const setSub = json.options.find(o => o.name === 'set');
        assert.ok(setSub);
        assert.deepEqual(setSub.name_localizations, { 'es-419': 'establecer', 'de': 'einstellen' });

        const monthOpt = setSub.options.find(o => o.name === 'month');
        assert.ok(monthOpt);
        assert.deepEqual(monthOpt.name_localizations, { 'es-419': 'mes', 'de': 'monat' });

        const dayOpt = setSub.options.find(o => o.name === 'day');
        assert.ok(dayOpt);
        assert.deepEqual(dayOpt.name_localizations, { 'es-419': 'dia', 'de': 'tag' });
    });

    await tContext.test('birthday months are localized in all supported languages', () => {
        const expectedEs = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const expectedDe = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const expectedEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        for (let i = 1; i <= 12; i++) {
            assert.equal(t(`birthday.months.${i}`, {}, 'es-419'), expectedEs[i - 1]);
            assert.equal(t(`birthday.months.${i}`, {}, 'de'), expectedDe[i - 1]);
            assert.equal(t(`birthday.months.${i}`, {}, 'en-US'), expectedEn[i - 1]);
        }
    });

    await tContext.test('help categories and category commands menu are localized', async () => {
        const { createCategoryCommandsMenu } = await import('../../src/handlers/help/helpSelectMenus.js');

        const esMenu = await createCategoryCommandsMenu('Giveaway', null, 'es-419');
        assert.ok(esMenu.embeds[0].data.title.includes('Sorteos'));
        assert.equal(esMenu.embeds[0].data.fields[0].name, 'Comandos');
        assert.ok(esMenu.embeds[0].data.fields[0].value.includes('Crear un sorteo'));

        const deMenu = await createCategoryCommandsMenu('Giveaway', null, 'de');
        assert.ok(deMenu.embeds[0].data.title.includes('Gewinnspiele'));
        assert.equal(deMenu.embeds[0].data.fields[0].name, 'Befehle');
        assert.ok(deMenu.embeds[0].data.fields[0].value.includes('interaktives Gewinnspiel'));
    });

    await tContext.test('giveaway embeds and buttons are localized in all supported languages', async () => {
        const { createGiveawayEmbed, createGiveawayButtons } = await import('../../src/services/giveawayService.js');
        const dummyGiveaway = {
            prize: 'Nitro',
            hostId: '123456789',
            winnerCount: 1,
            endTime: Date.now() + 60000,
            participants: ['123', '456']
        };

        const esEmbed = createGiveawayEmbed(dummyGiveaway, 'active', [], 'es-419');
        assert.ok(esEmbed.data.description.includes('participar'));
        assert.ok(esEmbed.data.fields.some(f => f.name.includes('Creado por')));
        assert.ok(esEmbed.data.fields.some(f => f.name.includes('Ganadores')));
        assert.ok(esEmbed.data.fields.some(f => f.name.includes('Entradas')));

        const esButtons = createGiveawayButtons(false, 'es-419');
        assert.ok(esButtons.components[0].data.label.includes('Participar'));
        assert.ok(esButtons.components[1].data.label.includes('Finalizar'));

        const deButtons = createGiveawayButtons(false, 'de');
        assert.ok(deButtons.components[0].data.label.includes('Teilnehmen'));
        assert.ok(deButtons.components[1].data.label.includes('Beenden'));
    });

    await tContext.test('ticket controls and strings are localized in all supported languages', async () => {
        const { buildTicketControlRow } = await import('../../src/services/ticket.js');
        
        const esRow = buildTicketControlRow('es-419');
        const esLabels = esRow.components.map(c => c.data.label);
        assert.ok(esLabels.includes('Cerrar'));
        assert.ok(esLabels.includes('Reclamar'));

        const deRow = buildTicketControlRow('de');
        const deLabels = deRow.components.map(c => c.data.label);
        assert.ok(deLabels.includes('Schließen'));
        assert.ok(deLabels.includes('Übernehmen'));

        assert.equal(t('ticket.panel.default_title', {}, 'es-419'), 'Tickets de Soporte');
        assert.equal(t('ticket.panel.default_title', {}, 'de'), 'Support-Tickets');
    });

    await tContext.test('verification strings are localized in all supported languages', () => {
        assert.equal(t('verification.default_button', {}, 'es-419'), 'Verificarme');
        assert.equal(t('verification.default_button', {}, 'de'), 'Verifizieren');
        assert.equal(t('verification.panel_title', {}, 'es-419'), 'Verificación del Servidor');
        assert.equal(t('verification.panel_title', {}, 'de'), 'Server-Verifizierung');
    });

    await tContext.test('reaction roles strings are localized in all supported languages', () => {
        assert.equal(t('reactroles.panel.placeholder', {}, 'es-419'), 'Selecciona tus roles');
        assert.equal(t('reactroles.panel.placeholder', {}, 'de'), 'Wähle deine Rollen');
        assert.equal(t('reactroles.dashboard_title', {}, 'es-419'), 'Panel de Roles por Reacción');
        assert.equal(t('reactroles.dashboard_title', {}, 'de'), 'Reaktionsrollen-Dashboard');
    });

    await tContext.test('jointocreate strings are localized in all supported languages', () => {
        assert.equal(t('jointocreate.config_title', {}, 'es-419'), 'Configuración de Join to Create');
        assert.equal(t('jointocreate.config_title', {}, 'de'), 'Join-to-Create-Konfiguration');
        assert.equal(t('jointocreate.btn_name_template', {}, 'es-419'), '📝 Plantilla de Nombre');
        assert.equal(t('jointocreate.btn_name_template', {}, 'de'), '📝 Namensvorlage');
        assert.equal(t('jointocreate.btn_remove_channel', {}, 'de'), '🗑️ Kanal entfernen');
    });

    await tContext.test('fun games strings are localized in all supported languages', () => {
        assert.equal(t('fun:flip_heads', {}, 'es-419'), 'Cara');
        assert.equal(t('fun:flip_heads', {}, 'de'), 'Kopf');
        assert.equal(t('fun:flip_tails', {}, 'es-419'), 'Cruz');
        assert.equal(t('fun:flip_tails', {}, 'de'), 'Zahl');
        assert.equal(t('fun:roll_title', { dice: 1, sides: 20, mod: '' }, 'es-419'), '🎲 Tirando 1d20');
        assert.equal(t('fun:roll_title', { dice: 1, sides: 20, mod: '' }, 'de'), '🎲 Würfeln: 1d20');
        assert.equal(t('fun:fight_duel_complete', {}, 'es-419'), '🏆 ¡Duelo Terminado!');
        assert.equal(t('fun:fight_duel_complete', {}, 'de'), '🏆 Duell Beendet!');
    });

    await tContext.test('community and applications strings are localized in all supported languages', () => {
        assert.equal(t('community:submit_modal_title', { name: 'Mod' }, 'es-419'), 'Postulación para Mod');
        assert.equal(t('community:submit_modal_title', { name: 'Mod' }, 'de'), 'Bewerbung für Mod');
        assert.equal(t('community:status_in_progress', {}, 'es-419'), 'En Progreso');
        assert.equal(t('community:status_in_progress', {}, 'de'), 'In Bearbeitung');
        assert.equal(t('community:setup_modal_title', {}, 'es-419'), 'Configurar Nueva Postulación');
        assert.equal(t('community:setup_modal_title', {}, 'de'), 'Neue Bewerbung Einrichten');
    });

    await tContext.test('leveling strings are localized in all supported languages', () => {
        assert.equal(t('leveling:rank_title', { user: 'Test' }, 'es-419'), 'Rango de Test');
        assert.equal(t('leveling:rank_title', { user: 'Test' }, 'de'), 'Rang von Test');
        assert.equal(t('leveling:leaderboard_title', {}, 'es-419'), 'Tabla de Clasificación de Niveles');
        assert.equal(t('leveling:leaderboard_title', {}, 'de'), 'Level-Bestenliste');
        assert.equal(t('leveling:level_set_title', {}, 'es-419'), 'Nivel Establecido');
        assert.equal(t('leveling:level_set_title', {}, 'de'), 'Level Festgelegt');
    });

    await tContext.test('economy commands and dashboard are localized in all supported languages', () => {
        assert.equal(t('economy:balance_wallet', {}, 'es-419'), '💵 Efectivo');
        assert.equal(t('economy:balance_wallet', {}, 'de'), '💵 Bargeld');
        assert.equal(t('economy:daily_claimed_title', {}, 'es-419'), '✅ ¡Recompensa Diaria Reclamada!');
        assert.equal(t('economy:daily_claimed_title', {}, 'de'), '✅ Tägliche Belohnung abgeholt!');
        assert.equal(t('economy:beg_success_title', {}, 'es-419'), 'Mendicidad Exitosa');
        assert.equal(t('economy:beg_success_title', {}, 'de'), 'Betteln erfolgreich');
        assert.equal(t('economy:work_complete_title', {}, 'es-419'), '💼 ¡Trabajo Completado!');
        assert.equal(t('economy:work_complete_title', {}, 'de'), '💼 Arbeit abgeschlossen!');
        assert.equal(t('economy:deposit_title', {}, 'es-419'), 'Depósito Exitoso');
        assert.equal(t('economy:deposit_title', {}, 'de'), 'Einzahlung erfolgreich');
        assert.equal(t('economy:withdraw_title', {}, 'es-419'), 'Retiro Exitoso');
        assert.equal(t('economy:withdraw_title', {}, 'de'), 'Auszahlung erfolgreich');
        assert.equal(t('economy:dashboard_title', {}, 'es-419'), '💰 Panel de Economía');
        assert.equal(t('economy:dashboard_title', {}, 'de'), '💰 Wirtschafts-Dashboard');
    });

    await tContext.test('music strings and player buttons are localized in all supported languages', () => {
        assert.equal(t('music:joined_title', {}, 'es-419'), 'Conectado al Canal de Voz');
        assert.equal(t('music:joined_title', {}, 'de'), 'Sprachkanal Beigetreten');
        assert.equal(t('music:now_playing_title', {}, 'es-419'), 'Reproduciendo Ahora');
        assert.equal(t('music:now_playing_title', {}, 'de'), 'Jetzt Läuft');
        assert.equal(t('music:btn_pause', {}, 'es-419'), 'Pausar');
        assert.equal(t('music:btn_pause', {}, 'de'), 'Pause');
        assert.equal(t('music:err_empty_queue', {}, 'es-419'), 'La cola de reproducción está vacía.');
        assert.equal(t('music:err_empty_queue', {}, 'de'), 'Die Warteschlange ist leer.');
    });

    await tContext.test('serverstats counter types, messages, and buttons are localized in all supported languages', () => {
        assert.equal(t('serverstats:type_members', {}, 'es-419'), 'Miembros + Bots');
        assert.equal(t('serverstats:type_members', {}, 'de'), 'Mitglieder + Bots');
        assert.equal(t('serverstats:type_members_only', {}, 'es-419'), 'Solo Miembros');
        assert.equal(t('serverstats:type_members_only', {}, 'de'), 'Nur Mitglieder');
        assert.equal(t('serverstats:create_success_title', {}, 'es-419'), '¡Contador Creado Exitosamente!');
        assert.equal(t('serverstats:create_success_title', {}, 'de'), 'Zähler Erfolgreich Erstellt!');
        assert.equal(t('serverstats:delete_btn_confirm', {}, 'es-419'), 'Confirmar Eliminación');
        assert.equal(t('serverstats:delete_btn_confirm', {}, 'de'), 'Löschen Bestätigen');
    });

    await tContext.test('logging dashboard, channels, categories, and filters are localized in all supported languages', () => {
        assert.equal(t('logging:dash_title', {}, 'es-419'), '📝 Panel de Registros');
        assert.equal(t('logging:dash_title', {}, 'de'), '📝 Protokoll-Dashboard');
        assert.equal(t('logging:dest_audit', {}, 'es-419'), 'Registro de Auditoría');
        assert.equal(t('logging:dest_audit', {}, 'de'), 'Audit-Protokoll');
        assert.equal(t('logging:categories_title', {}, 'es-419'), '📋 Categorías de Eventos');
        assert.equal(t('logging:categories_title', {}, 'de'), '📋 Ereigniskategorien');
        assert.equal(t('logging:filters_title', {}, 'es-419'), '🔇 Filtros de Ignorados');
        assert.equal(t('logging:filters_title', {}, 'de'), '🔇 Ignorierfilter');
    });

    await tContext.test('welcome, goodbye, autorole, and greet dashboard are localized in all supported languages', () => {
        assert.equal(t('welcome:welcome_title', {}, 'es-419'), 'Sistema de Bienvenida Configurado');
        assert.equal(t('welcome:welcome_title', {}, 'de'), 'Willkommenssystem Konfiguriert');
        assert.equal(t('welcome:goodbye_title', {}, 'es-419'), 'Sistema de Despedida Configurado');
        assert.equal(t('welcome:goodbye_title', {}, 'de'), 'Abschiedssystem Konfiguriert');
        assert.equal(t('welcome:autorole_list_title', {}, 'es-419'), 'Rol Autoasignado');
        assert.equal(t('welcome:autorole_list_title', {}, 'de'), 'Automatisch Zugewiesene Rolle');
        assert.equal(t('welcome:dash_title', {}, 'es-419'), '👋 Panel del Sistema de Saludos');
        assert.equal(t('welcome:dash_title', {}, 'de'), '👋 Begrüßungs-Dashboard');
    });

    await tContext.test('search commands are localized in all supported languages', () => {
        assert.equal(t('search:google_title', {}, 'en-US'), 'Google Search');
        assert.equal(t('search:google_title', {}, 'es-419'), 'Búsqueda en Google');
        assert.equal(t('search:google_title', {}, 'de'), 'Google-Suche');
        assert.equal(t('search:urban_author_anon', {}, 'es-419'), 'Anónimo');
        assert.equal(t('search:urban_author_anon', {}, 'de'), 'Anonym');
        assert.equal(t('search:define_default_meaning', {}, 'es-419'), 'Definición');
        assert.equal(t('search:define_default_meaning', {}, 'de'), 'Definition');
    });

    await tContext.test('tools commands are localized in all supported languages', () => {
        assert.equal(t('tools:baseconvert_title_single', {}, 'es-419'), '🔄 Resultado de Conversión de Base');
        assert.equal(t('tools:baseconvert_title_single', {}, 'de'), '🔄 Basiskonvertierungsergebnis');
        assert.equal(t('tools:calc_title', {}, 'es-419'), '🧮 Resultado del Cálculo');
        assert.equal(t('tools:calc_title', {}, 'de'), '🧮 Berechnungsergebnis');
        assert.equal(t('tools:countdown_started', {}, 'es-419'), '✅ ¡Cuenta regresiva iniciada!');
        assert.equal(t('tools:countdown_started', {}, 'de'), '✅ Countdown gestartet!');
        assert.equal(t('tools:embedbuilder_dash_title', {}, 'es-419'), 'Generador de Embeds — Panel de Control');
        assert.equal(t('tools:embedbuilder_dash_title', {}, 'de'), 'Embed-Baukasten — Bedienfeld');
        assert.equal(t('tools:embedbuilder_post_sent_title', {}, 'es-419'), 'Embed Enviado');
        assert.equal(t('tools:embedbuilder_post_sent_title', {}, 'de'), 'Embed gesendet');
    });

    await tContext.test('utility commands and handlers are localized in all supported languages', () => {
        assert.equal(t('utility:avatar_title', { user: 'Jorge' }, 'es-419'), 'Avatar de Jorge');
        assert.equal(t('utility:avatar_title', { user: 'Jorge' }, 'de'), 'Avatar von Jorge');
        assert.equal(t('utility:firstmsg_title', {}, 'es-419'), 'Primer Mensaje');
        assert.equal(t('utility:firstmsg_title', {}, 'de'), 'Erste Nachricht');
        assert.equal(t('utility:serverinfo_title', { name: 'TitanHQ' }, 'es-419'), 'Información del Servidor: TitanHQ');
        assert.equal(t('utility:serverinfo_title', { name: 'TitanHQ' }, 'de'), 'Server-Info: TitanHQ');
        assert.equal(t('utility:userinfo_title', { user: 'Jorge' }, 'es-419'), 'Información de Usuario: Jorge');
        assert.equal(t('utility:userinfo_title', { user: 'Jorge' }, 'de'), 'Benutzer-Info: Jorge');
        assert.equal(t('utility:weather_title', { city: 'Berlin', country: 'Germany' }, 'es-419'), 'Clima en Berlin, Germany');
        assert.equal(t('utility:weather_title', { city: 'Berlin', country: 'Germany' }, 'de'), 'Wetter in Berlin, Germany');
        assert.equal(t('utility:wipedata_cancel_title', {}, 'es-419'), '❌ Borrado de Datos Cancelado');
        assert.equal(t('utility:wipedata_cancel_title', {}, 'de'), '❌ Datenlöschung abgebrochen');
        assert.equal(t('utility:todo_shared_created_title', {}, 'es-419'), 'Lista Compartida Creada');
        assert.equal(t('utility:todo_shared_created_title', {}, 'de'), 'Geteilte Liste erstellt');
    });
});



