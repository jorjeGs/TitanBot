import { EmbedBuilder } from 'discord.js';
import { getUpcomingBirthdays } from '../../../services/birthdayService.js';
import { deleteBirthday } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { t } from '../../../utils/i18n/index.js';

export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const next5 = await getUpcomingBirthdays(client, interaction.guildId, 5);

        if (next5.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(t('birthday.next.title', {}, interaction))
                .setDescription(t('birthday.next.none', {}, interaction));
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                deleteBirthday(client, interaction.guildId, birthday.userId).catch(() => null);
                continue;
            }
            displayIndex++;

            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = '🎉 **Today!**';
            } else if (birthday.daysUntil === 1) {
                timeUntil = '📅 **Tomorrow!**';
            } else {
                timeUntil = `In ${birthday.daysUntil} day${birthday.daysUntil > 1 ? 's' : ''}`;
            }
        }

        if (displayIndex === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(t('birthday.next.title', {}, interaction))
                .setDescription(t('birthday.next.none_current', {}, interaction));
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let birthdayList = t('birthday.next.header', { guild: interaction.guild.name }, interaction);
        displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                continue;
            }
            displayIndex++;

            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = t('birthday.next.today', {}, interaction);
            } else if (birthday.daysUntil === 1) {
                timeUntil = t('birthday.next.tomorrow', {}, interaction);
            } else {
                timeUntil = t('birthday.next.in_days', { days: birthday.daysUntil }, interaction);
            }
            const localizedMonth = t(`birthday.months.${birthday.month}`, {}, interaction);
            birthdayList += `${displayIndex}. **${member.displayName}**\n<@${birthday.userId}>\n📅 **${t('birthday.info.date', {}, interaction)}:** ${birthday.day} ${localizedMonth}\n⏰ **${t('birthday.next.time_until', {}, interaction)}:** ${timeUntil}\n\n`;
        }

        birthdayList += t('birthday.next.footer_cta', {}, interaction);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(t('birthday.next.title', {}, interaction))
            .setDescription(birthdayList);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Next birthdays retrieved successfully', {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            upcomingCount: displayIndex,
            commandName: 'next_birthdays'
        });
    }
};