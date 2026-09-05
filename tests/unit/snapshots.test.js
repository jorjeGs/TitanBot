import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
  importSnapshotJson,
  restoreSnapshot,
} from '../../src/services/snapshots/snapshotService.js';
import { ServerSnapshotSchema } from '../../src/utils/schemas.js';
import { db } from '../../src/utils/database/wrapper.js';

test('Server Snapshots & Backups (Sub-project B)', async (t) => {
  if (!db.initialized) {
    await db.initialize();
  }

  const mockGuildId = '556677889900112233';

  // Build Mock Guild
  const mockRoles = [
    { id: mockGuildId, name: '@everyone', color: 0, managed: false, hoist: false, position: 0 },
    { id: '111111111111111111', name: 'Bot Integration', color: 0, managed: true, hoist: false, position: 1 },
    { id: '222222222222222222', name: 'Moderator', color: 0x3498db, managed: false, hoist: true, position: 2, mentionable: true, permissions: { bitfield: 8n } },
    { id: '333333333333333333', name: 'VIP', color: 0xe67e22, managed: false, hoist: false, position: 3, mentionable: false, permissions: { bitfield: 0n } },
  ];

  const mockChannels = [
    {
      id: '444444444444444444',
      name: 'Community Category',
      type: 4, // GuildCategory
      position: 0,
      permissionOverwrites: { cache: { values: () => [] } },
    },
    {
      id: '555555555555555555',
      name: 'general-chat',
      type: 0, // GuildText
      parentId: '444444444444444444',
      position: 1,
      topic: 'Welcome to general chat!',
      nsfw: false,
      permissionOverwrites: {
        cache: {
          values: () => [
            { id: '222222222222222222', type: 0, allow: { bitfield: 1024n }, deny: { bitfield: 0n } },
          ],
        },
      },
    },
    {
      id: '666666666666666666',
      name: 'Voice Lounge',
      type: 2, // GuildVoice
      parentId: '444444444444444444',
      position: 2,
      bitrate: 64000,
      userLimit: 10,
      permissionOverwrites: { cache: { values: () => [] } },
    },
  ];

  const createMockGuild = () => ({
    id: mockGuildId,
    name: 'Snapshot Test Server',
    roles: {
      cache: {
        values: () => [...mockRoles],
        get: (rId) => mockRoles.find((r) => r.id === rId) || null,
      },
      everyone: mockRoles[0],
      create: async (data) => {
        const newRole = { id: `new-role-${Math.random().toString(36).slice(2, 7)}`, ...data };
        mockRoles.push(newRole);
        return newRole;
      },
    },
    channels: {
      cache: {
        values: () => [...mockChannels],
        get: (cId) => mockChannels.find((c) => c.id === cId) || null,
      },
      create: async (data) => {
        const newChannel = {
          id: `new-ch-${Math.random().toString(36).slice(2, 7)}`,
          permissionOverwrites: { set: async () => {} },
          ...data,
        };
        mockChannels.push(newChannel);
        return newChannel;
      },
    },
  });

  await t.test('ServerSnapshotSchema validates snapshot data structure', () => {
    const valid = {
      id: '33333333-3333-3333-3333-333333333333',
      guildId: mockGuildId,
      name: 'Test Snapshot',
      createdAt: new Date().toISOString(),
      createdBy: { id: '123456789012345678', tag: 'Admin#0001' },
      counts: { roles: 2, categories: 1, channels: 2 },
      roles: [
        { id: '1', name: 'Role1', color: 0, hoist: false, position: 1, permissions: '8', mentionable: false },
      ],
      channels: [
        { id: '2', name: 'general', type: 0, parentId: null, position: 1, permissionOverwrites: [] },
      ],
    };

    const parsed = ServerSnapshotSchema.safeParse(valid);
    assert.equal(parsed.success, true);
  });

  await t.test('createSnapshot captures server architecture and persists snapshot', async () => {
    const mockGuild = createMockGuild();
    const author = { id: '999999999999999999', tag: 'ServerOwner#0001' };

    const snapshot = await createSnapshot(mockGuild, author, 'Main Backup');

    assert.ok(snapshot.id);
    assert.equal(snapshot.name, 'Main Backup');
    assert.equal(snapshot.guildId, mockGuildId);
    assert.equal(snapshot.createdBy.tag, 'ServerOwner#0001');

    // Filtered out @everyone and bot managed roles (2 kept: Moderator, VIP)
    assert.equal(snapshot.roles.length, 2);
    assert.equal(snapshot.counts.roles, 2);
    assert.equal(snapshot.counts.categories, 1);
    assert.equal(snapshot.counts.channels, 2);

    // Verify channel permission overwrites captured
    const textCh = snapshot.channels.find((c) => c.name === 'general-chat');
    assert.ok(textCh);
    assert.equal(textCh.permissionOverwrites.length, 1);
    assert.equal(textCh.permissionOverwrites[0].id, '222222222222222222');

    // Verify index
    const list = await listSnapshots(mockGuildId);
    assert.ok(list.length >= 1);
    assert.ok(list.some((s) => s.id === snapshot.id));

    // Verify retrieve by ID
    const fetched = await getSnapshot(mockGuildId, snapshot.id);
    assert.equal(fetched.id, snapshot.id);
    assert.equal(fetched.name, 'Main Backup');
  });

  await t.test('importSnapshotJson validates and imports external JSON snapshot', async () => {
    const jsonPayload = JSON.stringify({
      name: 'Imported Community Setup',
      counts: { roles: 1, categories: 1, channels: 1 },
      roles: [
        { id: 'temp-1', name: 'Member', color: 0x2ecc71, hoist: true, position: 1, permissions: '0', mentionable: true },
      ],
      channels: [
        { id: 'temp-2', name: 'Welcome Category', type: 4, position: 0, permissionOverwrites: [] },
        { id: 'temp-3', name: 'rules', type: 0, parentId: 'temp-2', position: 1, permissionOverwrites: [] },
      ],
    });

    const imported = await importSnapshotJson(mockGuildId, jsonPayload, { id: 'admin-1', tag: 'Importer#0001' });
    assert.ok(imported.id);
    assert.equal(imported.name, 'Imported Community Setup (Imported)');
    assert.equal(imported.roles.length, 1);
    assert.equal(imported.channels.length, 2);

    const fetched = await getSnapshot(mockGuildId, imported.id);
    assert.equal(fetched.id, imported.id);
  });

  await t.test('restoreSnapshot runs in safe_sync mode without deleting channels', async () => {
    const freshGuild = createMockGuild();
    // Re-create a snapshot
    const snap = await createSnapshot(freshGuild, null, 'Pre-restore snapshot');

    // Simulate safe restore with 0 pacing for unit test speed
    const restoreRes = await restoreSnapshot(freshGuild, snap.id, { mode: 'safe_sync', pacingMs: 0 });

    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.mode, 'safe_sync');
    assert.equal(restoreRes.counts.channelsDeleted, 0);
  });

  await t.test('deleteSnapshot removes snapshot from database and index', async () => {
    const mockGuild = createMockGuild();
    const snap = await createSnapshot(mockGuild, null, 'To be deleted');

    const beforeDelete = await getSnapshot(mockGuildId, snap.id);
    assert.ok(beforeDelete);

    await deleteSnapshot(mockGuildId, snap.id);

    const afterDelete = await getSnapshot(mockGuildId, snap.id);
    assert.equal(afterDelete, null);

    const list = await listSnapshots(mockGuildId);
    assert.ok(!list.some((s) => s.id === snap.id));
  });
});
