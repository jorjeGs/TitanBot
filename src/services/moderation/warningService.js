// warningService.js

import { db, getFromDb, setInDb, getWarningsKey, getWarningsPrefix } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { createError, ErrorTypes, wrapServiceClassMethods } from '../../utils/errorHandler.js';

class WarningService {

  static async addWarning({
    guildId,
    userId,
    moderatorId,
    reason,
    timestamp = Date.now()
  }) {
    const key = getWarningsKey(guildId, userId);
    const warnings = await getFromDb(key, []);

    if (!Array.isArray(warnings)) {
      logger.warn(`Warnings for ${userId} in ${guildId} corrupted, resetting`);
      await setInDb(key, []);
      throw createError(
        'Corrupted warning data',
        ErrorTypes.DATABASE,
        'Warning data was corrupted and has been reset. Please try again.',
        { guildId, userId, service: 'warningService', operation: 'addWarning' }
      );
    }

    const warning = {
      id: Date.now(),
      guildId,
      userId,
      moderatorId,
      reason,
      timestamp,
      status: 'active'
    };

    warnings.push(warning);
    await setInDb(key, warnings);

    logger.info(`Warning added: ${userId} in ${guildId} by ${moderatorId}`);

    return {
      id: warning.id,
      totalCount: warnings.length
    };
  }

  static async getWarnings(guildId, userId, client = null) {
    const key = getWarningsKey(guildId, userId);
    let warnings;
    if (client?.db && typeof client.db.get === 'function') {
      warnings = await client.db.get(key);
    } else {
      warnings = await getFromDb(key, []);
    }

    return Array.isArray(warnings)
      ? warnings.filter(w => w && w.status !== 'deleted')
      : [];
  }

  static async getWarningCount(guildId, userId, client = null) {
    const warnings = await this.getWarnings(guildId, userId, client);
    return warnings.length;
  }

  static async removeWarning(guildId, userId, warningId, client = null) {
    const key = getWarningsKey(guildId, userId);
    let warnings;
    if (client?.db && typeof client.db.get === 'function') {
      warnings = await client.db.get(key) || [];
    } else {
      warnings = await getFromDb(key, []);
    }

    const index = warnings.findIndex(w => w.id === warningId);
    if (index === -1) {
      throw createError(
        'Warning not found',
        ErrorTypes.USER_INPUT,
        'That warning could not be found. It may have already been removed.',
        { guildId, userId, warningId, service: 'warningService', operation: 'removeWarning' }
      );
    }

    warnings[index].status = 'deleted';
    if (client?.db && typeof client.db.set === 'function') {
      await client.db.set(key, warnings);
    } else {
      await setInDb(key, warnings);
    }

    logger.info(`Warning removed: ${warningId} for ${userId} in ${guildId}`);
    return { removed: true };
  }

  static async clearWarnings(guildId, userId, client = null) {
    const key = getWarningsKey(guildId, userId);
    let warnings;
    if (client?.db && typeof client.db.get === 'function') {
      warnings = await client.db.get(key) || [];
    } else {
      warnings = await getFromDb(key, []);
    }
    const count = Array.isArray(warnings) ? warnings.length : 0;

    if (client?.db && typeof client.db.set === 'function') {
      await client.db.set(key, []);
    } else {
      await setInDb(key, []);
    }

    logger.info(`Warnings cleared for ${userId} in ${guildId} (${count} removed)`);
    return { count };
  }

  static async getGuildWarnings(guildId, filters = {}, client = null) {
    const { moderatorId, limit = 100 } = filters;
    const prefix = getWarningsPrefix(guildId);

    let keys;
    if (client?.db && typeof client.db.list === 'function') {
      keys = await client.db.list(prefix);
    } else {
      keys = await db.list(prefix);
    }
    const allWarnings = [];

    for (const key of Array.isArray(keys) ? keys : []) {
      let warnings;
      if (client?.db && typeof client.db.get === 'function') {
        warnings = await client.db.get(key);
      } else {
        warnings = await getFromDb(key, []);
      }
      if (!Array.isArray(warnings)) continue;

      for (const warning of warnings) {
        if (!warning || warning.status === 'deleted') continue;
        if (moderatorId && warning.moderatorId !== moderatorId) continue;
        allWarnings.push(warning);
      }
    }

    allWarnings.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    logger.debug(`Fetched guild warnings for ${guildId} with ${allWarnings.length} total`);
    return allWarnings.slice(0, limit);
  }
}

wrapServiceClassMethods(WarningService);

export { WarningService };
