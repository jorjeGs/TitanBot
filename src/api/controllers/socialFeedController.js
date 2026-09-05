// socialFeedController.js — API controller for external notifications and social feeds
import crypto from 'crypto';
import { getGuildConfig, updateGuildConfig } from '../../services/config/guildConfig.js';
import { SocialFeedItemSchema, SocialFeedsConfigSchema } from '../../utils/schemas.js';
import {
  dispatchSocialAnnouncement,
  handleIncomingWebhook,
  fetchYouTubeLatest,
  fetchTwitchStatus,
  fetchRssLatest,
} from '../../services/social/socialFeedService.js';
import { logger } from '../../utils/logger.js';

function generateId(prefix = 'feed') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * GET /api/guilds/:guildId/socialfeeds
 */
export async function getSocialFeeds(req, res) {
  try {
    const { guildId } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);

    const socialFeeds = guildConfig?.socialFeeds || {
      enabled: true,
      checkIntervalMinutes: 5,
      feeds: [],
    };

    return res.json({
      success: true,
      data: socialFeeds,
    });
  } catch (error) {
    logger.error('Error in getSocialFeeds:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/socialfeeds
 */
export async function saveSocialFeed(req, res) {
  try {
    const { guildId } = req.params;
    const body = req.body || {};

    const rawItem = {
      ...body,
      id: body.id || generateId('feed'),
      webhookToken: body.type === 'webhook' && !body.webhookToken 
        ? crypto.randomBytes(16).toString('hex') 
        : body.webhookToken || '',
    };

    const parsed = SocialFeedItemSchema.safeParse(rawItem);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Invalid social feed payload',
      });
    }

    const guildConfig = await getGuildConfig(req.client, guildId);
    const currentSocial = guildConfig?.socialFeeds || { enabled: true, checkIntervalMinutes: 5, feeds: [] };
    const feeds = [...(currentSocial.feeds || [])];

    const index = feeds.findIndex((f) => f.id === parsed.data.id);
    if (index >= 0) {
      feeds[index] = { ...feeds[index], ...parsed.data };
    } else {
      feeds.push(parsed.data);
    }

    const updatedConfig = {
      ...currentSocial,
      feeds,
    };

    await updateGuildConfig(req.client, guildId, {
      socialFeeds: updatedConfig,
    });

    return res.json({
      success: true,
      data: parsed.data,
      message: index >= 0 ? 'Social feed updated successfully' : 'Social feed created successfully',
    });
  } catch (error) {
    logger.error('Error in saveSocialFeed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/guilds/:guildId/socialfeeds/:id
 */
export async function deleteSocialFeed(req, res) {
  try {
    const { guildId, id } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);
    const currentSocial = guildConfig?.socialFeeds || { enabled: true, checkIntervalMinutes: 5, feeds: [] };

    const initialLength = currentSocial.feeds?.length || 0;
    const filteredFeeds = (currentSocial.feeds || []).filter((f) => f.id !== id);

    if (filteredFeeds.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Social feed not found' });
    }

    await updateGuildConfig(req.client, guildId, {
      socialFeeds: {
        ...currentSocial,
        feeds: filteredFeeds,
      },
    });

    return res.json({ success: true, message: 'Social feed deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteSocialFeed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/socialfeeds/:id/test
 */
export async function testSocialFeed(req, res) {
  try {
    const { guildId, id } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);
    const feed = guildConfig?.socialFeeds?.feeds?.find((f) => f.id === id);

    if (!feed) {
      return res.status(404).json({ success: false, error: 'Social feed not found' });
    }

    let testItem = null;

    if (feed.type === 'youtube') {
      if (feed.youtubeChannelId) {
        try {
          testItem = await fetchYouTubeLatest(feed.youtubeChannelId);
        } catch {
          // Fallback to sample item
        }
      }
      if (!testItem) {
        testItem = {
          id: 'sample_yt_123',
          title: '🔥 Demostración de Nuevo Contenido en YouTube',
          author: feed.name || 'Canal Oficial',
          url: 'https://youtube.com',
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80',
          published: new Date().toISOString(),
        };
      }
    } else if (feed.type === 'twitch') {
      testItem = {
        id: 'sample_tw_123',
        isLive: true,
        streamer: feed.twitchUsername || feed.name || 'Streamer',
        title: '🔴 ¡Estamos En Vivo jugando en Comunidad!',
        game: 'Grand Theft Auto V',
        viewers: 1420,
        url: `https://twitch.tv/${feed.twitchUsername || 'streamer'}`,
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&q=80',
        startedAt: new Date().toISOString(),
      };
    } else if (feed.type === 'tiktok') {
      testItem = {
        id: 'sample_tt_123',
        title: '🎵 Nuevo Video Corto en TikTok',
        author: `@${feed.tiktokUsername || feed.name || 'creador'}`,
        url: `https://www.tiktok.com/@${feed.tiktokUsername || 'creador'}`,
        thumbnail: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=1280&q=80',
        published: new Date().toISOString(),
      };
    } else if (feed.type === 'instagram') {
      testItem = {
        id: 'sample_ig_123',
        title: '📸 Nueva Publicación en Instagram',
        author: `@${feed.instagramUsername || feed.name || 'creador'}`,
        url: `https://www.instagram.com/${feed.instagramUsername || 'creador'}`,
        description: '¡Echa un vistazo a la nueva sesión fotográfica y novedades en nuestro perfil de Instagram!',
        thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1280&q=80',
        published: new Date().toISOString(),
      };
    } else if (feed.type === 'rss') {
      if (feed.rssFeedUrl) {
        try {
          testItem = await fetchRssLatest(feed.rssFeedUrl);
        } catch {
          // Fallback to sample item
        }
      }
      if (!testItem) {
        testItem = {
          id: 'sample_rss_123',
          title: '📰 Noticia de Prueba: Nueva Actualización Publicada',
          author: feed.name || 'Blog Oficial',
          url: feed.rssFeedUrl || 'https://discord.com',
          description: 'Esta es una publicación de prueba para comprobar la entrega correcta de noticias y artículos RSS en este canal.',
          published: new Date().toISOString(),
        };
      }
    } else {
      // Webhook
      testItem = {
        id: 'sample_wh_123',
        title: '🚀 Alerta de Webhook Entrante (Prueba)',
        content: 'Evento de integración recibido con éxito desde la API externa.',
        author: 'TitanBot Webhooks',
        url: 'https://titanbot.dev',
        color: '#5865F2',
        fields: [
          { name: 'Estado', value: 'Operativo', inline: true },
          { name: 'Ambiente', value: 'Producción', inline: true },
        ],
      };
    }

    const dispatched = await dispatchSocialAnnouncement(req.client, guildId, feed, testItem);
    if (!dispatched) {
      return res.status(500).json({
        success: false,
        error: 'Could not send test message to Discord channel. Verify bot permissions and target channel.',
      });
    }

    return res.json({ success: true, message: 'Test announcement sent to channel' });
  } catch (error) {
    logger.error('Error in testSocialFeed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/webhooks/incoming/:guildId/:feedId
 * Public endpoint for external services
 */
export async function receiveIncomingWebhook(req, res) {
  try {
    const { guildId, feedId } = req.params;
    const token = req.query.token || req.headers['x-webhook-token'] || req.body?.token;
    const payload = req.body || {};

    const result = await handleIncomingWebhook(req.client, guildId, feedId, token, payload);
    return res.json({ success: true, ...result });
  } catch (error) {
    logger.warn('Error processing incoming webhook:', error.message);
    const status = error.message.includes('Invalid webhook authorization') ? 401 : 400;
    return res.status(status).json({ success: false, error: error.message });
  }
}
