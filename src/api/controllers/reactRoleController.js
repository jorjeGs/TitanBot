import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
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
        resolvedRoles = m.roles.map((rItem) => {
          const rId = typeof rItem === 'string' ? rItem : (rItem?.roleId || rItem?.id);
          const r = guild.roles?.cache?.get(rId);
          let emoji = typeof rItem === 'object' ? rItem?.emoji : null;
          if (!emoji && m.rolesMap && typeof m.rolesMap === 'object') {
            emoji = Object.keys(m.rolesMap).find((k) => m.rolesMap[k] === rId) || null;
          }
          return {
            id: rId,
            name: r?.name || 'Deleted Role',
            color: r?.hexColor || '#99aab5',
            emoji: emoji || null,
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
        type: m.type || 'select_menu',
        roles: resolvedRoles,
        rolesMap: m.rolesMap || null,
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

    const { channelId, title, description, roles, roleIds, type = 'reactions' } = req.body;

    if (!channelId || typeof channelId !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Channel is required.' });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Validation', message: 'Title is required.' });
    }

    const rawRoles = Array.isArray(roles) && roles.length > 0 ? roles : (Array.isArray(roleIds) ? roleIds : []);

    if (rawRoles.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation', message: 'At least one role is required.' });
    }

    if (rawRoles.length > 25) {
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

      if (type === 'reactions' && !perms.has(PermissionFlagsBits.AddReactions)) {
        return res.status(403).json({
          success: false,
          error: 'MissingChannelPermissions',
          message: 'Bot lacks Add Reactions permission in the selected channel.',
        });
      }
    }

    // Validate each role
    const validatedRoles = [];
    const defaultEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '⭐', '🔥', '💎', '🎉', '🚀', '👑', '🛡️', '⚡', '🎯', '🎨', '🎵', '🕹️', '🏆', '🌟', '💡'];

    for (let i = 0; i < rawRoles.length; i++) {
      const item = rawRoles[i];
      const roleId = typeof item === 'string' ? item : (item?.roleId || item?.id);
      const emoji = typeof item === 'object' && item?.emoji ? item.emoji.trim() : defaultEmojis[i % defaultEmojis.length];

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

      validatedRoles.push({
        id: role.id,
        name: role.name,
        color: role.hexColor || '#99aab5',
        emoji: emoji || '⭐',
      });
    }

    let message;
    const rolesMap = {};

    if (type === 'reactions') {
      // Build classic emoji embed
      const rolesListText = validatedRoles.map((r) => `${r.emoji} : <@&${r.id}>`).join('\n');
      const embedDesc = description
        ? `${description.trim()}\n\n${rolesListText}`
        : rolesListText;

      const panelEmbed = new EmbedBuilder()
        .setTitle(title.trim().slice(0, 256))
        .setDescription(embedDesc.slice(0, 4096))
        .setColor(getColor ? getColor('info') : 0x5865F2)
        .setFooter({ text: 'TitanBot Roles • Reacciona para obtener o quitar tu rol' });

      message = await channel.send({ embeds: [panelEmbed] });

      // Bot reacts with each emoji sequentially
      for (const r of validatedRoles) {
        if (r.emoji) {
          try {
            await message.react(r.emoji);
            rolesMap[r.emoji] = r.id;
          } catch (reactErr) {
            logger.warn(`Failed to react with emoji "${r.emoji}" on message ${message.id}:`, reactErr.message);
            rolesMap[r.emoji] = r.id;
          }
        }
      }
    } else if (type === 'buttons') {
      // Build interactive buttons embed
      const rolesListText = validatedRoles.map((r) => `${r.emoji ? r.emoji + ' ' : ''}• <@&${r.id}>`).join('\n');
      const embedDesc = description
        ? `${description.trim()}\n\n${rolesListText}`
        : rolesListText;

      const panelEmbed = new EmbedBuilder()
        .setTitle(title.trim().slice(0, 256))
        .setDescription(embedDesc.slice(0, 4096))
        .setColor(getColor ? getColor('info') : 0x5865F2)
        .setFooter({ text: 'TitanBot Roles • Haz clic en un botón para obtener o quitar tu rol' });

      const buttonRows = [];
      let currentRow = new ActionRowBuilder();

      for (let i = 0; i < validatedRoles.length; i++) {
        if (i > 0 && i % 5 === 0) {
          buttonRows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        const r = validatedRoles[i];
        const btn = new ButtonBuilder()
          .setCustomId(`titan_btn:toggle_role:${r.id}`)
          .setLabel(r.name.slice(0, 80))
          .setStyle(ButtonStyle.Secondary);

        if (r.emoji) {
          try {
            btn.setEmoji(r.emoji);
          } catch (emojiErr) {
            logger.warn(`Could not set emoji "${r.emoji}" on button:`, emojiErr.message);
          }
        }

        currentRow.addComponents(btn);
      }
      if (currentRow.components.length > 0) {
        buttonRows.push(currentRow);
      }

      message = await channel.send({
        embeds: [panelEmbed],
        components: buttonRows,
      });
    } else {
      // type === 'select_menu' (default fallback)
      const panelEmbed = new EmbedBuilder()
        .setTitle(title.trim().slice(0, 256))
        .setDescription(description ? description.trim().slice(0, 2048) : 'Elige tus roles en el menú desplegable:')
        .setColor(getColor ? getColor('info') : 0x5865F2)
        .addFields({
          name: 'Roles Disponibles',
          value: validatedRoles.map((r) => `${r.emoji ? r.emoji + ' ' : ''}• <@&${r.id}>`).join('\n'),
        })
        .setFooter({ text: 'TitanBot Roles' });

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('reaction_roles')
          .setPlaceholder('Elige tus roles...')
          .setMinValues(0)
          .setMaxValues(validatedRoles.length)
          .addOptions(
            validatedRoles.map((role) => {
              const opt = {
                label: role.name.slice(0, 100),
                description: `Asignar rol ${role.name}`.slice(0, 100),
                value: role.id,
              };
              if (role.emoji) {
                opt.emoji = role.emoji;
              }
              return opt;
            })
          )
      );

      message = await channel.send({
        embeds: [panelEmbed],
        components: [selectRow],
      });
    }

    // Save in DB
    const dbRolesPayload = validatedRoles.map((r) => ({
      roleId: r.id,
      emoji: r.emoji,
      name: r.name,
    }));

    await createReactionRoleMessage(
      req.client,
      guild.id,
      channel.id,
      message.id,
      validatedRoles.map((r) => r.id),
      {
        type,
        title: title.trim(),
        description: description ? description.trim() : '',
        roles: dbRolesPayload,
        rolesMap: Object.keys(rolesMap).length > 0 ? rolesMap : undefined,
      }
    );

    return res.json({
      success: true,
      panel: {
        messageId: message.id,
        channelId: channel.id,
        channelName: channel.name,
        title,
        description,
        type,
        roles: validatedRoles,
        rolesMap: Object.keys(rolesMap).length > 0 ? rolesMap : undefined,
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
