import { MusicActionSchema } from '../../utils/schemas.js';
import { getGuildMusicData, deleteGuildMusicData } from '../../services/music/playerStore.js';
import { refreshPlayerMessage } from '../../services/music/playerHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/music/status
 * Returns current Lavalink node status, active player, track metadata and queue.
 */
export async function getMusicStatusHandler(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'GuildNotFound',
        message: 'Guild not found or TitanBot is not present.',
      });
    }

    // Lavalink Nodes status
    const nodes = [];
    if (req.client?.riffy?.nodeMap) {
      for (const node of req.client.riffy.nodeMap.values()) {
        nodes.push({
          name: node.name || 'default',
          connected: Boolean(node.connected),
        });
      }
    }

    const player = req.client?.riffy?.players?.get(guildId) || null;
    const guildData = getGuildMusicData(guildId);

    if (!player || (!player.current && (!player.queue || player.queue.length === 0))) {
      return res.json({
        success: true,
        connected: Boolean(player?.connected),
        isPlaying: false,
        isPaused: false,
        volume: guildData?.volume ?? 75,
        loop: guildData?.loop || 'none',
        current: null,
        queue: [],
        voiceChannel: null,
        nodes,
      });
    }

    const current = player.current
      ? {
          title: player.current.info?.title || 'Unknown Title',
          author: player.current.info?.author || 'Unknown Artist',
          duration: Number(player.current.info?.length || 0),
          position: Number(player.position || 0),
          thumbnail: player.current.info?.thumbnail || null,
          uri: player.current.info?.uri || null,
          requester: player.current.info?.requester
            ? {
                id: player.current.info.requester.id,
                username:
                  player.current.info.requester.username ||
                  player.current.info.requester.tag ||
                  'User',
              }
            : null,
        }
      : null;

    const queue = Array.isArray(player.queue)
      ? player.queue.map((track, idx) => ({
          index: idx + 1,
          title: track.info?.title || 'Unknown Title',
          author: track.info?.author || 'Unknown Artist',
          duration: Number(track.info?.length || 0),
          thumbnail: track.info?.thumbnail || null,
          uri: track.info?.uri || null,
        }))
      : [];

    const voiceChannel = player.voiceChannel
      ? {
          id: player.voiceChannel,
          name:
            guild.channels?.cache?.get(player.voiceChannel)?.name ||
            `voice-${player.voiceChannel.slice(-4)}`,
        }
      : null;

    return res.json({
      success: true,
      connected: Boolean(player.connected),
      isPlaying: Boolean(player.playing && !player.paused),
      isPaused: Boolean(player.paused),
      volume: player.volume ?? guildData?.volume ?? 75,
      loop: guildData?.loop || 'none',
      current,
      queue,
      voiceChannel,
      nodes,
    });
  } catch (error) {
    logger.error('Error fetching music status:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to retrieve music status.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/music/action
 * Executes control actions on active music player (pause, resume, skip, stop, volume, loop, shuffle).
 */
export async function executeMusicActionHandler(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'GuildNotFound',
        message: 'Guild not found or TitanBot is not present.',
      });
    }

    const parsed = MusicActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: parsed.error.issues[0]?.message || 'Invalid music action.',
        issues: parsed.error.issues,
      });
    }

    const player = req.client?.riffy?.players?.get(guildId) || null;
    if (!player || (!player.current && parsed.data.action !== 'stop')) {
      return res.status(400).json({
        success: false,
        error: 'NoActivePlayer',
        message: 'There is no music currently playing in this server.',
      });
    }

    const guildData = getGuildMusicData(guildId);
    const { action, value } = parsed.data;

    switch (action) {
      case 'pause':
        if (typeof player.pause === 'function') player.pause(true);
        if (req.client?.channels?.cache && typeof refreshPlayerMessage === 'function') {
          await refreshPlayerMessage(req.client, guildId).catch(() => {});
        }
        break;

      case 'resume':
        if (typeof player.pause === 'function') player.pause(false);
        if (req.client?.channels?.cache && typeof refreshPlayerMessage === 'function') {
          await refreshPlayerMessage(req.client, guildId).catch(() => {});
        }
        break;

      case 'skip':
        if (player.loop === 'track') {
          if (typeof player.setLoop === 'function') player.setLoop('none');
          if (guildData) guildData.loop = 'none';
        }
        if (typeof player.stop === 'function') player.stop();
        break;

      case 'stop':
        if (typeof player.destroy === 'function') player.destroy();
        deleteGuildMusicData(guildId);
        break;

      case 'volume': {
        const vol = Math.max(0, Math.min(100, Number(value) || 75));
        if (typeof player.setVolume === 'function') player.setVolume(vol);
        if (guildData) guildData.volume = vol;
        break;
      }

      case 'shuffle':
        if (player.queue && typeof player.queue.shuffle === 'function') {
          player.queue.shuffle();
        }
        if (guildData) guildData.shuffle = true;
        break;

      case 'loop': {
        const loopMode = ['none', 'track', 'queue'].includes(value) ? value : 'none';
        if (typeof player.setLoop === 'function') player.setLoop(loopMode);
        if (guildData) guildData.loop = loopMode;
        if (req.client?.channels?.cache && typeof refreshPlayerMessage === 'function') {
          await refreshPlayerMessage(req.client, guildId).catch(() => {});
        }
        break;
      }

      default:
        break;
    }

    return res.json({
      success: true,
      action,
      message: `Music action '${action}' applied successfully.`,
    });
  } catch (error) {
    logger.error('Error executing music action:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to execute music action.',
    });
  }
}
