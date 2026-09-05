import crypto from 'node:crypto';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { db, getFromDb } from '../../utils/database/wrapper.js';
import { getSnapshotKey, getSnapshotsIndexKey } from '../../utils/database/keys.js';
import { ServerSnapshotSchema } from '../../utils/schemas.js';
import { logger } from '../../utils/logger.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a complete snapshot of a guild's roles, channels, categories and permissions.
 */
export async function createSnapshot(guild, author = null, customName = null) {
  if (!guild || !guild.id) {
    throw new Error('Invalid guild provided to createSnapshot');
  }

  logger.info(`Creating server snapshot for guild ${guild.id} (${guild.name})`);

  // 1. Snapshot Roles (excluding @everyone and managed bot roles)
  const roles = [];
  const rawRoles = guild.roles?.cache?.values
    ? Array.from(guild.roles.cache.values())
    : [];

  for (const role of rawRoles) {
    if (role.id === guild.id) continue; // Skip @everyone
    if (role.managed) continue; // Skip managed bot integration roles

    roles.push({
      id: String(role.id),
      name: String(role.name),
      color: Number(role.color || 0),
      hoist: Boolean(role.hoist),
      position: Number(role.position || 0),
      permissions: role.permissions?.bitfield != null ? String(role.permissions.bitfield) : '0',
      mentionable: Boolean(role.mentionable),
    });
  }

  // 2. Snapshot Channels & Categories
  const channels = [];
  const rawChannels = guild.channels?.cache?.values
    ? Array.from(guild.channels.cache.values())
    : [];

  let categoriesCount = 0;
  let channelsCount = 0;

  for (const ch of rawChannels) {
    const isCategory = ch.type === ChannelType.GuildCategory || ch.type === 4;
    if (isCategory) {
      categoriesCount += 1;
    } else {
      channelsCount += 1;
    }

    const permissionOverwrites = [];
    if (ch.permissionOverwrites?.cache?.values) {
      for (const ow of ch.permissionOverwrites.cache.values()) {
        permissionOverwrites.push({
          id: String(ow.id),
          type: Number(ow.type || 0),
          allow: ow.allow?.bitfield != null ? String(ow.allow.bitfield) : '0',
          deny: ow.deny?.bitfield != null ? String(ow.deny.bitfield) : '0',
        });
      }
    }

    channels.push({
      id: String(ch.id),
      name: String(ch.name),
      type: Number(ch.type || 0),
      parentId: ch.parentId ? String(ch.parentId) : null,
      position: Number(ch.position || 0),
      topic: ch.topic || null,
      nsfw: Boolean(ch.nsfw),
      bitrate: typeof ch.bitrate === 'number' ? ch.bitrate : undefined,
      userLimit: typeof ch.userLimit === 'number' ? ch.userLimit : undefined,
      permissionOverwrites,
    });
  }

  const snapshotId = crypto.randomUUID();
  const dateStr = new Date().toISOString();
  const snapshotName = customName?.trim() || `Snapshot ${guild.name} (${dateStr.slice(0, 10)})`;

  const snapshotData = {
    id: snapshotId,
    guildId: String(guild.id),
    name: snapshotName,
    createdAt: dateStr,
    createdBy: {
      id: String(author?.id || '0'),
      tag: String(author?.tag || author?.username || 'System Admin'),
    },
    counts: {
      roles: roles.length,
      categories: categoriesCount,
      channels: channelsCount,
    },
    roles,
    channels,
  };

  const validated = ServerSnapshotSchema.parse(snapshotData);

  if (!db.initialized) {
    await db.initialize();
  }

  // Save snapshot document
  const snapshotKey = getSnapshotKey(guild.id, snapshotId);
  await db.set(snapshotKey, validated);

  // Update Guild Snapshots Index (keep max 15)
  const indexKey = getSnapshotsIndexKey(guild.id);
  const existingIndex = (await getFromDb(indexKey, [])) || [];

  const summaryItem = {
    id: snapshotId,
    name: validated.name,
    createdAt: validated.createdAt,
    createdBy: validated.createdBy,
    counts: validated.counts,
  };

  const updatedIndex = [summaryItem, ...existingIndex.filter((item) => item.id !== snapshotId)].slice(0, 15);
  await db.set(indexKey, updatedIndex);

  logger.info(`Successfully created server snapshot ${snapshotId} for guild ${guild.id}`);
  return validated;
}

/**
 * Lists all snapshots for a guild.
 */
export async function listSnapshots(guildId) {
  if (!db.initialized) {
    await db.initialize();
  }

  const indexKey = getSnapshotsIndexKey(guildId);
  const index = (await getFromDb(indexKey, [])) || [];
  return index;
}

/**
 * Gets a specific snapshot by ID.
 */
export async function getSnapshot(guildId, snapshotId) {
  if (!db.initialized) {
    await db.initialize();
  }

  const snapshotKey = getSnapshotKey(guildId, snapshotId);
  return await db.get(snapshotKey);
}

/**
 * Deletes a snapshot by ID.
 */
export async function deleteSnapshot(guildId, snapshotId) {
  if (!db.initialized) {
    await db.initialize();
  }

  const snapshotKey = getSnapshotKey(guildId, snapshotId);
  await db.delete(snapshotKey);

  const indexKey = getSnapshotsIndexKey(guildId);
  const index = (await getFromDb(indexKey, [])) || [];
  const updatedIndex = index.filter((item) => item.id !== snapshotId);
  await db.set(indexKey, updatedIndex);

  return true;
}

/**
 * Imports a snapshot from JSON.
 */
export async function importSnapshotJson(guildId, rawJson, author = null) {
  let parsed;
  try {
    parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch (err) {
    throw new Error('Invalid JSON format for snapshot import');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Snapshot JSON must be an object');
  }

  const snapshotId = crypto.randomUUID();
  const dateStr = new Date().toISOString();

  const fullPayload = {
    id: snapshotId,
    guildId: String(guildId),
    name: parsed.name ? `${parsed.name} (Imported)` : `Imported Snapshot (${dateStr.slice(0, 10)})`,
    createdAt: dateStr,
    createdBy: {
      id: String(author?.id || '0'),
      tag: String(author?.tag || author?.username || 'Imported'),
    },
    counts: parsed.counts || {
      roles: Array.isArray(parsed.roles) ? parsed.roles.length : 0,
      categories: Array.isArray(parsed.channels) ? parsed.channels.filter((c) => c.type === 4).length : 0,
      channels: Array.isArray(parsed.channels) ? parsed.channels.filter((c) => c.type !== 4).length : 0,
    },
    roles: Array.isArray(parsed.roles) ? parsed.roles : [],
    channels: Array.isArray(parsed.channels) ? parsed.channels : [],
  };

  const validated = ServerSnapshotSchema.parse(fullPayload);

  if (!db.initialized) {
    await db.initialize();
  }

  const snapshotKey = getSnapshotKey(guildId, snapshotId);
  await db.set(snapshotKey, validated);

  const indexKey = getSnapshotsIndexKey(guildId);
  const existingIndex = (await getFromDb(indexKey, [])) || [];

  const summaryItem = {
    id: snapshotId,
    name: validated.name,
    createdAt: validated.createdAt,
    createdBy: validated.createdBy,
    counts: validated.counts,
  };

  const updatedIndex = [summaryItem, ...existingIndex.filter((item) => item.id !== snapshotId)].slice(0, 15);
  await db.set(indexKey, updatedIndex);

  return validated;
}

/**
 * Restores a snapshot into a Discord guild with rate-limit protection and ID mapping.
 */
export async function restoreSnapshot(guild, snapshotId, options = {}) {
  const { mode = 'safe_sync', pacingMs = 200 } = options;
  const guildId = guild.id;

  const snapshot = await getSnapshot(guildId, snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot with ID "${snapshotId}" not found for this guild.`);
  }

  logger.info(`Beginning snapshot restore (${mode}) for guild ${guildId}`, {
    snapshotId,
    rolesCount: snapshot.roles?.length,
    channelsCount: snapshot.channels?.length,
  });

  const roleIdMap = new Map();
  const categoryIdMap = new Map();
  const channelIdMap = new Map();

  let rolesRestored = 0;
  let categoriesRestored = 0;
  let channelsRestored = 0;

  // 1. Restore Roles
  const existingRoles = guild.roles?.cache?.values
    ? Array.from(guild.roles.cache.values())
    : [];

  const everyoneRole = guild.roles?.everyone || guild.roles?.cache?.get(guildId);
  if (everyoneRole) {
    roleIdMap.set(guildId, everyoneRole.id);
  }

  for (const r of (snapshot.roles || [])) {
    try {
      let targetRole = existingRoles.find((ex) => ex.name === r.name && !ex.managed);
      if (targetRole) {
        // Role already exists, map ID
        roleIdMap.set(r.id, targetRole.id);
      } else if (guild.roles?.create) {
        // Create role
        targetRole = await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: r.permissions ? BigInt(r.permissions) : PermissionFlagsBits.SendMessages,
          reason: '[TitanBot Snapshot Restore]',
        });
        roleIdMap.set(r.id, targetRole.id);
        rolesRestored += 1;
        if (pacingMs > 0) await sleep(pacingMs);
      }
    } catch (roleErr) {
      logger.warn(`Could not restore role "${r.name}":`, roleErr);
    }
  }

  // 2. Restore Categories (type 4)
  const existingChannels = guild.channels?.cache?.values
    ? Array.from(guild.channels.cache.values())
    : [];

  const categories = (snapshot.channels || []).filter((c) => c.type === ChannelType.GuildCategory || c.type === 4);
  const nonCategories = (snapshot.channels || []).filter((c) => c.type !== ChannelType.GuildCategory && c.type !== 4);

  for (const cat of categories) {
    try {
      let targetCat = existingChannels.find((ch) =>
        ch.name === cat.name && (ch.type === ChannelType.GuildCategory || ch.type === 4)
      );

      if (targetCat) {
        categoryIdMap.set(cat.id, targetCat.id);
      } else if (guild.channels?.create) {
        targetCat = await guild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          position: cat.position,
          reason: '[TitanBot Snapshot Restore]',
        });
        categoryIdMap.set(cat.id, targetCat.id);
        categoriesRestored += 1;
        if (pacingMs > 0) await sleep(pacingMs);
      }
    } catch (catErr) {
      logger.warn(`Could not restore category "${cat.name}":`, catErr);
    }
  }

  // 3. Restore Channels
  for (const ch of nonCategories) {
    try {
      const targetParentId = ch.parentId ? (categoryIdMap.get(ch.parentId) || ch.parentId) : null;
      let targetChannel = existingChannels.find((ec) =>
        ec.name === ch.name && ec.type === ch.type && (targetParentId ? ec.parentId === targetParentId : true)
      );

      if (targetChannel) {
        channelIdMap.set(ch.id, targetChannel.id);
      } else if (guild.channels?.create) {
        const createOptions = {
          name: ch.name,
          type: ch.type,
          parent: targetParentId || undefined,
          position: ch.position,
          topic: ch.topic || undefined,
          nsfw: ch.nsfw,
          reason: '[TitanBot Snapshot Restore]',
        };

        if (typeof ch.bitrate === 'number') createOptions.bitrate = ch.bitrate;
        if (typeof ch.userLimit === 'number') createOptions.userLimit = ch.userLimit;

        targetChannel = await guild.channels.create(createOptions);
        channelIdMap.set(ch.id, targetChannel.id);
        channelsRestored += 1;
        if (pacingMs > 0) await sleep(pacingMs);
      }

      // Reapply Permission Overwrites
      if (targetChannel && ch.permissionOverwrites && ch.permissionOverwrites.length > 0 && targetChannel.permissionOverwrites?.set) {
        const overwritesToApply = [];
        for (const ow of ch.permissionOverwrites) {
          const mappedTargetId = roleIdMap.get(ow.id) || channelIdMap.get(ow.id) || ow.id;
          overwritesToApply.push({
            id: mappedTargetId,
            type: ow.type,
            allow: ow.allow ? BigInt(ow.allow) : 0n,
            deny: ow.deny ? BigInt(ow.deny) : 0n,
          });
        }
        await targetChannel.permissionOverwrites.set(overwritesToApply).catch((owErr) => {
          logger.warn(`Could not set overwrites for channel ${ch.name}:`, owErr);
        });
      }
    } catch (chErr) {
      logger.warn(`Could not restore channel "${ch.name}":`, chErr);
    }
  }

  // 4. If full_replace mode, purge channels not in snapshot
  let channelsDeleted = 0;
  if (mode === 'full_replace') {
    const freshChannels = guild.channels?.cache?.values
      ? Array.from(guild.channels.cache.values())
      : [];

    const preservedIds = new Set(Array.from(channelIdMap.values()).concat(Array.from(categoryIdMap.values())));

    for (const fresh of freshChannels) {
      if (!preservedIds.has(fresh.id) && fresh.deletable && typeof fresh.delete === 'function') {
        try {
          await fresh.delete('[TitanBot Snapshot Restore Full Replace]');
          channelsDeleted += 1;
          if (pacingMs > 0) await sleep(pacingMs);
        } catch (delErr) {
          logger.warn(`Could not delete channel ${fresh.name} during full replace:`, delErr);
        }
      }
    }
  }

  logger.info(`Completed snapshot restore for guild ${guildId}`, {
    mode,
    rolesRestored,
    categoriesRestored,
    channelsRestored,
    channelsDeleted,
  });

  return {
    success: true,
    mode,
    counts: {
      rolesRestored,
      categoriesRestored,
      channelsRestored,
      channelsDeleted,
    },
  };
}
