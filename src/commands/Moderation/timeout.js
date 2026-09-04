import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

const durationChoices = [
    { name: "5 minutes", name_localizations: { "es-419": "5 minutos", "de": "5 Minuten" }, value: 5 },
    { name: "10 minutes", name_localizations: { "es-419": "10 minutos", "de": "10 Minuten" }, value: 10 },
    { name: "30 minutes", name_localizations: { "es-419": "30 minutos", "de": "30 Minuten" }, value: 30 },
    { name: "1 hour", name_localizations: { "es-419": "1 hora", "de": "1 Stunde" }, value: 60 },
    { name: "6 hours", name_localizations: { "es-419": "6 horas", "de": "6 Stunden" }, value: 360 },
    { name: "1 day", name_localizations: { "es-419": "1 día", "de": "1 Tag" }, value: 1440 },
    { name: "1 week", name_localizations: { "es-419": "1 semana", "de": "1 Woche" }, value: 10080 },
];

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("timeout")
            .setDescription("Timeout a user for a specific duration")
            .addUserOption((option) =>
                localizeOption(
                    option
                        .setName("target")
                        .setDescription("User to timeout")
                        .setRequired(true),
                    'timeout',
                    'target',
                ),
            )
            .addIntegerOption((option) =>
                localizeOption(
                    option
                        .setName("duration")
                        .setDescription("Duration of the timeout")
                        .setRequired(true)
                        .addChoices(...durationChoices),
                    'timeout',
                    'duration',
                ),
            )
            .addStringOption((option) =>
                localizeOption(
                    option.setName("reason").setDescription("Reason for the timeout"),
                    'timeout',
                    'reason',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        'timeout',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Timeout interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'timeout',
            });
            return;
        }

        const targetUser = interaction.options.getUser("target");
        const member = interaction.options.getMember("target");
        const durationMinutes = interaction.options.getInteger("duration");
        const reason = interaction.options.getString("reason") || t('moderation.no_reason', {}, interaction);

        if (!targetUser) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                t('moderation.timeout.missing_user', {}, interaction),
                { subtype: 'invalid_user' },
            );
        }

        if (targetUser.id === interaction.user.id) {
            throw new TitanBotError(
                "Cannot timeout self",
                ErrorTypes.VALIDATION,
                t('moderation.errors.cannot_timeout_self', {}, interaction),
            );
        }
        if (targetUser.id === client.user.id) {
            throw new TitanBotError(
                "Cannot timeout bot",
                ErrorTypes.VALIDATION,
                t('moderation.errors.cannot_timeout_bot', {}, interaction),
            );
        }
        if (!member) {
            throw new TitanBotError(
                "Target not found",
                ErrorTypes.USER_INPUT,
                t('moderation.errors.target_not_in_server', {}, interaction),
            );
        }

        const durationMs = durationMinutes * 60 * 1000;
        const result = await ModerationService.timeoutUser({
            guild: interaction.guild,
            member,
            moderator: interaction.member,
            durationMs,
            reason,
        });

        const durationDisplay =
            t(`moderation.timeout.durations.${durationMinutes}`, {}, interaction) ||
            `${durationMinutes} minutes`;

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    t('moderation.timeout.success_title', { user: targetUser.tag, duration: durationDisplay }, interaction),
                    t('moderation.timeout.success_desc', { reason, caseId: result.caseId }, interaction),
                ),
            ],
        });
    },
};
