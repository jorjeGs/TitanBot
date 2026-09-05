import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createSessionToken, verifySessionToken } from '../../src/api/utils/tokenHelper.js';

describe('API: tokenHelper', () => {
  it('creates and verifies a valid JWT session token', () => {
    const payload = {
      id: '123456789012345678',
      username: 'TestUser',
      discriminator: '0',
      avatar: 'avatar_hash_123',
    };

    const token = createSessionToken(payload);
    assert.strictEqual(typeof token, 'string');
    assert.ok(token.split('.').length === 3);

    const decoded = verifySessionToken(token);
    assert.ok(decoded);
    assert.strictEqual(decoded.id, payload.id);
    assert.strictEqual(decoded.username, payload.username);
    assert.strictEqual(decoded.avatar, payload.avatar);
  });

  it('returns null for null, undefined, or empty token', () => {
    assert.strictEqual(verifySessionToken(null), null);
    assert.strictEqual(verifySessionToken(undefined), null);
    assert.strictEqual(verifySessionToken(''), null);
    assert.strictEqual(verifySessionToken(12345), null);
  });

  it('returns null for a corrupted or manipulated token', () => {
    const payload = { id: '12345', username: 'Test' };
    const token = createSessionToken(payload);
    const corrupted = token.slice(0, -5) + 'xxxxx';

    assert.strictEqual(verifySessionToken(corrupted), null);
  });
});
