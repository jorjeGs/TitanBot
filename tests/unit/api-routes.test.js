import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { createApiRouter } from '../../src/api/routes/index.js';
import { createSessionToken } from '../../src/api/utils/tokenHelper.js';
import { Collection, PermissionFlagsBits } from 'discord.js';

describe('API Routes Integration Tests', () => {
  let server;
  let baseUrl;
  let rootUrl;
  let mockClient;

  before(async () => {
    const store = new Map();
    // Setup mock Discord client
    mockClient = {
      user: { id: 'bot-123', username: 'TitanBot' },
      db: {
        get: async (key) => store.get(key) || null,
        set: async (key, val) => {
          store.set(key, val);
          return true;
        },
      },
      commands: new Collection([
        [
          'ping',
          {
            category: 'Core',
            data: {
              name: 'ping',
              description: 'Replies with pong',
              name_localizations: { 'es-419': 'ping' },
              description_localizations: { 'es-419': 'Responde con pong' },
            },
          },
        ],
        [
          'ban',
          {
            category: 'Moderation',
            data: { name: 'ban', description: 'Bans a user' },
          },
        ],
        [
          'birthday',
          {
            category: 'Birthday',
            data: {
              name: 'birthday',
              description: 'Birthday commands',
              options: [
                {
                  type: 1,
                  name: 'set',
                  description: 'Set birthday',
                  description_localizations: { 'es-419': 'Configura tu cumpleaños' },
                },
                {
                  type: 1,
                  name: 'list',
                  description: 'List birthdays',
                },
              ],
            },
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
                      permissionsFor: () => ({ has: () => true }),
                      send: async () => ({
                        id: '112233445566778899',
                        delete: async () => {},
                      }),
                      messages: {
                        fetch: async () => ({
                          id: '112233445566778899',
                          delete: async () => {},
                        }),
                      },
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
        get: async (key) => store.get(key) || null,
        set: async (key, val) => {
          store.set(key, val);
          return true;
        },
        delete: async (key) => {
          store.delete(key);
          return true;
        },
        list: async (prefix) => {
          const keys = Array.from(store.keys());
          return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
        },
      },
    };

    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api', createApiRouter(mockClient));

    const distPath = path.resolve('dashboard/dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use((req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/ready') {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        rootUrl = `http://localhost:${port}`;
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
    assert.strictEqual(coreCat.commands[0].descriptionLocalizations['es-419'], 'Responde con pong');

    const modCat = data.categories.find((c) => c.name === 'Moderation');
    assert.ok(modCat);
    assert.strictEqual(modCat.commands[0].name, 'ban');

    const bdayCat = data.categories.find((c) => c.name === 'Birthday');
    assert.ok(bdayCat);
    assert.strictEqual(bdayCat.commands[0].name, 'birthday');
    assert.strictEqual(bdayCat.commands[0].subcommands.length, 2);
    assert.strictEqual(bdayCat.commands[0].subcommands[0].name, 'birthday set');
    assert.strictEqual(bdayCat.commands[0].subcommands[0].descriptionLocalizations['es-419'], 'Configura tu cumpleaños');
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
    assert.strictEqual(typeof data.roles[0].canManage, 'boolean');
  });

  it('GET /api/guilds/:guildId/roles marks role unmanageable if above bot highest role', async () => {
    const guild = mockClient.guilds.cache.get('guild-123');
    guild.roles.cache.set('role-mod', {
      id: 'role-mod',
      name: 'Moderator',
      hexColor: '#00ff00',
      position: 2,
      managed: false,
    });
    guild.members.me = {
      roles: {
        highest: { position: 3 },
      },
      permissions: {
        has: () => true,
      },
    };

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/guild-123/roles`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const adminRole = data.roles.find((r) => r.id === 'role-admin');
    assert.strictEqual(adminRole.canManage, false);

    const modRole = data.roles.find((r) => r.id === 'role-mod');
    assert.strictEqual(modRole.canManage, true);
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

  it('PATCH /api/guilds/:guildId/config updates disabledCommands and disabledCategories', async () => {
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/guild-123/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        disabledCommands: { ping: true, roll: false },
        disabledCategories: { Fun: true },
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.config.disabledCommands.ping, true);
    assert.strictEqual(data.config.disabledCommands.roll, false);
    assert.strictEqual(data.config.disabledCategories.Fun, true);
  });

  it('POST /api/guilds/:guildId/reactroles rejects role above bot hierarchy with 422', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const testRoleId = '123456789012345680';

    mockClient.guilds.cache.set(testGuildId, {
      id: testGuildId,
      name: 'Reaction Role Server',
      memberCount: 10,
      ownerId: 'admin-user-id',
      channels: {
        cache: new Map([
          [
            testChannelId,
            {
              id: testChannelId,
              name: 'roles-channel',
              type: 0,
              permissionsFor: () => ({ has: () => true }),
              send: async () => ({
                id: '112233445566778899',
                delete: async () => {},
              }),
              messages: {
                fetch: async () => ({
                  id: '112233445566778899',
                  delete: async () => {},
                }),
              },
            },
          ],
        ]),
      },
      roles: {
        cache: new Map([
          [
            testRoleId,
            {
              id: testRoleId,
              name: 'Gamer',
              hexColor: '#00ff00',
              position: 5,
              managed: false,
              permissions: { has: () => false },
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
              permissions: { has: () => true },
            },
          ],
        ]),
        me: {
          roles: { highest: { position: 3 } }, // lower than role position 5
          permissions: { has: () => true },
        },
      },
    });

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/reactroles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelId: testChannelId,
        title: 'Roles de Test',
        description: 'Test description',
        roleIds: [testRoleId],
      }),
    });

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, 'HierarchyError');
  });

  it('POST, GET, and DELETE /api/guilds/:guildId/reactroles lifecycle', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 10; // higher than role position 5

    const token = createSessionToken({ id: 'admin-user-id' });

    // 1. Create panel
    const createRes = await fetch(`${baseUrl}/guilds/${testGuildId}/reactroles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelId: testChannelId,
        title: 'Notificaciones',
        description: 'Elige tus notificaciones',
        roleIds: [testRoleId],
      }),
    });

    assert.strictEqual(createRes.status, 200);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    assert.strictEqual(createData.panel.messageId, '112233445566778899');
    assert.strictEqual(createData.panel.roles[0].name, 'Gamer');

    // 2. Get panels list
    const getRes = await fetch(`${baseUrl}/guilds/${testGuildId}/reactroles`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.strictEqual(getData.success, true);
    assert.ok(getData.panels.length > 0);
    assert.strictEqual(getData.panels[0].messageId, '112233445566778899');

    // 3. Delete panel
    const delRes = await fetch(`${baseUrl}/guilds/${testGuildId}/reactroles/112233445566778899`, {
      method: 'DELETE',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(delRes.status, 200);
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);

    // 4. Verify list is empty
    const verifyRes = await fetch(`${baseUrl}/guilds/${testGuildId}/reactroles`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.panels.length, 0);
  });

  it('PATCH /api/guilds/:guildId/config updates autoRoles array and full verification config', async () => {
    const testGuildId = '123456789012345678';
    const testRoleId = '123456789012345680';
    const testChannelId = '123456789012345679';

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        autoRoles: [testRoleId],
        verification: {
          enabled: true,
          channelId: testChannelId,
          roleId: testRoleId,
          message: 'Personalized verification greeting',
          buttonText: 'Click to Verify',
          autoVerify: {
            enabled: true,
            accountAgeDays: 14,
          },
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.deepStrictEqual(data.config.autoRoles, [testRoleId]);
    assert.strictEqual(data.config.autoRole, testRoleId);
    assert.strictEqual(data.config.verification.enabled, true);
    assert.strictEqual(data.config.verification.channelId, testChannelId);
    assert.strictEqual(data.config.verification.roleId, testRoleId);
    assert.strictEqual(data.config.verification.message, 'Personalized verification greeting');
    assert.strictEqual(data.config.verification.buttonText, 'Click to Verify');
    assert.strictEqual(data.config.verification.autoVerify.enabled, true);
    assert.strictEqual(data.config.verification.autoVerify.accountAgeDays, 14);
  });

  it('POST /api/guilds/:guildId/verification/publish rejects unmanageable role with 422', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 2; // Lower than role position 5

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/verification/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelId: testChannelId,
        roleId: testRoleId,
        message: 'Click to verify',
        buttonText: 'Verify',
      }),
    });

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, 'HierarchyError');
  });

  it('POST /api/guilds/:guildId/verification/publish sends embed and button to channel', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 20; // Higher than role position 5

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/verification/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelId: testChannelId,
        roleId: testRoleId,
        message: 'Bienvenido, pulsa para verificarte',
        buttonText: 'Verificarme Ahora',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.panel.messageId, '112233445566778899');
    assert.strictEqual(data.panel.roleName, 'Gamer');
    assert.ok(data.panel.messageUrl.includes('112233445566778899'));
  });

  it('PATCH /api/guilds/:guildId/config persists granular logging configuration', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        logging: {
          enabled: true,
          channels: {
            audit: '123456789012345679',
            reports: '123456789012345679',
            applications: '123456789012345679',
          },
          enabledEvents: {
            'moderation.*': true,
            'message.delete': true,
            'role.create': false,
          },
          ignore: {
            channels: ['123456789012345679'],
            users: [],
          },
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.config.logging.enabled, true);
    assert.strictEqual(data.config.logging.channels.applications, '123456789012345679');
    assert.strictEqual(data.config.logging.enabledEvents['moderation.*'], true);
    assert.strictEqual(data.config.logging.enabledEvents['role.create'], false);
    assert.deepStrictEqual(data.config.logging.ignore.channels, ['123456789012345679']);
  });

  it('GET /api/guilds/:guildId/tickets returns ticket settings and unconfigured panel status', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/tickets`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.tickets);
    assert.strictEqual(typeof data.tickets.maxTicketsPerUser, 'number');
    assert.strictEqual(typeof data.tickets.dmOnClose, 'boolean');
  });

  it('POST /api/guilds/:guildId/tickets/publish rejects unmanageable staff role with 422', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 2; // Lower than role position 5

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/tickets/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        panelChannelId: testChannelId,
        staffRoleId: testRoleId,
        panelMessage: 'Soporte',
        buttonLabel: 'Abrir Ticket',
      }),
    });

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, 'HierarchyError');
  });

  it('POST /api/guilds/:guildId/tickets/publish rejects when bot lacks channel permissions with 403', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 20;

    const channel = guild.channels.cache.get(testChannelId);
    const originalPerms = channel.permissionsFor;
    channel.permissionsFor = () => ({
      has: () => false,
    });

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/tickets/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        panelChannelId: testChannelId,
        panelMessage: 'Soporte',
        buttonLabel: 'Abrir Ticket',
      }),
    });

    // Restore permissionsFor
    channel.permissionsFor = originalPerms;

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.error, 'MissingChannelPermissions');
  });

  it('POST /api/guilds/:guildId/tickets/publish publishes ticket panel and DELETE cleans it up', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const testCategoryId = '123456789012345681';
    const testClosedCategoryId = '123456789012345682';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 20;

    // Add category channels to cache
    guild.channels.cache.set(testCategoryId, {
      id: testCategoryId,
      name: 'Tickets Activos',
      type: 4,
      position: 10,
    });
    guild.channels.cache.set(testClosedCategoryId, {
      id: testClosedCategoryId,
      name: 'Tickets Cerrados',
      type: 4,
      position: 11,
    });

    const token = createSessionToken({ id: 'admin-user-id' });

    // 1. Publish Ticket Panel
    const pubRes = await fetch(`${baseUrl}/guilds/${testGuildId}/tickets/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        panelChannelId: testChannelId,
        categoryId: testCategoryId,
        closedCategoryId: testClosedCategoryId,
        staffRoleId: testRoleId,
        panelMessage: 'Panel de Soporte Oficial',
        buttonLabel: 'Crear Ticket de Ayuda',
        maxTicketsPerUser: 5,
        dmOnClose: true,
      }),
    });

    assert.strictEqual(pubRes.status, 200);
    const pubData = await pubRes.json();
    assert.strictEqual(pubData.success, true);
    assert.strictEqual(pubData.panel.messageId, '112233445566778899');
    assert.strictEqual(pubData.panel.channelId, testChannelId);

    // 2. Fetch ticket settings and verify state
    const getRes = await fetch(`${baseUrl}/guilds/${testGuildId}/tickets`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.strictEqual(getData.success, true);
    assert.strictEqual(getData.tickets.ticketPanelMessageId, '112233445566778899');
    assert.strictEqual(getData.tickets.ticketPanelMessage, 'Panel de Soporte Oficial');
    assert.strictEqual(getData.tickets.ticketButtonLabel, 'Crear Ticket de Ayuda');
    assert.strictEqual(getData.tickets.ticketCategoryId, testCategoryId);
    assert.strictEqual(getData.tickets.ticketClosedCategoryId, testClosedCategoryId);
    assert.strictEqual(getData.tickets.maxTicketsPerUser, 5);
    assert.strictEqual(getData.tickets.dmOnClose, true);

    // 3. Delete ticket panel
    const delRes = await fetch(`${baseUrl}/guilds/${testGuildId}/tickets/panel`, {
      method: 'DELETE',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });
    assert.strictEqual(delRes.status, 200);
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);

    // 4. Verify settings show panel IDs removed
    const postDelRes = await fetch(`${baseUrl}/guilds/${testGuildId}/tickets`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });
    const postDelData = await postDelRes.json();
    assert.strictEqual(postDelData.tickets.ticketPanelMessageId, null);
    assert.strictEqual(postDelData.tickets.ticketPanelChannelId, null);
  });

  it('GET /api/guilds/:guildId/leveling returns leveling settings and leaderboard', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/leveling`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.leveling);
    assert.strictEqual(typeof data.leveling.enabled, 'boolean');
    assert.strictEqual(typeof data.leveling.xpCooldown, 'number');
    assert.ok(Array.isArray(data.leaderboard));
  });

  it('PATCH /api/guilds/:guildId/leveling rejects invalid XP range with 400', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/leveling`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        xpPerMessage: { min: 50, max: 10 }, // min > max
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'ValidationError');
  });

  it('PATCH /api/guilds/:guildId/leveling rejects unmanageable reward role with 422', async () => {
    const testGuildId = '123456789012345678';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 2; // Lower than role position 5

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/leveling`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        roleRewards: {
          '5': testRoleId,
        },
      }),
    });

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, 'HierarchyError');
  });

  it('PATCH /api/guilds/:guildId/leveling updates settings and persists role rewards', async () => {
    const testGuildId = '123456789012345678';
    const testRoleId = '123456789012345680';
    const testChannelId = '123456789012345679';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 20; // Higher than role position 5

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/leveling`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        enabled: true,
        announceLevelUp: true,
        levelUpChannel: testChannelId,
        levelUpMessage: '¡Bien hecho {user}, has llegado al nivel {level}!',
        xpMultiplier: 2.0,
        xpCooldown: 45,
        xpPerMessage: { min: 20, max: 40 },
        roleRewards: {
          '5': testRoleId,
        },
        ignoredChannels: [testChannelId],
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.leveling.enabled, true);
    assert.strictEqual(data.leveling.levelUpChannel, testChannelId);
    assert.strictEqual(data.leveling.xpMultiplier, 2.0);
    assert.strictEqual(data.leveling.xpCooldown, 45);
    assert.deepStrictEqual(data.leveling.xpPerMessage, { min: 20, max: 40 });
    assert.strictEqual(data.leveling.roleRewards['5'], testRoleId);
    assert.deepStrictEqual(data.leveling.ignoredChannels, [testChannelId]);
  });

  it('GET /api/guilds/:guildId/economy returns economy settings and leaderboard', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/economy`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.economy);
    assert.strictEqual(typeof data.economy.currencyName, 'string');
    assert.strictEqual(typeof data.economy.startingBalance, 'number');
    assert.ok(Array.isArray(data.leaderboard));
  });

  it('PATCH /api/guilds/:guildId/economy rejects inverted work range with 400', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/economy`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        workMin: 500,
        workMax: 100, // min > max
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'ValidationError');
  });

  it('PATCH /api/guilds/:guildId/economy rejects unmanageable premium role with 422', async () => {
    const testGuildId = '123456789012345678';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 2; // Lower than role position 5

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/economy`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        premiumRoleId: testRoleId,
      }),
    });

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, 'HierarchyError');
  });

  it('PATCH /api/guilds/:guildId/economy updates settings and persists premiumRoleId', async () => {
    const testGuildId = '123456789012345678';
    const testRoleId = '123456789012345680';

    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 20;

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/economy`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        currencyName: 'gemas',
        currencySymbol: '💎',
        startingBalance: 250,
        dailyAmount: 1500,
        workMin: 75,
        workMax: 300,
        premiumRoleId: testRoleId,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.economy.currencyName, 'gemas');
    assert.strictEqual(data.economy.currencySymbol, '💎');
    assert.strictEqual(data.economy.startingBalance, 250);
    assert.strictEqual(data.economy.dailyAmount, 1500);
    assert.strictEqual(data.economy.premiumRoleId, testRoleId);
  });

  it('GET /api/guilds/:guildId/serverstats returns counters and guild stats', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/serverstats`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.counters));
    assert.ok(data.stats);
    assert.strictEqual(typeof data.stats.totalCount, 'number');
  });

  it('POST & DELETE /api/guilds/:guildId/serverstats lifecycle', async () => {
    const testGuildId = '123456789012345678';
    const guild = mockClient.guilds.cache.get(testGuildId);
    guild.members.me.roles.highest.position = 20;

    if (!guild.channels.create) {
      guild.channels.create = async ({ name, type }) => {
        const id = 'stat-ch-' + Math.random().toString(36).substring(2, 7);
        const ch = {
          id,
          name,
          type,
          delete: async () => {
            guild.channels.cache.delete(id);
          },
        };
        guild.channels.cache.set(id, ch);
        return ch;
      };
    }

    const token = createSessionToken({ id: 'admin-user-id' });
    const postRes = await fetch(`${baseUrl}/guilds/${testGuildId}/serverstats/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        types: ['members', 'bots'],
      }),
    });

    assert.strictEqual(postRes.status, 200);
    const postData = await postRes.json();
    assert.strictEqual(postData.success, true);
    assert.ok(postData.counters.length >= 2);

    const delRes = await fetch(`${baseUrl}/guilds/${testGuildId}/serverstats`, {
      method: 'DELETE',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(delRes.status, 200);
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);

    const getRes = await fetch(`${baseUrl}/guilds/${testGuildId}/serverstats`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });
    const getData = await getRes.json();
    assert.strictEqual(getData.counters.length, 0);
  });

  it('GET /api/guilds/:guildId/jointocreate returns JTC configuration', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/jointocreate`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.joinToCreate);
    assert.strictEqual(typeof data.joinToCreate.enabled, 'boolean');
    assert.strictEqual(typeof data.joinToCreate.channelNameTemplate, 'string');
  });

  it('PATCH /api/guilds/:guildId/jointocreate rejects invalid template with 400', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/jointocreate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelNameTemplate: '{invalid_placeholder_xyz}',
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'ValidationError');
  });

  it('PATCH /api/guilds/:guildId/jointocreate updates settings successfully', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/jointocreate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        enabled: true,
        channelNameTemplate: '{username} Room',
        userLimit: 8,
        bitrate: 128000,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.joinToCreate.enabled, true);
    assert.strictEqual(data.joinToCreate.channelNameTemplate, '{username} Room');
    assert.strictEqual(data.joinToCreate.userLimit, 8);
    assert.strictEqual(data.joinToCreate.bitrate, 128000);
  });

  it('GET /api/guilds/:guildId/moderation/cases returns cases and warnings', async () => {
    const testGuildId = '123456789012345678';
    const targetUserId = 'target-user-456';
    const warningId = 1700000000000;

    await mockClient.db.set(`guild:${testGuildId}:warnings:${targetUserId}`, [
      {
        id: warningId,
        guildId: testGuildId,
        userId: targetUserId,
        moderatorId: 'admin-user-id',
        reason: 'Spamming in general',
        timestamp: Date.now(),
        status: 'active',
      },
    ]);
    await mockClient.db.set(`moderation_cases_list_${testGuildId}`, [
      {
        caseId: 1,
        action: 'User Warned',
        target: 'spammerbob#1234 (target-user-456)',
        executor: 'Admin#0001 (admin-user-id)',
        reason: 'Spamming in general',
        targetUserId,
        moderatorId: 'admin-user-id',
        createdAt: new Date().toISOString(),
      },
    ]);

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/cases`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.cases));
    assert.strictEqual(data.cases.length, 1);
    assert.strictEqual(data.cases[0].action, 'User Warned');
    assert.ok(Array.isArray(data.warnings));
    assert.strictEqual(data.warnings.length, 1);
    assert.strictEqual(data.warnings[0].id, warningId);
  });

  it('GET /api/guilds/:guildId/moderation/users/:userId returns disciplinary record', async () => {
    const testGuildId = '123456789012345678';
    const targetUserId = 'target-user-456';
    const guild = mockClient.guilds.cache.get(testGuildId);

    guild.members.cache.set(targetUserId, {
      id: targetUserId,
      displayName: 'SpammerBob',
      user: {
        id: targetUserId,
        username: 'spammerbob',
        tag: 'spammerbob#1234',
        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/target-user-456/abc.png',
      },
      roles: {
        cache: new Map([
          ['role-regular', { id: 'role-regular', name: 'Member', hexColor: '#99aab5' }],
        ]),
        highest: { position: 1, name: 'Member' },
      },
      communicationDisabledUntilTimestamp: null,
    });

    await mockClient.db.set(`guild:${testGuildId}:usernotes:${targetUserId}`, [
      {
        id: 1,
        type: 'warning',
        content: 'User was previously warned verbally',
        moderatorId: 'admin-user-id',
        moderatorTag: 'Admin#0001',
        timestamp: new Date().toISOString(),
      },
    ]);

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/users/${targetUserId}`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.member.displayName, 'SpammerBob');
    assert.strictEqual(data.member.inGuild, true);
    assert.strictEqual(data.warnings.length, 1);
    assert.strictEqual(data.notes.length, 1);
    assert.strictEqual(data.notes[0].content, 'User was previously warned verbally');
  });

  it('DELETE /api/guilds/:guildId/moderation/warnings/:userId/:warningId rejects when target outranks moderator', async () => {
    const testGuildId = '123456789012345678';
    const targetUserId = 'target-user-456';
    const guild = mockClient.guilds.cache.get(testGuildId);

    // Target outranks admin
    const targetMember = guild.members.cache.get(targetUserId);
    targetMember.roles.highest = { position: 20, name: 'SuperAdmin' };
    const adminMember = guild.members.cache.get('admin-user-id');
    adminMember.roles = { highest: { position: 10, name: 'Admin' } };
    guild.ownerId = 'other-owner-id';

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/warnings/${targetUserId}/1700000000000`, {
      method: 'DELETE',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, 'HierarchyError');
  });

  it('DELETE /api/guilds/:guildId/moderation/warnings/:userId/:warningId revokes warning', async () => {
    const testGuildId = '123456789012345678';
    const targetUserId = 'target-user-456';
    const guild = mockClient.guilds.cache.get(testGuildId);

    // Reset hierarchy so admin outranks target
    const targetMember = guild.members.cache.get(targetUserId);
    targetMember.roles.highest = { position: 1, name: 'Member' };
    const adminMember = guild.members.cache.get('admin-user-id');
    adminMember.roles = { highest: { position: 10, name: 'Admin' } };

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/warnings/${targetUserId}/1700000000000`, {
      method: 'DELETE',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const activeWarns = await mockClient.db.get(`guild:${testGuildId}:warnings:${targetUserId}`);
    assert.strictEqual(activeWarns[0].status, 'deleted');
  });

  it('DELETE /api/guilds/:guildId/moderation/warnings/:userId clears all warnings', async () => {
    const testGuildId = '123456789012345678';
    const targetUserId = 'target-user-456';

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/warnings/${targetUserId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(typeof data.count, 'number');

    const activeWarns = await mockClient.db.get(`guild:${testGuildId}:warnings:${targetUserId}`);
    assert.deepStrictEqual(activeWarns, []);
  });

  it('GET /api/guilds/:guildId/moderation/config returns moderation settings', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/config`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.moderation.autoPunish));
  });

  it('PATCH /api/guilds/:guildId/moderation/config rejects invalid autoPunish rules with 400', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        autoPunish: [
          {
            warnThreshold: 0, // Invalid: min is 1
            action: 'invalid_action',
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'ValidationError');
  });

  it('PATCH /api/guilds/:guildId/moderation/config persists valid autoPunish rules', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/moderation/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        autoPunish: [
          { warnThreshold: 3, action: 'timeout', durationMinutes: 60 },
          { warnThreshold: 5, action: 'kick' },
          { warnThreshold: 7, action: 'ban' },
        ],
        dmOnWarn: false,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.moderation.autoPunish.length, 3);
    assert.strictEqual(data.moderation.autoPunish[0].action, 'timeout');
    assert.strictEqual(data.moderation.autoPunish[0].durationMinutes, 60);
    assert.strictEqual(data.moderation.dmOnWarn, false);
  });

  it('GET /api/guilds/:guildId/giveaways returns active and ended giveaways', async () => {
    const testGuildId = '123456789012345678';
    const giveawayKey = `guild:${testGuildId}:giveaways`;

    await mockClient.db.set(giveawayKey, {
      'msg-active-1': {
        messageId: 'msg-active-1',
        channelId: '123456789012345679',
        guildId: testGuildId,
        prize: 'Discord Nitro 1 Month',
        hostId: 'admin-user-id',
        endTime: Date.now() + 3600000,
        endsAt: Date.now() + 3600000,
        winnerCount: 1,
        participants: ['user-1', 'user-2'],
        isEnded: false,
        ended: false,
        createdAt: new Date().toISOString(),
      },
      'msg-ended-1': {
        messageId: 'msg-ended-1',
        channelId: '123456789012345679',
        guildId: testGuildId,
        prize: 'Steam Game Key',
        hostId: 'admin-user-id',
        endTime: Date.now() - 3600000,
        endsAt: Date.now() - 3600000,
        winnerCount: 1,
        participants: ['user-3'],
        winnerIds: ['user-3'],
        isEnded: true,
        ended: true,
        endedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    });

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/giveaways`, {
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.active.length, 1);
    assert.strictEqual(data.active[0].prize, 'Discord Nitro 1 Month');
    assert.strictEqual(data.active[0].participantCount, 2);
    assert.strictEqual(data.ended.length, 1);
    assert.strictEqual(data.ended[0].prize, 'Steam Game Key');
    assert.strictEqual(data.ended[0].winnerIds.length, 1);
  });

  it('POST /api/guilds/:guildId/giveaways rejects invalid payload with 400', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/giveaways`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelId: '123456789012345679',
        prize: '', // empty prize
        durationMinutes: 0, // < 1 min
        winnerCount: 15, // > 10
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'ValidationError');
  });

  it('POST /api/guilds/:guildId/giveaways rejects when bot lacks channel permissions with 422', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const guild = mockClient.guilds.cache.get(testGuildId);
    const channel = guild.channels.cache.get(testChannelId);

    // Mock bot lacking permissions
    const origPerms = channel.permissionsFor;
    channel.permissionsFor = () => ({
      has: (flag) => flag !== PermissionFlagsBits.EmbedLinks,
    });

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/giveaways`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelId: testChannelId,
        prize: 'Gaming Mouse',
        durationMinutes: 60,
        winnerCount: 2,
      }),
    });

    channel.permissionsFor = origPerms; // restore

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, 'PermissionError');
  });

  it('POST /api/guilds/:guildId/giveaways creates and starts giveaway', async () => {
    const testGuildId = '123456789012345678';
    const testChannelId = '123456789012345679';
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/giveaways`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `titanbot_session=${token}`,
      },
      body: JSON.stringify({
        channelId: testChannelId,
        prize: 'Discord Nitro Classic',
        durationMinutes: 120,
        winnerCount: 1,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.giveaway.prize, 'Discord Nitro Classic');
    assert.strictEqual(data.giveaway.winnerCount, 1);
    assert.strictEqual(data.giveaway.isEnded, false);
  });

  it('POST /api/guilds/:guildId/giveaways/:messageId/end immediately ends active giveaway', async () => {
    const testGuildId = '123456789012345678';
    const giveawayKey = `guild:${testGuildId}:giveaways`;

    // Seed active giveaway with participants
    const giveaways = await mockClient.db.get(giveawayKey) || {};
    giveaways['msg-active-to-end'] = {
      messageId: 'msg-active-to-end',
      channelId: '123456789012345679',
      guildId: testGuildId,
      prize: 'Spotify Premium 3 Months',
      hostId: 'admin-user-id',
      endTime: Date.now() + 7200000,
      endsAt: Date.now() + 7200000,
      winnerCount: 1,
      participants: ['participant-1', 'participant-2'],
      isEnded: false,
      ended: false,
      createdAt: new Date().toISOString(),
    };
    await mockClient.db.set(giveawayKey, giveaways);

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/giveaways/msg-active-to-end/end`, {
      method: 'POST',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.giveaway.ended, true);
    assert.strictEqual(data.winners.length, 1);
  });

  it('POST /api/guilds/:guildId/giveaways/:messageId/reroll rerolls winners for ended giveaway', async () => {
    const testGuildId = '123456789012345678';
    const giveawayKey = `guild:${testGuildId}:giveaways`;

    const token = createSessionToken({ id: 'admin-user-id' });
    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/giveaways/msg-active-to-end/reroll`, {
      method: 'POST',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.winners.length, 1);
    assert.ok(['participant-1', 'participant-2'].includes(data.winners[0]));
  });

  it('DELETE /api/guilds/:guildId/giveaways/:messageId deletes giveaway', async () => {
    const testGuildId = '123456789012345678';
    const token = createSessionToken({ id: 'admin-user-id' });

    const res = await fetch(`${baseUrl}/guilds/${testGuildId}/giveaways/msg-active-to-end`, {
      method: 'DELETE',
      headers: {
        Cookie: `titanbot_session=${token}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const giveawayKey = `guild:${testGuildId}:giveaways`;
    const giveaways = await mockClient.db.get(giveawayKey);
    assert.strictEqual(giveaways['msg-active-to-end'], undefined);
  });

  it('GET / serves the dashboard index.html when dist exists', async () => {
    const res = await fetch(`${rootUrl}/`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('<div id="root">') || text.includes('TitanBot Dashboard'));
  });

  it('GET /servers serves the dashboard index.html (SPA client fallback)', async () => {
    const res = await fetch(`${rootUrl}/servers`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('<div id="root">') || text.includes('TitanBot Dashboard'));
  });
});
