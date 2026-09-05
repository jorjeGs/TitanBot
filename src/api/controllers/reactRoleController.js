import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import {
  getAllReactionRoleMessages,
  createReactionRoleMessage,
  deleteReactionRoleMessage,
  getReactionRoleMessage,
  hasDangerousPermissions,
} from '../../services/reactionRoleService.js';
import { getColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

/**
 * Returns all reaction role panels for the guild.
 */
export async function getGuildReactionRoles(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found' });
    }

    const messages = await getAllReactionRoleMessages(req.client, guild.id);
    const panels = messages.map((m) => {
      const channel = guild.channels?.cache?.get(m.channelId);
      const channelName = channel?.name || m.channelId;

      let resolvedRoles = [];
      if (Array.isArray(m.roles)) {
        resolvedRoles = m.roles.map((rId) => {
          const r = guild.roles?.cache?.get(rId);
          return {
            id: rId,
            name: r?.name || 'Deleted Role',
            color: r?.hexColor || '#99aab5',
          };
        });
      } else if (typeof m.roles === 'object' && m.roles !== null) {
        resolvedRoles = Object.entries(m.roles).map(([emoji, rId]) => {
          const r = guild.roles?.cache?.get(rId);
          return {
            id: rId,
            name: r?.name || 'Deleted Role',
            color: r?.hexColor || '#99aab5',
            emoji,
          };
        });
      }

      return {
        messageId: m.messageId,
        channelId: m.channelId,
        channelName,
        title: m.title || null,
        description: m.description || null,
        roles: resolvedRoles,
        createdAt: m.createdAt || null,
      };
    });

    return res.json({
      success: true,
      panels,
    });
  } catch (err) {
    logger.error('Error fetching reaction role panels:', err);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: err.message,
    });
  }
}

/**
 * Creates and publishes a new reaction role panel to Discord and persists to DB.
 */
export async function createGuildReactionRole(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found' });
    }

    const { channelId, title, description, roleIds } = req.body;

    if (!channelId || typeof channelId !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Channel is required.' });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Title is required.' });
    }

    if (!Array.isArray(roleIds) || roleIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation', message: 'At least one role is required.' });
    }

    if (roleIds.length > 25) {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Maximum 25 roles per panel.' });
    }

    const channel = guild.channels?.cache?.get(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Channel not found in this guild.' });
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

    // Validate channel permissions if available
    if (botMember && typeof channel.permissionsFor === 'function') {
      const perms = channel.permissionsFor(botMember);
      if (!perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.SendMessages)) {
        return res.status(403).json({
          success: false,
          error: 'MissingChannelPermissions',
          message: 'Bot cannot view or send messages in the selected channel.',
        });
      }
    }

    // Validate each role
    const validatedRoles = [];
    for (const roleId of roleIds) {
      const role = guild.roles?.cache?.get(roleId);
      if (!role) {
        return res.status(400).json({
          success: false,
          error: 'RoleNotFound',
          message: `Role ${roleId} not found in this guild.`,
        });
      }

      if (hasDangerousPermissions(role)) {
        return res.status(422).json({
          success: false,
          error: 'DangerousRole',
          message: `Role "${role.name}" has administrative permissions and cannot be assigned via reaction roles.`,
        });
      }

      if (botMember && role.position >= botHighestPosition) {
        return res.status(422).json({
          success: false,
          error: 'HierarchyError',
          message: `Role "${role.name}" is equal to or higher than TitanBot's role in server hierarchy.`,
        });
      }

      validatedRoles.push(role);
    }

    // Build Discord embed
    const panelEmbed = new EmbedBuilder()
      .setTitle(title.trim().slice(0, 256))
      .setDescription(description ? description.trim().slice(0, 2048) : 'Select your roles below:')
      .setColor(getColor ? getColor('info') : 0x5865F2)
      .addFields({
        name: 'Roles Disponibles',
        value: validatedRoles.map((r) => `• <@&${r.id}>`).join('\n'),
      })
      .setFooter({ text: 'TitanBot Roles' });

    // Build select menu
    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('reaction_roles')
        .setPlaceholder('Elige tus roles...')
        .setMinValues(0)
        .setMaxValues(validatedRoles.length)
        .addOptions(
          validatedRoles.map((role) => ({
            label: role.name.slice(0, 100),
            description: `Asignar rol ${role.name}`.slice(0, 100),
            value: role.id,
            emoji: '🎭',
          }))
        )
    );

    // Send message to Discord
    const message = await channel.send({
      embeds: [panelEmbed],
      components: [selectRow],
    });

    // Save in DB
    await createReactionRoleMessage(req.client, guild.id, channel.id, message.id, roleIds);

    return res.json({
      success: true,
      panel: {
        messageId: message.id,
        channelId: channel.id,
        channelName: channel.name,
        title,
        description,
        roles: validatedRoles.map((r) => ({
          id: r.id,
          name: r.name,
          color: r.hexColor || '#99aab5',
        })),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('Error creating reaction role panel:', err);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: err.message,
    });
  }
}

/**
 * Deletes a reaction role panel message in Discord and purges DB record.
 */
export async function deleteGuildReactionRole(req, res) {
  try {
    const { guildId, messageId } = req.params;
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found' });
    }

    const data = await getReactionRoleMessage(req.client, guildId, messageId);
    if (data?.channelId) {
      const channel = guild.channels?.cache?.get(data.channelId);
      if (channel && typeof channel.messages?.fetch === 'function') {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg && typeof msg.delete === 'function') {
          await msg.delete().catch(() => {});
        }
      }
    }

    await deleteReactionRoleMessage(req.client, guildId, messageId);

    return res.json({
      success: true,
    });
  } catch (err) {
    logger.error('Error deleting reaction role panel:', err);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: err.message,
    });
  }
}
