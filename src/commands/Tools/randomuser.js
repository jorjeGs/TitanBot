import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { getColor } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('randomuser')
        .setDescription('Select a random user from the server')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Limit selection to users with this role')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('bots')
                .setDescription('Include bots in the selection (default: false)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('online')
                .setDescription('Only select from online users (default: false)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('mention')
                .setDescription('Mention the selected user (default: false)')
                .setRequired(false)),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`RandomUser interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'randomuser'
            });
            return;
        }

        if (!interaction.guild) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: t('tools.randomuser_guild_only', {}, interaction),
            });
        }

        const role = interaction.options.getRole('role');
        const includeBots = interaction.options.getBoolean('bots') || false;
        const onlineOnly = interaction.options.getBoolean('online') || false;
        const shouldMention = interaction.options.getBoolean('mention') || false;

        let members = interaction.guild.members.cache.filter(member => {
            if (member.user.bot && !includeBots) return false;

            if (onlineOnly && member.presence?.status === 'offline') return false;

            if (role && !member.roles.cache.has(role.id)) return false;

            return true;
        });

        let memberArray = Array.from(members.values());

        if (!includeBots) {
            memberArray = memberArray.filter(member => !member.user.bot);
        }

        if (memberArray.length === 0) {
            let errorMessage;
            if (role && onlineOnly) errorMessage = t('tools.randomuser_no_role_online', { role: role.name }, interaction);
            else if (role) errorMessage = t('tools.randomuser_no_role', { role: role.name }, interaction);
            else if (onlineOnly) errorMessage = t('tools.randomuser_no_online', {}, interaction);
            else errorMessage = t('tools.randomuser_no_users', {}, interaction);

            return replyUserError(interaction, {
                type: ErrorTypes.USER_INPUT,
                message: errorMessage,
            });
        }

        const randomIndex = Math.floor(Math.random() * memberArray.length);
        const selectedMember = memberArray[randomIndex];

        const user = selectedMember.user;
        const joinDate = selectedMember.joinedAt;
        const roles = selectedMember.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .slice(0, 10);

        const embed = successEmbed(
            t('tools.randomuser_selected_title', {}, interaction),
            shouldMention ? `${selectedMember}` : `**${user.username}**`
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: t('tools.randomuser_field_username', {}, interaction), value: user.username, inline: true },
            { name: t('tools.randomuser_field_bot', {}, interaction), value: user.bot ? t('tools.randomuser_yes', {}, interaction) : t('tools.randomuser_no', {}, interaction), inline: true },
            { name: t('tools.randomuser_field_roles', { count: roles.length }, interaction), value: roles.length > 0 ? roles.slice(0, 5).join('') + (roles.length > 5 ? ` +${roles.length - 5} more` : '') : t('tools.randomuser_no_roles', {}, interaction), inline: false }
        )
        .setColor('primary');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`randomuser_${interaction.user.id}_again`)
                    .setLabel(t('tools.randomuser_btn_again', {}, interaction))
                    .setStyle(ButtonStyle.Primary)
            );

        const response = await interaction.editReply({
            content: shouldMention ? t('tools.randomuser_chosen', { user: selectedMember.toString() }, interaction) : null,
            embeds: [embed],
            components: [row],
            allowedMentions: { users: shouldMention ? [user.id] : [] }
        });

        const filter = (i) => i.customId === `randomuser_${interaction.user.id}_again` && i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async (i) => {
            try {
                let newMembers = interaction.guild.members.cache.filter(member => {
                    if (member.user.bot && !includeBots) return false;

                    if (onlineOnly && member.presence?.status === 'offline') return false;

                    if (role && !member.roles.cache.has(role.id)) return false;

                    return true;
                });

                let newMemberArray = Array.from(newMembers.values());

                if (!includeBots) {
                    newMemberArray = newMemberArray.filter(member => !member.user.bot);
                }

                if (newMemberArray.length === 0) {
                    await replyUserError(i, {
                        type: ErrorTypes.USER_INPUT,
                        message: t('tools.randomuser_no_users', {}, i),
                    });
                    return;
                }

                const newRandomIndex = Math.floor(Math.random() * newMemberArray.length);
                const newSelectedMember = newMemberArray[newRandomIndex];
                const newUser = newSelectedMember.user;

                const newRoles = newSelectedMember.roles.cache
                    .filter(r => r.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.toString())
                    .slice(0, 10);

                const newEmbed = successEmbed(
                    t('tools.randomuser_selected_title', {}, i),
                    shouldMention ? `${newSelectedMember}` : `**${newUser.username}**`
                )
                .setThumbnail(newUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: t('tools.randomuser_field_username', {}, i), value: newUser.username, inline: true },
                    { name: t('tools.randomuser_field_bot', {}, i), value: newUser.bot ? t('tools.randomuser_yes', {}, i) : t('tools.randomuser_no', {}, i), inline: true },
                    { name: t('tools.randomuser_field_roles', { count: newRoles.length }, i), value: newRoles.length > 0 ? newRoles.slice(0, 5).join('') + (newRoles.length > 5 ? ` +${newRoles.length - 5} more` : '') : t('tools.randomuser_no_roles', {}, i), inline: false }
                )
                .setColor(newSelectedMember.displayHexColor || '#3498db');

                await i.update({
                    content: shouldMention ? t('tools.randomuser_chosen', { user: newSelectedMember.toString() }, i) : null,
                    embeds: [newEmbed],
                    components: [row],
                    allowedMentions: { users: shouldMention ? [newUser.id] : [] }
                });

            } catch (error) {
                logger.error('Button interaction error:', error);
                await i.reply({
                    content: t('tools.randomuser_err_again', {}, i),
                    flags: ['Ephemeral']
                });
            }
        });

        collector.on('end', () => {
            const disabledRow = ActionRowBuilder.from(row).setComponents(
                ButtonBuilder.from(row.components[0]).setDisabled(true)
            );

            interaction.editReply({ components: [disabledRow] }).catch(console.error);
        });
    },
};