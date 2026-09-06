import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  DashboardAuditLogItemSchema,
} from '../../src/utils/schemas.js';
import {
  logAuditEvent,
  getGuildAuditLogs,
  clearGuildAuditLogs,
} from '../../src/services/audit/auditLogService.js';
import { db } from '../../src/utils/database/wrapper.js';

describe('Dashboard Audit Logs (Feature B)', () => {
  const testGuildId = '123456789012345678';
  const mockStaff = {
    id: '987654321098765432',
    username: 'admin_jorge',
    discriminator: '0',
    avatar: 'a_sample_avatar_hash',
  };

  before(async () => {
    if (!db.initialized) {
      await db.initialize();
    }
    await clearGuildAuditLogs(testGuildId);
  });

  describe('Zod Schema Validation', () => {
    it('validates a correct audit log item', () => {
      const item = {
        id: 'audit_uuid_1',
        guildId: testGuildId,
        userId: mockStaff.id,
        userTag: '@admin_jorge',
        userAvatar: 'https://cdn.discordapp.com/avatars/1/2.png',
        action: 'CONFIG_UPDATE',
        category: 'general',
        details: 'Actualizó prefix a !',
        metadata: { field: 'prefix', old: '?', new: '!' },
        ip: '127.0.0.1',
      };

      const parsed = DashboardAuditLogItemSchema.safeParse(item);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.action, 'CONFIG_UPDATE');
      assert.strictEqual(parsed.data.category, 'general');
    });

    it('rejects empty guild ID', () => {
      const item = {
        id: 'audit_uuid_2',
        guildId: '',
        userId: mockStaff.id,
        action: 'TEST',
      };

      const parsed = DashboardAuditLogItemSchema.safeParse(item);
      assert.strictEqual(parsed.success, false);
    });

    it('applies defaults for optional fields', () => {
      const item = {
        id: 'audit_uuid_3',
        guildId: testGuildId,
        userId: mockStaff.id,
        action: 'SNAPSHOT_CREATE',
      };

      const parsed = DashboardAuditLogItemSchema.safeParse(item);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.category, 'general');
      assert.strictEqual(parsed.data.details, '');
      assert.ok(parsed.data.timestamp);
    });
  });

  describe('Audit Log Service & Persistence', () => {
    it('logs an audit event and stores it in the guild index', async () => {
      const logged = await logAuditEvent({
        guildId: testGuildId,
        user: mockStaff,
        action: 'AUTOMATION_CREATE',
        category: 'automations',
        details: 'Creó sticky message en #general',
        metadata: { channelId: '111222333444555666' },
        ip: '192.168.1.1',
      });

      assert.ok(logged);
      assert.strictEqual(logged.action, 'AUTOMATION_CREATE');
      assert.strictEqual(logged.category, 'automations');
      assert.strictEqual(logged.userTag, '@admin_jorge');
    });

    it('retrieves paginated audit logs with category and search filters', async () => {
      // Add a couple more logs
      await logAuditEvent({
        guildId: testGuildId,
        user: mockStaff,
        action: 'SNAPSHOT_RESTORE',
        category: 'snapshots',
        details: 'Restauró snapshot safe_sync',
      });

      await logAuditEvent({
        guildId: testGuildId,
        user: { id: '111122223333444455', username: 'moderator_dan' },
        action: 'CONFIG_UPDATE',
        category: 'general',
        details: 'Cambió idioma a es-419',
      });

      // Query all
      const allRes = await getGuildAuditLogs({ guildId: testGuildId, page: 1, limit: 10 });
      assert.ok(allRes.total >= 3);
      assert.strictEqual(allRes.page, 1);
      assert.ok(allRes.logs.length >= 3);

      // Query by category 'snapshots'
      const snapRes = await getGuildAuditLogs({ guildId: testGuildId, category: 'snapshots' });
      assert.strictEqual(snapRes.logs.length, 1);
      assert.strictEqual(snapRes.logs[0].action, 'SNAPSHOT_RESTORE');

      // Query by search 'moderator_dan'
      const searchRes = await getGuildAuditLogs({ guildId: testGuildId, search: 'dan' });
      assert.strictEqual(searchRes.logs.length, 1);
      assert.ok(searchRes.logs[0].userTag.includes('dan'));
    });

    it('clears all audit logs for a guild', async () => {
      const cleared = await clearGuildAuditLogs(testGuildId);
      assert.strictEqual(cleared, true);

      const res = await getGuildAuditLogs({ guildId: testGuildId });
      assert.strictEqual(res.total, 0);
      assert.strictEqual(res.logs.length, 0);
    });
  });
});
