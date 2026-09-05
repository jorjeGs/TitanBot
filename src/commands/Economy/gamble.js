import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';
import { formatDuration } from '../../utils/embeds.js';

const BASE_WIN_CHANCE = 0.4;
const CLOVER_WIN_BONUS = 0.1;
const CHARM_WIN_BONUS = 0.08;
const PAYOUT_MULTIPLIER = 2.0;
const GAMBLE_COOLDOWN = 5 * 60 * 1000;

export default {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble your money for a chance to win more')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount of cash to gamble')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
            const userId = interaction.user.id;
            const guildId = interaction.guildId;
            const betAmount = interaction.options.getInteger("amount");
            const now = Date.now();

            const userData = await getEconomyData(client, guildId, userId);

            if (!userData) {
                throw createError(
                    "Failed to load economy data",
                    ErrorTypes.DATABASE,
                    t('economy:error_load_data', interaction),
                    { userId, guildId }
                );
            }

            const lastGamble = userData.lastGamble || 0;
            let cloverCount = userData.inventory["lucky_clover"] || 0;
            let charmCount = userData.inventory["lucky_charm"] || 0;

            if (now < lastGamble + GAMBLE_COOLDOWN) {
                const remaining = lastGamble + GAMBLE_COOLDOWN - now;
                throw createError(
                    "Gamble cooldown active",
                    ErrorTypes.RATE_LIMIT,
                    t('economy:gamble_cooldown', { time: formatDuration(remaining) }, interaction),
                    { remaining, cooldownType: 'gamble' }
                );
            }

            if (userData.wallet < betAmount) {
                throw createError(
                    "Insufficient cash for gamble",
                    ErrorTypes.VALIDATION,
                    t('economy:gamble_err_insufficient', { wallet: userData.wallet.toLocaleString(), bet: betAmount.toLocaleString() }, interaction),
                    { required: betAmount, current: userData.wallet }
                );
            }

            let winChance = BASE_WIN_CHANCE;
            let cloverMessage = "";
            let usedClover = false;
            let usedCharm = false;

            if (cloverCount > 0) {
                winChance += CLOVER_WIN_BONUS;
                userData.inventory["lucky_clover"] -= 1;
                cloverMessage = t('economy:gamble_clover_bonus', interaction);
                usedClover = true;
            }
            
            else if (charmCount > 0) {
                winChance += CHARM_WIN_BONUS;
                userData.inventory["lucky_charm"] -= 1;
                cloverMessage = t('economy:gamble_charm_bonus', { remaining: charmCount - 1 }, interaction);
                usedCharm = true;
            }

            const win = Math.random() < winChance;
            let cashChange = 0;
            let resultEmbed;

            if (win) {
                const amountWon = Math.floor(betAmount * PAYOUT_MULTIPLIER);
                cashChange = amountWon - betAmount;

                resultEmbed = successEmbed(
                    t('economy:gamble_title_won', interaction),
                    t('economy:gamble_success', { bet: betAmount.toLocaleString(), payout: amountWon.toLocaleString(), bonus: cloverMessage }, interaction),
                );
            } else {
                cashChange = -betAmount;

                resultEmbed = warningEmbed(
                    t('economy:gamble_title_lost', interaction),
                    t('economy:gamble_fail', { bet: betAmount.toLocaleString() }, interaction),
                );
            }

            userData.wallet = (userData.wallet || 0) + cashChange;
            userData.lastGamble = now;

            await setEconomyData(client, guildId, userId, userData);

            const newCash = userData.wallet;

            resultEmbed.addFields({
                name: t('economy:gamble_new_balance', interaction),
                value: `$${newCash.toLocaleString()}`,
                inline: true,
            });

            if (usedClover) {
                resultEmbed.setFooter({
                    text: t('economy:gamble_footer_clover', { count: userData.inventory["lucky_clover"], chance: Math.round(winChance * 100) }, interaction),
                });
            } else if (usedCharm) {
                resultEmbed.setFooter({
                    text: t('economy:gamble_footer_charm', { count: userData.inventory["lucky_charm"], chance: Math.round(winChance * 100) }, interaction),
                });
            } else {
                resultEmbed.setFooter({
                    text: t('economy:gamble_footer_normal', { chance: Math.round(BASE_WIN_CHANCE * 100) }, interaction),
                });
            }

            await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'gamble' })
};