import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { t, localizeSlashCommand } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("unlock")
            .setDescription("Unlocks the current channel (allows @everyone to send messages again)")
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        'unlock',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Unlock interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'unlock'
            });
            return;
        }

        const channel = interaction.channel;
        const everyoneRole = interaction.guild.roles.everyone;

        try {
            const currentPermissions = channel.permissionsFor(everyoneRole);
            if (
                currentPermissions.has(PermissionFlagsBits.SendMessages) === true ||
                currentPermissions.has(PermissionFlagsBits.SendMessages) === null
            ) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: t('moderation.unlock.not_locked', { channel: channel.toString() }, interaction),
                });
            }

            await channel.permissionOverwrites.edit(
                everyoneRole,
                { SendMessages: true },
                {
                    type: 0,
                    reason: `Channel unlocked by ${interaction.user.tag}`,
                },
            );

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: "Channel Unlocked",
                    target: channel.toString(),
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    metadata: {
                        channelId: channel.id,
                        category: channel.parent?.name || 'None'
                    }
                }
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        t('moderation.unlock.success_title', {}, interaction),
                        t('moderation.unlock.success_desc', { channel: channel.toString() }, interaction),
                    ),
                ],
            });
        } catch (error) {
            logger.error('Unlock command error:', error);
            await replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: t('moderation.unlock.error_unlock', {}, interaction),
            });
        }
    }
};