import { logger } from '../utils/logger.js';
import { getReactionRoleMessage } from '../services/reactionRoleService.js';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'messageReactionRemove',
  once: false,
  async execute(reaction, user, client) {
    try {
      // Ignore bot reactions
      if (user.bot) return;

      // Resolve partials
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (fetchErr) {
          logger.debug('Could not fetch partial reaction on remove:', fetchErr.message);
          return;
        }
      }

      if (user.partial) {
        try {
          await user.fetch();
        } catch (fetchErr) {
          logger.debug('Could not fetch partial user on remove:', fetchErr.message);
          return;
        }
      }

      const message = reaction.message;
      const guild = message.guild;
      if (!guild) return;

      // Check if message is an active reaction role panel
      const panelData = await getReactionRoleMessage(client, guild.id, message.id);
      if (!panelData) return;

      const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : (reaction.emoji.name || '');
      const plainEmoji = reaction.emoji.id || reaction.emoji.name;

      let roleId = null;

      if (panelData.rolesMap && typeof panelData.rolesMap === 'object') {
        roleId = panelData.rolesMap[emojiKey] || panelData.rolesMap[plainEmoji] || panelData.rolesMap[reaction.emoji.name];
      }

      if (!roleId && panelData.roles && typeof panelData.roles === 'object' && !Array.isArray(panelData.roles)) {
        roleId = panelData.roles[emojiKey] || panelData.roles[plainEmoji] || panelData.roles[reaction.emoji.name];
      }

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

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
      if (!role) return;

      const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) return;

      if (role.position >= botMember.roles.highest.position) return;

      // Remove role if member currently has it
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        logger.info(`Removed role "${role.name}" (${roleId}) from user ${user.tag} (${user.id}) via reaction role in guild ${guild.id}`);
      }
    } catch (error) {
      logger.error('Error in messageReactionRemove handler:', error);
    }
  },
};
