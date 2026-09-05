import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';

const SLUT_COOLDOWN = 45 * 60 * 1000;

const SLUT_ACTIVITIES = [
    { key: "cam_stream", name: "Cam Stream", min: 120, max: 450, risk: 0.2 },
    { key: "private_dance", name: "Private Dance Session", min: 220, max: 700, risk: 0.25 },
    { key: "club_host", name: "After-Hours Club Host", min: 320, max: 900, risk: 0.3 },
    { key: "companion_booking", name: "VIP Companion Booking", min: 550, max: 1400, risk: 0.35 },
    { key: "exclusive_stream", name: "Exclusive Livestream", min: 850, max: 2200, risk: 0.4 },
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function resolveOutcome(activity, wallet) {
    const successChance = Math.max(0.35, 0.55 - activity.risk * 0.2);
    const fineChance = 0.22;
    const robbedChance = 0.2;
    const roll = Math.random();

    if (roll < successChance) {
        const amount = randomInt(activity.min, activity.max);
        const msgKey = randomChoice(['pos_1', 'pos_2', 'pos_3', 'pos_4']);
        return {
            type: 'payout',
            delta: amount,
            msgKey
        };
    }

    const remainingAfterSuccess = roll - successChance;

    if (remainingAfterSuccess < fineChance) {
        const maxFine = Math.min(wallet, Math.max(150, Math.floor(activity.max * 0.4)));
        const minFine = Math.min(maxFine, Math.max(50, Math.floor(activity.min * 0.2)));
        const amount = maxFine > 0 ? randomInt(minFine, maxFine) : 0;
        const msgKey = randomChoice(['fine_1', 'fine_2', 'fine_3']);
        return {
            type: 'fine',
            delta: -amount,
            msgKey
        };
    }

    if (remainingAfterSuccess < fineChance + robbedChance) {
        const maxRobbed = Math.min(wallet, Math.max(200, Math.floor(wallet * 0.35)));
        const minRobbed = Math.min(maxRobbed, Math.max(75, Math.floor(wallet * 0.1)));
        const amount = maxRobbed > 0 ? randomInt(minRobbed, maxRobbed) : 0;
        const msgKey = randomChoice(['robbed_1', 'robbed_2', 'robbed_3']);
        return {
            type: 'robbed',
            delta: -amount,
            msgKey
        };
    }

    const maxLoss = Math.min(wallet, Math.max(100, Math.floor(activity.max * 0.3)));
    const minLoss = Math.min(maxLoss, Math.max(40, Math.floor(activity.min * 0.15)));
    const amount = maxLoss > 0 ? randomInt(minLoss, maxLoss) : 0;
    const msgKey = randomChoice(['loss_1', 'loss_2', 'loss_3']);
    return {
        type: 'loss',
        delta: -amount,
        msgKey
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName('slut')
        .setDescription('Take a risky provocative job for random payout or loss'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const now = Date.now();

            logger.debug(`[ECONOMY] Slut command started for ${userId}`, { userId, guildId });

            const userData = await getEconomyData(client, guildId, userId);

            if (!userData) {
                throw createError(
                    "Failed to load economy data for slut command",
                    ErrorTypes.DATABASE,
                    t('economy:error_load_data', interaction),
                    { userId, guildId }
                );
            }

            const lastSlut = userData.lastSlut || 0;

            if (now - lastSlut < SLUT_COOLDOWN) {
                const remainingTime = lastSlut + SLUT_COOLDOWN - now;
                throw createError(
                    "Slut cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    t('economy:slut_cooldown', { time: Math.ceil(remainingTime / 60000) }, interaction),
                    { timeRemaining: remainingTime, cooldownType: 'slut' }
                );
            }

            const activity = randomChoice(SLUT_ACTIVITIES);

            const outcome = resolveOutcome(activity, userData.wallet || 0);

            userData.lastSlut = now;
            userData.totalSluts = (userData.totalSluts || 0) + 1;
            userData.totalSlutEarnings = (userData.totalSlutEarnings || 0) + Math.max(0, outcome.delta);
            userData.totalSlutLosses = (userData.totalSlutLosses || 0) + Math.max(0, -outcome.delta);

            if (outcome.type !== 'payout') {
                userData.failedSluts = (userData.failedSluts || 0) + 1;
            }

            userData.wallet = Math.max(0, (userData.wallet || 0) + outcome.delta);

            await setEconomyData(client, guildId, userId, userData);

            logger.info(`[ECONOMY_TRANSACTION] Slut activity resolved`, {
                userId,
                guildId,
                activity: activity.name,
                outcomeType: outcome.type,
                amountDelta: outcome.delta,
                newWallet: userData.wallet,
                timestamp: new Date().toISOString()
            });

            const activityName = t(`economy:slut_activities.${activity.key}`, interaction);
            const outcomeName = t(`economy:slut_outcomes.${outcome.type}`, interaction);
            const outcomeTitle = `${activityName} - ${outcomeName}`;
            const message = t(`economy:slut_messages.${outcome.msgKey}`, interaction);

            const amountLabel = `${outcome.delta >= 0 ? '+' : '-'}$${Math.abs(outcome.delta).toLocaleString()}`;
            const summaryLines = [
                `${message}`,
                t('economy:slut_net_result', { amount: amountLabel }, interaction),
                t('economy:slut_current_balance', { balance: userData.wallet.toLocaleString() }, interaction),
                t('economy:slut_total_sessions', { count: userData.totalSluts }, interaction),
                t('economy:slut_total_earned', { amount: (userData.totalSlutEarnings || 0).toLocaleString() }, interaction),
                t('economy:slut_total_lost', { amount: (userData.totalSlutLosses || 0).toLocaleString() }, interaction),
            ];

            const embed = createEmbed({
                title: outcomeTitle,
                description: summaryLines.join('\n'),
                color: outcome.delta >= 0 ? 'success' : 'error',
                timestamp: true
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'slut' })
};