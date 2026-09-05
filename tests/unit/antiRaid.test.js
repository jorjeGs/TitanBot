import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAntiRaidConfig,
  updateAntiRaidConfig,
  handleMemberJoin,
  toggleEmergencyLockdown,
  clearJoinQueue,
} from '../../src/services/security/antiRaidService.js';
import { AntiRaidConfigSchema } from '../../src/utils/schemas.js';
import { db } from '../../src/utils/database/wrapper.js';

test('Anti-Raid Shield (Sub-project B)', async (t) => {
  if (!db.initialized) {
    await db.initialize();
  }

  const mockGuildId = '112233445566778899';
  const quarantineRoleId = '998877665544332211';
  const alertChannelId = '887766554433221100';

  // Ensure clean test state
  clearJoinQueue(mockGuildId);

  await t.test('AntiRaidConfigSchema validates fields and defaults', () => {
    const defaults = AntiRaidConfigSchema.parse({});
    assert.equal(defaults.enabled, false);
    assert.equal(defaults.joinThreshold, 5);
    assert.equal(defaults.windowSeconds, 10);
    assert.equal(defaults.action, 'quarantine');
    assert.equal(defaults.isLockdownActive, false);

    const validCustom = {
      enabled: true,
      joinThreshold: 10,
      windowSeconds: 15,
      minAccountAgeHours: 48,
      action: 'ban',
      quarantineRoleId,
      lockdownOnRaid: true,
      alertChannelId,
    };

    const parsed = AntiRaidConfigSchema.safeParse(validCustom);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.action, 'ban');

    // Invalid action rejected
    const invalidAction = { action: 'destroy' };
    const parsedInvalid = AntiRaidConfigSchema.safeParse(invalidAction);
    assert.equal(parsedInvalid.success, false);
  });

  await t.test('getAntiRaidConfig and updateAntiRaidConfig persist settings properly', async () => {
    const initial = await getAntiRaidConfig(mockGuildId);
    assert.equal(initial.enabled, false);

    const updated = await updateAntiRaidConfig(mockGuildId, {
      enabled: true,
      joinThreshold: 3,
      windowSeconds: 5,
      action: 'quarantine',
      quarantineRoleId,
      lockdownOnRaid: false,
    });

    assert.equal(updated.enabled, true);
    assert.equal(updated.joinThreshold, 3);

    const fetched = await getAntiRaidConfig(mockGuildId);
    assert.equal(fetched.enabled, true);
    assert.equal(fetched.joinThreshold, 3);
  });

  await t.test('handleMemberJoin detects burst join and applies quarantine role', async () => {
    clearJoinQueue(mockGuildId);

    await updateAntiRaidConfig(mockGuildId, {
      enabled: true,
      joinThreshold: 3,
      windowSeconds: 10,
      minAccountAgeHours: 0,
      action: 'quarantine',
      quarantineRoleId,
      lockdownOnRaid: false,
    });

    const rolesAdded = [];
    const createMockMember = (id) => ({
      id,
      guild: {
        id: mockGuildId,
        roles: {
          cache: {
            get: (rId) => (rId === quarantineRoleId ? { id: quarantineRoleId, name: 'Quarantine' } : null),
          },
        },
      },
      user: {
        id,
        bot: false,
        createdTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days old
      },
      roles: {
        add: async (role, reason) => {
          rolesAdded.push({ roleId: role.id, memberId: id, reason });
        },
      },
    });

    // 1st member join -> queue = 1, not a raid
    const res1 = await handleMemberJoin(createMockMember('100000000000000001'));
    assert.equal(res1.handled, true);
    assert.equal(res1.raidDetected, false);
    assert.equal(rolesAdded.length, 0);

    // 2nd member join -> queue = 2, not a raid
    const res2 = await handleMemberJoin(createMockMember('100000000000000002'));
    assert.equal(res2.handled, true);
    assert.equal(res2.raidDetected, false);
    assert.equal(rolesAdded.length, 0);

    // 3rd member join -> queue = 3 >= joinThreshold 3 -> RAID DETECTED!
    const res3 = await handleMemberJoin(createMockMember('100000000000000003'));
    assert.equal(res3.handled, true);
    assert.equal(res3.raidDetected, true);
    assert.equal(res3.action, 'quarantine');
    assert.equal(res3.actionSuccess, true);
    assert.equal(rolesAdded.length, 1);
    assert.equal(rolesAdded[0].roleId, quarantineRoleId);
  });

  await t.test('handleMemberJoin executes kick or ban based on configuration', async () => {
    clearJoinQueue(mockGuildId);

    // Test Kick action
    await updateAntiRaidConfig(mockGuildId, {
      enabled: true,
      joinThreshold: 3,
      action: 'kick',
    });

    let kicked = false;
    const kickMember = {
      id: '100000000000000004',
      guild: { id: mockGuildId },
      user: { id: '100000000000000004', bot: false, createdTimestamp: Date.now() },
      kickable: true,
      kick: async () => { kicked = true; },
    };

    await handleMemberJoin(kickMember);
    await handleMemberJoin(kickMember);
    const resKick = await handleMemberJoin(kickMember);
    assert.equal(resKick.raidDetected, true);
    assert.equal(resKick.action, 'kick');
    assert.equal(kicked, true);

    // Test Ban action
    clearJoinQueue(mockGuildId);
    await updateAntiRaidConfig(mockGuildId, {
      enabled: true,
      joinThreshold: 3,
      action: 'ban',
    });

    let banned = false;
    const banMember = {
      id: '100000000000000005',
      guild: { id: mockGuildId },
      user: { id: '100000000000000005', bot: false, createdTimestamp: Date.now() },
      bannable: true,
      ban: async () => { banned = true; },
    };

    await handleMemberJoin(banMember);
    await handleMemberJoin(banMember);
    const resBan = await handleMemberJoin(banMember);
    assert.equal(resBan.raidDetected, true);
    assert.equal(resBan.action, 'ban');
    assert.equal(banned, true);
  });

  await t.test('toggleEmergencyLockdown edits channel permission overwrites and updates status', async () => {
    let overwritesEdited = 0;
    const mockChannel = {
      id: '776655443322110099',
      type: 0, // GuildText
      permissionOverwrites: {
        edit: async (role, perms) => {
          overwritesEdited += 1;
        },
      },
    };

    const mockClient = {
      guilds: {
        cache: {
          get: (gId) => (gId === mockGuildId ? {
            id: mockGuildId,
            roles: { everyone: { id: mockGuildId } },
            channels: {
              cache: {
                values: () => [mockChannel],
                get: (cId) => (cId === mockChannel.id ? mockChannel : null),
              },
            },
          } : null),
        },
      },
    };

    // Enable Lockdown
    const lockRes = await toggleEmergencyLockdown(mockGuildId, mockClient, true);
    assert.equal(lockRes.isLockdownActive, true);
    assert.equal(lockRes.affectedChannelsCount, 1);

    const configLocked = await getAntiRaidConfig(mockGuildId);
    assert.equal(configLocked.isLockdownActive, true);

    // Lift Lockdown
    const unlockRes = await toggleEmergencyLockdown(mockGuildId, mockClient, false);
    assert.equal(unlockRes.isLockdownActive, false);
    assert.equal(unlockRes.affectedChannelsCount, 1);

    const configUnlocked = await getAntiRaidConfig(mockGuildId);
    assert.equal(configUnlocked.isLockdownActive, false);
  });
});
