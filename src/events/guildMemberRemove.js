import { Events, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getColor, botConfig } from '../config/bot.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { getWelcomeConfig, getUserApplications, deleteApplication } from '../utils/database.js';
import { formatWelcomeMessage } from '../utils/welcome.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { getServerCounters, updateCounter } from '../services/serverstatsService.js';
import { getGuildBirthdays, deleteBirthday } from '../utils/database.js';
import { deleteUserLevelData } from '../services/leveling/leveling.js';
import { recordMemberLeave } from '../services/analytics/analyticsService.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberRemove,
  once: false,
  
  async execute(member) {
    try {
        const { guild, user } = member;
        
        // Track analytics leave metrics
        recordMemberLeave(guild, member).catch((err) => {
            logger.warn('Error recording member leave analytics:', err);
        });

        const config = await getGuildConfig(member.client, guild.id).catch(() => ({}));
        const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
        
        const isGoodbyeEnabled = Boolean(welcomeConfig?.goodbyeEnabled ?? config?.goodbyeEnabled);
        const goodbyeChannelId = welcomeConfig?.goodbyeChannelId || config?.goodbyeChannelId;
        const leaveType = welcomeConfig?.leaveType || config?.leaveType || 'text';

        if (isGoodbyeEnabled && goodbyeChannelId) {
            const channel = guild.channels.cache.get(goodbyeChannelId);
            if (channel?.isTextBased?.()) {
                const me = guild.members.me;
                const permissions = me ? channel.permissionsFor(me) : null;
                if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
                    return;
                }

                const formatData = { user, guild, member };
                const goodbyeMessage = formatWelcomeMessage(
                    welcomeConfig.leaveMessage || config?.leaveMessage || welcomeConfig.leaveEmbed?.description || config?.leaveEmbed?.description || botConfig.welcome?.defaultGoodbyeMessage || '{user} has left the server.',
                    formatData
                );

                const embedTitle = formatWelcomeMessage(
                    welcomeConfig.leaveEmbed?.title || config?.leaveEmbed?.title || '👋 Goodbye',
                    formatData
                );
                const embedFooter = (welcomeConfig.leaveEmbed?.footer || config?.leaveEmbed?.footer)
                    ? formatWelcomeMessage(welcomeConfig.leaveEmbed?.footer || config?.leaveEmbed?.footer, formatData)
                    : `Goodbye from ${guild.name}!`;

                const canEmbed = permissions.has(PermissionFlagsBits.EmbedLinks);
                const shouldPing = Boolean(welcomeConfig?.goodbyePing ?? config?.goodbyePing);

                if (!canEmbed || leaveType === 'text') {
                    await channel.send({
                        content: shouldPing ? `<@${user.id}> ${goodbyeMessage}` : goodbyeMessage,
                        allowedMentions: shouldPing ? { users: [user.id] } : { parse: [] }
                    });
                } else {
                    const embedColor = welcomeConfig.leaveEmbed?.color || config?.leaveEmbed?.color || getColor('error');
                    const embed = new EmbedBuilder()
                        .setTitle(embedTitle)
                        .setDescription(goodbyeMessage)
                        .setColor(embedColor)
                        .setTimestamp()
                        .setFooter({ text: embedFooter });

                    const showThumbnail = (welcomeConfig.leaveEmbed?.thumbnail ?? config?.leaveEmbed?.thumbnail) !== false;
                    if (showThumbnail) {
                        embed.setThumbnail(user.displayAvatarURL());
                    }

                    const embedImage = typeof welcomeConfig.leaveEmbed?.image === 'string' && welcomeConfig.leaveEmbed.image
                        ? welcomeConfig.leaveEmbed.image
                        : (typeof config?.leaveEmbed?.image === 'string' && config.leaveEmbed.image
                            ? config.leaveEmbed.image
                            : welcomeConfig.leaveEmbed?.image?.url);
                    if (embedImage) {
                        embed.setImage(embedImage);
                    }

                    await channel.send({
                        content: shouldPing ? `<@${user.id}>` : undefined,
                        allowedMentions: shouldPing ? { users: [user.id] } : { parse: [] },
                        embeds: [embed]
                    });
                }
            }
        }

        try {
            await logEvent({
                client: member.client,
                guildId: guild.id,
                eventType: EVENT_TYPES.MEMBER_LEAVE,
                data: {
                    title: 'User left',
                    lines: [
                        `**User:** ${user.toString()} (${user.tag})`,
                        `**ID:** \`${user.id}\``,
                        `**Joined:** <t:${Math.floor((member.joinedTimestamp || Date.now()) / 1000)}:R>`,
                        `**Members:** ${guild.memberCount}`,
                    ],
                    quoted: false,
                    thumbnail: user.displayAvatarURL({ dynamic: true }),
                    userId: user.id,
                }
            });
        } catch (error) {
            logger.debug('Error logging member leave:', error);
        }

        try {
            const counters = await getServerCounters(member.client, guild.id);
            for (const counter of counters) {
                if (counter && counter.type && counter.channelId && counter.enabled !== false) {
                    await updateCounter(member.client, guild, counter);
                }
            }
        } catch (error) {
            logger.debug('Error updating counters on member leave:', error);
        }

        try {
            const birthdays = await getGuildBirthdays(member.client, guild.id);
            if (birthdays[user.id]) {
                const backupKey = `guild:${guild.id}:birthdays:left`;
                const backup = (await member.client.db.get(backupKey)) || {};
                backup[user.id] = birthdays[user.id];
                await member.client.db.set(backupKey, backup);
                await deleteBirthday(member.client, guild.id, user.id);
                logger.debug(`Birthday backed up and removed for user ${user.id} in guild ${guild.id}`);
            }
        } catch (error) {
            logger.debug('Error handling birthday on member leave:', error);
        }

        try {
            const userApplications = await getUserApplications(member.client, guild.id, user.id);
            if (userApplications && userApplications.length > 0) {
                for (const app of userApplications) {
                    await deleteApplication(member.client, guild.id, app.id, user.id);
                }
                logger.debug(`Removed ${userApplications.length} applications for user ${user.id} in guild ${guild.id}`);
            }
        } catch (error) {
            logger.debug('Error handling applications on member leave:', error);
        }

        try {
            await deleteUserLevelData(member.client, guild.id, user.id);
            logger.debug(`Removed leveling data for user ${user.id} in guild ${guild.id}`);
        } catch (error) {
            logger.debug('Error handling leveling data on member leave:', error);
        }
        
    } catch (error) {
        logger.error('Error in guildMemberRemove event:', error);
    }
  }
};