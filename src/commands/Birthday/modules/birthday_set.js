import { EmbedBuilder } from 'discord.js';
import { setBirthday } from '../../../services/birthdayService.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { t } from '../../../utils/i18n/index.js';

export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const month = interaction.options.getInteger("month");
        const day = interaction.options.getInteger("day");
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        const result = await setBirthday(client, guildId, userId, month, day);

        const localizedMonth = t(`birthday.months.${result.data.month}`, {}, interaction);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(t('birthday.set.success_title', {}, interaction))
            .setDescription(t('birthday.set.success_desc', { month: localizedMonth, day: result.data.day }, interaction));

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });
    }
};