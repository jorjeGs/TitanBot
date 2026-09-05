import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { infoEmbed, successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { verifyUser } from '../../services/verificationService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { t } from '../../utils/i18n/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify yourself and gain access to the server'),

    async execute(interaction, config, client) {
        const guild = interaction.guild;

        const result = await verifyUser(client, guild.id, interaction.user.id, {
            source: 'command_self',
            moderatorId: null
        });

        if (result.status === 'already_verified') {
            return await InteractionHelper.safeReply(interaction, {
                embeds: [infoEmbed(
                    t('verification.already_verified_title', interaction),
                    t('verification.already_verified', interaction)
                )],
                flags: MessageFlags.Ephemeral
            });
        }

        await InteractionHelper.safeReply(interaction, {
            embeds: [successEmbed(
                t('verification.success_title', interaction),
                t('verification.command_success_desc', { roleName: result.roleName }, interaction)
            )],
            flags: MessageFlags.Ephemeral
        });
    }
};
