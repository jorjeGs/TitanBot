import { ChannelType, PermissionFlagsBits } from 'discord.js';
import {
  getServerCounters,
  saveServerCounters,
  getGuildCounterStats,
  formatCounterChannelName,
  getCounterBaseName,
} from '../../services/serverstatsService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/serverstats
 * Returns active counters and live stats for the guild.
 */
export async function getServerstatsSettings(req, res) {
  try {
    const { guild, guildId } = req;
    const counters = await getServerCounters(req.client, guildId);

    let stats = { totalCount: 0, humanCount: 0, botCount: 0 };
    try {
      stats = await getGuildCounterStats(guild);
    } catch (statsErr) {
      const total = typeof guild.memberCount === 'number' ? guild.memberCount : guild.members?.cache?.size || 0;
      const memberList = guild.members?.cache?.values ? Array.from(guild.members.cache.values()) : [];
      const bots = memberList.filter((m) => m?.user?.bot).length;
      stats = { totalCount: total, botCount: bots, humanCount: Math.max(total - bots, 0) };
    }

    const detailedCounters = counters.map((c) => {
      const ch = guild.channels?.cache?.get(c.channelId);
      return {
        ...c,
        channelExists: Boolean(ch),
        channelName: ch?.name || 'unknown-channel',
      };
    });

    return res.json({
      success: true,
      counters: detailedCounters,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching serverstats settings:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Failed to fetch server stats' });
  }
}

/**
 * POST /api/guilds/:guildId/serverstats/setup
 * Creates counter voice channels in Discord and stores them in the database.
 */
export async function setupCounters(req, res) {
  try {
    const { guild, guildId } = req;
    const { types = ['members', 'members_only', 'bots'], categoryId } = req.body || {};

    const botMember = guild.members?.me || guild.members?.cache?.get(req.client.user?.id);
    if (botMember && !botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return res.status(403).json({
        error: 'MissingBotPermissions',
        message: 'TitanBot requires the "Manage Channels" permission in this server to create stat counters.',
      });
    }

    let stats = { totalCount: 0, humanCount: 0, botCount: 0 };
    try {
      stats = await getGuildCounterStats(guild);
    } catch (err) {
      stats = {
        totalCount: guild.memberCount || 0,
        humanCount: guild.memberCount || 0,
        botCount: 0,
      };
    }

    const existingCounters = await getServerCounters(req.client, guildId);
    const updatedCounters = [...existingCounters];

    // Determine target category
    let parentCategory = null;
    if (categoryId) {
      parentCategory = guild.channels?.cache?.get(categoryId);
    }

    if (!parentCategory && guild.channels?.create) {
      try {
        parentCategory = await guild.channels.create({
          name: '📊 Server Stats',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.roles?.everyone?.id || guild.id,
              deny: [PermissionFlagsBits.Connect],
              allow: [PermissionFlagsBits.ViewChannel],
            },
          ],
        });
      } catch (catErr) {
        logger.warn('Could not create stats category, creating channels without parent:', catErr.message);
      }
    }

    for (const type of types) {
      // If a counter for this type already exists and channel is valid, skip
      const existing = updatedCounters.find((c) => c.type === type);
      if (existing && guild.channels?.cache?.get(existing.channelId)) {
        continue;
      }

      let count = stats.totalCount;
      if (type === 'bots') count = stats.botCount;
      if (type === 'members_only') count = stats.humanCount;

      const channelName = formatCounterChannelName(type, count);

      if (guild.channels?.create) {
        const createdChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: parentCategory?.id || null,
          permissionOverwrites: [
            {
              id: guild.roles?.everyone?.id || guild.id,
              deny: [PermissionFlagsBits.Connect],
              allow: [PermissionFlagsBits.ViewChannel],
            },
          ],
          reason: 'TitanBot Server Stats counter provisioned via Web Dashboard',
        });

        updatedCounters.push({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          type,
          channelId: createdChannel.id,
          guildId,
          createdAt: new Date().toISOString(),
          enabled: true,
        });
      }
    }

    await saveServerCounters(req.client, guildId, updatedCounters);
    logger.info(`Server stats provisioned for guild ${guildId} with ${updatedCounters.length} counters`);

    return res.json({
      success: true,
      message: 'Server stats counters created successfully',
      counters: updatedCounters,
    });
  } catch (error) {
    logger.error('Error provisioning server stats:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Failed to create server stats counters' });
  }
}

/**
 * DELETE /api/guilds/:guildId/serverstats
 * Deletes all counter channels from Discord and clears database entries.
 */
export async function deleteCounters(req, res) {
  try {
    const { guild, guildId } = req;
    const counters = await getServerCounters(req.client, guildId);

    for (const counter of counters) {
      try {
        const channel = guild.channels?.cache?.get(counter.channelId);
        if (channel && typeof channel.delete === 'function') {
          await channel.delete('TitanBot server stats counter deleted via Web Dashboard');
        }
      } catch (delErr) {
        logger.warn(`Could not delete counter channel ${counter.channelId}:`, delErr.message);
      }
    }

    await saveServerCounters(req.client, guildId, []);
    logger.info(`All server stats cleared for guild ${guildId}`);

    return res.json({
      success: true,
      message: 'Server stats counters cleared successfully',
    });
  } catch (error) {
    logger.error('Error deleting server stats:', error);
    return res.status(500).json({ error: 'InternalError', message: 'Failed to delete server stats counters' });
  }
}
