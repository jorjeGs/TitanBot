import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getUserGuilds, filterManageableGuilds } from '../../src/api/controllers/guildController.js';

describe('User Guilds Filtering & Management (filterManageableGuilds & getUserGuilds)', () => {
  it('returns 401 Unauthorized when no access token is in session', async () => {
    let statusCode = 0;
    let jsonResult = null;

    const req = {
      user: null,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };

    await getUserGuilds(req, res);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonResult.success, false);
  });

  it('strictly filters out servers where the user lacks Owner, Administrator, or Manage Server permissions', () => {
    const mockUserGuilds = [
      {
        id: '111111111111111111',
        name: 'Server I Own',
        icon: 'icon1',
        owner: true,
        permissions: '0',
      },
      {
        id: '222222222222222222',
        name: 'Server where I am Admin',
        icon: 'icon2',
        owner: false,
        permissions: '8', // 0x8 Administrator
      },
      {
        id: '333333333333333333',
        name: 'Server where I have Manage Server',
        icon: 'icon3',
        owner: false,
        permissions: '32', // 0x20 Manage Server
      },
      {
        id: '444444444444444444',
        name: 'Public Gaming Server (Regular Member)',
        icon: 'icon4',
        owner: false,
        permissions: '0', // 0 permissions
      },
      {
        id: '555555555555555555',
        name: 'Friend Community (Chatting Only)',
        icon: 'icon5',
        owner: false,
        permissions: '104324673', // Send messages, read messages, connect, etc. but NO Admin (8) or ManageGuild (32)
      },
    ];

    const mockClient = {
      guilds: {
        cache: new Map([
          ['111111111111111111', { id: '111111111111111111', name: 'Server I Own' }],
        ]),
      },
    };
    const mockClientId = '123456789012345678';

    const results = filterManageableGuilds(mockUserGuilds, mockClient, mockClientId);

    assert.strictEqual(Array.isArray(results), true);
    // Only the 3 manageable guilds should be returned
    assert.strictEqual(results.length, 3);

    const returnedIds = results.map((g) => g.id);
    assert.strictEqual(returnedIds.includes('111111111111111111'), true);
    assert.strictEqual(returnedIds.includes('222222222222222222'), true);
    assert.strictEqual(returnedIds.includes('333333333333333333'), true);

    // Verify unmanageable servers are completely filtered out
    assert.strictEqual(returnedIds.includes('444444444444444444'), false);
    assert.strictEqual(returnedIds.includes('555555555555555555'), false);

    // Verify flags and presence
    const g1 = results.find((g) => g.id === '111111111111111111');
    assert.strictEqual(g1.owner, true);
    assert.strictEqual(g1.botInGuild, true);
    assert.strictEqual(g1.inviteUrl, null);

    const g2 = results.find((g) => g.id === '222222222222222222');
    assert.strictEqual(g2.owner, false);
    assert.strictEqual(g2.hasAdmin, true);
    assert.strictEqual(g2.botInGuild, false);
    assert.strictEqual(typeof g2.inviteUrl, 'string');
    assert.strictEqual(g2.inviteUrl.includes('guild_id=222222222222222222'), true);

    const g3 = results.find((g) => g.id === '333333333333333333');
    assert.strictEqual(g3.owner, false);
    assert.strictEqual(g3.hasManageGuild, true);
    assert.strictEqual(g3.botInGuild, false);
    assert.strictEqual(typeof g3.inviteUrl, 'string');
    assert.strictEqual(g3.inviteUrl.includes('guild_id=333333333333333333'), true);
  });

  it('handles empty or malformed guild payloads gracefully', () => {
    assert.deepStrictEqual(filterManageableGuilds(null), []);
    assert.deepStrictEqual(filterManageableGuilds(undefined), []);
    assert.deepStrictEqual(filterManageableGuilds([]), []);
    assert.deepStrictEqual(filterManageableGuilds([{ id: '123' }]), []); // missing owner and perms
  });
});
