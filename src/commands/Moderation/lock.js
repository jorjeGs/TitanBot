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
            .setName("lock")
            .setDescription("Locks the current channel (prevents @everyone from sending messages)")
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        'lock',
    ),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Lock interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'lock'
            });
            return;
        }

        const channel = interaction.channel;
        const everyoneRole = interaction.guild.roles.everyone;

        try {
            const currentPermissions = channel.permissionsFor(everyoneRole);
            if (currentPermissions.has(PermissionFlagsBits.SendMessages) === false) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: t('moderation.lock.already_locked', { channel: channel.toString() }, interaction),
                });
            }

            await channel.permissionOverwrites.edit(
                everyoneRole,
                { SendMessages: false },
                { type: 0, reason: `Channel locked by ${interaction.user.tag}` },
            );

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: "Channel Locked",
                    target: channel.toString(),
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    metadata: {
                        channelId: channel.id,
                        category: channel.parent?.name || 'None',
                        moderatorId: interaction.user.id
                    }
                }
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        t('moderation.lock.success_title', {}, interaction),
                        t('moderation.lock.success_desc', { channel: channel.toString() }, interaction),
                    ),
                ],
            });
        } catch (error) {
            logger.error('Lock command error:', error);
            await replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: t('moderation.lock.error_lock', {}, interaction),
            });
        }
    }
};