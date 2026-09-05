import {
  getApplicationSettings,
  saveApplicationSettings,
  getApplications,
  getApplication,
  deleteApplication,
} from '../../utils/database.js';
import ApplicationService from '../../services/applicationService.js';
import {
  UpdateApplicationConfigSchema,
  ReviewApplicationSchema,
} from '../../utils/schemas.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/applications
 * Returns application settings and list of submitted applications.
 */
export async function getApplicationData(req, res) {
  try {
    const { guildId } = req.params;
    const { status } = req.query;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    const settings = await getApplicationSettings(req.client, guildId);

    const filterOptions = {};
    if (status && status !== 'all') {
      filterOptions.status = status;
    }

    const rawApplications = await getApplications(req.client, guildId, filterOptions);

    const applications = [];
    for (const app of rawApplications) {
      if (!app || !app.id) continue;

      const member = guild?.members?.cache?.get(app.userId);

      applications.push({
        ...app,
        username: member?.user?.username || `User-${app.userId?.slice(-4)}`,
        displayName:
          member?.displayName ||
          member?.user?.globalName ||
          member?.user?.username ||
          `User-${app.userId?.slice(-4)}`,
        avatar: member?.user?.displayAvatarURL?.({ size: 64 }) || null,
      });
    }

    const appChannel = settings.applicationChannelId
      ? guild?.channels?.cache?.get(settings.applicationChannelId)
      : null;
    const logChannel = settings.logChannelId
      ? guild?.channels?.cache?.get(settings.logChannelId)
      : null;
    const targetRoleId = settings.roles?.accepted || settings.targetRoleId || null;
    const targetRole = targetRoleId ? guild?.roles?.cache?.get(targetRoleId) : null;

    return res.json({
      success: true,
      settings: {
        ...settings,
        targetRoleId,
        applicationChannelName: appChannel?.name || null,
        logChannelName: logChannel?.name || null,
        targetRoleName: targetRole?.name || null,
      },
      applications,
      totalCount: applications.length,
    });
  } catch (error) {
    logger.error('Error fetching application data:', error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to retrieve application data',
    });
  }
}

/**
 * PATCH /api/guilds/:guildId/applications/config
 * Updates questionnaire settings, target role, and channels.
 */
export async function updateApplicationSettingsHandler(req, res) {
  try {
    const { guildId } = req.params;
    const validation = UpdateApplicationConfigSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'ValidationError',
        message: validation.error.errors[0]?.message || 'Invalid application settings',
        issues: validation.error.errors,
      });
    }

    const {
      enabled,
      applicationChannelId,
      logChannelId,
      targetRoleId,
      questions,
      cooldownHours,
    } = validation.data;

    const currentSettings = await getApplicationSettings(req.client, guildId);

    const mergedSettings = {
      ...currentSettings,
      enabled: enabled !== undefined ? enabled : currentSettings.enabled,
      applicationChannelId:
        applicationChannelId !== undefined ? applicationChannelId : currentSettings.applicationChannelId,
      logChannelId: logChannelId !== undefined ? logChannelId : currentSettings.logChannelId,
      questions: Array.isArray(questions) ? questions : currentSettings.questions,
      cooldown: cooldownHours !== undefined ? cooldownHours : currentSettings.cooldown,
      roles: {
        ...(currentSettings.roles || {}),
        accepted: targetRoleId !== undefined ? targetRoleId : currentSettings.roles?.accepted,
      },
    };

    await saveApplicationSettings(req.client, guildId, mergedSettings);

    logger.info(`Application settings updated for guild ${guildId}`);

    return res.json({
      success: true,
      settings: mergedSettings,
    });
  } catch (error) {
    logger.error('Error updating application settings:', error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to update application settings',
    });
  }
}

/**
 * PATCH /api/guilds/:guildId/applications/:appId/review
 * Approves or denies an application, assigning roles when accepted.
 */
export async function reviewApplicationHandler(req, res) {
  try {
    const { guildId, appId } = req.params;
    const validation = ReviewApplicationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'ValidationError',
        message: validation.error.errors[0]?.message || 'Invalid review action',
        issues: validation.error.errors,
      });
    }

    const { action, reason } = validation.data;
    const reviewerId = req.user?.id || 'dashboard-admin';

    const updatedApp = await ApplicationService.reviewApplication(
      req.client,
      guildId,
      appId,
      {
        action,
        reason: reason || 'Reviewed via TitanBot Web Dashboard',
        reviewerId,
      }
    );

    // If approved, attempt to assign the target role to member in Discord
    if (action === 'approve') {
      try {
        const guild = req.guild || req.client?.guilds?.cache?.get(guildId);
        const settings = await getApplicationSettings(req.client, guildId);
        const targetRoleId = settings.roles?.accepted || settings.targetRoleId;

        if (guild && targetRoleId) {
          const member = await guild.members.fetch(updatedApp.userId).catch(() => null);
          if (member) {
            await member.roles.add(targetRoleId, 'Application approved via Web Dashboard').catch((err) => {
              logger.warn(`Could not add approved role ${targetRoleId} to user ${updatedApp.userId}:`, err?.message);
            });
          }
        }
      } catch (roleErr) {
        logger.warn('Non-fatal: failed role assignment on application approval:', roleErr?.message);
      }
    }

    logger.info(`Application ${appId} reviewed: ${action} by ${reviewerId}`);

    return res.json({
      success: true,
      application: updatedApp,
    });
  } catch (error) {
    logger.error(`Error reviewing application ${req.params.appId}:`, error);

    const status = error.statusCode || (error.type === 'VALIDATION' ? 400 : 500);
    return res.status(status).json({
      error: error.name || 'ReviewError',
      message: error.message || 'Failed to review application',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/applications/:appId
 * Removes an application record from the database.
 */
export async function deleteApplicationHandler(req, res) {
  try {
    const { guildId, appId } = req.params;

    const existing = await getApplication(req.client, guildId, appId);
    if (!existing) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Application not found',
      });
    }

    const success = await deleteApplication(req.client, guildId, appId);

    if (!success) {
      return res.status(500).json({
        error: 'InternalError',
        message: 'Failed to delete application',
      });
    }

    logger.info(`Application ${appId} deleted via web dashboard`);

    return res.json({
      success: true,
      message: 'Application deleted successfully',
      appId,
    });
  } catch (error) {
    logger.error(`Error deleting application ${req.params.appId}:`, error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to delete application',
    });
  }
}
