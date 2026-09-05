import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  StickyMessageSchema,
  ScheduledMessageSchema,
  AutoResponderSchema,
  AutomationsConfigSchema,
} from '../../src/utils/schemas.js';
import {
  handleStickyMessage,
  resetStickyTracking,
} from '../../src/services/automations/stickyMessageService.js';
import {
  isScheduledMessageDue,
  sendScheduledMessage,
  checkScheduledMessages,
  triggerScheduledMessageNow,
} from '../../src/services/automations/scheduledMessageService.js';
import {
  matchTrigger,
  handleAutoResponders,
  resetAutoResponderCooldowns,
} from '../../src/services/automations/autoResponderService.js';
import {
  getAutomations,
  createOrUpdateSticky,
  deleteSticky,
  createOrUpdateScheduled,
  triggerScheduledNow,
  deleteScheduled,
  createOrUpdateAutoResponder,
  deleteAutoResponder,
} from '../../src/api/controllers/automationsController.js';

describe('Automations & Dynamic Messaging (Sub-project A)', () => {
  beforeEach(() => {
    resetStickyTracking();
    resetAutoResponderCooldowns();
  });

  describe('Zod Schemas Validation', () => {
    it('validates a valid sticky message payload', () => {
      const payload = {
        id: 'sticky_1',
        channelId: '123456789012345678',
        enabled: true,
        type: 'embed',
        embed: {
          title: 'Reglas',
          description: 'Descripción de reglas',
          color: '#5865F2',
        },
        messageCountThreshold: 5,
        cooldownSeconds: 10,
      };

      const result = StickyMessageSchema.safeParse(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.messageCountThreshold, 5);
      assert.strictEqual(result.data.cooldownSeconds, 10);
    });

    it('rejects an invalid channelId in StickyMessageSchema', () => {
      const payload = {
        id: 'sticky_1',
        channelId: 'invalid-channel',
      };
      const result = StickyMessageSchema.safeParse(payload);
      assert.strictEqual(result.success, false);
    });

    it('validates scheduled message schemas for all scheduleTypes', () => {
      const daily = {
        id: 'sched_1',
        name: 'Aviso Diario',
        channelId: '123456789012345678',
        scheduleType: 'daily',
        timeOfDay: '18:30',
      };
      const interval = {
        id: 'sched_2',
        name: 'Aviso Intervalo',
        channelId: '123456789012345678',
        scheduleType: 'interval',
        intervalHours: 6,
      };

      assert.strictEqual(ScheduledMessageSchema.safeParse(daily).success, true);
      assert.strictEqual(ScheduledMessageSchema.safeParse(interval).success, true);
    });

    it('validates auto-responder schema with match types and regex', () => {
      const rule = {
        id: 'ar_1',
        trigger: 'reglas del server',
        matchType: 'contains',
        replyType: 'channel',
        type: 'text',
        content: 'Lee las reglas en #normas',
      };

      const result = AutoResponderSchema.safeParse(rule);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.matchType, 'contains');
    });

    it('defaults AutomationsConfigSchema to empty arrays', () => {
      const result = AutomationsConfigSchema.safeParse({});
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data.stickyMessages, []);
      assert.deepStrictEqual(result.data.scheduledMessages, []);
      assert.deepStrictEqual(result.data.autoResponders, []);
    });
  });

  describe('Sticky Message Service Logic', () => {
    it('ignores bot messages', async () => {
      let sendCalled = false;
      const mockMessage = {
        author: { bot: true },
        guild: { id: 'g1' },
        channel: {
          id: 'c1',
          send: async () => {
            sendCalled = true;
          },
        },
      };

      await handleStickyMessage(mockMessage, {});
      assert.strictEqual(sendCalled, false);
    });

    it('increments counter and only dispatches when threshold is reached', async () => {
      let sentCount = 0;
      let deletedOld = false;

      const store = new Map();
      store.set('guild:g1:config', {
        automations: {
          stickyMessages: [
            {
              id: 'sticky_1',
              channelId: '123456789012345678',
              enabled: true,
              type: 'text',
              content: '📌 Sticky Content for {channel}',
              messageCountThreshold: 2,
              cooldownSeconds: 0,
              lastMessageId: '111111111111111111',
            },
          ],
        },
      });

      const mockClient = {
        db: {
          get: async (k) => store.get(k) || null,
          set: async (k, v) => store.set(k, v),
        },
      };

      const mockMessage = {
        author: { bot: false, id: 'u1' },
        guild: { id: 'g1', name: 'Titan Server' },
        channel: {
          id: '123456789012345678',
          messages: {
            fetch: async (id) => ({
              id,
              deletable: true,
              delete: async () => {
                deletedOld = true;
              },
            }),
          },
          send: async (payload) => {
            sentCount++;
            assert.ok(payload.content.includes('#123456789012345678'));
            return { id: '222222222222222222' };
          },
        },
      };

      // 1st message: count becomes 1 (< threshold 2) -> does not send
      await handleStickyMessage(mockMessage, mockClient);
      assert.strictEqual(sentCount, 0);

      // 2nd message: count becomes 2 (>= threshold 2) -> sends!
      await handleStickyMessage(mockMessage, mockClient);
      assert.strictEqual(sentCount, 1);
      assert.strictEqual(deletedOld, true);
    });
  });

  describe('Scheduled Message Service Logic', () => {
    it('evaluates interval schedules correctly', () => {
      const scheduled = {
        enabled: true,
        scheduleType: 'interval',
        intervalHours: 4,
        lastRunAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      };

      assert.strictEqual(isScheduledMessageDue(scheduled), true);

      const notDue = {
        ...scheduled,
        lastRunAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      };
      assert.strictEqual(isScheduledMessageDue(notDue), false);
    });

    it('evaluates daily schedules correctly', () => {
      const now = new Date('2026-09-05T14:30:00Z');
      const matching = {
        enabled: true,
        scheduleType: 'daily',
        timeOfDay: '14:30',
        lastRunAt: null,
      };

      assert.strictEqual(isScheduledMessageDue(matching, now), true);

      const nonMatching = {
        enabled: true,
        scheduleType: 'daily',
        timeOfDay: '15:00',
        lastRunAt: null,
      };
      assert.strictEqual(isScheduledMessageDue(nonMatching, now), false);
    });

    it('triggers scheduled message test dispatch immediately', async () => {
      let sentPayload = null;
      const store = new Map();
      store.set('guild:g1:config', {
        automations: {
          scheduledMessages: [
            {
              id: 'sched_test_1',
              name: 'Prueba',
              channelId: '123456789012345678',
              enabled: true,
              type: 'text',
              content: 'Hola {server}',
            },
          ],
        },
      });

      const mockClient = {
        db: {
          get: async (k) => store.get(k) || null,
          set: async (k, v) => store.set(k, v),
        },
        guilds: {
          cache: new Map([
            [
              'g1',
              {
                id: 'g1',
                name: 'Test Server',
                channels: {
                  cache: new Map([
                    [
                      '123456789012345678',
                      {
                        id: '123456789012345678',
                        name: 'general',
                        isTextBased: () => true,
                        send: async (p) => {
                          sentPayload = p;
                          return { id: 'sent_id' };
                        },
                      },
                    ],
                  ]),
                },
              },
            ],
          ]),
        },
      };

      const res = await triggerScheduledMessageNow(mockClient, 'g1', 'sched_test_1');
      assert.strictEqual(res.success, true);
      assert.ok(sentPayload);
      assert.strictEqual(sentPayload.content, 'Hola Test Server');
    });
  });

  describe('Auto-Responder Service Logic', () => {
    it('matches exact trigger text', () => {
      const rule = { trigger: 'ping', matchType: 'exact', caseSensitive: false };
      assert.strictEqual(matchTrigger('ping', rule), true);
      assert.strictEqual(matchTrigger('PING', rule), true);
      assert.strictEqual(matchTrigger('ping bot', rule), false);
    });

    it('matches contains trigger text', () => {
      const rule = { trigger: 'ayuda', matchType: 'contains', caseSensitive: false };
      assert.strictEqual(matchTrigger('necesito ayuda por favor', rule), true);
      assert.strictEqual(matchTrigger('hola mundo', rule), false);
    });

    it('handles regex triggers safely and blocks dangerous patterns (ReDoS)', () => {
      const validRegex = { trigger: '^!help\\s+\\w+', matchType: 'regex' };
      assert.strictEqual(matchTrigger('!help command', validRegex), true);
      assert.strictEqual(matchTrigger('random text', validRegex), false);

      // ReDoS pattern with nested repetition
      const badRegex = { trigger: '(a+)+', matchType: 'regex' };
      assert.strictEqual(matchTrigger('aaaaaaaaaaaa!', badRegex), false);

      // Pattern over 100 characters
      const longRegex = { trigger: 'a'.repeat(105), matchType: 'regex' };
      assert.strictEqual(matchTrigger('a', longRegex), false);
    });

    it('executes auto-responder and enforces channel and role filters', async () => {
      let sentChannel = null;
      let sentDm = null;

      const store = new Map();
      store.set('guild:g1:config', {
        automations: {
          autoResponders: [
            {
              id: 'ar_channel_rule',
              trigger: 'faq',
              matchType: 'contains',
              replyType: 'channel',
              type: 'text',
              content: 'Visita #faq {user}',
              enabled: true,
              allowedChannels: ['123456789012345678'],
              ignoredRoles: ['987654321098765432'],
              cooldownSeconds: 10,
            },
          ],
        },
      });

      const mockClient = {
        db: {
          get: async (k) => store.get(k) || null,
          set: async (k, v) => store.set(k, v),
        },
      };

      // Message in non-allowed channel -> ignored
      const msgWrongChannel = {
        author: { bot: false, id: 'u1' },
        guild: { id: 'g1', name: 'Titan' },
        channel: { id: '234567890123456789', send: async (p) => (sentChannel = p) },
        member: { roles: { cache: new Map() } },
        content: 'dónde está el faq',
      };
      await handleAutoResponders(msgWrongChannel, mockClient);
      assert.strictEqual(sentChannel, null);

      // Message by user with ignored role -> ignored
      const msgIgnoredRole = {
        author: { bot: false, id: 'u1' },
        guild: { id: 'g1', name: 'Titan' },
        channel: { id: '123456789012345678', send: async (p) => (sentChannel = p) },
        member: { roles: { cache: new Map([['987654321098765432', { id: '987654321098765432' }]]) } },
        content: 'dónde está el faq',
      };
      await handleAutoResponders(msgIgnoredRole, mockClient);
      assert.strictEqual(sentChannel, null);

      // Valid message in allowed channel without ignored role -> triggers!
      const msgValid = {
        author: { bot: false, id: 'u1' },
        guild: { id: 'g1', name: 'Titan' },
        channel: { id: '123456789012345678', send: async (p) => (sentChannel = p) },
        member: { roles: { cache: new Map() } },
        content: 'dónde está el faq',
      };
      await handleAutoResponders(msgValid, mockClient);
      assert.ok(sentChannel);
      assert.ok(sentChannel.content.includes('<@u1>'));

      // Immediate second attempt hits cooldown -> not sent again
      sentChannel = null;
      await handleAutoResponders(msgValid, mockClient);
      assert.strictEqual(sentChannel, null);
    });
  });

  describe('Automations API Controller', () => {
    function createMockRes() {
      return {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };
    }

    it('performs CRUD operations for sticky messages', async () => {
      const store = new Map();
      const client = {
        db: {
          get: async (k) => store.get(k) || null,
          set: async (k, v) => store.set(k, v),
        },
      };

      // 1. Get Automations (initially empty)
      const resGet1 = createMockRes();
      await getAutomations({ params: { guildId: 'g1' }, client }, resGet1);
      assert.strictEqual(resGet1.statusCode, 200);
      assert.deepStrictEqual(resGet1.body.data.stickyMessages, []);

      // 2. Create Sticky Message
      const resCreate = createMockRes();
      await createOrUpdateSticky(
        {
          params: { guildId: 'g1' },
          client,
          body: {
            channelId: '123456789012345678',
            content: 'Hello Sticky',
            messageCountThreshold: 4,
          },
        },
        resCreate
      );
      assert.strictEqual(resCreate.statusCode, 200);
      assert.ok(resCreate.body.data.id);
      const createdId = resCreate.body.data.id;

      // 3. Delete Sticky Message
      const resDelete = createMockRes();
      await deleteSticky({ params: { guildId: 'g1', id: createdId }, client }, resDelete);
      assert.strictEqual(resDelete.statusCode, 200);

      // 4. Verify deleted
      const resGet2 = createMockRes();
      await getAutomations({ params: { guildId: 'g1' }, client }, resGet2);
      assert.strictEqual(resGet2.body.data.stickyMessages.length, 0);
    });

    it('performs CRUD operations for scheduled messages', async () => {
      const store = new Map();
      const client = {
        db: {
          get: async (k) => store.get(k) || null,
          set: async (k, v) => store.set(k, v),
        },
      };

      const resCreate = createMockRes();
      await createOrUpdateScheduled(
        {
          params: { guildId: 'g1' },
          client,
          body: {
            name: 'Diario 12:00',
            channelId: '123456789012345678',
            scheduleType: 'daily',
            timeOfDay: '12:00',
          },
        },
        resCreate
      );
      assert.strictEqual(resCreate.statusCode, 200);
      const schedId = resCreate.body.data.id;

      const resDelete = createMockRes();
      await deleteScheduled({ params: { guildId: 'g1', id: schedId }, client }, resDelete);
      assert.strictEqual(resDelete.statusCode, 200);
    });

    it('performs CRUD operations for auto-responders', async () => {
      const store = new Map();
      const client = {
        db: {
          get: async (k) => store.get(k) || null,
          set: async (k, v) => store.set(k, v),
        },
      };

      const resCreate = createMockRes();
      await createOrUpdateAutoResponder(
        {
          params: { guildId: 'g1' },
          client,
          body: {
            trigger: 'soporte',
            matchType: 'contains',
            content: 'Abre un ticket en #tickets',
          },
        },
        resCreate
      );
      assert.strictEqual(resCreate.statusCode, 200);
      const arId = resCreate.body.data.id;

      const resDelete = createMockRes();
      await deleteAutoResponder({ params: { guildId: 'g1', id: arId }, client }, resDelete);
      assert.strictEqual(resDelete.statusCode, 200);
    });
  });
});
