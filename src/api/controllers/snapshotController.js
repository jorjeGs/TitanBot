import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
  importSnapshotJson,
  restoreSnapshot,
} from '../../services/snapshots/snapshotService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/snapshots
 * List all snapshots for a guild.
 */
export async function getSnapshots(req, res) {
  try {
    const { guildId } = req.params;
    const snapshots = await listSnapshots(guildId);

    return res.json({
      success: true,
      snapshots,
    });
  } catch (error) {
    logger.error('Error listing snapshots:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to list snapshots.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/snapshots
 * Capture a new snapshot of the guild.
 */
export async function createSnapshotHandler(req, res) {
  try {
    const guild = req.guild;
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Guild not found.',
      });
    }

    const { name } = req.body || {};
    const author = req.user ? { id: req.user.id, tag: req.user.username } : null;

    const snapshot = await createSnapshot(guild, author, name);

    return res.json({
      success: true,
      snapshot,
      message: 'Server snapshot created successfully.',
    });
  } catch (error) {
    logger.error('Error creating snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to create server snapshot.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/snapshots/:id/export
 * Download snapshot as JSON.
 */
export async function exportSnapshotJson(req, res) {
  try {
    const { guildId, id } = req.params;
    const snapshot = await getSnapshot(guildId, id);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Snapshot not found.',
      });
    }

    const safeName = String(snapshot.name || id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const jsonString = JSON.stringify(snapshot, null, 2);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="snapshot-${safeName}.json"`);
    return res.send(jsonString);
  } catch (error) {
    logger.error('Error exporting snapshot JSON:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to export snapshot JSON.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/snapshots/import
 * Import snapshot from JSON.
 */
export async function importSnapshotHandler(req, res) {
  try {
    const { guildId } = req.params;
    const author = req.user ? { id: req.user.id, tag: req.user.username } : null;

    const imported = await importSnapshotJson(guildId, req.body, author);

    return res.json({
      success: true,
      snapshot: imported,
      message: 'Snapshot imported successfully.',
    });
  } catch (error) {
    logger.error('Error importing snapshot JSON:', error);
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message || 'Failed to import snapshot JSON.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/snapshots/:id/restore
 * Restore guild roles, channels and permissions from snapshot.
 */
export async function restoreSnapshotHandler(req, res) {
  try {
    const guild = req.guild;
    const { id } = req.params;
    const { mode = 'safe_sync' } = req.body || {};

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Guild not found.',
      });
    }

    const result = await restoreSnapshot(guild, id, { mode });

    return res.json({
      success: true,
      ...result,
      message: `Snapshot restored successfully (${mode === 'full_replace' ? 'Full Replace' : 'Safe Sync'}).`,
    });
  } catch (error) {
    logger.error('Error restoring snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to restore snapshot.',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/snapshots/:id
 * Delete a snapshot by ID.
 */
export async function deleteSnapshotHandler(req, res) {
  try {
    const { guildId, id } = req.params;
    const existing = await getSnapshot(guildId, id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Snapshot not found.',
      });
    }

    await deleteSnapshot(guildId, id);

    return res.json({
      success: true,
      message: 'Snapshot deleted successfully.',
    });
  } catch (error) {
    logger.error('Error deleting snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to delete snapshot.',
    });
  }
}
