import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureChannelTranscript,
  renderStandaloneHtml,
  getGuildTranscripts,
  getTranscriptById,
  deleteTranscript,
  validateViewToken,
  resolveTranscriptGuild,
} from '../../src/services/transcripts/transcriptService.js';
import { TicketTranscriptSchema } from '../../src/utils/schemas.js';
import { db } from '../../src/utils/database/wrapper.js';

test('Ticket Web Transcripts (Sub-project B)', async (t) => {
  if (!db.initialized) {
    await db.initialize();
  }

  const mockGuildId = '123456789012345678';
  const mockChannelId = '234567890123456789';

  await t.test('TicketTranscriptSchema validation', () => {
    const valid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      guildId: mockGuildId,
      channelId: mockChannelId,
      ticketNumber: '042',
      title: 'Ticket #042',
      ticketCreatorId: '345678901234567890',
      ticketCreatorTag: 'TestUser#1234',
      closedById: '456789012345678901',
      closedByTag: 'StaffMod#0001',
      closeReason: 'Resolved by support',
      createdAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      messageCount: 2,
      viewToken: 'abcdef1234567890',
      messages: [
        {
          id: '111222333444555666',
          author: {
            id: '345678901234567890',
            username: 'TestUser',
            bot: false,
          },
          content: 'Hello, I need help with my account!',
          embeds: [],
          attachments: [],
          createdAt: new Date().toISOString(),
          pinned: false,
        },
      ],
    };

    const parsed = TicketTranscriptSchema.safeParse(valid);
    assert.equal(parsed.success, true);

    const invalid = { ...valid, guildId: 'short' };
    const parsedInvalid = TicketTranscriptSchema.safeParse(invalid);
    assert.equal(parsedInvalid.success, false);
  });

  await t.test('renderStandaloneHtml produces rich Discord Dark theme document', () => {
    const transcript = {
      id: 'sample-transcript-id',
      ticketNumber: '007',
      title: 'Ticket #007',
      ticketCreatorTag: 'Alice',
      closedByTag: 'BobStaff',
      closeReason: 'Solved problem',
      closedAt: '2026-09-05T12:00:00.000Z',
      messageCount: 2,
      messages: [
        {
          id: 'msg-1',
          author: { id: 'u1', username: 'Alice', bot: false, avatarUrl: 'https://example.com/alice.png' },
          content: 'Here is **bold** text and `inline code` with ```js\nconsole.log(123);\n```',
          embeds: [
            {
              title: 'Embed Title',
              description: 'Embed Description',
              color: 0x5865f2,
              fields: [{ name: 'Field 1', value: 'Val 1', inline: true }],
            },
          ],
          attachments: [
            { id: 'att-1', name: 'screenshot.png', url: 'https://example.com/img.png', contentType: 'image/png' },
          ],
          createdAt: '2026-09-05T11:55:00.000Z',
        },
        {
          id: 'msg-2',
          author: { id: 'u2', username: 'TitanBot', bot: true, avatarUrl: null },
          content: 'Ticket closed by staff.',
          embeds: [],
          attachments: [],
          createdAt: '2026-09-05T12:00:00.000Z',
        },
      ],
    };

    const html = renderStandaloneHtml(transcript);
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Ticket #007'));
    assert.ok(html.includes('Alice'));
    assert.ok(html.includes('BobStaff'));
    assert.ok(html.includes('<strong>bold</strong>'));
    assert.ok(html.includes('<code class="discord-inline-code">inline code</code>'));
    assert.ok(html.includes('console.log(123);'));
    assert.ok(html.includes('discord-bot-badge'));
    assert.ok(html.includes('discord-embed'));
    assert.ok(html.includes('screenshot.png'));
  });

  await t.test('captureChannelTranscript fetches messages, saves to DB and returns view token', async () => {
    const mockMessages = [
      {
        id: 'msg-101',
        author: { id: '345678901234567890', username: 'User1', bot: false },
        content: 'Initial ticket opening message',
        embeds: [],
        attachments: [],
        createdTimestamp: 1700000000000,
      },
      {
        id: 'msg-102',
        author: { id: '456789012345678901', username: 'Staff1', bot: false },
        content: 'Staff responding to ticket',
        embeds: [],
        attachments: [],
        createdTimestamp: 1700000060000,
      },
    ];

    const mockChannel = {
      id: mockChannelId,
      name: 'ticket-042',
      guild: { id: mockGuildId, name: 'Test Guild' },
      messages: {
        fetch: async () => {
          return {
            size: mockMessages.length,
            values: () => mockMessages,
          };
        },
      },
    };

    const result = await captureChannelTranscript(mockChannel, {
      closedBy: { id: '456789012345678901', username: 'Staff1' },
      closeReason: 'Inquiry resolved',
      ticketData: { id: '042', userId: '345678901234567890', userTag: 'User1' },
    });

    assert.ok(result.transcript);
    assert.ok(result.transcript.id);
    assert.equal(result.transcript.ticketNumber, '042');
    assert.equal(result.transcript.messageCount, 2);
    assert.ok(result.html.includes('Ticket #042'));
    assert.ok(result.viewToken);

    // Verify lookup index
    const resolvedGuild = await resolveTranscriptGuild(result.transcript.id);
    assert.equal(resolvedGuild, mockGuildId);

    // Verify retrieval by ID
    const fetched = await getTranscriptById(mockGuildId, result.transcript.id);
    assert.equal(fetched.id, result.transcript.id);
    assert.equal(fetched.messages.length, 2);

    // Verify list queries
    const list = await getGuildTranscripts(mockGuildId);
    assert.ok(list.total >= 1);
    assert.ok(list.transcripts.some((t) => t.id === result.transcript.id));

    // Verify search
    const searched = await getGuildTranscripts(mockGuildId, { search: '042' });
    assert.ok(searched.transcripts.some((t) => t.id === result.transcript.id));

    // Verify view token validation
    const validToken = await validateViewToken(mockGuildId, result.transcript.id, result.viewToken);
    assert.equal(validToken, true);

    const invalidToken = await validateViewToken(mockGuildId, result.transcript.id, 'wrong-token');
    assert.equal(invalidToken, false);

    // Verify deletion
    await deleteTranscript(mockGuildId, result.transcript.id);
    const afterDelete = await getTranscriptById(mockGuildId, result.transcript.id);
    assert.equal(afterDelete, null);
  });
});
