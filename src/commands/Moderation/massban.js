import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("massban")
            .setDescription("Ban multiple users from the server at once")
            .addStringOption((option) =>
                localizeOption(
                    option
                        .setName("users")
                        .setDescription("User IDs or mentions to ban (separated by spaces or commas)")
                        .setRequired(true),
                    'massban',
                    'users',
                ),
            )
            .addStringOption((option) =>
                localizeOption(
                    option
                        .setName("reason")
                        .setDescription("Reason for the mass ban")
                        .setRequired(false),
                    'massban',
                    'reason',
                ),
            )
            .addIntegerOption((option) =>
                localizeOption(
                    option
                        .setName("delete_days")
                        .setDescription("Number of days of messages to delete (0-7)")
                        .setMinValue(0)
                        .setMaxValue(7)
                        .setRequired(false),
                    'massban',
                    'delete_days',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        'massban',
    ),
    category: "moderation",
    abuseProtection: { maxAttempts: 3, windowMs: 60_000 },

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Massban interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'massban'
            });
            return;
        }

        const usersInput = interaction.options.getString("users");
        const reason = interaction.options.getString("reason") || t('moderation.massban.default_reason', {}, interaction);
        const deleteDays = interaction.options.getInteger("delete_days") || 0;

        try {
            const userIds = usersInput
                .replace(/<@!?(\d+)>/g, '$1')
                .split(/[\s,]+/)
                .filter(id => id && /^\d+$/.test(id))
                .slice(0, 20);

            if (userIds.length === 0) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: t('moderation.massban.invalid_users', {}, interaction),
                });
            }

            if (userIds.includes(interaction.user.id)) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: t('moderation.massban.cannot_include_self', {}, interaction),
                });
            }

            if (userIds.includes(client.user.id)) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: t('moderation.massban.cannot_include_bot', {}, interaction),
                });
            }

            const results = {
                successful: [],
                failed: [],
                skipped: []
            };

            for (const userId of userIds) {
                try {
                    const user = await client.users.fetch(userId).catch(() => null);
                    
                    if (!user) {
                        results.failed.push({ userId, reason: t('moderation.massban.user_not_found', {}, interaction) });
                        continue;
                    }

                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    
                    if (member) {
                        const modCheck = ModerationService.validateHierarchy(interaction.member, member, 'ban');
                        if (!modCheck.valid) {
                            results.skipped.push({
                                user: user.tag,
                                userId,
                                reason: ModerationService.buildHierarchySkipReason(interaction.member, member, 'ban'),
                            });
                            continue;
                        }

                        const botCheck = ModerationService.validateBotHierarchy(member, 'ban');
                        if (!botCheck.valid) {
                            results.skipped.push({
                                user: user.tag,
                                userId,
                                reason: ModerationService.buildHierarchySkipReason(interaction.member, member, 'ban', 'bot'),
                            });
                            continue;
                        }
                    }

                    await interaction.guild.members.ban(userId, {
                        reason: reason,
                        deleteMessageSeconds: deleteDays * 24 * 60 * 60
                    });

                    results.successful.push({
                        user: user.tag,
                        userId
                    });

                    await logModerationAction({
                        client,
                        guild: interaction.guild,
                        event: {
                            action: "Member Banned",
                            target: `${user.tag} (${user.id})`,
                            executor: `${interaction.user.tag} (${interaction.user.id})`,
                            reason: `${reason} (Mass Ban)`,
                            metadata: {
                                userId: user.id,
                                moderatorId: interaction.user.id,
                                massBan: true,
                                permanent: true
                            }
                        }
                    });

                } catch (error) {
                    logger.error(`Failed to ban user ${userId}:`, error);
                    const reason = error instanceof TitanBotError
                        ? (error.userMessage || error.message)
                        : (error.message || "Unknown error");
                    results.failed.push({ 
                        userId, 
                        reason,
                    });
                }
            }

            let description = t('moderation.massban.results_header', {}, interaction);
            
            if (results.successful.length > 0) {
                description += t('moderation.massban.successful_section', { count: results.successful.length }, interaction);
                results.successful.forEach(result => {
                    description += `• ${result.user} (${result.userId})\n`;
                });
                description += '\n';
            }

            if (results.skipped.length > 0) {
                description += t('moderation.massban.skipped_section', { count: results.skipped.length }, interaction);
                results.skipped.forEach(result => {
                    description += `• ${result.user} - ${result.reason}\n`;
                });
                description += '\n';
            }

            if (results.failed.length > 0) {
                description += t('moderation.massban.failed_section', { count: results.failed.length }, interaction);
                results.failed.forEach(result => {
                    description += `• ${result.userId} - ${result.reason}\n`;
                });
            }

            const embed = results.successful.length > 0 ? successEmbed : warningEmbed;
            
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    embed(
                        t('moderation.massban.completed_title', {}, interaction),
                        description
                    )
                ]
            });

        } catch (error) {
            logger.error("Error in massban command:", error);
            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: t('moderation.massban.error_massban', {}, interaction),
            });
        }
    }
};