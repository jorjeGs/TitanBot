import { getGuildConfig, updateGuildConfig } from '../../services/config/guildConfig.js';
import { getEconomyPrefix } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { EconomyConfigSchema } from '../../utils/schemas.js';

/**
 * GET /api/guilds/:guildId/economy
 * Returns guild economy configuration and top 10 richest users.
 */
export async function getEconomySettings(req, res) {
  try {
    const { guild, guildId } = req;
    const config = await getGuildConfig(req.client, guildId);

    const economyConfig = {
      currencyName: config.economy?.currencyName || 'coins',
      currencySymbol: config.economy?.currencySymbol || '🪙',
      startingBalance: typeof config.economy?.startingBalance === 'number' ? config.economy.startingBalance : 100,
      dailyAmount: typeof config.economy?.dailyAmount === 'number' ? config.economy.dailyAmount : 1000,
      workMin: typeof config.economy?.workMin === 'number' ? config.economy.workMin : 50,
      workMax: typeof config.economy?.workMax === 'number' ? config.economy.workMax : 250,
      premiumRoleId: config.premiumRoleId || config.economy?.premiumRoleId || null,
    };

    // Fetch top 10 richest users
    let leaderboard = [];
    try {
      if (req.client?.db && typeof req.client.db.list === 'function') {
        const prefix = getEconomyPrefix(guildId);
        const keys = await req.client.db.list(prefix);

        if (Array.isArray(keys) && keys.length > 0) {
          const userDataPromises = keys.map(async (key) => {
            const userId = key.replace(prefix, '');
            const data = await req.client.db.get(key);
            if (data) {
              const wallet = Number(data.wallet) || 0;
              const bank = Number(data.bank) || 0;
              return {
                userId,
                wallet,
                bank,
                netWorth: wallet + bank,
              };
            }
            return null;
          });

          const results = (await Promise.all(userDataPromises)).filter(Boolean);
          results.sort((a, b) => b.netWorth - a.netWorth);

          const top10 = results.slice(0, 10);
          const uncachedTop = top10.filter((item) => !guild.members?.cache?.has(item.userId));
          if (uncachedTop.length > 0 && typeof guild.members?.fetch === 'function') {
            await Promise.allSettled(
              uncachedTop.map((item) => guild.members.fetch(item.userId).catch(() => null))
            );
          }
          const stillUncachedTop = top10.filter(
            (item) => !guild.members?.cache?.has(item.userId) && typeof req.client?.users?.fetch === 'function'
          );
          if (stillUncachedTop.length > 0) {
            await Promise.allSettled(
              stillUncachedTop.map((item) => req.client.users.fetch(item.userId).catch(() => null))
            );
          }

          leaderboard = top10.map((item) => {
            const member = guild.members?.cache?.get(item.userId);
            const user = member?.user || req.client?.users?.cache?.get(item.userId);
            return {
              userId: item.userId,
              username: user?.username || `User ${item.userId.slice(-4)}`,
              displayName: member?.displayName || user?.globalName || user?.username || `User ${item.userId.slice(-4)}`,
              wallet: item.wallet,
              bank: item.bank,
              netWorth: item.netWorth,
            };
          });
        }
      }
    } catch (lbErr) {
      logger.warn(`Failed to build economy leaderboard for guild ${guildId}:`, lbErr.message);
    }

    return res.json({
      success: true,
      economy: economyConfig,
      leaderboard,
    });
  } catch (error) {
    logger.error('Error fetching economy settings:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Failed to fetch economy settings' });
  }
}

/**
 * PATCH /api/guilds/:guildId/economy
 * Updates guild economy settings, validating work ranges and premium role hierarchy.
 */
export async function updateEconomySettings(req, res) {
  try {
    const { guild, guildId } = req;
    const body = req.body || {};

    const workMin = typeof body.workMin === 'number' ? body.workMin : 50;
    const workMax = typeof body.workMax === 'number' ? body.workMax : 250;

    if (workMin > workMax) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Minimum work payout cannot exceed maximum work payout',
      });
    }

    if (body.startingBalance !== undefined && body.startingBalance < 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Starting balance cannot be negative',
      });
    }

    if (body.dailyAmount !== undefined && body.dailyAmount <= 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Daily reward amount must be greater than 0',
      });
    }

    // Role hierarchy validation for premiumRoleId
    if (body.premiumRoleId) {
      const roleId = String(body.premiumRoleId);
      const role = guild.roles?.cache?.get(roleId);
      if (!role) {
        return res.status(404).json({
          error: 'RoleNotFound',
          message: `Premium role ${roleId} not found in this guild`,
        });
      }

      const botMember = guild.members?.me || guild.members?.cache?.get(req.client.user?.id);
      if (botMember && role.position >= botMember.roles?.highest?.position) {
        return res.status(422).json({
          error: 'HierarchyError',
          message: `Role "${role.name}" is higher than or equal to TitanBot in the role hierarchy. Move the bot role above this role in Discord.`,
        });
      }
    }

    const economyPatch = {
      currencyName: body.currencyName || 'coins',
      currencySymbol: body.currencySymbol || '🪙',
      startingBalance: typeof body.startingBalance === 'number' ? body.startingBalance : 100,
      dailyAmount: typeof body.dailyAmount === 'number' ? body.dailyAmount : 1000,
      workMin,
      workMax,
      premiumRoleId: body.premiumRoleId || null,
    };

    // Validate with Zod
    const parsed = EconomyConfigSchema.safeParse(economyPatch);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        message: parsed.error.issues[0]?.message || 'Invalid economy configuration',
      });
    }

    // Persist into guildConfig
    await updateGuildConfig(req.client, guildId, {
      economy: parsed.data,
      premiumRoleId: parsed.data.premiumRoleId,
    });

    logger.info(`Economy settings updated for guild ${guildId}`);

    return res.json({
      success: true,
      message: 'Economy settings updated successfully',
      economy: parsed.data,
    });
  } catch (error) {
    logger.error('Error updating economy settings:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Failed to update economy settings' });
  }
}
