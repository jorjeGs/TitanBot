import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, LabelBuilder } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';
import {
    initializeJoinToCreate,
    getChannelConfiguration,
    updateChannelConfig,
    removeTriggerChannel,
    hasManageGuildPermission,
    logConfigurationChange,
    getConfiguration
} from '../../services/joinToCreateService.js';

export default {
    data: new SlashCommandBuilder()
        .setName("jointocreate")
        .setDescription("Manage Join to Create voice channels system.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("setup")
                .setDescription("Set up a new Join to Create voice channel.")
                .addChannelOption((option) =>
                    option
                        .setName("category")
                        .setDescription("Category to create the channel in.")
                        .addChannelTypes(ChannelType.GuildCategory)
                )
                .addStringOption((option) =>
                    option
                        .setName("channel_name")
                        .setDescription("Select a template for naming temporary voice channels.")
                        .addChoices(
                            { name: "{username}'s Room (Default)", value: "{username}'s Room" },
                            { name: "{username}'s Channel", value: "{username}'s Channel" },
                            { name: "{username}'s Lounge", value: "{username}'s Lounge" },
                            { name: "{username}'s Space", value: "{username}'s Space" },
                            { name: "{displayName}'s Room", value: "{displayName}'s Room" },
                            { name: "{username}'s VC", value: "{username}'s VC" },
                            { name: "{username}'s Music Room", value: "{username}'s Music Room" },
                            { name: "{username}'s Gaming Room", value: "{username}'s Gaming Room" },
                            { name: "{username}'s Chat Room", value: "{username}'s Chat Room" },
                            { name: "{username}'s Private Room", value: "{username}'s Private Room" }
                        )
                )
                .addIntegerOption((option) =>
                    option
                        .setName("user_limit")
                        .setDescription("Maximum number of users in temporary channels. (0 = unlimited)")
                )
                .addIntegerOption((option) =>
                    option
                        .setName("bitrate")
                        .setDescription("Bitrate for temporary channels in kbps (8-96).")
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("dashboard")
                .setDescription("Configure an existing Join to Create system.")
                .addChannelOption((option) =>
                    option
                        .setName("trigger_channel")
                        .setDescription("The Join to Create trigger channel to configure.")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice)
                )
        ),
    category: "utility",

    async execute(interaction, config, client) {
        try {
            
            if (!hasManageGuildPermission(interaction.member)) {
                throw new TitanBotError(
                    'User lacks ManageGuild permission',
                    ErrorTypes.PERMISSION,
                    t('jointocreate.perm_denied', interaction)
                );
            }

            const subcommand = interaction.options.getSubcommand();
            await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

            let responseEmbed;

            if (subcommand === "setup") {
                await handleSetupSubcommand(interaction, client);
                return;
            } else if (subcommand === "dashboard") {
                await handleConfigSubcommand(interaction, client);
                return;
            }

        } catch (error) {
            try {
                let errorMessage = 'An error occurred while executing this command.';
                
                if (error instanceof TitanBotError) {
                    errorMessage = error.userMessage || 'An error occurred. Please try again.';
                    logger.debug(`TitanBotError [${error.type}]: ${error.message}`, error.context || {});
                } else {
                    logger.error('Unexpected error in jointocreate command:', error);
                    errorMessage = 'An unexpected error occurred. Please try again or contact support.';
                }

                return replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: errorMessage });
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    }
};

async function handleSetupSubcommand(interaction, client) {
    try {
        const category = interaction.options.getChannel('category');
        const nameTemplate = interaction.options.getString('channel_name') || "{username}'s Room";
        const userLimit = interaction.options.getInteger('user_limit') || 0;
        const bitrate = interaction.options.getInteger('bitrate') || 64;
        const guildId = interaction.guild.id;

        logger.debug(`Setting up Join to Create in guild ${guildId} with template: ${nameTemplate}`);

        const existingConfig = await getConfiguration(client, guildId);
        
        if (Array.isArray(existingConfig.triggerChannels) && existingConfig.triggerChannels.length > 0) {
            const activeTriggerChannels = [];
            const staleTriggerChannelIds = [];

            for (const existingChannelId of existingConfig.triggerChannels) {
                const existingChannel = await interaction.guild.channels.fetch(existingChannelId).catch(() => null);
                if (existingChannel) {
                    activeTriggerChannels.push(existingChannel);
                } else {
                    staleTriggerChannelIds.push(existingChannelId);
                }
            }

            if (staleTriggerChannelIds.length > 0) {
                for (const staleChannelId of staleTriggerChannelIds) {
                    logger.info(`Cleaning up stale JTC trigger ${staleChannelId} from guild ${guildId}`);
                    await removeTriggerChannel(client, guildId, staleChannelId);
                }
            }

            if (activeTriggerChannels.length > 0) {
                const primaryTrigger = activeTriggerChannels[0];
                const errorMessage = t('jointocreate.already_exists', { channel: `${primaryTrigger}` }, interaction);

                throw new TitanBotError(
                    'Guild already has a Join to Create channel',
                    ErrorTypes.VALIDATION,
                    errorMessage,
                    {
                        guildId,
                        activeTriggerCount: activeTriggerChannels.length,
                        expected: true,
                        suppressErrorLog: true
                    }
                );
            }
        }

        logger.debug('Creating Join to Create trigger channel...');
        let triggerChannel = await interaction.guild.channels.create({
            name: 'Join to Create',
            type: ChannelType.GuildVoice,
            parent: category?.id,
            userLimit: 0,
            bitrate: 64000,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                },
            ],
        });

        logger.debug(`Created trigger channel ${triggerChannel.id}, initializing config...`);

        const config = await initializeJoinToCreate(client, guildId, triggerChannel.id, {
            nameTemplate: nameTemplate,
            userLimit: userLimit,
            bitrate: bitrate * 1000,
            categoryId: category?.id
        });

        await logConfigurationChange(client, guildId, interaction.user.id, 'Initialized Join to Create', {
            channelId: triggerChannel.id,
            nameTemplate,
            userLimit,
            bitrate
        });

        logger.info(`Successfully created Join to Create system in guild ${guildId}`);

        const responseEmbed = successEmbed(
            t('jointocreate.setup_complete_title', interaction),
            t('jointocreate.setup_complete_desc', {
                channel: `${triggerChannel}`,
                template: nameTemplate,
                limit: userLimit === 0 ? t('jointocreate.unlimited', interaction) : t('jointocreate.users_count', { count: userLimit }, interaction),
                bitrate: bitrate,
                category: category ? category.name : t('jointocreate.category_root', interaction)
            }, interaction)
        );

        return await InteractionHelper.safeEditReply(interaction, { embeds: [responseEmbed] });

    } catch (error) {
        logger.error('Error in handleSetupSubcommand:', error);
        if (error instanceof TitanBotError) {
            throw error;
        }
        throw new TitanBotError(
            `Setup failed: ${error.message}`,
            ErrorTypes.DISCORD_API,
            t('jointocreate.setup_failed', interaction)
        );
    }
}

async function handleConfigSubcommand(interaction, client) {
    try {
        const triggerChannel = interaction.options.getChannel('trigger_channel');
        const guildId = interaction.guild.id;

        const currentConfig = await getChannelConfiguration(client, guildId, triggerChannel.id);
        const channelConfig = currentConfig.channelConfig || {};

        const configEmbed = new EmbedBuilder()
            .setTitle(t('jointocreate.config_title', interaction))
            .setDescription(t('jointocreate.config_desc', { channel: `${triggerChannel}` }, interaction))
            .setColor(getColor('info'))
            .addFields(
                {
                    name: t('jointocreate.field_template', interaction),
                    value: `\`${channelConfig.nameTemplate || currentConfig.channelNameTemplate || "{username}'s Room"}\``,
                    inline: false
                },
                {
                    name: t('jointocreate.field_user_limit', interaction),
                    value: `${(channelConfig.userLimit ?? currentConfig.userLimit ?? 0) === 0 ? t('jointocreate.unlimited', interaction) : t('jointocreate.users_count', { count: (channelConfig.userLimit ?? currentConfig.userLimit ?? 0) }, interaction)}`,
                    inline: true
                },
                {
                    name: t('jointocreate.field_bitrate', interaction),
                    value: `${(channelConfig.bitrate ?? currentConfig.bitrate ?? 64000) / 1000} kbps`,
                    inline: true
                }
            )
            .setFooter({ text: t('jointocreate.config_footer', interaction) })
            .setTimestamp();

        const nameButton = new ButtonBuilder()
            .setCustomId(`jtc_config_name_${triggerChannel.id}`)
            .setLabel(t('jointocreate.btn_name_template', interaction))
            .setStyle(ButtonStyle.Primary);

        const limitButton = new ButtonBuilder()
            .setCustomId(`jtc_config_limit_${triggerChannel.id}`)
            .setLabel(t('jointocreate.btn_user_limit', interaction))
            .setStyle(ButtonStyle.Primary);

        const bitrateButton = new ButtonBuilder()
            .setCustomId(`jtc_config_bitrate_${triggerChannel.id}`)
            .setLabel(t('jointocreate.btn_bitrate', interaction))
            .setStyle(ButtonStyle.Primary);

        const deleteButton = new ButtonBuilder()
            .setCustomId(`jtc_config_delete_${triggerChannel.id}`)
            .setLabel(t('jointocreate.btn_remove_channel', interaction))
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(nameButton, limitButton, bitrateButton, deleteButton);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [configEmbed],
            components: [row]
        });

        const message = await interaction.fetchReply();

        if (!message || typeof message.createMessageComponentCollector !== 'function') {
            throw new TitanBotError(
                'Failed to fetch interaction reply for collector setup',
                ErrorTypes.DISCORD_API,
                'Failed to open configuration controls. Please run `/jointocreate dashboard` again.'
            );
        }

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async (buttonInteraction) => {
            try {
                
                if (!hasManageGuildPermission(buttonInteraction.member)) {
                    await buttonInteraction.reply({
                        content: `❌ ${t('jointocreate.perm_denied_controls', buttonInteraction)}`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const customId = buttonInteraction.customId;

                if (customId.includes('jtc_config_name_')) {
                    await handleNameTemplateModal(buttonInteraction, triggerChannel, currentConfig, client);
                } else if (customId.includes('jtc_config_limit_')) {
                    await handleUserLimitModal(buttonInteraction, triggerChannel, currentConfig, client);
                } else if (customId.includes('jtc_config_bitrate_')) {
                    await handleBitrateModal(buttonInteraction, triggerChannel, currentConfig, client);
                } else if (customId.includes('jtc_config_delete_')) {
                    await handleChannelDeletion(buttonInteraction, triggerChannel, currentConfig, client);
                }
            } catch (error) {
                const userMessage = error instanceof TitanBotError
                    ? error.userMessage || 'An error occurred.'
                    : 'An error occurred while processing your request.';

                if (error instanceof TitanBotError) {
                    logger.debug(`Button interaction validation error: ${error.message}`, error.context || {});
                } else {
                    logger.error('Unexpected error in config button interaction:', error);
                }

                await buttonInteraction.reply({
                    content: `❌ ${userMessage}`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                nameButton.setDisabled(true),
                limitButton.setDisabled(true),
                bitrateButton.setDisabled(true),
                deleteButton.setDisabled(true)
            );

            message.edit({
                components: [disabledRow],
                embeds: [configEmbed.setFooter({ text: t('jointocreate.session_expired', interaction) })]
            }).catch(() => {});
        });

    } catch (error) {
        if (error instanceof TitanBotError) {
            throw error;
        }
        throw new TitanBotError(
            `Config failed: ${error.message}`,
            ErrorTypes.DATABASE,
            t('jointocreate.load_failed', interaction)
        );
    }
}

async function handleNameTemplateModal(interaction, triggerChannel, currentConfig, client) {
    try {
        const TEMPLATE_OPTIONS = [
            { label: "{username}'s Room (Default)", value: "{username}'s Room" },
            { label: "{username}'s Channel",        value: "{username}'s Channel" },
            { label: "{username}'s Lounge",         value: "{username}'s Lounge" },
            { label: "{username}'s Space",          value: "{username}'s Space" },
            { label: "{displayName}'s Room",        value: "{displayName}'s Room" },
            { label: "{username}'s VC",             value: "{username}'s VC" },
            { label: "{username}'s Music Room",  value: "{username}'s Music Room" },
            { label: "{username}'s Gaming Room", value: "{username}'s Gaming Room" },
            { label: "{username}'s Chat Room",   value: "{username}'s Chat Room" },
            { label: "{username}'s Private Room",   value: "{username}'s Private Room" },
        ];

        const currentTemplate = currentConfig.channelConfig?.nameTemplate
            || currentConfig.channelNameTemplate
            || "{username}'s Room";

        const templateSelect = new StringSelectMenuBuilder()
            .setCustomId('template')
            .setPlaceholder(t('jointocreate.modal_template_placeholder', interaction))
            .setOptions(
                TEMPLATE_OPTIONS.map(o => ({
                    label: o.label,
                    value: o.value,
                    default: o.value === currentTemplate,
                })),
            );

        const templateLabel = new LabelBuilder()
            .setLabel(t('jointocreate.modal_template_label', interaction))
            .setStringSelectMenuComponent(templateSelect);

        const modal = new ModalBuilder()
            .setCustomId(`jtc_name_modal_${triggerChannel.id}`)
            .setTitle(t('jointocreate.modal_template_title', interaction))
            .addLabelComponents(templateLabel);

        await interaction.showModal(modal);

        const modalSubmission = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === `jtc_name_modal_${triggerChannel.id}` && i.user.id === interaction.user.id,
            time: 60000
        });

        if (!hasManageGuildPermission(modalSubmission.member)) {
            await modalSubmission.reply({
                content: `❌ ${t('jointocreate.perm_denied_modify', modalSubmission)}`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const [newTemplate] = modalSubmission.fields.getStringSelectValues('template');

        await updateChannelConfig(client, interaction.guild.id, triggerChannel.id, {
            nameTemplate: newTemplate
        });

        await logConfigurationChange(client, interaction.guild.id, interaction.user.id, 'Updated channel name template', {
            channelId: triggerChannel.id,
            newTemplate
        });

        await modalSubmission.reply({
            embeds: [successEmbed(
                t('jointocreate.updated_title', modalSubmission),
                t('jointocreate.updated_template', { template: newTemplate }, modalSubmission)
            )],
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
            return;
        }
        if (error instanceof TitanBotError) {
            throw error;
        }
        logger.error('Unexpected error in name template modal:', error);
        throw new TitanBotError(
            `Modal error: ${error.message}`,
            ErrorTypes.UNKNOWN,
            'An error occurred while updating the template.'
        );
    }
}

async function handleUserLimitModal(interaction, triggerChannel, currentConfig, client) {
    try {
        const currentLimit = currentConfig.channelConfig?.userLimit ?? currentConfig.userLimit ?? 0;

        const modal = new ModalBuilder()
            .setCustomId(`jtc_limit_modal_${triggerChannel.id}`)
            .setTitle(t('jointocreate.modal_limit_title', interaction))
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('user_limit')
                        .setLabel(t('jointocreate.modal_limit_label', interaction))
                        .setPlaceholder(t('jointocreate.modal_limit_placeholder', interaction))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(2)
                        .setValue(currentLimit.toString())
                )
            );

        await interaction.showModal(modal);

        const modalSubmission = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === `jtc_limit_modal_${triggerChannel.id}` && i.user.id === interaction.user.id,
            time: 60000
        });

        if (!hasManageGuildPermission(modalSubmission.member)) {
            await modalSubmission.reply({
                content: `❌ ${t('jointocreate.perm_denied_modify', modalSubmission)}`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const userInput = modalSubmission.fields.getTextInputValue('user_limit').trim();

        await updateChannelConfig(client, interaction.guild.id, triggerChannel.id, {
            userLimit: parseInt(userInput)
        });

        await logConfigurationChange(client, interaction.guild.id, interaction.user.id, 'Updated user limit', {
            channelId: triggerChannel.id,
            userLimit: parseInt(userInput)
        });

        const userLimitText = parseInt(userInput) === 0 
            ? t('jointocreate.unlimited', modalSubmission) 
            : t('jointocreate.users_count', { count: parseInt(userInput) }, modalSubmission);
        await modalSubmission.reply({
            embeds: [successEmbed(
                t('jointocreate.updated_title', modalSubmission),
                t('jointocreate.updated_limit', { limit: userLimitText }, modalSubmission)
            )],
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
            return;
        }
        if (error instanceof TitanBotError) {
            throw error;
        }
        logger.error('Unexpected error in user limit modal:', error);
        throw new TitanBotError(
            `Modal error: ${error.message}`,
            ErrorTypes.UNKNOWN,
            'An error occurred while updating the user limit.'
        );
    }
}

async function handleBitrateModal(interaction, triggerChannel, currentConfig, client) {
    try {
        const currentBitrate = ((currentConfig.channelConfig.bitrate ?? currentConfig.bitrate ?? 64000) / 1000);

        const modal = new ModalBuilder()
            .setCustomId(`jtc_bitrate_modal_${triggerChannel.id}`)
            .setTitle(t('jointocreate.modal_bitrate_title', interaction))
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('bitrate')
                        .setLabel(t('jointocreate.modal_bitrate_label', interaction))
                        .setPlaceholder(t('jointocreate.modal_bitrate_placeholder', interaction))
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(3)
                        .setValue(currentBitrate.toString())
                )
            );

        await interaction.showModal(modal);

        const modalSubmission = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === `jtc_bitrate_modal_${triggerChannel.id}` && i.user.id === interaction.user.id,
            time: 60000
        });

        if (!hasManageGuildPermission(modalSubmission.member)) {
            await modalSubmission.reply({
                content: `❌ ${t('jointocreate.perm_denied_modify', modalSubmission)}`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const userInput = modalSubmission.fields.getTextInputValue('bitrate').trim();

        await updateChannelConfig(client, interaction.guild.id, triggerChannel.id, {
            bitrate: parseInt(userInput) * 1000
        });

        await logConfigurationChange(client, interaction.guild.id, interaction.user.id, 'Updated bitrate', {
            channelId: triggerChannel.id,
            bitrate: parseInt(userInput)
        });

        await modalSubmission.reply({
            embeds: [successEmbed(
                t('jointocreate.updated_title', modalSubmission),
                t('jointocreate.updated_bitrate', { bitrate: parseInt(userInput) }, modalSubmission)
            )],
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
            return;
        }
        if (error instanceof TitanBotError) {
            throw error;
        }
        logger.error('Unexpected error in bitrate modal:', error);
        throw new TitanBotError(
            `Modal error: ${error.message}`,
            ErrorTypes.UNKNOWN,
            'An error occurred while updating the bitrate.'
        );
    }
}

async function handleChannelDeletion(interaction, triggerChannel, currentConfig, client) {
    try {
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`jtc_delete_confirm_${triggerChannel.id}`)
                .setLabel(t('jointocreate.btn_confirm_delete', interaction))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`jtc_delete_cancel_${triggerChannel.id}`)
                .setLabel(t('jointocreate.btn_cancel', interaction))
                .setStyle(ButtonStyle.Secondary)
        );

        await InteractionHelper.safeReply(interaction, {
            embeds: [warningEmbed(
                t('jointocreate.confirm_delete_title', interaction),
                t('jointocreate.confirm_delete_desc', { channel: triggerChannel.name }, interaction)
            )],
            components: [confirmRow],
            flags: MessageFlags.Ephemeral
        });

        const message = await interaction.fetchReply();
        const deleteCollector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === interaction.user.id && 
                          (i.customId === `jtc_delete_confirm_${triggerChannel.id}` || 
                           i.customId === `jtc_delete_cancel_${triggerChannel.id}`),
            time: 600_000,
            max: 1
        });

        deleteCollector.on('collect', async (buttonInteraction) => {
            try {
                
                if (!hasManageGuildPermission(buttonInteraction.member)) {
                    await buttonInteraction.reply({
                        content: `❌ ${t('jointocreate.perm_denied_remove', buttonInteraction)}`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                if (buttonInteraction.customId === `jtc_delete_confirm_${triggerChannel.id}`) {
                    
                    await removeTriggerChannel(client, interaction.guild.id, triggerChannel.id);

                    await logConfigurationChange(client, interaction.guild.id, interaction.user.id, 'Removed Join to Create trigger', {
                        channelId: triggerChannel.id,
                        channelName: triggerChannel.name
                    });

                    try {
                        if (triggerChannel.members.size === 0) {
                            await triggerChannel.delete('Join to Create trigger removed by administrator');
                        }
                    } catch (deleteError) {
                        logger.warn(`Could not delete channel ${triggerChannel.id}: ${deleteError.message}`);
                        
                    }

                    await buttonInteraction.update({
                        embeds: [successEmbed(
                            t('jointocreate.delete_success_title', buttonInteraction),
                            t('jointocreate.delete_success_desc', { channel: triggerChannel.name }, buttonInteraction)
                        )],
                        components: []
                    });

                } else {
                    await buttonInteraction.update({
                        embeds: [successEmbed(
                            t('jointocreate.delete_cancel_title', buttonInteraction),
                            t('jointocreate.delete_cancel_desc', buttonInteraction)
                        )],
                        components: []
                    });
                }
            } catch (collectError) {
                logger.error('Error handling delete confirmation:', collectError);
                await buttonInteraction.reply({
                    content: `❌ ${t('jointocreate.error_generic', buttonInteraction)}`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        });

        deleteCollector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                message.edit({ components: [] }).catch(() => {});
            }
        });

    } catch (error) {
        if (error instanceof TitanBotError) {
            throw error;
        }
        logger.error('Unexpected error in handleChannelDeletion:', error);
        throw new TitanBotError(
            `Deletion error: ${error.message}`,
            ErrorTypes.UNKNOWN,
            'An error occurred while removing the channel.'
        );
    }
}