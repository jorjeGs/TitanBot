// socialFeedService.js — Social feeds, RSS/Atom notifications and inbound webhooks for TitanBot
import axios from 'axios';
import { logger } from '../../utils/logger.js';
import { getGuildConfig, updateGuildConfig } from '../config/guildConfig.js';
import { createEmbed } from '../../utils/embeds.js';

// Cache for Twitch OAuth App Access Token
let twitchTokenCache = {
  token: null,
  expiresAt: 0,
};

/**
 * Lightweight XML tag extractor without external parser dependencies
 */
export function extractXmlTag(xml, tagName) {
  if (!xml || typeof xml !== 'string') return '';
  // Try CDATA first: <tag><![CDATA[content]]></tag>
  const cdataRegex = new RegExp(`<${tagName}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch && cdataMatch[1]) {
    return cdataMatch[1].trim();
  }

  // Standard tag: <tag>content</tag>
  const standardRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(standardRegex);
  if (match && match[1]) {
    return match[1].replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
  return '';
}

/**
 * Extract attribute from tag (e.g. <link href="..." />)
 */
export function extractXmlAttr(xml, tagName, attrName) {
  if (!xml || typeof xml !== 'string') return '';
  const attrRegex = new RegExp(`<${tagName}[^>]*\\b${attrName}=["']([^"']*)["'][^>]*>`, 'i');
  const match = xml.match(attrRegex);
  return match && match[1] ? match[1].trim() : '';
}

/**
 * Fetch latest YouTube video from official RSS feed
 */
export async function fetchYouTubeLatest(channelId) {
  if (!channelId) throw new Error('YouTube Channel ID is required');
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const response = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'TitanBot-SocialFeeds/2.1' },
  });

  const xml = response.data;
  if (!xml || typeof xml !== 'string') {
    throw new Error('Invalid YouTube feed XML received');
  }

  // Find first <entry>
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
  if (!entryMatch) {
    return null;
  }

  const entryXml = entryMatch[1];
  const videoId = extractXmlTag(entryXml, 'yt:videoId') || extractXmlTag(entryXml, 'id').replace('yt:video:', '');
  const title = extractXmlTag(entryXml, 'title');
  const author = extractXmlTag(entryXml, 'name') || extractXmlTag(xml, 'title');
  const published = extractXmlTag(entryXml, 'published') || new Date().toISOString();
  const link = extractXmlAttr(entryXml, 'link', 'href') || `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: videoId,
    title,
    author,
    url: link,
    thumbnail,
    published,
  };
}

/**
 * Fetch Twitch app access token
 */
async function getTwitchAppToken(clientId, clientSecret) {
  const now = Date.now();
  if (twitchTokenCache.token && twitchTokenCache.expiresAt > now + 60000) {
    return twitchTokenCache.token;
  }

  const response = await axios.post(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    {},
    { timeout: 8000 }
  );

  if (response.data && response.data.access_token) {
    twitchTokenCache.token = response.data.access_token;
    twitchTokenCache.expiresAt = now + (response.data.expires_in || 3600) * 1000;
    return twitchTokenCache.token;
  }

  throw new Error('Failed to obtain Twitch access token');
}

/**
 * Check Twitch streamer live status via Helix API
 */
export async function fetchTwitchStatus(username, credentials = {}) {
  const clientId = credentials.clientId || process.env.TWITCH_CLIENT_ID;
  const clientSecret = credentials.clientSecret || process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.debug('Twitch credentials not configured; skipping Twitch check');
    return null;
  }

  const token = await getTwitchAppToken(clientId, clientSecret);
  const cleanUser = username.trim().toLowerCase();

  const response = await axios.get(
    `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(cleanUser)}`,
    {
      timeout: 8000,
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const stream = response.data?.data?.[0];
  if (!stream || stream.type !== 'live') {
    return { isLive: false, streamer: cleanUser };
  }

  const thumbnail = stream.thumbnail_url
    ? stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720')
    : '';

  return {
    id: String(stream.id),
    isLive: true,
    streamer: stream.user_name || cleanUser,
    title: stream.title || 'En Vivo en Twitch',
    game: stream.game_name || 'Just Chatting',
    viewers: stream.viewer_count || 0,
    url: `https://twitch.tv/${cleanUser}`,
    thumbnail,
    startedAt: stream.started_at || new Date().toISOString(),
  };
}

/**
 * Fetch latest item from generic RSS or Atom feed
 */
export async function fetchRssLatest(feedUrl) {
  if (!feedUrl) throw new Error('Feed URL is required');

  const response = await axios.get(feedUrl, {
    timeout: 10000,
    headers: { 'User-Agent': 'TitanBot-SocialFeeds/2.1' },
  });

  const xml = response.data;
  if (!xml || typeof xml !== 'string') {
    throw new Error('Invalid feed XML received');
  }

  // Look for RSS <item> or Atom <entry>
  const itemMatch = xml.match(/<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/i);
  if (!itemMatch) {
    return null;
  }

  const itemXml = itemMatch[1];
  const title = extractXmlTag(itemXml, 'title') || 'Nuevo Anuncio';
  let link = extractXmlTag(itemXml, 'link');
  if (!link) {
    link = extractXmlAttr(itemXml, 'link', 'href');
  }

  const id = extractXmlTag(itemXml, 'guid') || extractXmlTag(itemXml, 'id') || link || title;
  const published = extractXmlTag(itemXml, 'pubDate') || extractXmlTag(itemXml, 'published') || new Date().toISOString();
  let description = extractXmlTag(itemXml, 'description') || extractXmlTag(itemXml, 'summary') || '';
  
  // Strip HTML tags from description
  description = description.replace(/<[^>]*>?/gm, '').trim();
  if (description.length > 300) {
    description = description.slice(0, 297) + '...';
  }

  const feedTitle = extractXmlTag(xml, 'title') || 'RSS Feed';

  return {
    id,
    title,
    author: feedTitle,
    url: link,
    description,
    published,
  };
}

/**
 * Build rich Discord embed for the platform alert
 */
export function buildFeedEmbed(feed, itemData) {
  const type = feed.type;

  if (type === 'youtube') {
    return {
      title: itemData.title || 'Nuevo Video de YouTube',
      url: itemData.url,
      color: 0xff0000, // YouTube Red
      author: {
        name: `${itemData.author || feed.name || 'YouTube'} ha subido un video`,
        icon_url: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
        url: itemData.url,
      },
      image: itemData.thumbnail ? { url: itemData.thumbnail } : undefined,
      timestamp: itemData.published ? new Date(itemData.published).toISOString() : new Date().toISOString(),
      footer: {
        text: 'TitanBot Social Feeds • YouTube',
      },
    };
  }

  if (type === 'twitch') {
    return {
      title: itemData.title || '¡Directo en Twitch!',
      url: itemData.url,
      color: 0x9146ff, // Twitch Purple
      author: {
        name: `¡${itemData.streamer || feed.name} está transmitiendo en vivo!`,
        icon_url: 'https://cdn-icons-png.flaticon.com/512/5968/5968819.png',
        url: itemData.url,
      },
      fields: [
        {
          name: 'Categoría / Juego',
          value: itemData.game || 'Just Chatting',
          inline: true,
        },
        {
          name: 'Espectadores',
          value: String(itemData.viewers || 0),
          inline: true,
        },
      ],
      image: itemData.thumbnail ? { url: itemData.thumbnail } : undefined,
      timestamp: itemData.startedAt ? new Date(itemData.startedAt).toISOString() : new Date().toISOString(),
      footer: {
        text: 'TitanBot Social Feeds • Twitch',
      },
    };
  }

  if (type === 'rss') {
    return {
      title: itemData.title || 'Nueva Publicación',
      url: itemData.url,
      description: itemData.description || undefined,
      color: 0xffa500, // RSS Orange
      author: {
        name: itemData.author || feed.name || 'Feed RSS',
        url: itemData.url,
      },
      timestamp: itemData.published ? new Date(itemData.published).toISOString() : new Date().toISOString(),
      footer: {
        text: 'TitanBot Social Feeds • RSS',
      },
    };
  }

  // Webhook
  return {
    title: itemData.title || feed.name || 'Notificación Externa',
    url: itemData.url || undefined,
    description: itemData.content || itemData.description || 'Nuevo evento recibido.',
    color: itemData.color ? parseInt(String(itemData.color).replace('#', ''), 16) : 0x5865f2,
    author: itemData.author ? { name: itemData.author } : { name: feed.name || 'Webhook' },
    fields: Array.isArray(itemData.fields) ? itemData.fields.slice(0, 10) : [],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'TitanBot Inbound Webhooks',
    },
  };
}

/**
 * Replace placeholders in custom message template
 */
export function interpolateFeedMessage(template, data) {
  if (!template || typeof template !== 'string') {
    return `${data.author || data.streamer || 'Nuevo contenido'}: ${data.title || ''}\n${data.url || ''}`;
  }

  return template
    .replace(/\{author\}/gi, data.author || data.streamer || '')
    .replace(/\{streamer\}/gi, data.streamer || data.author || '')
    .replace(/\{title\}/gi, data.title || '')
    .replace(/\{url\}/gi, data.url || '')
    .replace(/\{game\}/gi, data.game || '')
    .replace(/\{viewers\}/gi, String(data.viewers || 0));
}

/**
 * Dispatch an announcement into the designated Discord channel
 */
export async function dispatchSocialAnnouncement(client, guildId, feed, itemData) {
  try {
    const guild = client.guilds?.cache?.get(guildId);
    if (!guild) {
      logger.warn(`Guild ${guildId} not found in client cache during social dispatch`);
      return false;
    }

    const channel = guild.channels?.cache?.get(feed.targetChannelId);
    if (!channel || !channel.send) {
      logger.warn(`Channel ${feed.targetChannelId} not found in guild ${guildId}`);
      return false;
    }

    let messageContent = interpolateFeedMessage(feed.customMessage, itemData);

    // Apply role mention ping
    if (feed.mentionRole) {
      if (feed.mentionRole === '@everyone' || feed.mentionRole === '@here') {
        messageContent = `${feed.mentionRole} ${messageContent}`;
      } else if (/^\d{17,20}$/.test(feed.mentionRole)) {
        messageContent = `<@&${feed.mentionRole}> ${messageContent}`;
      }
    }

    const embed = buildFeedEmbed(feed, itemData);

    await channel.send({
      content: messageContent,
      embeds: [embed],
    });

    logger.info(`Dispatched social announcement for feed ${feed.name} (${feed.type}) to #${channel.name}`);
    return true;
  } catch (error) {
    logger.error(`Error dispatching social announcement for feed ${feed.name}:`, error);
    return false;
  }
}

/**
 * Check feeds for a specific guild and dispatch announcements for new items
 */
export async function checkGuildSocialFeeds(client, guildId) {
  try {
    const config = await getGuildConfig(client, guildId);
    const socialConfig = config?.socialFeeds;

    if (!socialConfig || socialConfig.enabled === false || !Array.isArray(socialConfig.feeds)) {
      return;
    }

    let hasUpdates = false;
    const updatedFeeds = [];

    for (const feed of socialConfig.feeds) {
      if (!feed.enabled || !feed.targetChannelId) {
        updatedFeeds.push(feed);
        continue;
      }

      try {
        let latest = null;

        if (feed.type === 'youtube' && feed.youtubeChannelId) {
          latest = await fetchYouTubeLatest(feed.youtubeChannelId);
          if (latest && latest.id && latest.id !== feed.lastItemId) {
            await dispatchSocialAnnouncement(client, guildId, feed, latest);
            feed.lastItemId = latest.id;
            feed.lastPublished = latest.published;
            feed.lastChecked = new Date().toISOString();
            hasUpdates = true;
          }
        } else if (feed.type === 'twitch' && feed.twitchUsername) {
          const status = await fetchTwitchStatus(feed.twitchUsername);
          if (status && status.isLive) {
            // Stream just went live
            if (!feed.isLive || (status.id && status.id !== feed.lastItemId)) {
              await dispatchSocialAnnouncement(client, guildId, feed, status);
              feed.lastItemId = status.id;
              feed.isLive = true;
              feed.lastChecked = new Date().toISOString();
              hasUpdates = true;
            }
          } else if (status && !status.isLive && feed.isLive) {
            // Stream went offline
            feed.isLive = false;
            feed.lastChecked = new Date().toISOString();
            hasUpdates = true;
          }
        } else if (feed.type === 'rss' && feed.rssFeedUrl) {
          latest = await fetchRssLatest(feed.rssFeedUrl);
          if (latest && latest.id && latest.id !== feed.lastItemId) {
            await dispatchSocialAnnouncement(client, guildId, feed, latest);
            feed.lastItemId = latest.id;
            feed.lastPublished = latest.published;
            feed.lastChecked = new Date().toISOString();
            hasUpdates = true;
          }
        }
      } catch (feedError) {
        logger.warn(`Error checking feed ${feed.name} (${feed.type}) for guild ${guildId}:`, feedError.message);
      }

      feed.lastChecked = new Date().toISOString();
      updatedFeeds.push(feed);
    }

    if (hasUpdates) {
      await updateGuildConfig(client, guildId, {
        socialFeeds: {
          ...socialConfig,
          feeds: updatedFeeds,
        },
      });
    }
  } catch (error) {
    logger.error(`Error processing social feeds for guild ${guildId}:`, error);
  }
}

/**
 * Periodic check routine across all guilds
 */
export async function checkAllSocialFeeds(client) {
  if (!client.guilds?.cache) return;
  for (const guildId of client.guilds.cache.keys()) {
    await checkGuildSocialFeeds(client, guildId);
  }
}

/**
 * Handle incoming webhook payload and forward to target Discord channel
 */
export async function handleIncomingWebhook(client, guildId, feedId, token, payload) {
  const config = await getGuildConfig(client, guildId);
  const socialConfig = config?.socialFeeds;

  if (!socialConfig || !Array.isArray(socialConfig.feeds)) {
    throw new Error('Social feeds not configured for this server');
  }

  const feed = socialConfig.feeds.find((f) => f.id === feedId && f.type === 'webhook');
  if (!feed) {
    throw new Error('Webhook feed not found');
  }

  if (feed.webhookToken && feed.webhookToken !== token) {
    throw new Error('Invalid webhook authorization token');
  }

  const itemData = {
    title: payload.title || payload.event || feed.name,
    content: payload.content || payload.message || payload.description || JSON.stringify(payload, null, 2).slice(0, 1000),
    author: payload.author || payload.sender || payload.repository?.full_name || 'Webhook Integration',
    url: payload.url || payload.html_url || payload.link || '',
    color: payload.color || '#5865F2',
    fields: payload.fields || [],
  };

  const success = await dispatchSocialAnnouncement(client, guildId, feed, itemData);
  return { success, feedId, channelId: feed.targetChannelId };
}
