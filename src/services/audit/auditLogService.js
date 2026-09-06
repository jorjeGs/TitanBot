import crypto from 'crypto';
import { db } from '../../utils/database/wrapper.js';
import { logger } from '../../utils/logger.js';
import { DashboardAuditLogItemSchema } from '../../utils/schemas.js';
const MAX_AUDIT_LOGS_PER_GUILD = 200;

export function getAuditLogsKey(guildId) {
  return `guild:${guildId}:audit_logs`;
}

/**
 * Records an administrative event executed inside the Dashboard.
 * @param {Object} params
 * @param {string} params.guildId
 * @param {Object} params.user - Authenticated staff member (id, username, tag, avatar)
 * @param {string} params.action - Machine action code (e.g. CONFIG_UPDATE, AUTOMATION_CREATE)
 * @param {string} params.category - Action category
 * @param {string} params.details - Human-readable explanation
 * @param {Object} [params.metadata] - Optional additional context
 * @param {string} [params.ip] - IP address of the requester
 */
export async function logAuditEvent({
  guildId,
  user,
  action,
  category = 'general',
  details = '',
  metadata = {},
  ip = '',
}) {
  if (!guildId) return null;

  if (!db.initialized) {
    await db.initialize();
  }

  const userTag = user?.username
    ? user.discriminator && user.discriminator !== '0'
      ? `${user.username}#${user.discriminator}`
      : `@${user.username}`
    : user?.tag || 'Staff Member';

  const userAvatar = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;

  const rawItem = {
    id: crypto.randomUUID(),
    guildId: String(guildId),
    userId: String(user?.id || '000000000000000000'),
    userTag,
    userAvatar,
    action: String(action),
    category,
    details: String(details || ''),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    ip: String(ip || ''),
    timestamp: new Date().toISOString(),
  };

  const parsed = DashboardAuditLogItemSchema.safeParse(rawItem);
  if (!parsed.success) {
    logger.warn('Failed to parse audit log item schema:', parsed.error.message);
    return null;
  }

  const logEntry = parsed.data;
  const key = getAuditLogsKey(guildId);

  try {
    const existing = (await db.get(key)) || [];
    const currentList = Array.isArray(existing) ? existing : [];
    const updated = [logEntry, ...currentList].slice(0, MAX_AUDIT_LOGS_PER_GUILD);
    await db.set(key, updated);

    logger.info(`[AuditLog] Guild ${guildId} | ${userTag} -> ${action}: ${details}`);
    return logEntry;
  } catch (err) {
    logger.error(`Error saving audit log for guild ${guildId}:`, err);
    return null;
  }
}

/**
 * Retrieves paginated and filtered audit logs for a guild.
 */
export async function getGuildAuditLogs({
  guildId,
  page = 1,
  limit = 25,
  category = null,
  search = null,
}) {
  if (!guildId) return { logs: [], total: 0, page: 1, limit: 25, totalPages: 0 };

  if (!db.initialized) {
    await db.initialize();
  }

  const key = getAuditLogsKey(guildId);
  const existing = (await db.get(key)) || [];
  let allLogs = Array.isArray(existing) ? existing : [];

  // Filter by category
  if (category && category !== 'all') {
    allLogs = allLogs.filter((log) => log.category === category);
  }

  // Filter by search query (user, action, details)
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    allLogs = allLogs.filter(
      (log) =>
        log.userTag?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q)
    );
  }

  const total = allLogs.length;
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 25));
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const safePage = Math.max(1, Math.min(totalPages, Number(page) || 1));

  const startIndex = (safePage - 1) * safeLimit;
  const logs = allLogs.slice(startIndex, startIndex + safeLimit);

  return {
    logs,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}

/**
 * Clears audit logs for a guild.
 */
export async function clearGuildAuditLogs(guildId) {
  if (!guildId) return false;
  if (!db.initialized) {
    await db.initialize();
  }
  const key = getAuditLogsKey(guildId);
  await db.delete(key);
  return true;
}
