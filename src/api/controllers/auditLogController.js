import { getGuildAuditLogs, clearGuildAuditLogs } from '../../services/audit/auditLogService.js';
import { logger } from '../../utils/logger.js';

/**
 * Controller to fetch paginated audit logs for a guild.
 */
export async function getGuildAuditLogsHandler(req, res) {
  try {
    const { guildId } = req.params;
    const { page, limit, category, search } = req.query;

    const result = await getGuildAuditLogs({
      guildId,
      page,
      limit,
      category,
      search,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching guild audit logs:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to retrieve dashboard audit logs.',
    });
  }
}

/**
 * Controller to clear audit logs for a guild (requires Administrator).
 */
export async function clearGuildAuditLogsHandler(req, res) {
  try {
    const { guildId } = req.params;
    await clearGuildAuditLogs(guildId);
    return res.json({
      success: true,
      message: 'Audit logs cleared successfully.',
    });
  } catch (error) {
    logger.error('Error clearing guild audit logs:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to clear dashboard audit logs.',
    });
  }
}
