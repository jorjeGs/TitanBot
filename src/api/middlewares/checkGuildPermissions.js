import { PermissionFlagsBits } from 'discord.js';
import { isBotOwner } from '../../config/bot.js';

/**
 * Middleware to verify the authenticated user has Administrator or ManageGuild permissions.
 */
export async function checkGuildPermissions(req, res, next) {
  const { guildId } = req.params;

  if (!guildId) {
    return res.status(400).json({
      success: false,
      error: 'BadRequest',
      message: 'Guild ID is required.',
    });
  }

  // Bot owners have bypass access to configure any guild
  if (isBotOwner(req.user?.id)) {
    req.isOwner = true;
    if (req.client?.guilds?.cache?.has(guildId)) {
      req.guild = req.client.guilds.cache.get(guildId);
    }
    return next();
  }

  const client = req.client;
  if (!client) {
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Discord client not available.',
    });
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return res.status(404).json({
      success: false,
      error: 'GuildNotFound',
      message: 'TitanBot is not present in this guild or the guild was not found.',
    });
  }

  try {
    let member = guild.members.cache.get(req.user.id);
    if (!member) {
      member = await guild.members.fetch(req.user.id);
    }

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not a member of this server.',
      });
    }

    const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const hasManageGuild = member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasAdmin && !hasManageGuild) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Administrator or Manage Server permission is required.',
      });
    }

    req.guild = guild;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Failed to verify server membership permissions: ${error.message}`,
    });
  }
}
