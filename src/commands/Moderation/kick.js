import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("kick")
            .setDescription("Kick a user from the server")
            .addUserOption((option) =>
                localizeOption(
                    option
                        .setName("target")
                        .setDescription("The user to kick")
                        .setRequired(true),
                    'kick',
                    'target',
                ),
            )
            .addStringOption((option) =>
                localizeOption(
                    option.setName("reason").setDescription("Reason for the kick"),
                    'kick',
                    'reason',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        'kick',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const targetUser = interaction.options.getUser("target");
        const member = interaction.options.getMember("target");
        const reason = interaction.options.getString("reason") || t('moderation.no_reason', {}, interaction);

        if (!targetUser) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                t('moderation.kick.missing_user', {}, interaction),
                { subtype: 'invalid_user' },
            );
        }

        if (targetUser.id === interaction.user.id) {
            throw new TitanBotError(
                "Cannot kick self",
                ErrorTypes.VALIDATION,
                t('moderation.errors.cannot_kick_self', {}, interaction),
            );
        }

        if (targetUser.id === client.user.id) {
            throw new TitanBotError(
                "Cannot kick bot",
                ErrorTypes.VALIDATION,
                t('moderation.errors.cannot_kick_bot', {}, interaction),
            );
        }

        if (!member) {
            throw new TitanBotError(
                "Target not found",
                ErrorTypes.USER_INPUT,
                t('moderation.errors.target_not_in_server', {}, interaction),
                { subtype: 'user_not_found' },
            );
        }

        const result = await ModerationService.kickUser({
            guild: interaction.guild,
            member,
            moderator: interaction.member,
            reason,
        });

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    t('moderation.kick.success_title', { user: targetUser.tag }, interaction),
                    t('moderation.kick.success_desc', { reason, caseId: result.caseId }, interaction),
                ),
            ],
        });
    },
};
