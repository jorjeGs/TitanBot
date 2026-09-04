import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/validation.js';
import { t, localizeSlashCommand, localizeOption } from '../../utils/i18n/index.js';

const TEXT_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
];

function resolveTargetChannel(interaction) {
    const selected = interaction.options.getChannel('channel');
    if (selected) {
        return selected;
    }

    if (!interaction.channel || !TEXT_CHANNEL_TYPES.includes(interaction.channel.type)) {
        return null;
    }

    return interaction.channel;
}

export default {
    data: localizeSlashCommand(
        new SlashCommandBuilder()
            .setName('say')
            .setDescription('Send a plain message as the bot')
            .addStringOption((option) =>
                localizeOption(
                    option
                        .setName('message')
                        .setDescription('The message the bot should send')
                        .setRequired(true)
                        .setMaxLength(2000),
                    'say',
                    'message',
                ),
            )
            .addChannelOption((option) =>
                localizeOption(
                    option
                        .setName('channel')
                        .setDescription('Channel to send in (defaults to the current channel)')
                        .addChannelTypes(...TEXT_CHANNEL_TYPES)
                        .setRequired(false),
                    'say',
                    'channel',
                ),
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
            .setDMPermission(false),
        'say',
    ),
    category: 'moderation',
    abuseProtection: { maxAttempts: 8, windowMs: 60_000 },

    async execute(interaction, _config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferSuccess) {
            logger.warn('Say interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'say',
            });
            return;
        }

        const rawMessage = interaction.options.getString('message');
        const message = sanitizeInput(rawMessage, 2000);

        if (!message) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: t('moderation.say.empty_message', {}, interaction),
            });
        }

        const channel = resolveTargetChannel(interaction);
        if (!channel) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: t('moderation.say.invalid_channel', {}, interaction),
            });
        }

        const memberPermissions = channel.permissionsFor(interaction.member);
        const botPermissions = channel.permissionsFor(interaction.guild.members.me);

        if (!memberPermissions?.has(PermissionFlagsBits.SendMessages)) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: t('moderation.say.user_no_perm', { channel: channel.toString() }, interaction),
            });
        }

        if (!botPermissions?.has(PermissionFlagsBits.SendMessages)) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: t('moderation.say.bot_no_perm', { channel: channel.toString() }, interaction),
            });
        }

        const sentMessage = await channel.send({ content: message });

        await logEvent({
            client,
            guild: interaction.guild,
            event: {
                action: 'Bot Message Sent',
                target: `${channel} (${channel.id})`,
                executor: `${interaction.user.tag} (${interaction.user.id})`,
                reason: message.length > 200
                    ? `${message.slice(0, 197)}...`
                    : message,
                metadata: {
                    channelId: channel.id,
                    messageId: sentMessage.id,
                    moderatorId: interaction.user.id,
                    messageLength: message.length,
                },
            },
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    t('moderation.say.success_title', {}, interaction),
                    t('moderation.say.success_desc', { channel: channel.toString(), url: sentMessage.url }, interaction),
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
};
