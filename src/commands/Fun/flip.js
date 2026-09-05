import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName("flip")
    .setDescription("Flips a coin (Heads or Tails)."),
  category: 'Fun',

  async execute(interaction, config, client) {
    const isHeads = Math.random() < 0.5;
    const resultKey = isHeads ? 'fun.flip_heads' : 'fun.flip_tails';
    const result = t(resultKey, interaction);
    const emoji = isHeads ? "🪙" : "🔮";

    const embed = successEmbed(
      t('fun.flip_title', interaction),
      t('fun.flip_result', { result, emoji }, interaction)
    );

    await InteractionHelper.safeReply(interaction, { embeds: [embed] });
    logger.debug(`Flip command executed by user ${interaction.user.id} in guild ${interaction.guildId}`);
  },
};