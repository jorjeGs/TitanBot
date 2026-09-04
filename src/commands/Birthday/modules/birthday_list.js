import { EmbedBuilder } from 'discord.js';
import { getAllBirthdays } from '../../../services/birthdayService.js';
import { deleteBirthday } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { t } from '../../../utils/i18n/index.js';
export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const guildId = interaction.guildId;

        const sortedBirthdays = await getAllBirthdays(client, guildId);

        if (sortedBirthdays.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(t('birthday.list.title', {}, interaction))
                .setDescription(t('birthday.list.none', {}, interaction));
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        const userIds = sortedBirthdays.map(b => b.userId);
        const fetchedMembers = await interaction.guild.members.fetch({ user: userIds }).catch(() => null);

        let birthdayList = '';
        let displayIndex = 0;
        const staleUserIds = [];

        for (const birthday of sortedBirthdays) {
            if (fetchedMembers && !fetchedMembers.has(birthday.userId)) {
                staleUserIds.push(birthday.userId);
                continue;
            }
            displayIndex++;
            const localizedMonth = t(`birthday.months.${birthday.month}`, {}, interaction);
            birthdayList += `${displayIndex}. <@${birthday.userId}> - ${birthday.day} ${localizedMonth}\n`;
        }

        if (fetchedMembers && staleUserIds.length > 0) {
            for (const userId of staleUserIds) {
                deleteBirthday(client, guildId, userId).catch(() => null);
            }
        }

        if (displayIndex === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(t('birthday.list.title', {}, interaction))
                .setDescription(t('birthday.list.none_current', {}, interaction));
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        const countHeader = t('birthday.list.header', { count: displayIndex, guild: interaction.guild.name }, interaction);
        const totalFooter = t('birthday.list.total', { count: displayIndex }, interaction);
        birthdayList = `${countHeader}\n\n` + birthdayList;

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(t('birthday.list.title', {}, interaction))
            .setDescription(`${birthdayList}\n\n${totalFooter}`);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Birthday list retrieved successfully', {
            userId: interaction.user.id,
            guildId,
            birthdayCount: displayIndex,
            staleRemoved: staleUserIds.length,
            commandName: 'birthday_list'
        });
    }
};