import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t, localizeSlashCommand } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Checks the bot's latency and API speed"),
        'ping',
    ),

    async prefixExecute(interaction) {
        try {
            const startTime = Date.now();
            const pingingMessage = await interaction.reply({ content: t('core.ping.pinging', {}, interaction) });

            const latency = Date.now() - startTime;
            const apiLatency = Math.max(0, Math.round(interaction.client.ws.ping));

            const embed = createEmbed({ title: t('core.ping.pong', {}, interaction), description: null }).addFields(
                { name: t('core.ping.bot_latency', {}, interaction), value: `${latency}ms`, inline: true },
                { name: t('core.ping.api_latency', {}, interaction), value: `${apiLatency}ms`, inline: true },
            );

            await pingingMessage.edit({ content: null, embeds: [embed] });
        } catch (error) {
            logger.error('Ping prefix command error:', error);
            if (!interaction.replied && !interaction._replyMessage) {
                await interaction.channel.send({
                    embeds: [createEmbed({ title: t('core.ping.error_title', {}, interaction), description: t('core.ping.error_desc', {}, interaction), color: 'error' })],
                }).catch(() => {});
            }
        }
    },

    async execute(interaction) {
        logger.info('execute called - checking if slash command or prefix command');
        logger.info(`execute - has _commandStartTime: ${!!interaction._commandStartTime}, createdTimestamp: ${interaction.createdTimestamp}`);
        
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Ping interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'ping'
            });
            return;
        }

        try {
            await InteractionHelper.safeEditReply(interaction, {
                content: t('core.ping.pinging', {}, interaction),
            });

            const startTime = interaction._commandStartTime || interaction.createdTimestamp;
            logger.info(`execute - using startTime: ${startTime}, type: ${interaction._commandStartTime ? 'prefix' : 'slash'}`);
            const latency = Math.max(0, Date.now() - startTime);
            const apiLatency = Math.max(0, Math.round(interaction.client.ws.ping));
            logger.info(`execute - calculated latency: ${latency}ms, apiLatency: ${apiLatency}ms`);

            const embed = createEmbed({ title: t('core.ping.pong', {}, interaction), description: null }).addFields(
                { name: t('core.ping.bot_latency', {}, interaction), value: `${latency}ms`, inline: true },
                { name: t('core.ping.api_latency', {}, interaction), value: `${apiLatency}ms`, inline: true },
            );

            await InteractionHelper.safeEditReply(interaction, {
                content: null,
                embeds: [embed],
            });
        } catch (error) {
            logger.error('Ping command error:', error);
            try {
                return await InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({ title: t('core.ping.error_title', {}, interaction), description: t('core.ping.error_desc', {}, interaction), color: 'error' })],
                    flags: MessageFlags.Ephemeral,
                });
            } catch (replyError) {
                logger.error('Failed to send error reply:', replyError);
            }
        }
    },
};