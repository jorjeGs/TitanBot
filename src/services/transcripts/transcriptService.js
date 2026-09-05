import crypto from 'node:crypto';
import { db, getFromDb } from '../../utils/database/wrapper.js';
import { getTranscriptKey, getTranscriptsIndexKey } from '../../utils/database/keys.js';
import { TicketTranscriptSchema } from '../../utils/schemas.js';
import { logger } from '../../utils/logger.js';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDiscordTimestamp(isoString) {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

/**
 * Renders formatted Discord message content with basic Markdown support.
 */
function renderMarkdown(content) {
  if (!content) return '';
  let escaped = escapeHtml(content);

  // Code blocks: ```lang\ncode\n```
  escaped = escaped.replace(/```(?:([a-zA-Z0-9_-]+)\n)?([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre class="discord-pre"><code class="${lang ? `language-${lang}` : ''}">${code.trim()}</code></pre>`;
  });

  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="discord-inline-code">$1</code>');

  // Bold: **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italics: *text* or _text_
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  escaped = escaped.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Newlines to <br>
  escaped = escaped.replace(/\n/g, '<br>');

  return escaped;
}

/**
 * Compiles a rich standalone HTML document styled like Discord Dark theme.
 */
export function renderStandaloneHtml(transcript) {
  const safeTitle = escapeHtml(transcript.title || `Ticket #${transcript.ticketNumber}`);
  const safeReason = escapeHtml(transcript.closeReason || 'Ticket closed');
  const safeCreator = escapeHtml(transcript.ticketCreatorTag || 'Unknown');
  const safeCloser = escapeHtml(transcript.closedByTag || 'System');

  const renderedMessages = (transcript.messages || []).map((msg) => {
    const author = msg.author || {};
    const safeAuthor = escapeHtml(author.username || 'Unknown');
    const avatar = author.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const isBot = Boolean(author.bot);
    const ts = formatDiscordTimestamp(msg.createdAt);
    const contentHtml = renderMarkdown(msg.content);

    // Embeds
    const embedsHtml = (msg.embeds || []).map((emb) => {
      const color = emb.color ? `#${Number(emb.color).toString(16).padStart(6, '0')}` : '#5865f2';
      const title = emb.title ? `<div class="embed-title">${escapeHtml(emb.title)}</div>` : '';
      const desc = emb.description ? `<div class="embed-desc">${renderMarkdown(emb.description)}</div>` : '';
      const fields = (emb.fields || []).map((f) => `
        <div class="embed-field ${f.inline ? 'inline' : ''}">
          <div class="embed-field-name">${escapeHtml(f.name)}</div>
          <div class="embed-field-val">${renderMarkdown(f.value)}</div>
        </div>
      `).join('');

      return `
        <div class="discord-embed" style="border-left-color: ${color}">
          ${title}
          ${desc}
          ${fields ? `<div class="embed-fields">${fields}</div>` : ''}
        </div>
      `;
    }).join('');

    // Attachments
    const attachmentsHtml = (msg.attachments || []).map((att) => {
      const isImg = att.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(att.name || '');
      if (isImg) {
        return `<div class="discord-attachment"><img src="${escapeHtml(att.url)}" alt="${escapeHtml(att.name)}" loading="lazy" /></div>`;
      }
      return `
        <div class="discord-file-attachment">
          <span class="file-icon">📎</span>
          <a href="${escapeHtml(att.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(att.name)}</a>
        </div>
      `;
    }).join('');

    return `
      <div class="discord-msg" id="msg-${msg.id}">
        <img class="discord-avatar" src="${escapeHtml(avatar)}" alt="${safeAuthor}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png';" />
        <div class="discord-msg-content">
          <div class="discord-msg-header">
            <span class="discord-author">${safeAuthor}</span>
            ${isBot ? '<span class="discord-bot-badge">BOT</span>' : ''}
            <span class="discord-timestamp">${ts}</span>
          </div>
          ${contentHtml ? `<div class="discord-text">${contentHtml}</div>` : ''}
          ${embedsHtml}
          ${attachmentsHtml}
        </div>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} – Transcript</title>
  <style>
    :root {
      --bg-primary: #313338;
      --bg-secondary: #2b2d31;
      --bg-tertiary: #1e1f22;
      --header-primary: #f2f3f5;
      --header-secondary: #b5bac1;
      --text-normal: #dbdee1;
      --text-muted: #949ba4;
      --brand: #5865f2;
      --border: #3f4147;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      color: var(--text-normal);
      font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.375;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .transcript-header {
      background-color: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left h1 {
      font-size: 18px;
      font-weight: 700;
      color: var(--header-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-meta {
      display: flex;
      gap: 16px;
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }
    .header-meta span strong {
      color: var(--header-secondary);
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      background-color: var(--brand);
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover { background-color: #4752c4; }
    .chat-container {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 20px;
      flex: 1;
    }
    .discord-msg {
      display: flex;
      gap: 16px;
      padding: 8px 12px;
      border-radius: 6px;
      transition: background-color 0.1s;
    }
    .discord-msg:hover {
      background-color: #2e3035;
    }
    .discord-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      object-fit: cover;
      background-color: var(--bg-tertiary);
    }
    .discord-msg-content {
      flex: 1;
      min-width: 0;
    }
    .discord-msg-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }
    .discord-author {
      font-weight: 600;
      color: var(--header-primary);
      font-size: 15px;
    }
    .discord-bot-badge {
      background-color: var(--brand);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      vertical-align: middle;
    }
    .discord-timestamp {
      font-size: 11px;
      color: var(--text-muted);
    }
    .discord-text {
      color: var(--text-normal);
      word-break: break-word;
      white-space: pre-wrap;
    }
    .discord-inline-code {
      background-color: var(--bg-tertiary);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 85%;
    }
    .discord-pre {
      background-color: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px 12px;
      margin-top: 6px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 13px;
    }
    .discord-embed {
      background-color: var(--bg-secondary);
      border-left: 4px solid var(--brand);
      border-radius: 4px;
      padding: 12px 16px;
      margin-top: 8px;
      max-width: 520px;
    }
    .embed-title {
      font-weight: 700;
      color: var(--header-primary);
      margin-bottom: 6px;
      font-size: 14px;
    }
    .embed-desc {
      font-size: 13px;
      color: var(--text-normal);
      margin-bottom: 8px;
    }
    .embed-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 6px;
    }
    .embed-field {
      flex: 1 1 100%;
    }
    .embed-field.inline {
      flex: 1 1 45%;
    }
    .embed-field-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--header-secondary);
      margin-bottom: 2px;
    }
    .embed-field-val {
      font-size: 12px;
      color: var(--text-normal);
    }
    .discord-attachment img {
      max-width: 420px;
      max-height: 360px;
      border-radius: 6px;
      margin-top: 6px;
      display: block;
    }
    .discord-file-attachment {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border);
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 6px;
    }
    .discord-file-attachment a {
      color: #00a8fc;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }
    .discord-file-attachment a:hover { text-decoration: underline; }
    .transcript-footer {
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border);
      background-color: var(--bg-tertiary);
      margin-top: 32px;
    }
    @media print {
      .transcript-header { position: static; }
      .header-actions { display: none; }
      body { background-color: #fff; color: #000; }
      .discord-msg { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header class="transcript-header">
    <div class="header-left">
      <h1>📜 ${safeTitle}</h1>
      <div class="header-meta">
        <span><strong>Creator:</strong> ${safeCreator}</span>
        <span><strong>Closed by:</strong> ${safeCloser}</span>
        <span><strong>Reason:</strong> ${safeReason}</span>
        <span><strong>Messages:</strong> ${transcript.messageCount || 0}</span>
        <span><strong>Closed At:</strong> ${formatDiscordTimestamp(transcript.closedAt)}</span>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn" onclick="window.print()">🖨️ Print / PDF</button>
    </div>
  </header>

  <main class="chat-container">
    ${renderedMessages || '<p style="color:var(--text-muted);text-align:center;padding:32px;">No messages recorded in this ticket.</p>'}
  </main>

  <footer class="transcript-footer">
    Generated by TitanBot • ${new Date(transcript.closedAt || Date.now()).toUTCString()}
  </footer>
</body>
</html>`;
}

/**
 * Fetches all messages from a Discord ticket channel and builds a rich transcript.
 */
export async function captureChannelTranscript(channel, options = {}) {
  const { closedBy = null, closeReason = 'Ticket closed', ticketData = null, client = null } = options;
  const guildId = channel?.guild?.id;

  if (!guildId || !channel?.id) {
    throw new Error('Invalid channel provided to captureChannelTranscript');
  }

  logger.info('Capturing channel transcript', {
    guildId,
    channelId: channel.id,
    channelName: channel.name,
  });

  const rawMessages = [];

  if (channel.messages && typeof channel.messages.fetch === 'function') {
    try {
      let before = undefined;
      let batch;
      let iterations = 0;
      const MAX_BATCHES = 15; // Max 1,500 messages per ticket transcript to prevent memory spikes

      do {
        batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
        if (!batch || batch.size === 0) break;

        const values = Array.from(batch.values ? batch.values() : batch);
        rawMessages.push(...values);
        before = values[values.length - 1]?.id;
        iterations += 1;
      } while (batch.size === 100 && iterations < MAX_BATCHES);
    } catch (fetchErr) {
      logger.warn('Failed to fetch complete message history for transcript:', fetchErr);
    }
  }

  // Sort chronological ascending
  rawMessages.sort((a, b) => {
    const timeA = a.createdTimestamp || new Date(a.createdAt).getTime() || 0;
    const timeB = b.createdTimestamp || new Date(b.createdAt).getTime() || 0;
    return timeA - timeB;
  });

  const normalizedMessages = rawMessages.map((msg) => {
    const author = msg.author || {};
    const avatar = typeof author.displayAvatarURL === 'function'
      ? author.displayAvatarURL({ size: 64, extension: 'png' })
      : (author.avatarUrl || null);

    const attachments = [];
    if (msg.attachments) {
      const attValues = Array.from(msg.attachments.values ? msg.attachments.values() : msg.attachments);
      for (const att of attValues) {
        attachments.push({
          id: String(att.id || crypto.randomUUID()),
          name: String(att.name || 'attachment'),
          url: String(att.url || att.proxyURL || ''),
          size: Number(att.size || 0),
          contentType: att.contentType || null,
        });
      }
    }

    const embeds = [];
    if (Array.isArray(msg.embeds)) {
      for (const emb of msg.embeds) {
        embeds.push({
          title: emb.title || null,
          description: emb.description || null,
          color: emb.color != null ? emb.color : null,
          fields: Array.isArray(emb.fields) ? emb.fields : [],
          footer: emb.footer?.text ? { text: emb.footer.text } : null,
        });
      }
    }

    return {
      id: String(msg.id || crypto.randomUUID()),
      author: {
        id: String(author.id || '0'),
        username: String(author.username || author.tag || 'Unknown'),
        discriminator: author.discriminator || undefined,
        avatarUrl: avatar,
        bot: Boolean(author.bot),
      },
      content: String(msg.content || ''),
      embeds,
      attachments,
      createdAt: new Date(msg.createdTimestamp || msg.createdAt || Date.now()).toISOString(),
      pinned: Boolean(msg.pinned),
    };
  });

  const transcriptId = crypto.randomUUID();
  const viewToken = crypto.randomBytes(24).toString('hex');
  const ticketNum = ticketData?.id || channel.name?.replace(/[^0-9]/g, '') || '001';

  const transcriptRecord = {
    id: transcriptId,
    guildId,
    channelId: channel.id,
    ticketNumber: ticketNum,
    title: `Ticket #${ticketNum}`,
    ticketCreatorId: ticketData?.userId || (rawMessages[0]?.author?.id) || '000000000000000000',
    ticketCreatorTag: ticketData?.userTag || ticketData?.username || rawMessages[0]?.author?.tag || 'Unknown',
    closedById: closedBy?.id || null,
    closedByTag: closedBy?.tag || closedBy?.username || 'System',
    closeReason: closeReason || 'Ticket closed',
    createdAt: ticketData?.createdAt || new Date(channel.createdTimestamp || Date.now()).toISOString(),
    closedAt: new Date().toISOString(),
    messageCount: normalizedMessages.length,
    viewToken,
    messages: normalizedMessages,
  };

  const parsed = TicketTranscriptSchema.parse(transcriptRecord);
  const html = renderStandaloneHtml(parsed);

  // Persist transcript record
  if (!db.initialized) {
    await db.initialize();
  }

  const transcriptKey = getTranscriptKey(guildId, transcriptId);
  await db.set(transcriptKey, parsed);
  await db.set(`transcript_lookup:${transcriptId}`, guildId);

  // Update Guild Transcripts Index (store summary for fast list queries, max 100)
  const indexKey = getTranscriptsIndexKey(guildId);
  const existingIndex = (await getFromDb(indexKey, [])) || [];

  const summaryItem = {
    id: transcriptId,
    ticketNumber: ticketNum,
    title: parsed.title,
    ticketCreatorId: parsed.ticketCreatorId,
    ticketCreatorTag: parsed.ticketCreatorTag,
    closedById: parsed.closedById,
    closedByTag: parsed.closedByTag,
    closeReason: parsed.closeReason,
    createdAt: parsed.createdAt,
    closedAt: parsed.closedAt,
    messageCount: parsed.messageCount,
    viewToken,
  };

  const updatedIndex = [summaryItem, ...existingIndex.filter((item) => item.id !== transcriptId)].slice(0, 100);
  await db.set(indexKey, updatedIndex);

  logger.info('Saved ticket transcript to database', {
    guildId,
    transcriptId,
    messageCount: parsed.messageCount,
  });

  return {
    transcript: parsed,
    html,
    viewToken,
  };
}

/**
 * Retrieves list of transcripts for a guild with optional search and pagination.
 */
export async function getGuildTranscripts(guildId, options = {}) {
  const { limit = 50, offset = 0, search = '' } = options;

  if (!db.initialized) {
    await db.initialize();
  }

  const indexKey = getTranscriptsIndexKey(guildId);
  const index = (await getFromDb(indexKey, [])) || [];

  let filtered = index;
  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    filtered = index.filter((t) =>
      String(t.ticketNumber).toLowerCase().includes(q) ||
      String(t.ticketCreatorTag || '').toLowerCase().includes(q) ||
      String(t.closedByTag || '').toLowerCase().includes(q) ||
      String(t.closeReason || '').toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    total,
    transcripts: paginated,
  };
}

/**
 * Retrieves full transcript details by ID.
 */
export async function getTranscriptById(guildId, transcriptId) {
  if (!db.initialized) {
    await db.initialize();
  }

  const key = getTranscriptKey(guildId, transcriptId);
  return await db.get(key);
}

/**
 * Validates a viewToken for a public transcript view.
 */
export async function validateViewToken(guildId, transcriptId, token) {
  if (!token) return false;
  const transcript = await getTranscriptById(guildId, transcriptId);
  if (!transcript || !transcript.viewToken) return false;
  return transcript.viewToken === token;
}

/**
 * Resolves the guildId associated with a transcriptId.
 */
export async function resolveTranscriptGuild(transcriptId) {
  if (!db.initialized) {
    await db.initialize();
  }
  return await db.get(`transcript_lookup:${transcriptId}`);
}

/**
 * Deletes a transcript from database and removes it from the guild index.
 */
export async function deleteTranscript(guildId, transcriptId) {
  if (!db.initialized) {
    await db.initialize();
  }

  const key = getTranscriptKey(guildId, transcriptId);
  await db.delete(key);
  await db.delete(`transcript_lookup:${transcriptId}`);

  const indexKey = getTranscriptsIndexKey(guildId);
  const index = (await getFromDb(indexKey, [])) || [];
  const updatedIndex = index.filter((item) => item.id !== transcriptId);
  await db.set(indexKey, updatedIndex);

  return true;
}
