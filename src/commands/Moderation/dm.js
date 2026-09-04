import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/validation.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("dm")
            .setDescription("Send a direct message to a user (Staff only)")
            .addUserOption((option) =>
                localizeOption(
                    option
                        .setName("user")
                        .setDescription("The user to send a DM to")
                        .setRequired(true),
                    'dm',
                    'user',
                ),
            )
            .addStringOption((option) =>
                localizeOption(
                    option
                        .setName("message")
                        .setDescription("The message to send")
                        .setRequired(true),
                    'dm',
                    'message',
                ),
            )
            .addBooleanOption((option) =>
                localizeOption(
                    option
                        .setName("anonymous")
                        .setDescription("Send the message anonymously (default: false)")
                        .setRequired(false),
                    'dm',
                    'anonymous',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
            .setDMPermission(false),
        'dm',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`DM interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'dm'
            });
            return;
        }

        const targetUser = interaction.options.getUser("user");
        const message = interaction.options.getString("message");
        const anonymous = interaction.options.getBoolean("anonymous") || false;

        try {
            if (message.length > 2000) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: t('moderation.dm.too_long', {}, interaction),
                });
            }

            if (targetUser.bot) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: t('moderation.dm.cannot_dm_bot', {}, interaction),
                });
            }

            const sanitized = sanitizeMarkdown(message);
            const dmChannel = await targetUser.createDM();
            
            const staffTitle = anonymous
                ? t('moderation.dm.embed_staff', {}, interaction)
                : t('moderation.dm.embed_user', { user: interaction.user.tag }, interaction);

            await dmChannel.send({
                embeds: [
                    successEmbed(staffTitle, sanitized).setFooter({
                        text: t('moderation.dm.embed_footer', { id: interaction.id }, interaction),
                    })
                ]
            });

            await logEvent({
                client: interaction.client,
                guild: interaction.guild,
                event: {
                    action: "DM Sent",
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `Anonymous: ${anonymous ? 'Yes' : 'No'}`,
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        anonymous,
                        messageLength: sanitized.length
                    }
                }
            });

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        t('moderation.dm.success_title', {}, interaction),
                        t('moderation.dm.success_desc', { user: targetUser.tag }, interaction),
                    ),
                ],
            });
        } catch (error) {
            logger.error('DM command error:', error);
            
            if (error.code === 50007) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: t('moderation.dm.dms_disabled', { user: targetUser.tag }, interaction),
                });
            }
            
            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: t('moderation.dm.send_failed', { error: error.message }, interaction),
            });
        }
    }
};