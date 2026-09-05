import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createApiRouter } from '../../src/api/routes/index.js';
import { createSessionToken } from '../../src/api/utils/tokenHelper.js';
import { Collection, PermissionFlagsBits } from 'discord.js';

describe('API Routes Integration Tests', () => {
  let server;
  let baseUrl;
  let mockClient;

  before(async () => {
    // Setup mock Discord client
    mockClient = {
      user: { id: 'bot-123', username: 'TitanBot' },
      commands: new Collection([
        [
          'ping',
          {
            category: 'Core',
            data: { name: 'ping', description: 'Replies with pong' },
          },
        ],
        [
          'ban',
          {
            category: 'Moderation',
            data: { name: 'ban', description: 'Bans a user' },
          },
        ],
      ]),
      guilds: {
        cache: new Map([
          [
            'guild-123',
            {
              id: 'guild-123',
              name: 'Test Server',
              memberCount: 42,
              ownerId: 'owner-123',
              iconURL: () => 'https://cdn.discordapp.com/icons/guild-123/icon.png',
              channels: {
                cache: new Map([
                  [
                    'ch-1',
                    {
                      id: 'ch-1',
                      name: 'general',
                      type: 0,
                      position: 1,
                      isTextBased: () => true,
                      isDMBased: () => false,
                      isThread: () => false,
                    },
                  ],
                ]),
              },
              roles: {
                cache: new Map([
                  [
                    'role-admin',
                    {
                      id: 'role-admin',
                      name: 'Admin',
                      hexColor: '#ff0000',
                      position: 5,
                      managed: false,
                    },
                  ],
                ]),
              },
              members: {
                cache: new Map([
                  [
                    'admin-user-id',
                    {
                      id: 'admin-user-id',
                      permissions: {
                        has(flag) {
                          return flag === PermissionFlagsBits.Administrator;
                        },
                      },
                    },
                  ],
                ]),
              },
            },
          ],
        ]),
      },
      db: {
        getGuildConfig: async () => ({
          locale: 'en-US',
          prefix: '!',
          welcomeChannel: null,
          welcomeMessage: 'Welcome {user}',
          autoRole: null,
          adminRole: null,
          modRole: null,
          logging: { enabled: false, channels: {} },
          verification: { enabled: false },
          disabledCommands: {},
          disabledCategories: {},
        }),
        setGuildConfig: async (guildId, data) => data,
      },
    };

    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api', createApiRouter(mockClient));

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/commands returns list of commands grouped by category', async () => {
    const res = await fetch(`${baseUrl}/commands`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.categories));

    const coreCat = data.categories.find((c) => c.name === 'Core');
    assert.ok(coreCat);
    assert.strictEqual(coreCat.commands[0].name, 'ping');

    const modCat = data.categories.find((c) => c.name === 'Moderation');
    assert.ok(modCat);
    assert.strictEqual(modCat.commands[0].name, 'ban');
  });

  it('GET /api/auth/login redirects to Discord OAuth2 URL and sets oauth_state cookie', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, { redirect: 'manual' });
    assert.strictEqual(res.status, 302);

    const location = res.headers.get('location');
    assert.ok(location?.includes('discord.com/oauth2/authorize'));
    assert.ok(location?.includes('scope=identify+guilds') || location?.includes('scope=identify%20guilds'));

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie?.includes('oauth_state='));
  });

  it('GET /api/auth/callback rejects invalid state with redirect', async () => {
    const res = await fetch(`${baseUrl}/auth/callback?code=fake_code&state=bad_state`, {
      redirect: 'manual',
      headers: {
        Cookie: 'oauth_state=expected_state',
      },
    });

    assert.strictEqual(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location?.includes('error=invalid_state'));
  });

  it('GET /api/auth/me returns 401 when not authenticated', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it('GET /api/auth/me returns user data when authenticated via cookie', async () => {
    const token = createSessionToken({
      id: 'admin-user-id',
      username: 'ServerAdmin',
      discriminator: '0',
    });

    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.id, 'admin-user-id');
    assert.strictEqual(data.user.username, 'ServerAdmin');
  });

  it('POST /api/auth/logout clears the session cookie', async () => {
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie?.includes('titanbot_session=;'));
  });

  it('GET /api/guilds/:guildId returns guild metadata for authorized user', async () => {
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/guild-123`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.guild.name, 'Test Server');
    assert.strictEqual(data.guild.memberCount, 42);
  });

  it('GET /api/guilds/:guildId/channels returns text channels', async () => {
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/guild-123/channels`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.channels[0].name, 'general');
  });

  it('GET /api/guilds/:guildId/roles returns non-managed roles', async () => {
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/guild-123/roles`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.roles[0].name, 'Admin');
  });

  it('PATCH /api/guilds/:guildId/config rejects invalid locale with 400', async () => {
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/guild-123/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({ locale: 'invalid-locale' }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid locale'));
  });

  it('PATCH /api/guilds/:guildId/config rejects prefix longer than 5 chars with 400', async () => {
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/guild-123/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({ prefix: 'toolongprefix' }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Prefix must be'));
  });
});
