import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { getColor } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unixtime')
        .setDescription('Get the current Unix timestamp'),

    async execute(interaction) {
        await InteractionHelper.safeExecute(
            interaction,
            async () => {
                const now = new Date();
                const unixTimestamp = Math.floor(now.getTime() / 1000);

                const embed = successEmbed(
                    t('tools.unixtime_title', {}, interaction),
                    `**${t('tools.unixtime_seconds', {}, interaction)}:** \`${unixTimestamp}\`\n` +
                    `**${t('tools.unixtime_millis', {}, interaction)}:** \`${now.getTime()}\`\n\n` +
                    `**${t('tools.unixtime_human', {}, interaction)}:** ${now.toUTCString()}\n` +
                    `**${t('tools.unixtime_iso', {}, interaction)}:** ${now.toISOString()}`
                );
                embed.setColor(getColor('success'));

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed],
                });
            },
            t('tools.unixtime_fail', {}, interaction),
            {
                autoDefer: true,
                deferOptions: { flags: MessageFlags.Ephemeral }
            }
        );
    },
};