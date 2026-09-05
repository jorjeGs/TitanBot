import {
  getGuildTranscripts,
  getTranscriptById,
  deleteTranscript,
  renderStandaloneHtml,
  validateViewToken,
  resolveTranscriptGuild,
} from '../../services/transcripts/transcriptService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/transcripts
 * List paginated transcripts for a guild.
 */
export async function getTranscripts(req, res) {
  try {
    const { guildId } = req.params;
    const { limit = 50, offset = 0, search = '' } = req.query;

    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    const result = await getGuildTranscripts(guildId, {
      limit: parsedLimit,
      offset: parsedOffset,
      search: String(search || ''),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching guild transcripts:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch transcripts.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/transcripts/:id
 * Retrieve transcript JSON details.
 */
export async function getTranscriptDetail(req, res) {
  try {
    const { guildId, id } = req.params;
    const transcript = await getTranscriptById(guildId, id);

    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transcript not found.',
      });
    }

    return res.json({
      success: true,
      transcript,
    });
  } catch (error) {
    logger.error('Error fetching transcript details:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch transcript details.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/transcripts/:id/download
 * Download standalone HTML file.
 */
export async function downloadTranscriptHtml(req, res) {
  try {
    const { guildId, id } = req.params;
    const transcript = await getTranscriptById(guildId, id);

    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transcript not found.',
      });
    }

    const html = renderStandaloneHtml(transcript);
    const safeTicketNum = String(transcript.ticketNumber || id).replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transcript-ticket-${safeTicketNum}.html"`);
    return res.send(html);
  } catch (error) {
    logger.error('Error downloading transcript HTML:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to download transcript HTML.',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/transcripts/:id
 * Delete transcript by ID.
 */
export async function deleteTranscriptHandler(req, res) {
  try {
    const { guildId, id } = req.params;
    const existing = await getTranscriptById(guildId, id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transcript not found.',
      });
    }

    await deleteTranscript(guildId, id);

    return res.json({
      success: true,
      message: 'Transcript deleted successfully.',
    });
  } catch (error) {
    logger.error('Error deleting transcript:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to delete transcript.',
    });
  }
}

/**
 * GET /api/transcripts/:id
 * Public view of transcript via signed viewToken.
 */
export async function getPublicTranscript(req, res) {
  try {
    const { id } = req.params;
    const { token, guildId: queryGuildId, format } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'A valid view token is required to view this transcript.',
      });
    }

    const guildId = queryGuildId || (await resolveTranscriptGuild(id));
    if (!guildId) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transcript not found or expired.',
      });
    }

    const isValid = await validateViewToken(guildId, id, token);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid or expired view token.',
      });
    }

    const transcript = await getTranscriptById(guildId, id);
    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Transcript not found.',
      });
    }

    if (format === 'json') {
      return res.json({
        success: true,
        transcript,
      });
    }

    const html = renderStandaloneHtml(transcript);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    logger.error('Error serving public transcript:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to load transcript.',
    });
  }
}
