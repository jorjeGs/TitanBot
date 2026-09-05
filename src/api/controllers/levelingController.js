import { getLevelingConfig, getLeaderboard, saveLevelingConfig } from '../../services/leveling/leveling.js';
import { patchGuildConfig } from '../../services/config/guildConfig.js';
import { logger } from '../../utils/logger.js';

/**
 * Returns current leveling settings and top 10 leaderboard for the guild.
 */
export async function getLevelingSettings(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found.' });
    }

    const config = await getLevelingConfig(req.client, guild.id);
    let leaderboard = [];
    try {
      leaderboard = await getLeaderboard(req.client, guild.id, 10);
    } catch (e) {
      logger.warn(`Could not load leaderboard for guild ${guild.id}:`, e);
    }

    return res.json({
      success: true,
      leveling: config,
      leaderboard: Array.isArray(leaderboard) ? leaderboard : [],
    });
  } catch (error) {
    logger.error('Error fetching leveling settings:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch leveling settings.',
    });
  }
}

/**
 * Updates leveling settings, validating ranges, cooldowns, and role hierarchy.
 */
export async function updateLevelingSettings(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({ success: false, error: 'NotFound', message: 'Guild not found.' });
    }

    const {
      enabled,
      announceLevelUp,
      levelUpChannel,
      levelUpMessage,
      xpMultiplier,
      xpCooldown,
      xpPerMessage,
      roleRewards,
      ignoredChannels,
      ignoredRoles,
    } = req.body;

    // Validate XP per message range if provided
    if (xpPerMessage !== undefined) {
      const min = parseInt(xpPerMessage?.min, 10);
      const max = parseInt(xpPerMessage?.max, 10);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < 1 || min > max) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Minimum XP must be less than or equal to maximum XP, and both must be positive.',
        });
      }
    }

    // Validate cooldown if provided
    if (xpCooldown !== undefined) {
      const cd = parseInt(xpCooldown, 10);
      if (!Number.isFinite(cd) || cd < 0 || cd > 3600) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Cooldown must be between 0 and 3600 seconds.',
        });
      }
    }

    // Validate multiplier if provided
    if (xpMultiplier !== undefined) {
      const mult = parseFloat(xpMultiplier);
      if (!Number.isFinite(mult) || mult < 0.1 || mult > 10) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'XP multiplier must be between 0.1 and 10.',
        });
      }
    }

    // Validate level up channel if provided
    if (levelUpChannel) {
      const channel = guild.channels?.cache?.get(levelUpChannel);
      if (!channel) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Level-up announcement channel not found in this server.',
        });
      }
    }

    // Role rewards hierarchy and existence check
    const botMember = guild.members?.me || (req.client?.user?.id ? guild.members?.cache?.get(req.client.user.id) : null);
    const botHighestPosition = botMember?.roles?.highest?.position ?? (botMember ? 0 : Infinity);

    if (roleRewards && typeof roleRewards === 'object') {
      for (const [lvl, roleId] of Object.entries(roleRewards)) {
        if (!roleId) continue;
        const role = guild.roles?.cache?.get(roleId);
        if (!role) {
          return res.status(404).json({
            success: false,
            error: 'NotFound',
            message: `Role for level ${lvl} not found in this server.`,
          });
        }

        if (botMember && role.position >= botHighestPosition) {
          return res.status(422).json({
            success: false,
            error: 'HierarchyError',
            message: `Role "${role.name}" for level ${lvl} is equal to or higher than TitanBot's highest role.`,
          });
        }
      }
    }

    const currentConfig = await getLevelingConfig(req.client, guild.id);

    const sanitizedRoleRewards = {};
    if (roleRewards && typeof roleRewards === 'object') {
      for (const [lvl, roleId] of Object.entries(roleRewards)) {
        const parsedLevel = parseInt(lvl, 10);
        if (Number.isFinite(parsedLevel) && parsedLevel >= 1 && roleId) {
          sanitizedRoleRewards[String(parsedLevel)] = String(roleId).trim();
        }
      }
    }

    const updatedConfig = {
      ...currentConfig,
      enabled: enabled !== undefined ? Boolean(enabled) : currentConfig.enabled,
      announceLevelUp: announceLevelUp !== undefined ? Boolean(announceLevelUp) : currentConfig.announceLevelUp,
      levelUpChannel:
        levelUpChannel !== undefined
          ? levelUpChannel
            ? String(levelUpChannel).trim()
            : null
          : currentConfig.levelUpChannel,
      levelUpMessage:
        levelUpMessage !== undefined
          ? String(levelUpMessage).slice(0, 2000)
          : currentConfig.levelUpMessage,
      xpMultiplier:
        xpMultiplier !== undefined
          ? Math.max(0.1, Math.min(10, parseFloat(xpMultiplier)))
          : currentConfig.xpMultiplier,
      xpCooldown:
        xpCooldown !== undefined
          ? Math.max(0, Math.min(3600, parseInt(xpCooldown, 10)))
          : currentConfig.xpCooldown,
      xpPerMessage: xpPerMessage
        ? {
            min: Math.max(1, parseInt(xpPerMessage.min, 10)),
            max: Math.max(1, parseInt(xpPerMessage.max, 10)),
          }
        : currentConfig.xpPerMessage,
      roleRewards: roleRewards !== undefined ? sanitizedRoleRewards : currentConfig.roleRewards,
      ignoredChannels: Array.isArray(ignoredChannels)
        ? ignoredChannels.map(String).filter((id) => /^\d{17,19}$/.test(id))
        : currentConfig.ignoredChannels,
      ignoredRoles: Array.isArray(ignoredRoles)
        ? ignoredRoles.map(String).filter((id) => /^\d{17,19}$/.test(id))
        : currentConfig.ignoredRoles,
    };

    await saveLevelingConfig(req.client, guild.id, updatedConfig);
    await patchGuildConfig(req.client, guild.id, { leveling: updatedConfig });

    logger.info(`Leveling settings updated for guild ${guild.id}`);

    return res.json({
      success: true,
      message: 'Leveling settings updated successfully.',
      leveling: updatedConfig,
    });
  } catch (error) {
    logger.error('Error updating leveling settings:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to update leveling settings.',
    });
  }
}
