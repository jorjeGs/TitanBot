import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { replyUserError, ErrorTypes } from '../utils/errorHandler.js';
import { t } from '../utils/i18n/index.js';

function createControlButtons(countdownId, isPaused = false, context = null) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`countdown_pause:${countdownId}`)
            .setLabel(isPaused ? t('tools.countdown_btn_resume', {}, context) : t('tools.countdown_btn_pause', {}, context))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`countdown_cancel:${countdownId}`)
            .setLabel(t('tools.countdown_btn_cancel', {}, context))
            .setStyle(ButtonStyle.Danger),
    );
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [
        h > 0 ? h.toString().padStart(2, "0") : null,
        m.toString().padStart(2, "0"),
        s.toString().padStart(2, "0"),
    ]
        .filter(Boolean)
        .join(":");
}

function startCountdown(countdownId, countdownData, activeCountdowns) {
    if (countdownData.interval) {
        clearInterval(countdownData.interval);
        countdownData.interval = null;
    }

    logger.info(`Countdown started: ${countdownData.title} (${countdownData.remainingTime / 1000}s remaining)`);

    countdownData.interval = setInterval(async () => {
        try {
            if (countdownData.isPaused) return;

            const now = Date.now();
            const remaining = Math.max(0, countdownData.endTime - now);
            countdownData.remainingTime = remaining;

            if (now - countdownData.lastUpdate >= 1000) {
                countdownData.lastUpdate = now;

                const embed = successEmbed(
                    `⏱️ ${countdownData.title}`,
                    t('tools.countdown_remaining', { time: formatTime(Math.ceil(remaining / 1000)) }, countdownData.guildId),
                );

                try {
                    await countdownData.message.edit({
                        embeds: [embed],
                        components: [
                            createControlButtons(
                                countdownId,
                                countdownData.isPaused,
                                countdownData.guildId,
                            ),
                        ],
                    });
                } catch (error) {
                    logger.error("Error updating countdown message:", error);
                }
            }

            if (remaining <= 0) {
                clearInterval(countdownData.interval);

                const finishedEmbed = successEmbed(
                    t('tools.countdown_finished_title', { title: countdownData.title }, countdownData.guildId),
                    t('tools.countdown_finished_desc', {}, countdownData.guildId),
                );

                await countdownData.message.edit({
                    embeds: [finishedEmbed],
                    components: [],
                });

                cleanupCountdown(countdownId, activeCountdowns);
            }
        } catch (error) {
            logger.error("Countdown update error:", error);
            cleanupCountdown(countdownId, activeCountdowns);
        }
    }, 100);
}

function cleanupCountdown(countdownId, activeCountdowns) {
    const countdownData = activeCountdowns.get(countdownId);
    if (countdownData) {
        clearInterval(countdownData.interval);
        activeCountdowns.delete(countdownId);
    }
}

async function countdownButtonHandler(interaction, client, args) {
    try {
        const { activeCountdowns } = await import('../commands/Tools/countdown.js');
        const action = args[0];
        const countdownId = args[1];

        const countdownData = activeCountdowns.get(countdownId);
        if (!countdownData) {
            return await interaction.reply({
                content: t('tools.countdown_expired_or_cancelled', {}, interaction),
                flags: ["Ephemeral"],
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: t('tools.countdown_perm_manage_messages', {}, interaction),
                flags: ["Ephemeral"],
            });
        }

        switch (action) {
            case "pause":
                if (countdownData.isPaused) {
                    countdownData.isPaused = false;
                    countdownData.endTime = Date.now() + countdownData.remainingTime;
                    startCountdown(countdownId, countdownData, activeCountdowns);

                    const currentEmbed = countdownData.message.embeds[0];
                    await countdownData.message.edit({
                        embeds: [currentEmbed],
                        components: [createControlButtons(countdownId, false, interaction)],
                    });

                    await interaction.reply({
                        content: t('tools.countdown_resumed', {}, interaction),
                        flags: ["Ephemeral"],
                    });
                } else {
                    clearInterval(countdownData.interval);
                    countdownData.isPaused = true;
                    countdownData.remainingTime = countdownData.endTime - Date.now();

                    const currentEmbed = countdownData.message.embeds[0];
                    await countdownData.message.edit({
                        embeds: [currentEmbed],
                        components: [createControlButtons(countdownId, true, interaction)],
                    });

                    await interaction.reply({
                        content: t('tools.countdown_paused', {}, interaction),
                        flags: ["Ephemeral"],
                    });
                }
                break;

            case "cancel":
                clearInterval(countdownData.interval);

                const embed = successEmbed(
                    t('tools.countdown_cancelled_title', { title: countdownData.title }, interaction),
                    t('tools.countdown_cancelled_desc', {}, interaction),
                );

                await countdownData.message.edit({
                    embeds: [embed],
                    components: [],
                });

                cleanupCountdown(countdownId, activeCountdowns);

                await interaction.reply({
                    content: t('tools.countdown_cancelled', {}, interaction),
                    flags: ["Ephemeral"],
                });
                break;
        }
    } catch (error) {
        logger.error('Countdown button handler error:', error);
        try {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('tools.countdown_err_control', {}, interaction) });
        } catch (err) {
            logger.error('Failed to send error message:', err);
        }
    }
}

export { createControlButtons, formatTime, startCountdown, cleanupCountdown, countdownButtonHandler };
export default countdownButtonHandler;