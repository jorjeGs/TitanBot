import { WarningService } from '../../services/moderation/warningService.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { getModerationCases } from '../../utils/moderation.js';
import { getFromDb, getUserNotesKey } from '../../utils/database.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';
import { ModerationConfigSchema } from '../../utils/schemas.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/moderation/cases
 * Returns server moderation audit cases and warning records.
 */
export async function getGuildCases(req, res) {
  try {
    const { guildId } = req.params;
    const { limit = 50, action, userId, moderatorId } = req.query;

    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [cases, warnings] = await Promise.all([
      getModerationCases(
        guildId,
        {
          limit: parsedLimit,
          action: action || undefined,
          userId: userId || undefined,
          moderatorId: moderatorId || undefined,
        },
        req.client
      ),
      WarningService.getGuildWarnings(
        guildId,
        {
          limit: parsedLimit,
          moderatorId: moderatorId || undefined,
        },
        req.client
      ).catch((err) => {
        logger.warn('Failed to fetch guild warnings in getGuildCases:', err);
        return [];
      }),
    ]);

    return res.json({
      success: true,
      cases,
      warnings,
    });
  } catch (error) {
    logger.error('Error fetching guild moderation cases:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to fetch moderation cases.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/moderation/users/:userId
 * Returns disciplinary record for a specific member (warnings, usernotes, timeout/ban status).
 */
export async function getUserModHistory(req, res) {
  try {
    const { guildId, userId } = req.params;
    const guild = req.guild || (req.client?.guilds?.cache?.get(guildId));

    const notesKey = getUserNotesKey(guildId, userId);
    const [warnings, notes] = await Promise.all([
      WarningService.getWarnings(guildId, userId, req.client).catch(() => []),
      (req.client?.db && typeof req.client.db.get === 'function'
        ? req.client.db.get(notesKey)
        : getFromDb(notesKey, [])
      ).catch(() => []),
    ]);

    let member = guild?.members?.cache?.get(userId);
    if (!member && guild && typeof guild.members?.fetch === 'function') {
      member = await guild.members.fetch(userId).catch(() => null);
    }

    let isBanned = false;
    let banReason = null;
    let banUser = null;

    if (guild && typeof guild.bans?.fetch === 'function') {
      const banInfo = await guild.bans.fetch(userId).catch(() => null);
      if (banInfo) {
        isBanned = true;
        banReason = banInfo.reason || null;
        banUser = banInfo.user || null;
      }
    }

    const isTimedOut = Boolean(
      member?.communicationDisabledUntilTimestamp &&
      member.communicationDisabledUntilTimestamp > Date.now()
    );

    const timeoutUntil = isTimedOut
      ? new Date(member.communicationDisabledUntilTimestamp).toISOString()
      : null;

    let roles = [];
    if (member?.roles?.cache) {
      const rawRoles = typeof member.roles.cache.values === 'function'
        ? Array.from(member.roles.cache.values())
        : (Array.isArray(member.roles.cache) ? member.roles.cache : []);

      roles = rawRoles
        .filter((r) => r && r.id !== guildId)
        .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));
    }

    const memberDetails = {
      id: userId,
      username: member?.user?.username || banUser?.username || null,
      tag: member?.user?.tag || banUser?.tag || null,
      displayName: member?.displayName || banUser?.username || userId,
      avatar: (typeof member?.user?.displayAvatarURL === 'function' ? member.user.displayAvatarURL() : null) ||
        (banUser?.avatar ? `https://cdn.discordapp.com/avatars/${banUser.id}/${banUser.avatar}.png` : null),
      inGuild: Boolean(member),
      roles,
      isTimedOut,
      timeoutUntil,
      isBanned,
      banReason,
    };

    return res.json({
      success: true,
      member: memberDetails,
      warnings: Array.isArray(warnings) ? warnings : [],
      notes: Array.isArray(notes) ? notes : [],
    });
  } catch (error) {
    logger.error('Error fetching user moderation history:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to fetch user disciplinary history.',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/moderation/warnings/:userId/:warningId
 * Revokes an individual warning with role hierarchy verification.
 */
export async function deleteWarning(req, res) {
  try {
    const { guildId, userId, warningId } = req.params;
    const guild = req.guild || (req.client?.guilds?.cache?.get(guildId));

    if (guild && req.member && !req.isOwner) {
      let targetMember = guild.members?.cache?.get(userId);
      if (!targetMember && typeof guild.members?.fetch === 'function') {
        targetMember = await guild.members.fetch(userId).catch(() => null);
      }

      if (targetMember) {
        const hierarchyCheck = ModerationService.validateHierarchy(req.member, targetMember, 'unwarn');
        if (!hierarchyCheck.valid) {
          return res.status(422).json({
            success: false,
            error: 'HierarchyError',
            message: hierarchyCheck.error,
          });
        }
      }
    }

    await WarningService.removeWarning(guildId, userId, Number(warningId), req.client);

    return res.json({
      success: true,
      message: 'Warning revoked successfully.',
    });
  } catch (error) {
    if (error.type === 'USER_INPUT' || error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: error.userMessage || 'Warning not found.',
      });
    }

    logger.error('Error removing warning:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to remove warning.',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/moderation/warnings/:userId
 * Clears all active warnings for a user with role hierarchy verification.
 */
export async function clearUserWarnings(req, res) {
  try {
    const { guildId, userId } = req.params;
    const guild = req.guild || (req.client?.guilds?.cache?.get(guildId));

    if (guild && req.member && !req.isOwner) {
      let targetMember = guild.members?.cache?.get(userId);
      if (!targetMember && typeof guild.members?.fetch === 'function') {
        targetMember = await guild.members.fetch(userId).catch(() => null);
      }

      if (targetMember) {
        const hierarchyCheck = ModerationService.validateHierarchy(req.member, targetMember, 'clear warnings for');
        if (!hierarchyCheck.valid) {
          return res.status(422).json({
            success: false,
            error: 'HierarchyError',
            message: hierarchyCheck.error,
          });
        }
      }
    }

    const result = await WarningService.clearWarnings(guildId, userId, req.client);

    return res.json({
      success: true,
      count: result.count,
      message: `Cleared ${result.count} warning(s) successfully.`,
    });
  } catch (error) {
    logger.error('Error clearing user warnings:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to clear user warnings.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/moderation/config
 * Returns current moderation settings (autoPunish rules, dmOnWarn).
 */
export async function getModerationSettings(req, res) {
  try {
    const { guildId } = req.params;
    const config = await getGuildConfig(req.client, guildId);

    return res.json({
      success: true,
      moderation: config.moderation || {
        autoPunish: [],
        dmOnWarn: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching moderation settings:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to fetch moderation settings.',
    });
  }
}

/**
 * PATCH /api/guilds/:guildId/moderation/config
 * Updates autoPunish rules and moderation settings with schema validation.
 */
export async function updateModerationSettings(req, res) {
  try {
    const { guildId } = req.params;
    const body = req.body || {};

    const parsed = ModerationConfigSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid moderation configuration payload.',
        issues: parsed.error.issues,
      });
    }

    const updatedConfig = await patchGuildConfig(req.client, guildId, {
      moderation: parsed.data,
    });

    return res.json({
      success: true,
      moderation: updatedConfig.moderation,
    });
  } catch (error) {
    logger.error('Error updating moderation settings:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to update moderation settings.',
    });
  }
}
