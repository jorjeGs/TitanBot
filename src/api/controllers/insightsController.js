import {
  getInsightsOverview,
  getGrowthAnalytics,
  getActivityHeatmap,
  getChannelActivity,
} from '../../services/analytics/analyticsService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/insights/overview
 * Retrieve comprehensive insights summary with KPIs, growth history, heatmap and top channels.
 */
export async function getInsightsOverviewHandler(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Guild not found.',
      });
    }

    const range = parseInt(req.query.range, 10) || 30;
    const overview = await getInsightsOverview(guild, range);

    return res.json({
      success: true,
      ...overview,
    });
  } catch (error) {
    logger.error('Error fetching insights overview:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch insights overview.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/insights/growth
 * Retrieve time series of member growth (joins, leaves, net, totalMembers).
 */
export async function getGrowthHandler(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Guild not found.',
      });
    }

    const range = parseInt(req.query.range, 10) || 30;
    const history = await getGrowthAnalytics(guild, range);

    return res.json({
      success: true,
      history,
    });
  } catch (error) {
    logger.error('Error fetching growth history:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch growth history.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/insights/heatmap
 * Retrieve weekly 7x24 activity heatmap.
 */
export async function getHeatmapHandler(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Guild not found.',
      });
    }

    const heatmap = await getActivityHeatmap(guild.id);

    return res.json({
      success: true,
      heatmap,
    });
  } catch (error) {
    logger.error('Error fetching activity heatmap:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch activity heatmap.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/insights/channels
 * Retrieve channel chat participation breakdown.
 */
export async function getChannelsHandler(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Guild not found.',
      });
    }

    const range = parseInt(req.query.range, 10) || 30;
    const data = await getChannelActivity(guild, range);

    return res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    logger.error('Error fetching channel activity breakdown:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch channel activity breakdown.',
    });
  }
}
