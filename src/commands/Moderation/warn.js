import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { WarningService } from '../../services/moderation/warningService.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("warn")
            .setDescription("Warn a user")
            .addUserOption((o) =>
                localizeOption(
                    o
                        .setName("target")
                        .setRequired(true)
                        .setDescription("User to warn"),
                    'warn',
                    'target',
                ),
            )
            .addStringOption((o) =>
                localizeOption(
                    o
                        .setName("reason")
                        .setRequired(true)
                        .setDescription("Reason for the warning"),
                    'warn',
                    'reason',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        'warn',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Warn interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'warn'
            });
            return;
        }

        const target = interaction.options.getUser("target");
        const member = interaction.options.getMember("target");
        const reason = interaction.options.getString("reason");
        const moderator = interaction.user;
        const guildId = interaction.guildId;

        if (!target) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                t('moderation.warn.missing_user', {}, interaction),
                { subtype: 'invalid_user' },
            );
        }

        if (!reason) {
            throw new TitanBotError(
                'Missing warning reason',
                ErrorTypes.VALIDATION,
                t('moderation.warn.missing_reason', {}, interaction),
                { subtype: 'missing_required' },
            );
        }

        if (!member) {
            throw new TitanBotError(
                "Target not found",
                ErrorTypes.USER_INPUT,
                t('moderation.errors.target_not_in_server', {}, interaction),
            );
        }

        ModerationService.assertModerationHierarchy(interaction.member, member, 'warn');

        const { id, totalCount } = await WarningService.addWarning({
            guildId,
            userId: target.id,
            moderatorId: moderator.id,
            reason,
            timestamp: Date.now()
        });

        await logModerationAction({
            client,
            guild: interaction.guild,
            event: {
                action: "User Warned",
                target: `${target.tag} (${target.id})`,
                executor: `${moderator.tag} (${moderator.id})`,
                reason,
                metadata: {
                    userId: target.id,
                    moderatorId: moderator.id,
                    totalWarns: totalCount,
                    warningNumber: totalCount,
                    warningId: id
                }
            }
        });

        const autoPunishResult = await ModerationService.checkAndApplyAutoPunish({
            guild: interaction.guild,
            member,
            warnCount: totalCount,
            client,
        }).catch((err) => {
            logger.warn('Auto-punish execution error:', err);
            return null;
        });

        let successDescription = t('moderation.warn.success_desc', { reason, totalCount }, interaction);
        if (autoPunishResult?.applied) {
            successDescription += `\n⚡ **Auto-punish triggered:** ${autoPunishResult.action.toUpperCase()}`;
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    t('moderation.warn.success_title', { user: target.tag }, interaction),
                    successDescription,
                ),
            ],
        });
    }
};