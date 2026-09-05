import { describe, it } from 'node:test';
import assert from 'node:assert';
import { verifyAuth } from '../../src/api/middlewares/verifyAuth.js';
import { checkGuildPermissions } from '../../src/api/middlewares/checkGuildPermissions.js';
import { createSessionToken } from '../../src/api/utils/tokenHelper.js';
import { PermissionFlagsBits } from 'discord.js';

describe('API: verifyAuth Middleware', () => {
  it('returns 401 if neither cookie nor auth header is provided', () => {
    const req = { cookies: {}, headers: {} };
    let status = 0;
    let responseBody = null;
    const res = {
      status(code) {
        status = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    verifyAuth(req, res, next);

    assert.strictEqual(status, 401);
    assert.strictEqual(responseBody?.error, 'Unauthorized');
    assert.strictEqual(nextCalled, false);
  });

  it('authenticates successfully with valid cookie', () => {
    const userPayload = { id: '999888777', username: 'CoolAdmin' };
    const token = createSessionToken(userPayload);

    const req = { cookies: { titanbot_session: token }, headers: {} };
    let status = 0;
    const res = {
      status(code) { status = code; return this; },
      json() { return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    verifyAuth(req, res, next);

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(status, 0);
    assert.strictEqual(req.user.id, userPayload.id);
    assert.strictEqual(req.user.username, userPayload.username);
  });

  it('authenticates successfully with Authorization Bearer header', () => {
    const userPayload = { id: '111222333', username: 'BearerUser' };
    const token = createSessionToken(userPayload);

    const req = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const res = {
      status() { return this; },
      json() { return this; },
    };

    verifyAuth(req, res, next);

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user.id, userPayload.id);
  });

  it('returns 401 when token is invalid', () => {
    const req = { cookies: { titanbot_session: 'invalid.jwt.token' }, headers: {} };
    let status = 0;
    const res = {
      status(code) { status = code; return this; },
      json() { return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    verifyAuth(req, res, next);

    assert.strictEqual(status, 401);
    assert.strictEqual(nextCalled, false);
  });
});

describe('API: checkGuildPermissions Middleware', () => {
  it('returns 400 when guildId parameter is missing', async () => {
    const req = { params: {}, user: { id: '123' } };
    let status = 0;
    let responseBody = null;
    const res = {
      status(code) { status = code; return this; },
      json(body) { responseBody = body; return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await checkGuildPermissions(req, res, next);

    assert.strictEqual(status, 400);
    assert.strictEqual(responseBody?.error, 'BadRequest');
    assert.strictEqual(nextCalled, false);
  });

  it('returns 404 when bot is not in the requested guild', async () => {
    const req = {
      params: { guildId: 'guild-not-present' },
      user: { id: '123' },
      client: {
        guilds: {
          cache: new Map(),
        },
      },
    };
    let status = 0;
    let responseBody = null;
    const res = {
      status(code) { status = code; return this; },
      json(body) { responseBody = body; return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await checkGuildPermissions(req, res, next);

    assert.strictEqual(status, 404);
    assert.strictEqual(responseBody?.error, 'GuildNotFound');
    assert.strictEqual(nextCalled, false);
  });

  it('allows access if member has Administrator permission', async () => {
    const mockGuild = {
      id: 'guild-123',
      members: {
        cache: new Map([
          [
            'admin-user',
            {
              permissions: {
                has(flag) {
                  return flag === PermissionFlagsBits.Administrator;
                },
              },
            },
          ],
        ]),
      },
    };

    const req = {
      params: { guildId: 'guild-123' },
      user: { id: 'admin-user' },
      client: {
        guilds: {
          cache: new Map([['guild-123', mockGuild]]),
        },
      },
    };

    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const res = {
      status() { return this; },
      json() { return this; },
    };

    await checkGuildPermissions(req, res, next);

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.guild, mockGuild);
  });

  it('rejects access with 403 if member lacks both Admin and ManageGuild permissions', async () => {
    const mockGuild = {
      id: 'guild-123',
      members: {
        cache: new Map([
          [
            'regular-user',
            {
              permissions: {
                has() {
                  return false;
                },
              },
            },
          ],
        ]),
      },
    };

    const req = {
      params: { guildId: 'guild-123' },
      user: { id: 'regular-user' },
      client: {
        guilds: {
          cache: new Map([['guild-123', mockGuild]]),
        },
      },
    };

    let status = 0;
    let responseBody = null;
    const res = {
      status(code) { status = code; return this; },
      json(body) { responseBody = body; return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await checkGuildPermissions(req, res, next);

    assert.strictEqual(status, 403);
    assert.strictEqual(responseBody?.error, 'Forbidden');
    assert.strictEqual(nextCalled, false);
  });
});
