import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("unban")
            .setDescription("Unban a user from the server")
            .addStringOption((option) =>
                localizeOption(
                    option
                        .setName("target")
                        .setDescription("The ID (or mention) of the user to unban")
                        .setRequired(true),
                    'unban',
                    'target',
                ),
            )
            .addStringOption((option) =>
                localizeOption(
                    option
                        .setName("reason")
                        .setDescription("Reason for the unban")
                        .setRequired(false),
                    'unban',
                    'reason',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        'unban',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Unban interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'unban',
            });
            return;
        }

        const rawTarget = interaction.options.getString("target");
        const targetId = rawTarget.replace(/[<@!>]/g, '').trim();

        if (!/^\d{17,20}$/.test(targetId)) {
            return replyUserError(interaction, {
                type: ErrorTypes.USER_INPUT,
                message: t('moderation.unban.invalid_target', {}, interaction),
            });
        }

        const targetUser = await client.users.fetch(targetId).catch(() => null);
        if (!targetUser) {
            return replyUserError(interaction, {
                type: ErrorTypes.USER_INPUT,
                message: t('moderation.unban.user_not_found', { targetId }, interaction),
            });
        }

        const reason = interaction.options.getString("reason") || t('moderation.no_reason', {}, interaction);

        const result = await ModerationService.unbanUser({
            guild: interaction.guild,
            user: targetUser,
            moderator: interaction.member,
            reason,
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    t('moderation.unban.success_title', {}, interaction),
                    t('moderation.unban.success_desc', { user: targetUser.tag, reason, caseId: result.caseId }, interaction),
                ),
            ],
        });
    },
};
