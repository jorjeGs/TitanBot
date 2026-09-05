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
