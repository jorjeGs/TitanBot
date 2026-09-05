import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildGiveaways, saveGiveaway } from '../../utils/giveaways.js';
import { 
    endGiveaway as endGiveawayService,
    createGiveawayEmbed, 
    createGiveawayButtons 
} from '../../services/giveawayService.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName("gend")
        .setDescription(
            "Ends an active giveaway immediately and picks the winner(s).",
        )
        .addStringOption((option) =>
            option
                .setName("messageid")
                .setDescription("The message ID of the giveaway to end.")
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            throw new TitanBotError(
                'Giveaway command used outside guild',
                ErrorTypes.VALIDATION,
                t('giveaway.errors.guild_only', {}, interaction),
                { userId: interaction.user.id }
            );
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            throw new TitanBotError(
                'User lacks ManageGuild permission',
                ErrorTypes.PERMISSION,
                t('giveaway.errors.perm_denied', {}, interaction),
                { userId: interaction.user.id, guildId: interaction.guildId }
            );
        }

        logger.info(`Giveaway end initiated by ${interaction.user.tag} in guild ${interaction.guildId}`);

        const messageId = interaction.options.getString("messageid");

        if (!messageId || !/^\d+$/.test(messageId)) {
            throw new TitanBotError(
                'Invalid message ID format',
                ErrorTypes.VALIDATION,
                'Please provide a valid message ID.',
                { providedId: messageId }
            );
        }

        const giveaways = await getGuildGiveaways(interaction.client, interaction.guildId);
        const giveaway = giveaways.find(g => g.messageId === messageId);

        if (!giveaway) {
            throw new TitanBotError(
                `Giveaway not found: ${messageId}`,
                ErrorTypes.VALIDATION,
                t('giveaway.errors.not_found', {}, interaction),
                { messageId, guildId: interaction.guildId }
            );
        }

        const endResult = await endGiveawayService(
            interaction.client,
            giveaway,
            interaction.guildId,
            interaction.user.id
        );

        const updatedGiveaway = endResult.giveaway;
        const winners = endResult.winners;

        const channel = await interaction.client.channels.fetch(
            updatedGiveaway.channelId,
        ).catch(err => {
            logger.warn(`Could not fetch channel ${updatedGiveaway.channelId}:`, err.message);
            return null;
        });

        if (!channel || !channel.isTextBased()) {
            throw new TitanBotError(
                `Channel not found: ${updatedGiveaway.channelId}`,
                ErrorTypes.VALIDATION,
                t('giveaway.errors.channel_not_found', {}, interaction),
                { channelId: updatedGiveaway.channelId, messageId }
            );
        }

        const message = await channel.messages
            .fetch(messageId)
            .catch(err => {
                logger.warn(`Could not fetch message ${messageId}:`, err.message);
                return null;
            });

        if (!message) {
            throw new TitanBotError(
                `Message not found: ${messageId}`,
                ErrorTypes.VALIDATION,
                t('giveaway.errors.message_not_found', {}, interaction),
                { messageId, channelId: updatedGiveaway.channelId }
            );
        }

        await saveGiveaway(
            interaction.client,
            interaction.guildId,
            updatedGiveaway,
        );

        const newEmbed = createGiveawayEmbed(updatedGiveaway, "ended", winners, interaction);
        const newRow = createGiveawayButtons(true, interaction);

        await message.edit({
            content: t('giveaway.banner_ended', {}, interaction),
            embeds: [newEmbed],
            components: [newRow],
        });

        if (winners.length > 0) {
            const winnerMentions = winners
                .map((id) => `<@${id}>`)
                .join(",");
            const winnerPingMsg = await channel.send({
                content: t('giveaway.end.channel_congrats', {
                    winners: winnerMentions,
                    prize: updatedGiveaway.prize,
                    hostId: updatedGiveaway.hostId,
                }, interaction),
            });
            updatedGiveaway.winnerPingMessageId = winnerPingMsg.id;
            await saveGiveaway(interaction.client, interaction.guildId, updatedGiveaway);

            logger.info(`Giveaway ended with ${winners.length} winner(s): ${messageId}`);

            try {
                await logEvent({
                    client: interaction.client,
                    guildId: interaction.guildId,
                    eventType: EVENT_TYPES.GIVEAWAY_WINNER,
                    data: {
                        description: `Giveaway ended with ${winners.length} winner(s)`,
                        channelId: channel.id,
                        userId: interaction.user.id,
                        fields: [
                            {
                                name: 'Prize',
                                value: updatedGiveaway.prize || 'Mystery Prize!',
                                inline: true
                            },
                            {
                                name: 'Winners',
                                value: winnerMentions,
                                inline: false
                            },
                            {
                                name: 'Entries',
                                value: endResult.participantCount.toString(),
                                inline: true
                            }
                        ]
                    }
                });
            } catch (logError) {
                logger.debug('Error logging giveaway winner event:', logError);
            }
        } else {
            await channel.send({
                content: t('giveaway.end.channel_no_winners', { prize: updatedGiveaway.prize }, interaction),
            });
            logger.info(`Giveaway ended with no winners: ${messageId}`);
        }

        logger.info(`Giveaway successfully ended by ${interaction.user.tag}: ${messageId}`);

        return InteractionHelper.safeReply(interaction, {
            embeds: [
                successEmbed(
                    t('giveaway.end.success_title', {}, interaction),
                    t('giveaway.end.success_desc', {
                        prize: updatedGiveaway.prize,
                        channel: channel.toString(),
                        winnersCount: winners.length,
                        entriesCount: endResult.participantCount,
                    }, interaction),
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
};