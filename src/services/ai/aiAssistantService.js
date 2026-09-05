// aiAssistantService.js — Community AI Assistant powered by Google Gemini with Server Knowledge Base RAG
import { logger } from '../../utils/logger.js';
import { getGuildConfig } from '../config/guildConfig.js';
import { getCommandPrefix } from '../../config/bot.js';

// In-memory sliding window for user cooldowns: `${guildId}:${userId}` -> timestamp
const userCooldowns = new Map();

/**
 * Clean up old cooldown entries periodically
 */
const cooldownCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of userCooldowns.entries()) {
    if (now - timestamp > 60000) {
      userCooldowns.delete(key);
    }
  }
}, 30000);
if (typeof cooldownCleanupInterval?.unref === 'function') {
  cooldownCleanupInterval.unref();
}

/**
 * Check if a user is currently under cooldown
 */
export function isUserOnAiCooldown(guildId, userId, cooldownSeconds = 10) {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const lastTime = userCooldowns.get(key);
  if (lastTime && now - lastTime < cooldownSeconds * 1000) {
    return true;
  }
  userCooldowns.set(key, now);
  return false;
}

/**
 * Assemble knowledge base context and system instructions
 */
export function assembleSystemPrompt(aiConfig = {}, guild = {}) {
  const basePrompt = aiConfig.systemPrompt || 
    'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres amigable, conciso, respetuoso y muy útil.';

  let context = `${basePrompt}\n\n`;
  context += `Información del servidor actual:\n`;
  context += `- Nombre: ${guild.name || 'Servidor Discord'}\n`;
  context += `- Total de miembros: ${guild.memberCount || 'Desconocido'}\n\n`;

  const knowledge = Array.isArray(aiConfig.knowledgeBase) 
    ? aiConfig.knowledgeBase.filter((k) => k.enabled !== false)
    : [];

  if (knowledge.length > 0) {
    context += `=== BASE DE CONOCIMIENTO OFICIAL DEL SERVIDOR ===\n`;
    for (const item of knowledge) {
      context += `[Tema: ${item.title}]\n`;
      context += `${item.content}\n`;
      if (Array.isArray(item.tags) && item.tags.length > 0) {
        context += `Etiquetas: ${item.tags.join(', ')}\n`;
      }
      context += `\n`;
    }
    context += `=== FIN DE BASE DE CONOCIMIENTO ===\n`;
    context += `Instrucciones adicionales: Utiliza prioritariamente los datos de la base de conocimiento oficial para responder preguntas sobre normas, roles, canales o eventos. Si la información solicitada no figura en la base de conocimiento y es específica de este servidor, aclara que no dispones de esos detalles e invita al usuario a consultar a los moderadores. Mantén las respuestas dentro de un formato claro con markdown de Discord.\n`;
  }

  return context;
}

/**
 * Call Google Gemini API
 */
export async function callGeminiApi({
  apiKey,
  model = 'gemini-2.0-flash',
  systemInstruction,
  userMessage,
  maxOutputTokens = 500,
  temperature = 0.7,
}) {
  const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;

  if (!resolvedApiKey) {
    logger.warn('GEMINI_API_KEY is not configured in environment or guild settings');
    return '🤖 **TitanBot AI:** El asistente inteligente no tiene una clave de API configurada en este momento. Por favor, solicita a un administrador del servidor que agregue la clave de Google Gemini en la configuración.';
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${resolvedApiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: Math.max(0, Math.min(1, temperature)),
      maxOutputTokens: Math.max(50, Math.min(2048, maxOutputTokens)),
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    logger.error(`Gemini API error (Status ${response.status}):`, errorText);
    throw new Error(`Gemini API error: ${response.statusText} (${response.status})`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text;

  if (!responseText) {
    logger.warn('Empty or filtered response received from Gemini API');
    return '🤖 No pude generar una respuesta en este momento. Por favor formula tu pregunta de otra manera.';
  }

  return responseText.trim();
}

/**
 * Split long AI responses into Discord-safe chunks (max 2000 chars)
 */
export function splitMessage(text, maxLength = 1950) {
  if (!text || text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split by newline
    let splitIdx = remaining.lastIndexOf('\n', maxLength);
    if (splitIdx === -1 || splitIdx < maxLength / 2) {
      // Try to split by space
      splitIdx = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIdx === -1 || splitIdx < maxLength / 2) {
      splitIdx = maxLength;
    }

    chunks.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }

  return chunks;
}

/**
 * Handle incoming message in Discord chat to check if AI Assistant should reply
 */
export async function handleAiMessage(message, client) {
  try {
    if (!message || !message.guild || message.author.bot) {
      return false;
    }

    const guildConfig = await getGuildConfig(client, message.guild.id);
    const aiConfig = guildConfig?.aiAssistant;

    if (!aiConfig || aiConfig.enabled !== true) {
      return false;
    }

    // Check if member has an ignored role
    if (Array.isArray(aiConfig.ignoredRoleIds) && aiConfig.ignoredRoleIds.length > 0) {
      const hasIgnoredRole = message.member?.roles?.cache?.some((r) =>
        aiConfig.ignoredRoleIds.includes(r.id)
      );
      if (hasIgnoredRole) {
        return false;
      }
    }

    const isMentioned = Boolean(
      aiConfig.respondToMentions !== false &&
      client.user &&
      message.mentions?.has(client.user.id)
    );

    const isAllowedChannel = Boolean(
      Array.isArray(aiConfig.allowedChannelIds) &&
      aiConfig.allowedChannelIds.includes(message.channel.id)
    );

    if (!isMentioned && !isAllowedChannel) {
      return false;
    }

    // Strip bot mentions from prompt
    let cleanContent = message.content;
    if (client.user) {
      const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
      cleanContent = cleanContent.replace(mentionRegex, '').trim();
    }

    // Do not respond if message is empty or looks like a prefix command
    const prefix = guildConfig.prefix || getCommandPrefix();
    if (!cleanContent || cleanContent.startsWith(prefix) || cleanContent.startsWith('/')) {
      return false;
    }

    // Evaluate user cooldown
    const cooldown = aiConfig.cooldownSeconds || 10;
    if (isUserOnAiCooldown(message.guild.id, message.author.id, cooldown)) {
      await message.react('⏳').catch(() => {});
      return false;
    }

    // Show typing status
    await message.channel.sendTyping().catch(() => {});

    // Assemble system instructions
    const systemInstruction = assembleSystemPrompt(aiConfig, message.guild);

    // Call Gemini
    const answer = await callGeminiApi({
      apiKey: process.env.GEMINI_API_KEY,
      model: aiConfig.model || 'gemini-2.0-flash',
      systemInstruction,
      userMessage: `${message.author.username}: ${cleanContent}`,
      maxOutputTokens: aiConfig.maxOutputTokens || 500,
      temperature: aiConfig.temperature ?? 0.7,
    });

    const chunks = splitMessage(answer);
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        await message.reply({
          content: chunks[i],
          allowedMentions: { repliedUser: false },
        });
      } else {
        await message.channel.send({
          content: chunks[i],
        });
      }
    }

    return true;
  } catch (error) {
    logger.error('Error handling AI message in Discord:', error);
    return false;
  }
}
