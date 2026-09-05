import { PermissionFlagsBits } from 'discord.js';
import { isBotOwner } from '../../config/bot.js';

/**
 * Middleware to verify the authenticated user has Moderation permissions:
 * Administrator, ManageGuild, ModerateMembers, KickMembers, or BanMembers.
 */
export async function checkModerationAccess(req, res, next) {
  const guildId = req.params.guildId || req.guildId;

  if (!guildId) {
    return res.status(400).json({
      success: false,
      error: 'BadRequest',
      message: 'Guild ID is required.',
    });
  }

  req.guildId = guildId;

  // Bot owners have bypass access
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
    if (!member && typeof guild.members.fetch === 'function') {
      member = await guild.members.fetch(req.user.id).catch(() => null);
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
    const hasModMembers = member.permissions.has(PermissionFlagsBits.ModerateMembers);
    const hasKick = member.permissions.has(PermissionFlagsBits.KickMembers);
    const hasBan = member.permissions.has(PermissionFlagsBits.BanMembers);

    if (!hasAdmin && !hasManageGuild && !hasModMembers && !hasKick && !hasBan) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Moderation permissions (Moderate Members, Kick, or Ban) required.',
      });
    }

    req.guild = guild;
    req.member = member;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Failed to verify server moderation permissions: ${error.message}`,
    });
  }
}
