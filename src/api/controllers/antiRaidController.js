import {
  getAntiRaidConfig,
  updateAntiRaidConfig,
  toggleEmergencyLockdown,
} from '../../services/security/antiRaidService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/antiraid
 * Retrieve Anti-Raid settings and status.
 */
export async function getAntiRaidSettings(req, res) {
  try {
    const { guildId } = req.params;
    const config = await getAntiRaidConfig(guildId);

    return res.json({
      success: true,
      antiRaid: config,
    });
  } catch (error) {
    logger.error('Error fetching Anti-Raid settings:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to fetch Anti-Raid settings.',
    });
  }
}

/**
 * PATCH /api/guilds/:guildId/antiraid
 * Update Anti-Raid settings.
 */
export async function updateAntiRaidSettings(req, res) {
  try {
    const { guildId } = req.params;
    const updated = await updateAntiRaidConfig(guildId, req.body);

    return res.json({
      success: true,
      antiRaid: updated,
      message: 'Anti-Raid settings updated successfully.',
    });
  } catch (error) {
    logger.error('Error updating Anti-Raid settings:', error);
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message || 'Invalid Anti-Raid payload.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/antiraid/lockdown/toggle
 * Trigger or lift emergency lockdown on channels.
 */
export async function toggleEmergencyLockdownHandler(req, res) {
  try {
    const { guildId } = req.params;
    const { active } = req.body || {};

    const forceState = typeof active === 'boolean' ? active : null;
    const result = await toggleEmergencyLockdown(guildId, req.client, forceState);

    return res.json({
      success: true,
      ...result,
      message: result.isLockdownActive
        ? 'Emergency lockdown activated successfully.'
        : 'Emergency lockdown lifted successfully.',
    });
  } catch (error) {
    logger.error('Error toggling emergency lockdown:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to toggle emergency lockdown.',
    });
  }
}
