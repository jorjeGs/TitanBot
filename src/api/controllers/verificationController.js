import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { patchGuildConfig, getGuildConfig } from '../../services/config/guildConfig.js';
import { hasDangerousPermissions } from '../../services/reactionRoleService.js';
import { getColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

/**
 * Publishes an interactive verification panel (Embed + Button) to the selected Discord channel
 * and updates the server's verification configuration in PostgreSQL.
 */
export async function publishVerificationPanel(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found.' });
    }

    const { channelId, roleId, unverifiedRoleId, message, buttonText } = req.body;

    if (!channelId || typeof channelId !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Channel is required.' });
    }

    if (!roleId || typeof roleId !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Verified role is required.' });
    }

    const channel = guild.channels?.cache?.get(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Verification channel not found in this server.' });
    }

    const verifiedRole = guild.roles?.cache?.get(roleId);
    if (!verifiedRole) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Verified role not found in this server.' });
    }

    if (verifiedRole.managed || verifiedRole.id === guild.id) {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Invalid verified role selected.' });
    }

    const botMember = guild.members?.me || (req.client?.user?.id ? guild.members?.cache?.get(req.client.user.id) : null);
    const botHighestPosition = botMember?.roles?.highest?.position ?? (botMember ? 0 : Infinity);
    const botHasManageRoles = botMember
      ? Boolean(
          botMember.permissions?.has?.(PermissionFlagsBits.ManageRoles) ||
          botMember.permissions?.has?.(PermissionFlagsBits.Administrator)
        )
      : true;

    if (!botHasManageRoles) {
      return res.status(403).json({
        success: false,
        error: 'MissingPermissions',
        message: 'Bot lacks Manage Roles permission.',
      });
    }

    // Role hierarchy check
    if (botMember && verifiedRole.position >= botHighestPosition) {
      return res.status(422).json({
        success: false,
        error: 'HierarchyError',
        message: `Role "${verifiedRole.name}" is equal to or higher than TitanBot's highest role.`,
      });
    }

    // Dangerous permissions check
    if (hasDangerousPermissions(verifiedRole)) {
      return res.status(422).json({
        success: false,
        error: 'DangerousRole',
        message: `Role "${verifiedRole.name}" has administrative permissions and cannot be used as a verification role.`,
      });
    }

    // Check channel permissions
    if (botMember && typeof channel.permissionsFor === 'function') {
      const perms = channel.permissionsFor(botMember);
      if (
        !perms.has(PermissionFlagsBits.ViewChannel) ||
        !perms.has(PermissionFlagsBits.SendMessages) ||
        !perms.has(PermissionFlagsBits.EmbedLinks)
      ) {
        return res.status(403).json({
          success: false,
          error: 'MissingChannelPermissions',
          message: 'Bot lacks View Channel, Send Messages, or Embed Links permissions in the selected channel.',
        });
      }
    }

    // Validate optional unverifiedRoleId
    if (unverifiedRoleId) {
      const unverifiedRole = guild.roles?.cache?.get(unverifiedRoleId);
      if (unverifiedRole && botMember && unverifiedRole.position >= botHighestPosition) {
        return res.status(422).json({
          success: false,
          error: 'HierarchyError',
          message: `Unverified role "${unverifiedRole.name}" is equal to or higher than TitanBot's highest role.`,
        });
      }
    }

    const messageText =
      typeof message === 'string' && message.trim().length > 0
        ? message.trim().slice(0, 2000)
        : 'Haz clic en el botón de abajo para verificarte y obtener acceso al servidor.';

    const btnText =
      typeof buttonText === 'string' && buttonText.trim().length > 0
        ? buttonText.trim().slice(0, 80)
        : 'Verificarme';

    // Construct Discord Embed & Button
    const embedColor = getColor ? getColor('success') : 0x57f287;
    const embed = new EmbedBuilder()
      .setTitle('Verificación del Servidor')
      .setDescription(messageText)
      .setColor(embedColor)
      .setTimestamp()
      .setFooter({ text: `TitanBot Verification • ${guild.name}` });

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_user')
        .setLabel(btnText)
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    const sentMessage = await channel.send({
      embeds: [embed],
      components: [buttonRow],
    });

    // Update configuration in PostgreSQL
    const currentConfig = await getGuildConfig(req.client, guild.id);
    const updatedVerification = {
      ...(currentConfig.verification || {}),
      enabled: true,
      channelId: channel.id,
      roleId: verifiedRole.id,
      unverifiedRoleId: unverifiedRoleId ? String(unverifiedRoleId).trim() : null,
      messageId: sentMessage.id,
      message: messageText,
      buttonText: btnText,
    };

    await patchGuildConfig(req.client, guild.id, { verification: updatedVerification });

    logger.info(`Published verification panel in guild ${guild.id}, channel ${channel.id}, message ${sentMessage.id}`);

    return res.json({
      success: true,
      message: 'Verification panel published successfully.',
      panel: {
        messageId: sentMessage.id,
        channelId: channel.id,
        roleId: verifiedRole.id,
        roleName: verifiedRole.name,
        messageUrl: `https://discord.com/channels/${guild.id}/${channel.id}/${sentMessage.id}`,
      },
    });
  } catch (error) {
    logger.error('Error publishing verification panel:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to publish verification panel to Discord.',
    });
  }
}
