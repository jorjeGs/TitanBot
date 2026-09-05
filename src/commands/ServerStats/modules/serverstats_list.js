import { getColor } from '../../../config/bot.js';
import { PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../../utils/embeds.js';
import { getServerCounters, saveServerCounters, getCounterEmoji as getCounterTypeEmoji, getCounterTypeLabel, getGuildCounterStats } from '../../../services/serverstatsService.js';
import { logger } from '../../../utils/logger.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
import { t } from '../../../utils/i18n/index.js';

export async function handleList(interaction, client) {
    const guild = interaction.guild;

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
        const stats = await getGuildCounterStats(guild);

        const validCounters = [];
        const orphanedCounters = [];
        
        for (const counter of counters) {
            const channel = guild.channels.cache.get(counter.channelId);
            if (channel) {
                validCounters.push(counter);
            } else {
                orphanedCounters.push(counter);
                logger.info(`Removing orphaned counter ${counter.id} (type: ${counter.type}, deleted channel: ${counter.channelId}) from guild ${guild.id}`);
            }
        }

        if (orphanedCounters.length > 0) {
            await saveServerCounters(client, guild.id, validCounters);
            logger.info(`Cleaned up ${orphanedCounters.length} orphaned counter(s) from guild ${guild.id}`);
        }

        if (validCounters.length === 0) {
            const embed = createEmbed({
                title: t('serverstats.list_title', {}, interaction),
                description: t('serverstats.list_empty_desc', {}, interaction),
                color: getColor('warning')
            });

            embed.addFields({
                name: t('serverstats.list_available_types', {}, interaction),
                value: t('serverstats.list_types_val', {}, interaction),
                inline: false
            });

            embed.addFields({
                name: t('serverstats.list_examples', {}, interaction),
                value: t('serverstats.list_examples_val', {}, interaction),
                inline: false
            });

            embed.setFooter({ 
                text: t('serverstats.list_footer', {}, interaction) 
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] }).catch(logger.error);
            return;
        }

        const embed = createEmbed({
            title: `${t('serverstats.list_title', {}, interaction)} (${validCounters.length})`,
            description: t('serverstats.list_active_desc', {}, interaction),
            color: getColor('info')
        });

        for (let i = 0; i < validCounters.length; i++) {
            const counter = validCounters[i];
            const channel = guild.channels.cache.get(counter.channelId);
            
            if (!channel) {
                logger.warn(`Counter ${counter.id} still has missing channel after cleanup`);
                continue;
            }

            const currentCount = getCurrentCount(stats, counter.type);
            const status = channel.name.includes(':') ? '✅ Active' : '⚠️ Not Updated';
            
            embed.addFields({
                name: `${getCounterTypeEmoji(counter.type)} Counter #${i + 1} - ${channel.name}`,
                value: t('serverstats.list_field_val', {
                    id: counter.id,
                    type: getCounterTypeDisplay(counter.type, interaction),
                    channel: channel.toString(),
                    count: currentCount,
                    status,
                    date: new Date(counter.createdAt).toLocaleDateString()
                }, interaction),
                inline: false
            });
        }

        const activeCount = validCounters.filter(c => {
            const channel = guild.channels.cache.get(c.channelId);
            return channel && channel.name.includes(':');
        }).length;

        embed.addFields({
            name: t('serverstats.list_stats_title', {}, interaction),
            value: t('serverstats.list_stats_val', {
                total: validCounters.length,
                active: activeCount,
                next: Math.floor(Date.now() / 1000) + 900
            }, interaction),
            inline: false
        });

        embed.addFields({
            name: t('serverstats.list_mgmt_title', {}, interaction),
            value: t('serverstats.list_mgmt_val', {}, interaction),
            inline: false
        });

        embed.setFooter({ 
            text: t('serverstats.list_footer', {}, interaction) 
        });
        embed.setTimestamp();

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] }).catch(logger.error);

    } catch (error) {
        logger.error("Error displaying counters:", error);
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'An error occurred while fetching counters. Please try again.' }).catch(logger.error);
    }
}

function getCounterTypeDisplay(type, target = null) {
    return `${getCounterTypeEmoji(type)} ${getCounterTypeLabel(type, target)}`;
}

function getCounterEmoji(type) {
    return getCounterTypeEmoji(type);
}

function getCurrentCount(stats, type) {
    switch (type) {
        case "members":
            return stats.totalCount;
        case "bots":
            return stats.botCount;
        case "members_only":
            return stats.humanCount;
        default:
            return 0;
    }
}