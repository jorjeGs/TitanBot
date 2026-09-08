import { logger } from '../utils/logger.js';
import { getReactionRoleMessage } from '../services/reactionRoleService.js';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'messageReactionAdd',
  once: false,
  async execute(reaction, user, client) {
    try {
      // Ignore reactions from bots (including TitanBot's own setup reactions)
      if (user.bot) return;

      // Resolve partials if reaction is on an uncached message
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (fetchErr) {
          logger.debug('Could not fetch partial reaction:', fetchErr.message);
          return;
        }
      }

      if (user.partial) {
        try {
          await user.fetch();
        } catch (fetchErr) {
          logger.debug('Could not fetch partial user:', fetchErr.message);
          return;
        }
      }

      const message = reaction.message;
      const guild = message.guild;
      if (!guild) return;

      // Check if this message is a registered reaction role panel
      const panelData = await getReactionRoleMessage(client, guild.id, message.id);
      if (!panelData) return;

      // Identify emoji: custom emoji format or standard unicode character
      const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : (reaction.emoji.name || '');
      const plainEmoji = reaction.emoji.id || reaction.emoji.name;

      let roleId = null;

      // Check fast lookup map
      if (panelData.rolesMap && typeof panelData.rolesMap === 'object') {
        roleId = panelData.rolesMap[emojiKey] || panelData.rolesMap[plainEmoji] || panelData.rolesMap[reaction.emoji.name];
      }

      // Fallback: roles stored as key-value map { [emoji]: roleId }
      if (!roleId && panelData.roles && typeof panelData.roles === 'object' && !Array.isArray(panelData.roles)) {
        roleId = panelData.roles[emojiKey] || panelData.roles[plainEmoji] || panelData.roles[reaction.emoji.name];
      }

      // Fallback: roles stored as array of objects [{ roleId, emoji }]
      if (!roleId && Array.isArray(panelData.roles)) {
        const found = panelData.roles.find(
          (r) =>
            r.emoji === emojiKey ||
            r.emoji === plainEmoji ||
            r.emoji === reaction.emoji.name ||
            (reaction.emoji.id && r.emoji?.includes(reaction.emoji.id))
        );
        if (found) {
          roleId = found.roleId || found.id;
        }
      }

      if (!roleId) return;

      // Fetch member to manage roles
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
      if (!role) {
        logger.warn(`Role ${roleId} configured for reaction panel ${message.id} not found in guild ${guild.id}`);
        return;
      }

      // Verify bot permissions & hierarchy
      const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        logger.warn(`TitanBot lacks ManageRoles permission in guild ${guild.id}`);
        return;
      }

      if (role.position >= botMember.roles.highest.position) {
        logger.warn(`Role "${role.name}" is equal to or higher than TitanBot hierarchy in guild ${guild.id}`);
        return;
      }

      // Assign role cumulatively
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        logger.info(`Assigned role "${role.name}" (${roleId}) to user ${user.tag} (${user.id}) via reaction in guild ${guild.id}`);
      }
    } catch (error) {
      logger.error('Error in messageReactionAdd handler:', error);
    }
  },
};
