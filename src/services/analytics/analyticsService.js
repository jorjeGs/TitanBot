import { db } from '../../utils/database/wrapper.js';
import {
  getDailyAnalyticsKey,
  getAnalyticsHeatmapKey,
  getAnalyticsIndexKey,
} from '../../utils/database/keys.js';
import {
  DailyAnalyticsSchema,
  ActivityHeatmapSchema,
} from '../../utils/schemas.js';
import { logger } from '../../utils/logger.js';

// In-memory message activity buffer for debounced batch persistence
const activityBuffer = new Map(); // guildId -> { date, messages, channels: Map, heatmap: Array(7).fill().map(() => Array(24).fill(0)) }
let flushTimer = null;

function getTodayDateString(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function getDaysAgoDateString(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Get or create the activity buffer for a guild.
 */
function getGuildBuffer(guildId) {
  const today = getTodayDateString();
  let buf = activityBuffer.get(guildId);
  if (!buf || buf.date !== today) {
    buf = {
      date: today,
      messages: 0,
      channels: new Map(),
      heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
    };
    activityBuffer.set(guildId, buf);
  }
  return buf;
}

/**
 * Flush in-memory activity buffer to PostgreSQL.
 */
export async function flushAnalyticsBuffer(guildId = null) {
  const guildsToFlush = guildId ? [guildId] : Array.from(activityBuffer.keys());

  for (const gId of guildsToFlush) {
    const buf = activityBuffer.get(gId);
    if (!buf || buf.messages === 0) continue;

    // Reset buffer counts immediately
    const messagesToAdd = buf.messages;
    const channelsToAdd = Object.fromEntries(buf.channels);
    const heatmapToAdd = buf.heatmap.map((row) => [...row]);

    buf.messages = 0;
    buf.channels.clear();
    buf.heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));

    try {
      // 1. Update Daily Analytics
      const dateStr = buf.date;
      const daily = await getDailyAnalytics(gId, dateStr);
      daily.messages = (daily.messages || 0) + messagesToAdd;
      daily.channels = daily.channels || {};

      for (const [chId, count] of Object.entries(channelsToAdd)) {
        daily.channels[chId] = (daily.channels[chId] || 0) + count;
      }

      await saveDailyAnalytics(gId, daily);

      // 2. Update Heatmap
      const heatmap = await getActivityHeatmap(gId);
      for (let day = 0; day < 7; day++) {
        for (let hr = 0; hr < 24; hr++) {
          heatmap.matrix[day][hr] = (heatmap.matrix[day][hr] || 0) + heatmapToAdd[day][hr];
        }
      }
      heatmap.totalMessages = (heatmap.totalMessages || 0) + messagesToAdd;
      heatmap.lastUpdated = new Date().toISOString();

      await db.set(getAnalyticsHeatmapKey(gId), heatmap);
    } catch (err) {
      logger.error(`Failed to flush analytics buffer for guild ${gId}:`, err);
    }
  }
}

// Ensure flush timer runs periodically every 10 seconds
if (!flushTimer) {
  flushTimer = setInterval(() => {
    flushAnalyticsBuffer().catch((err) => {
      logger.error('Error during automatic analytics buffer flush:', err);
    });
  }, 10000);
  if (flushTimer.unref) flushTimer.unref();
}

/**
 * Retrieve daily analytics record for a guild.
 */
export async function getDailyAnalytics(guildId, dateString) {
  try {
    const raw = await db.get(getDailyAnalyticsKey(guildId, dateString));
    if (raw) {
      const parsed = DailyAnalyticsSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    }
  } catch (err) {
    logger.warn(`Error loading daily analytics for ${guildId} on ${dateString}:`, err);
  }

  return {
    date: dateString,
    joins: 0,
    leaves: 0,
    net: 0,
    totalMembers: 0,
    messages: 0,
    activeUsers: 0,
    channels: {},
  };
}

/**
 * Save daily analytics record for a guild and update index.
 */
export async function saveDailyAnalytics(guildId, data) {
  const validated = DailyAnalyticsSchema.parse(data);
  await db.set(getDailyAnalyticsKey(guildId, validated.date), validated);

  try {
    const indexKey = getAnalyticsIndexKey(guildId);
    let index = await db.get(indexKey);
    if (!Array.isArray(index)) index = [];
    if (!index.includes(validated.date)) {
      index.push(validated.date);
      // Keep last 90 days in index
      index.sort();
      if (index.length > 90) index = index.slice(-90);
      await db.set(indexKey, index);
    }
  } catch (err) {
    logger.warn(`Error updating analytics index for ${guildId}:`, err);
  }

  return validated;
}

/**
 * Record a member join event.
 */
export async function recordMemberJoin(guild, member) {
  if (!guild || !guild.id) return;
  try {
    const dateStr = getTodayDateString();
    const daily = await getDailyAnalytics(guild.id, dateStr);
    daily.joins = (daily.joins || 0) + 1;
    daily.net = (daily.net || 0) + 1;
    daily.totalMembers = guild.memberCount || (daily.totalMembers ? daily.totalMembers + 1 : 1);

    await saveDailyAnalytics(guild.id, daily);
  } catch (err) {
    logger.error(`Error recording member join for guild ${guild.id}:`, err);
  }
}

/**
 * Record a member leave event.
 */
export async function recordMemberLeave(guild, member) {
  if (!guild || !guild.id) return;
  try {
    const dateStr = getTodayDateString();
    const daily = await getDailyAnalytics(guild.id, dateStr);
    daily.leaves = (daily.leaves || 0) + 1;
    daily.net = (daily.net || 0) - 1;
    daily.totalMembers = guild.memberCount || (daily.totalMembers ? Math.max(0, daily.totalMembers - 1) : 0);

    await saveDailyAnalytics(guild.id, daily);
  } catch (err) {
    logger.error(`Error recording member leave for guild ${guild.id}:`, err);
  }
}

/**
 * Record a chat message activity event in the fast memory buffer.
 */
export function recordMessageActivity(guild, channel, author) {
  if (!guild || !guild.id || !channel || !channel.id || !author || author.bot) return;

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const hour = now.getUTCHours(); // 0 .. 23

  const buf = getGuildBuffer(guild.id);
  buf.messages += 1;
  buf.channels.set(channel.id, (buf.channels.get(channel.id) || 0) + 1);
  buf.heatmap[dayOfWeek][hour] += 1;

  // If buffer reached high activity threshold, flush asynchronously
  if (buf.messages >= 50) {
    flushAnalyticsBuffer(guild.id).catch((err) => {
      logger.error('Error auto-flushing analytics buffer:', err);
    });
  }
}

/**
 * Retrieve the 7x24 weekly activity heatmap.
 */
export async function getActivityHeatmap(guildId) {
  try {
    const raw = await db.get(getAnalyticsHeatmapKey(guildId));
    if (raw) {
      const parsed = ActivityHeatmapSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    }
  } catch (err) {
    logger.warn(`Error loading activity heatmap for ${guildId}:`, err);
  }

  return {
    matrix: Array.from({ length: 7 }, () => Array(24).fill(0)),
    totalMessages: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Retrieve growth time series with automatic historical baseline generator.
 */
export async function getGrowthAnalytics(guild, days = 30) {
  const guildId = guild.id;
  const numDays = Math.min(Math.max(days, 7), 90);

  // Generate date list from (today - numDays + 1) to today
  const dateList = [];
  for (let i = numDays - 1; i >= 0; i--) {
    dateList.push(getDaysAgoDateString(i));
  }

  // Load existing records from database
  const records = await Promise.all(dateList.map((d) => getDailyAnalytics(guildId, d)));

  // Count non-empty recorded days
  const hasHistory = records.some((r) => r.joins > 0 || r.leaves > 0 || r.messages > 0);

  // If no history exists yet in database, generate a realistic baseline from cached members joined dates
  if (!hasHistory && guild.members?.cache?.size > 0) {
    const joinCountsByDate = new Map();
    dateList.forEach((d) => joinCountsByDate.set(d, 0));

    // Inspect joinedTimestamp for cached members
    guild.members.cache.forEach((m) => {
      if (m.joinedTimestamp) {
        const joinDate = new Date(m.joinedTimestamp).toISOString().slice(0, 10);
        if (joinCountsByDate.has(joinDate)) {
          joinCountsByDate.set(joinDate, joinCountsByDate.get(joinDate) + 1);
        }
      }
    });

    let currentTotal = guild.memberCount || guild.members.cache.size;
    // Walk backwards to estimate totalMembers for past days
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i];
      const estimatedJoins = joinCountsByDate.get(r.date) || 0;
      r.joins = estimatedJoins;
      r.net = estimatedJoins;
      r.totalMembers = currentTotal;
      currentTotal = Math.max(1, currentTotal - estimatedJoins);
    }
  } else {
    // Fill totalMembers smoothly if some days had 0
    let lastKnownTotal = guild.memberCount || 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].totalMembers > 0) {
        lastKnownTotal = records[i].totalMembers;
      } else {
        records[i].totalMembers = lastKnownTotal;
      }
    }
  }

  return records;
}

/**
 * Retrieve channel activity breakdown with names and participation percentages.
 */
export async function getChannelActivity(guild, days = 30) {
  const history = await getGrowthAnalytics(guild, days);

  const channelTotals = new Map();
  let totalChat = 0;

  for (const day of history) {
    if (day.channels) {
      for (const [chId, count] of Object.entries(day.channels)) {
        channelTotals.set(chId, (channelTotals.get(chId) || 0) + count);
        totalChat += count;
      }
    }
  }

  const topChannels = [];
  for (const [chId, count] of channelTotals.entries()) {
    const channelObj = guild.channels?.cache?.get(chId);
    topChannels.push({
      id: chId,
      name: channelObj ? channelObj.name : `channel-${chId.slice(-4)}`,
      count,
      percentage: totalChat > 0 ? Math.round((count / totalChat) * 1000) / 10 : 0,
    });
  }

  topChannels.sort((a, b) => b.count - a.count);

  // If no chat history is recorded yet, provide available text channels as baseline
  if (topChannels.length === 0 && guild.channels?.cache) {
    const textChannels = Array.from(guild.channels.cache.values())
      .filter((c) => c.type === 0 || c.isTextBased?.())
      .slice(0, 5);

    textChannels.forEach((c) => {
      topChannels.push({
        id: c.id,
        name: c.name,
        count: 0,
        percentage: 0,
      });
    });
  }

  return {
    totalMessages: totalChat,
    topChannels: topChannels.slice(0, 10),
  };
}

/**
 * Retrieve full insights overview for dashboard display.
 */
export async function getInsightsOverview(guild, days = 30) {
  // Flush any buffered messages so stats reflect right now
  await flushAnalyticsBuffer(guild.id);

  const history = await getGrowthAnalytics(guild, days);
  const heatmap = await getActivityHeatmap(guild.id);
  const channelsData = await getChannelActivity(guild, days);

  const totalMembers = guild.memberCount || (history[history.length - 1]?.totalMembers || 0);

  // Calculate 7-day and 30-day net growth
  const last7Days = history.slice(-7);
  const growth7d = last7Days.reduce((acc, d) => acc + (d.net || 0), 0);
  const growth30d = history.reduce((acc, d) => acc + (d.net || 0), 0);

  // Messages today and in last 7 days
  const todayRecord = history[history.length - 1];
  const messagesToday = todayRecord ? todayRecord.messages || 0 : 0;
  const messages7d = last7Days.reduce((acc, d) => acc + (d.messages || 0), 0);

  // Find peak hour and peak day in heatmap
  let peakHour = 18;
  let peakDay = 5;
  let maxCount = -1;

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const val = heatmap.matrix[d]?.[h] || 0;
      if (val > maxCount) {
        maxCount = val;
        peakDay = d;
        peakHour = h;
      }
    }
  }

  return {
    guildId: guild.id,
    totalMembers,
    growth7d,
    growth30d,
    messagesToday,
    messages7d,
    peakHour,
    peakDay,
    topChannels: channelsData.topChannels,
    history,
    heatmap,
  };
}
