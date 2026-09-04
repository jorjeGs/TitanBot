import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("ban")
            .setDescription("Ban a user from the server")
            .addUserOption((option) =>
                localizeOption(
                    option
                        .setName("target")
                        .setDescription("The user to ban")
                        .setRequired(true),
                    'ban',
                    'target',
                ),
            )
            .addStringOption((option) =>
                localizeOption(
                    option.setName("reason").setDescription("Reason for the ban"),
                    'ban',
                    'reason',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        'ban',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const user = interaction.options.getUser("target");
        const reason = interaction.options.getString("reason") || t('moderation.no_reason', {}, interaction);

        if (!user) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                t('moderation.ban.missing_user', {}, interaction),
                { subtype: 'invalid_user' },
            );
        }

        if (user.id === interaction.user.id) {
            throw new TitanBotError(
                'Cannot ban self',
                ErrorTypes.VALIDATION,
                t('moderation.errors.cannot_ban_self', {}, interaction),
            );
        }
        if (user.id === client.user.id) {
            throw new TitanBotError(
                'Cannot ban bot',
                ErrorTypes.VALIDATION,
                t('moderation.errors.cannot_ban_bot', {}, interaction),
            );
        }

        const result = await ModerationService.banUser({
            guild: interaction.guild,
            user,
            moderator: interaction.member,
            reason,
        });

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    t('moderation.ban.success_title', { user: user.tag }, interaction),
                    t('moderation.ban.success_desc', { reason, caseId: result.caseId }, interaction),
                ),
            ],
        });
    },
};
