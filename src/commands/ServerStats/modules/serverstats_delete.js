import { getColor } from '../../../config/bot.js';
import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../../utils/embeds.js';
import { getServerCounters, saveServerCounters, getCounterEmoji, getCounterTypeLabel } from '../../../services/serverstatsService.js';
import { logger } from '../../../utils/logger.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes, createError, wrapServiceBoundary } from '../../../utils/errorHandler.js';
import { t } from '../../../utils/i18n/index.js';

export async function handleDelete(interaction, client) {
    const guild = interaction.guild;
    const counterId = interaction.options.getString("counter-id");

    try {
        await InteractionHelper.safeDefer(interaction);
    } catch (error) {
        logger.error("Failed to defer reply:", error);
        return;
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: t('serverstats.err_perm_manage', {}, interaction) }).catch(logger.error);
        return;
    }

    try {
        const counters = await getServerCounters(client, guild.id);

        if (counters.length === 0) {
            await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: t('serverstats.err_no_counters', {}, interaction) }).catch(logger.error);
            return;
        }

        const counterToDelete = counters.find(c => c.id === counterId);
        if (!counterToDelete) {
            await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: t('serverstats.err_not_found', { id: counterId }, interaction) }).catch(logger.error);
            return;
        }

        const channel = guild.channels.cache.get(counterToDelete.channelId);

        const embed = createEmbed({
            title: t('serverstats.delete_confirm_title', {}, interaction),
            description: t('serverstats.delete_confirm_desc', {
                id: counterToDelete.id,
                type: getCounterTypeDisplay(counterToDelete.type, interaction),
                channel: channel || 'Deleted Channel'
            }, interaction),
            color: getColor('error')
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`counter-delete:confirm:${counterToDelete.id}:${interaction.user.id}`)
                .setLabel(t('serverstats.delete_btn_confirm', {}, interaction))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`counter-delete:cancel:${counterToDelete.id}:${interaction.user.id}`)
                .setLabel(t('serverstats.delete_btn_cancel', {}, interaction))
                .setStyle(ButtonStyle.Secondary)
        );

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed], components: [row] }).catch(logger.error);

    } catch (error) {
        logger.error("Error in handleDelete:", error);
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('serverstats.err_create_general', {}, interaction) }).catch(logger.error);
    }
}

export const performDeletionByCounterId = wrapServiceBoundary(async function performDeletionByCounterId(client, guild, counterId, target = null) {
    const counters = await getServerCounters(client, guild.id);

    const counter = counters.find(c => c.id === counterId);
    if (!counter) {
        throw createError(
            'Counter not found',
            ErrorTypes.USER_INPUT,
            t('serverstats.err_not_found', { id: counterId }, target || guild.id),
            { guildId: guild.id, counterId, operation: 'performDeletionByCounterId' }
        );
    }

    const updatedCounters = counters.filter(c => c.id !== counter.id);

    const saved = await saveServerCounters(client, guild.id, updatedCounters);
    if (!saved) {
        throw createError(
            'Counter delete failed',
            ErrorTypes.DATABASE,
            t('serverstats.err_save_failed', {}, target || guild.id),
            { guildId: guild.id, counterId, operation: 'performDeletionByCounterId' }
        );
    }

    const channel = guild.channels.cache.get(counter.channelId);
    let channelDeleted = false;

    if (channel) {
        try {
            await channel.delete(`Counter deleted - removing channel: ${counter.id}`);
            channelDeleted = true;
        } catch (error) {
            logger.error("Error deleting channel:", error);
        }
    }

    let channelInfo = '';
    if (channelDeleted) {
        channelInfo = `\n**Channel:** ${channel.name} (deleted)`;
    } else if (channel) {
        channelInfo = `\n**Channel:** ${channel.name} (failed to delete)`;
    } else {
        channelInfo = `\n**Channel:** Already deleted`;
    }

    const message = t('serverstats.delete_success_desc', {
        id: counter.id,
        type: getCounterTypeDisplay(counter.type, target || guild.id),
        channelInfo
    }, target || guild.id);

    return { message };
}, {
    service: 'serverstats',
    operation: 'performDeletionByCounterId',
    userMessage: 'An error occurred while deleting the counter. Please try again.',
});

function getCounterTypeDisplay(type, target = null) {
    return `${getCounterEmoji(type)} ${getCounterTypeLabel(type, target)}`;
}