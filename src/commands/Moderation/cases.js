import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { getModerationCases } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName('cases')
            .setDescription('View moderation cases and audit logs')
            .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
            .setDMPermission(false)
            .addStringOption((option) =>
                localizeOption(
                    option
                        .setName('filter')
                        .setDescription('Filter cases by type or user')
                        .addChoices(
                            { name: 'All Cases', name_localizations: { 'es-419': 'Todos los casos', 'de': 'Alle Fälle' }, value: 'all' },
                            { name: 'Bans', name_localizations: { 'es-419': 'Baneos', 'de': 'Banns' }, value: 'Member Banned' },
                            { name: 'Kicks', name_localizations: { 'es-419': 'Expulsiones', 'de': 'Kicks' }, value: 'Member Kicked' },
                            { name: 'Timeouts', name_localizations: { 'es-419': 'Aislamientos', 'de': 'Timeouts' }, value: 'Member Timed Out' },
                            { name: 'Warnings', name_localizations: { 'es-419': 'Advertencias', 'de': 'Verwarnungen' }, value: 'User Warned' },
                        ),
                    'cases',
                    'filter',
                ),
            )
            .addUserOption((option) =>
                localizeOption(
                    option
                        .setName('user')
                        .setDescription('Filter cases by specific user'),
                    'cases',
                    'user',
                ),
            )
            .addIntegerOption((option) =>
                localizeOption(
                    option
                        .setName('limit')
                        .setDescription('Number of cases to show (default: 10)')
                        .setMinValue(1)
                        .setMaxValue(50),
                    'cases',
                    'limit',
                ),
            ),
        'cases',
    ),
    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Cases interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'cases'
            });
            return;
        }

        try {
            const filterType = interaction.options.getString('filter') || 'all';
            const targetUser = interaction.options.getUser('user');
            const limit = interaction.options.getInteger('limit') || 10;

            const filters = {
                limit,
                action: filterType === 'all' ? undefined : filterType,
                userId: targetUser?.id
            };

            const cases = await getModerationCases(interaction.guild.id, filters);

            if (cases.length === 0) {
                const emptyMessage = targetUser
                    ? t('moderation.cases.no_cases_user', { user: targetUser.tag }, interaction)
                    : t('moderation.cases.no_cases_filter', { filter: filterType === 'all' ? '' : filterType }, interaction);
                return await replyUserError(interaction, {
                    type: ErrorTypes.USER_INPUT,
                    message: emptyMessage,
                });
            }

            const CASES_PER_PAGE = 5;
            const totalPages = Math.ceil(cases.length / CASES_PER_PAGE);
            let currentPage = 1;

            const createCasesEmbed = (page) => {
                const startIndex = (page - 1) * CASES_PER_PAGE;
                const endIndex = startIndex + CASES_PER_PAGE;
                const pageCases = cases.slice(startIndex, endIndex);

                const embed = createEmbed({
                    title: t('moderation.cases.title', {}, interaction),
                    description: t('moderation.cases.desc', {
                        guild: interaction.guild.name,
                        page,
                        totalPages
                    }, interaction),
                });

                pageCases.forEach((case_) => {
                    const date = new Date(case_.createdAt).toLocaleDateString();
                    const time = new Date(case_.createdAt).toLocaleTimeString();
                    
                    embed.addFields({
                        name: t('moderation.cases.case_field_name', { caseId: case_.caseId, action: case_.action }, interaction),
                        value: t('moderation.cases.case_field_value', {
                            target: case_.target,
                            executor: case_.executor,
                            date,
                            time,
                            reason: case_.reason || t('moderation.no_reason', {}, interaction)
                        }, interaction),
                        inline: false
                    });
                });

                const userText = targetUser
                    ? t('moderation.cases.user_suffix', { user: targetUser.tag }, interaction)
                    : '';

                embed.setFooter({
                    text: t('moderation.cases.footer', {
                        total: cases.length,
                        filter: filterType,
                        userText
                    }, interaction)
                });

                return embed;
            };

            const createNavigationRow = (page) => {
                const row = new ActionRowBuilder();
                
                const prevButton = new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel(t('moderation.cases.btn_prev', {}, interaction))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1);

                const pageInfoButton = new ButtonBuilder()
                    .setCustomId('page_info')
                    .setLabel(t('moderation.cases.btn_page', { page, total: totalPages }, interaction))
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel(t('moderation.cases.btn_next', {}, interaction))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages);

                row.addComponents(prevButton, pageInfoButton, nextButton);
                return row;
            };

            const message = await interaction.editReply({ 
                embeds: [createCasesEmbed(currentPage)], 
                components: [createNavigationRow(currentPage)]
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000
            });

            collector.on('collect', async (buttonInteraction) => {
                await buttonInteraction.deferUpdate();

                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.followUp({
                        content: t('moderation.cases.btn_unauthorized', {}, buttonInteraction),
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const { customId } = buttonInteraction;

                if (customId === 'prev_page' && currentPage > 1) {
                    currentPage--;
                } else if (customId === 'next_page' && currentPage < totalPages) {
                    currentPage++;
                }

                await interaction.editReply({
                    embeds: [createCasesEmbed(currentPage)],
                    components: [createNavigationRow(currentPage)]
                });
            });

            collector.on('end', async () => {
                const disabledRow = createNavigationRow(currentPage);
                disabledRow.components.forEach(button => button.setDisabled(true));
                
                try {
                    await message.edit({
                        components: [disabledRow]
                    });
                } catch (error) {
                }
            });

        } catch (error) {
            logger.error('Error in cases command:', error);
            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: t('moderation.cases.error_cases', {}, interaction),
            });
        }
    }
};