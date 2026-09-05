// aiAssistantController.js — API controller for AI Community Assistant and Knowledge Base
import { getGuildConfig, updateGuildConfig } from '../../services/config/guildConfig.js';
import {
  AiAssistantConfigSchema,
  KnowledgeItemSchema,
} from '../../utils/schemas.js';
import {
  assembleSystemPrompt,
  callGeminiApi,
} from '../../services/ai/aiAssistantService.js';
import { logger } from '../../utils/logger.js';

function generateId(prefix = 'kb') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * GET /api/guilds/:guildId/aiassistant
 */
export async function getAiAssistantConfig(req, res) {
  try {
    const { guildId } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);

    const aiAssistant = guildConfig?.aiAssistant || {
      enabled: false,
      model: 'gemini-2.0-flash',
      systemPrompt: 'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres amigable, servicial, conciso y respetuoso.',
      allowedChannelIds: [],
      respondToMentions: true,
      ignoredRoleIds: [],
      cooldownSeconds: 10,
      maxOutputTokens: 500,
      temperature: 0.7,
      knowledgeBase: [],
    };

    return res.json({
      success: true,
      data: aiAssistant,
    });
  } catch (error) {
    logger.error('Error in getAiAssistantConfig:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/guilds/:guildId/aiassistant
 */
export async function updateAiAssistantConfig(req, res) {
  try {
    const { guildId } = req.params;
    const updates = req.body || {};

    const guildConfig = await getGuildConfig(req.client, guildId);
    const currentAi = guildConfig?.aiAssistant || {};

    const merged = {
      ...currentAi,
      ...updates,
      knowledgeBase: currentAi.knowledgeBase || [],
    };

    const parsed = AiAssistantConfigSchema.safeParse(merged);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Invalid AI assistant configuration',
      });
    }

    await updateGuildConfig(req.client, guildId, {
      aiAssistant: parsed.data,
    });

    return res.json({
      success: true,
      data: parsed.data,
      message: 'AI Assistant configuration saved successfully',
    });
  } catch (error) {
    logger.error('Error in updateAiAssistantConfig:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/aiassistant/test
 * Simulator playground endpoint for dashboard admins
 */
export async function testAiPrompt(req, res) {
  try {
    const { guildId } = req.params;
    const { prompt, customPrompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt cannot be empty' });
    }

    const guildConfig = await getGuildConfig(req.client, guildId);
    const aiConfig = guildConfig?.aiAssistant || {};

    const effectiveConfig = {
      ...aiConfig,
      systemPrompt: customPrompt || aiConfig.systemPrompt,
    };

    const guild = req.client.guilds?.cache?.get(guildId) || {
      name: 'Server de Prueba',
      memberCount: 150,
    };

    const systemInstruction = assembleSystemPrompt(effectiveConfig, guild);

    const startTime = Date.now();
    const response = await callGeminiApi({
      apiKey: process.env.GEMINI_API_KEY,
      model: aiConfig.model || 'gemini-2.0-flash',
      systemInstruction,
      userMessage: prompt.trim(),
      maxOutputTokens: aiConfig.maxOutputTokens || 500,
      temperature: aiConfig.temperature ?? 0.7,
    });
    const latencyMs = Date.now() - startTime;

    return res.json({
      success: true,
      data: {
        response,
        model: aiConfig.model || 'gemini-2.0-flash',
        latencyMs,
      },
    });
  } catch (error) {
    logger.error('Error in testAiPrompt:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/guilds/:guildId/aiassistant/knowledge
 */
export async function saveKnowledgeItem(req, res) {
  try {
    const { guildId } = req.params;
    const body = req.body || {};

    const rawItem = {
      ...body,
      id: body.id || generateId('kb'),
      updatedAt: new Date().toISOString(),
    };

    const parsed = KnowledgeItemSchema.safeParse(rawItem);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues?.[0]?.message || 'Invalid knowledge base item payload',
      });
    }

    const guildConfig = await getGuildConfig(req.client, guildId);
    const currentAi = guildConfig?.aiAssistant || {
      enabled: false,
      knowledgeBase: [],
    };

    const kb = [...(currentAi.knowledgeBase || [])];
    const index = kb.findIndex((k) => k.id === parsed.data.id);

    if (index >= 0) {
      kb[index] = { ...kb[index], ...parsed.data };
    } else {
      kb.push(parsed.data);
    }

    await updateGuildConfig(req.client, guildId, {
      aiAssistant: {
        ...currentAi,
        knowledgeBase: kb,
      },
    });

    return res.json({
      success: true,
      data: parsed.data,
      message: index >= 0 ? 'Knowledge item updated' : 'Knowledge item added',
    });
  } catch (error) {
    logger.error('Error in saveKnowledgeItem:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/guilds/:guildId/aiassistant/knowledge/:id
 */
export async function deleteKnowledgeItem(req, res) {
  try {
    const { guildId, id } = req.params;
    const guildConfig = await getGuildConfig(req.client, guildId);
    const currentAi = guildConfig?.aiAssistant || { knowledgeBase: [] };

    const initialCount = currentAi.knowledgeBase?.length || 0;
    const filteredKb = (currentAi.knowledgeBase || []).filter((k) => k.id !== id);

    if (filteredKb.length === initialCount) {
      return res.status(404).json({ success: false, error: 'Knowledge item not found' });
    }

    await updateGuildConfig(req.client, guildId, {
      aiAssistant: {
        ...currentAi,
        knowledgeBase: filteredKb,
      },
    });

    return res.json({ success: true, message: 'Knowledge item deleted' });
  } catch (error) {
    logger.error('Error in deleteKnowledgeItem:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
