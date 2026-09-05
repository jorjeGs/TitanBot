import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/utils/database/wrapper.js';
import {
  DailyAnalyticsSchema,
  ActivityHeatmapSchema,
  InsightsOverviewSchema,
} from '../../src/utils/schemas.js';
import {
  recordMemberJoin,
  recordMemberLeave,
  recordMessageActivity,
  flushAnalyticsBuffer,
  getDailyAnalytics,
  getActivityHeatmap,
  getGrowthAnalytics,
  getChannelActivity,
  getInsightsOverview,
} from '../../src/services/analytics/analyticsService.js';

describe('Server Insights & Analytics (Sub-project C)', () => {
  const guildId = '889900112233445566';
  let mockGuild;

  before(async () => {
    await db.initialize();

    mockGuild = {
      id: guildId,
      name: 'Analytics Test Guild',
      memberCount: 150,
      members: {
        cache: new Map([
          ['user-1', { id: 'user-1', joinedTimestamp: Date.now() - 24 * 60 * 60 * 1000 }],
          ['user-2', { id: 'user-2', joinedTimestamp: Date.now() - 48 * 60 * 60 * 1000 }],
          ['user-3', { id: 'user-3', joinedTimestamp: Date.now() - 72 * 60 * 60 * 1000 }],
        ]),
      },
      channels: {
        cache: new Map([
          ['ch-general', { id: 'ch-general', name: 'general', type: 0, isTextBased: () => true }],
          ['ch-memes', { id: 'ch-memes', name: 'memes', type: 0, isTextBased: () => true }],
        ]),
      },
    };
  });

  it('validates DailyAnalyticsSchema and ActivityHeatmapSchema', () => {
    const validDaily = {
      date: '2026-09-05',
      joins: 5,
      leaves: 2,
      net: 3,
      totalMembers: 150,
      messages: 450,
      activeUsers: 30,
      channels: { 'ch-general': 300, 'ch-memes': 150 },
    };

    const parsedDaily = DailyAnalyticsSchema.safeParse(validDaily);
    assert.strictEqual(parsedDaily.success, true);
    assert.strictEqual(parsedDaily.data.net, 3);

    const validHeatmap = {
      matrix: Array.from({ length: 7 }, () => Array(24).fill(0)),
      totalMessages: 50,
      lastUpdated: new Date().toISOString(),
    };

    const parsedHeatmap = ActivityHeatmapSchema.safeParse(validHeatmap);
    assert.strictEqual(parsedHeatmap.success, true);
    assert.strictEqual(parsedHeatmap.data.matrix.length, 7);
    assert.strictEqual(parsedHeatmap.data.matrix[0].length, 24);
  });

  it('records member joins and updates daily metrics', async () => {
    const mockMember = { id: 'user-new', user: { tag: 'NewUser#0001' } };
    mockGuild.memberCount = 151;

    await recordMemberJoin(mockGuild, mockMember);

    const todayStr = new Date().toISOString().slice(0, 10);
    const daily = await getDailyAnalytics(guildId, todayStr);

    assert.ok(daily.joins >= 1);
    assert.strictEqual(daily.totalMembers, 151);
  });

  it('records member leaves and updates net growth', async () => {
    const mockMember = { id: 'user-leaving', user: { tag: 'LeavingUser#0001' } };
    mockGuild.memberCount = 150;

    await recordMemberLeave(mockGuild, mockMember);

    const todayStr = new Date().toISOString().slice(0, 10);
    const daily = await getDailyAnalytics(guildId, todayStr);

    assert.ok(daily.leaves >= 1);
  });

  it('buffers and flushes message activity, updating daily totals, channel counts and heatmap', async () => {
    const channel = { id: 'ch-general' };
    const author = { id: 'user-1', bot: false };

    // Record 3 message activity events
    recordMessageActivity(mockGuild, channel, author);
    recordMessageActivity(mockGuild, channel, author);
    recordMessageActivity(mockGuild, { id: 'ch-memes' }, author);

    // Flush buffer explicitly
    await flushAnalyticsBuffer(guildId);

    const todayStr = new Date().toISOString().slice(0, 10);
    const daily = await getDailyAnalytics(guildId, todayStr);

    assert.ok(daily.messages >= 3);
    assert.ok(daily.channels['ch-general'] >= 2);
    assert.ok(daily.channels['ch-memes'] >= 1);

    const heatmap = await getActivityHeatmap(guildId);
    assert.ok(heatmap.totalMessages >= 3);
  });

  it('generates growth analytics with historical baseline for new servers', async () => {
    const history = await getGrowthAnalytics(mockGuild, 14);

    assert.strictEqual(history.length, 14);
    assert.ok(history[history.length - 1].totalMembers > 0);
  });

  it('calculates channel participation breakdown', async () => {
    const channelsData = await getChannelActivity(mockGuild, 30);

    assert.ok(Array.isArray(channelsData.topChannels));
    assert.ok(channelsData.topChannels.length > 0);
    const general = channelsData.topChannels.find((c) => c.id === 'ch-general');
    assert.ok(general);
    assert.strictEqual(general.name, 'general');
  });

  it('retrieves full insights overview matching InsightsOverviewSchema', async () => {
    const overview = await getInsightsOverview(mockGuild, 30);

    const parsed = InsightsOverviewSchema.safeParse(overview);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.guildId, guildId);
    assert.ok(parsed.data.history.length >= 7);
  });
});
