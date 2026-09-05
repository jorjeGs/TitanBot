import { createEmbed } from '../../../utils/embeds.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { logEvent, EVENT_TYPES, resolveLogChannel } from '../../../services/loggingService.js';
import { formatLogLine, resolveUserAuthor } from '../../../utils/logging/logEmbeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
import { logger } from '../../../utils/logger.js';
import { t } from '../../../utils/i18n/index.js';

export default {
    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { ephemeral: true });
        if (!deferSuccess) {
            logger.warn('Report interaction defer failed', { userId: interaction.user.id, guildId: interaction.guildId });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const guildId = interaction.guildId;

        const guildConfig = await getGuildConfig(client, guildId);
        const reportChannelId = resolveLogChannel(guildConfig, 'reports');

        if (!reportChannelId) {
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: t('utility.report_no_channel', {}, interaction) });
        }

        const ownerMention = interaction.guild.ownerId
            ? t('utility.report_owner_mention', { ownerId: interaction.guild.ownerId }, interaction)
            : t('utility.report_new_report', {}, interaction);

        await logEvent({
            client,
            guildId,
            eventType: EVENT_TYPES.REPORT_FILE,
            content: ownerMention,
            data: {
                title: t('utility.report_title_log', {}, interaction),
                lines: [
                    formatLogLine(t('utility.report_reported_user', {}, interaction), `${targetUser.tag} (\`${targetUser.id}\`)`),
                    formatLogLine(t('utility.report_reported_by', {}, interaction), `${interaction.user.tag} (\`${interaction.user.id}\`)`),
                    formatLogLine(t('utility.report_channel_field', {}, interaction), interaction.channel.toString()),
                ],
                blockFields: [{ name: t('utility.report_reason_field', {}, interaction), value: reason }],
                author: await resolveUserAuthor(client, targetUser.id),
                thumbnail: targetUser.displayAvatarURL(),
            },
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: t('utility.report_submitted_title', {}, interaction),
                description: t('utility.report_submitted_desc', { user: targetUser.tag }, interaction),
            })],
        });

        logger.info('Report submitted', {
            userId: interaction.user.id,
            reportedUserId: targetUser.id,
            guildId,
            reasonLength: reason.length,
        });
    },
};
