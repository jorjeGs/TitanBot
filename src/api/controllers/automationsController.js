// automationsController.js — API Controller for sticky messages, scheduled messages, and auto-responders
import { getGuildConfig, updateGuildConfig } from '../../services/config/guildConfig.js';
import {
  StickyMessageSchema,
  ScheduledMessageSchema,
  AutoResponderSchema,
} from '../../utils/schemas.js';
import { triggerScheduledMessageNow } from '../../services/automations/scheduledMessageService.js';
import { logger } from '../../utils/logger.js';

function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * GET /api/guilds/:guildId/automations
 */
export async function getAutomations(req, res) {
  try {
    const { guildId } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);

    const automations = guildConfig?.automations || {
      stickyMessages: [],
      scheduledMessages: [],
      autoResponders: [],
    };

    return res.json({
      success: true,
      data: {
        stickyMessages: automations.stickyMessages || [],
        scheduledMessages: automations.scheduledMessages || [],
        autoResponders: automations.autoResponders || [],
      },
    });
  } catch (error) {
    logger.error('Error in getAutomations:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/automations/sticky
 */
export async function createOrUpdateSticky(req, res) {
  try {
    const { guildId } = req.params;
    const body = req.body || {};

    const rawItem = {
      ...body,
      id: body.id || generateId('sticky'),
    };

    const parsed = StickyMessageSchema.safeParse(rawItem);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Invalid sticky message payload',
      });
    }

    const guildConfig = await getGuildConfig(req.client, guildId);
    const existingList = guildConfig?.automations?.stickyMessages || [];

    const index = existingList.findIndex((item) => item.id === parsed.data.id);
    let updatedList;
    if (index >= 0) {
      updatedList = [...existingList];
      updatedList[index] = { ...existingList[index], ...parsed.data };
    } else {
      updatedList = [...existingList, parsed.data];
    }

    await updateGuildConfig(req.client, guildId, {
      automations: {
        ...guildConfig?.automations,
        stickyMessages: updatedList,
      },
    });

    return res.json({ success: true, data: parsed.data });
  } catch (error) {
    logger.error('Error in createOrUpdateSticky:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/guilds/:guildId/automations/sticky/:id
 */
export async function deleteSticky(req, res) {
  try {
    const { guildId, id } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);
    const existingList = guildConfig?.automations?.stickyMessages || [];

    const updatedList = existingList.filter((item) => item.id !== id);
    if (updatedList.length === existingList.length) {
      return res.status(404).json({ success: false, error: 'Sticky message not found' });
    }

    await updateGuildConfig(req.client, guildId, {
      automations: {
        ...guildConfig?.automations,
        stickyMessages: updatedList,
      },
    });

    return res.json({ success: true, message: 'Sticky message deleted' });
  } catch (error) {
    logger.error('Error in deleteSticky:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/automations/scheduled
 */
export async function createOrUpdateScheduled(req, res) {
  try {
    const { guildId } = req.params;
    const body = req.body || {};

    const rawItem = {
      ...body,
      id: body.id || generateId('scheduled'),
    };

    const parsed = ScheduledMessageSchema.safeParse(rawItem);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Invalid scheduled message payload',
      });
    }

    const guildConfig = await getGuildConfig(req.client, guildId);
    const existingList = guildConfig?.automations?.scheduledMessages || [];

    const index = existingList.findIndex((item) => item.id === parsed.data.id);
    let updatedList;
    if (index >= 0) {
      updatedList = [...existingList];
      updatedList[index] = { ...existingList[index], ...parsed.data };
    } else {
      updatedList = [...existingList, parsed.data];
    }

    await updateGuildConfig(req.client, guildId, {
      automations: {
        ...guildConfig?.automations,
        scheduledMessages: updatedList,
      },
    });

    return res.json({ success: true, data: parsed.data });
  } catch (error) {
    logger.error('Error in createOrUpdateScheduled:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/guilds/:guildId/automations/scheduled/:id
 */
export async function deleteScheduled(req, res) {
  try {
    const { guildId, id } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);
    const existingList = guildConfig?.automations?.scheduledMessages || [];

    const updatedList = existingList.filter((item) => item.id !== id);
    if (updatedList.length === existingList.length) {
      return res.status(404).json({ success: false, error: 'Scheduled message not found' });
    }

    await updateGuildConfig(req.client, guildId, {
      automations: {
        ...guildConfig?.automations,
        scheduledMessages: updatedList,
      },
    });

    return res.json({ success: true, message: 'Scheduled message deleted' });
  } catch (error) {
    logger.error('Error in deleteScheduled:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/automations/scheduled/:id/trigger
 */
export async function triggerScheduledNow(req, res) {
  try {
    const { guildId, id } = req.params;
    const result = await triggerScheduledMessageNow(req.client, guildId, id);
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error in triggerScheduledNow:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/automations/auto-responders
 */
export async function createOrUpdateAutoResponder(req, res) {
  try {
    const { guildId } = req.params;
    const body = req.body || {};

    const rawItem = {
      ...body,
      id: body.id || generateId('ar'),
    };

    const parsed = AutoResponderSchema.safeParse(rawItem);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Invalid auto-responder payload',
      });
    }

    const guildConfig = await getGuildConfig(req.client, guildId);
    const existingList = guildConfig?.automations?.autoResponders || [];

    const index = existingList.findIndex((item) => item.id === parsed.data.id);
    let updatedList;
    if (index >= 0) {
      updatedList = [...existingList];
      updatedList[index] = { ...existingList[index], ...parsed.data };
    } else {
      updatedList = [...existingList, parsed.data];
    }

    await updateGuildConfig(req.client, guildId, {
      automations: {
        ...guildConfig?.automations,
        autoResponders: updatedList,
      },
    });

    return res.json({ success: true, data: parsed.data });
  } catch (error) {
    logger.error('Error in createOrUpdateAutoResponder:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/guilds/:guildId/automations/auto-responders/:id
 */
export async function deleteAutoResponder(req, res) {
  try {
    const { guildId, id } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);
    const existingList = guildConfig?.automations?.autoResponders || [];

    const updatedList = existingList.filter((item) => item.id !== id);
    if (updatedList.length === existingList.length) {
      return res.status(404).json({ success: false, error: 'Auto-responder rule not found' });
    }

    await updateGuildConfig(req.client, guildId, {
      automations: {
        ...guildConfig?.automations,
        autoResponders: updatedList,
      },
    });

    return res.json({ success: true, message: 'Auto-responder rule deleted' });
  } catch (error) {
    logger.error('Error in deleteAutoResponder:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
