import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
  importSnapshotJson,
  restoreSnapshot,
} from '../../services/snapshots/snapshotService.js';
import { logAuditEvent } from '../../services/audit/auditLogService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/snapshots
 * List all snapshots for a guild with normalized counter properties.
 */
export async function getSnapshots(req, res) {
  try {
    const { guildId } = req.params;
    const rawSnapshots = await listSnapshots(guildId);

    // Normalize counts and author so both new and old properties work seamlessly
    const snapshots = rawSnapshots.map((s) => ({
      ...s,
      rolesCount: s.counts?.roles ?? s.rolesCount ?? 0,
      categoriesCount: s.counts?.categories ?? s.categoriesCount ?? 0,
      channelsCount: s.counts?.channels ?? s.channelsCount ?? 0,
      counts: {
        roles: s.counts?.roles ?? s.rolesCount ?? 0,
        categories: s.counts?.categories ?? s.categoriesCount ?? 0,
        channels: s.counts?.channels ?? s.channelsCount ?? 0,
      },
      author: s.createdBy || s.author || { id: '0', tag: 'System' },
      createdBy: s.createdBy || s.author || { id: '0', tag: 'System' },
    }));

    return res.json({
      success: true,
      snapshots,
    });
  } catch (error) {
    logger.error('Error listing snapshots:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Error al listar las instantáneas del servidor.',
    });
  }
}

/**
 * GET /api/guilds/:guildId/snapshots/:id
 * Retrieve full details of a single snapshot.
 */
export async function getSnapshotDetailHandler(req, res) {
  try {
    const { guildId, id } = req.params;
    const snapshot = await getSnapshot(guildId, id);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Instantánea no encontrada.',
      });
    }

    return res.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    logger.error('Error fetching snapshot detail:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Error al obtener los detalles de la instantánea.',
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
        message: 'Servidor de Discord no encontrado o no disponible.',
      });
    }

    const { name } = req.body || {};
    const author = req.user ? { id: req.user.id, tag: req.user.username } : null;

    const snapshot = await createSnapshot(guild, author, name);

    // Audit log
    await logAuditEvent({
      guildId: guild.id,
      user: req.user,
      action: 'SNAPSHOT_CREATE',
      category: 'security',
      details: `Creó la instantánea de servidor "${snapshot.name}" (${snapshot.counts?.roles || 0} roles, ${snapshot.counts?.categories || 0} categorías, ${snapshot.counts?.channels || 0} canales)`,
      metadata: {
        snapshotId: snapshot.id,
        name: snapshot.name,
        counts: snapshot.counts,
      },
      ip: req.ip,
    }).catch((auditErr) => logger.warn('Failed to write audit log for snapshot create:', auditErr));

    return res.json({
      success: true,
      snapshot,
      message: 'Instantánea de servidor creada exitosamente.',
    });
  } catch (error) {
    logger.error('Error creating snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Error al crear la instantánea del servidor.',
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
        message: 'Instantánea no encontrada.',
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
      message: error.message || 'Error al exportar el archivo JSON de la instantánea.',
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

    // Audit log
    await logAuditEvent({
      guildId,
      user: req.user,
      action: 'SNAPSHOT_IMPORT',
      category: 'security',
      details: `Importó la instantánea de servidor "${imported.name}" (${imported.counts?.roles || 0} roles, ${imported.counts?.categories || 0} categorías, ${imported.counts?.channels || 0} canales)`,
      metadata: {
        snapshotId: imported.id,
        name: imported.name,
        counts: imported.counts,
      },
      ip: req.ip,
    }).catch((auditErr) => logger.warn('Failed to write audit log for snapshot import:', auditErr));

    return res.json({
      success: true,
      snapshot: imported,
      message: 'Instantánea importada exitosamente.',
    });
  } catch (error) {
    logger.error('Error importing snapshot JSON:', error);
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message || 'Error al importar el archivo JSON de la instantánea.',
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
        message: 'Servidor de Discord no encontrado.',
      });
    }

    const result = await restoreSnapshot(guild, id, { mode });

    // Audit log
    await logAuditEvent({
      guildId: guild.id,
      user: req.user,
      action: 'SNAPSHOT_RESTORE',
      category: 'security',
      details: `Restauró el servidor con la instantánea "${id}" en modo ${mode === 'full_replace' ? 'Full Replace (Destructivo)' : 'Safe Sync'}`,
      metadata: {
        snapshotId: id,
        mode,
        counts: result.counts,
      },
      ip: req.ip,
    }).catch((auditErr) => logger.warn('Failed to write audit log for snapshot restore:', auditErr));

    return res.json({
      success: true,
      ...result,
      message: `Servidor restaurado exitosamente (${mode === 'full_replace' ? 'Full Replace' : 'Safe Sync'}).`,
    });
  } catch (error) {
    logger.error('Error restoring snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Error al restaurar la instantánea.',
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
        message: 'Instantánea no encontrada.',
      });
    }

    await deleteSnapshot(guildId, id);

    // Audit log
    await logAuditEvent({
      guildId,
      user: req.user,
      action: 'SNAPSHOT_DELETE',
      category: 'security',
      details: `Eliminó la instantánea "${existing.name || id}"`,
      metadata: {
        snapshotId: id,
        name: existing.name,
      },
      ip: req.ip,
    }).catch((auditErr) => logger.warn('Failed to write audit log for snapshot delete:', auditErr));

    return res.json({
      success: true,
      message: 'Instantánea eliminada exitosamente.',
    });
  } catch (error) {
    logger.error('Error deleting snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Error al eliminar la instantánea.',
    });
  }
}
