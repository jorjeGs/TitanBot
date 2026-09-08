import { callGeminiApi } from '../ai/aiAssistantService.js';
import { logger } from '../../utils/logger.js';

/**
 * Translates welcome or goodbye text to the specified target language using Gemini AI.
 * Preserves Discord tokens ({user}, {server}, etc.) and channel mentions verbatim.
 *
 * @param {Object} options
 * @param {string} options.text Text to translate
 * @param {string} [options.targetLocale] Target locale (e.g. 'es-419', 'en-US', 'de')
 * @param {Object} [options.guildConfig] Optional guild configuration containing custom API key
 * @returns {Promise<string>} Translated text, or original text on fallback
 */
export async function translateWelcomeText({
  text,
  targetLocale = 'es-419',
  guildConfig = {},
}) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const apiKey = guildConfig?.aiAssistant?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return text;
  }

  const prompt = `You are a translation assistant for a Discord community bot.
Translate the following Discord message into the language represented by locale: "${targetLocale}".

CRITICAL INSTRUCTIONS:
1. Preserve placeholders like {user}, {username}, {server}, {memberCount}, {user.id}, {guild.name} EXACTLY as written.
2. Preserve Discord mentions (<@...>, <#...>, <@&...>) and emojis untouched.
3. Keep the original formatting, line breaks, and enthusiastic community tone.
4. Return ONLY the translated message, without any intro, markdown quotes, or explanations.

Message to translate:
${trimmed}`;

  try {
    const translated = await callGeminiApi({
      apiKey,
      userMessage: prompt,
      temperature: 0.2,
      maxOutputTokens: 600,
    });

    if (translated && !translated.startsWith('🤖') && !translated.startsWith('Lo siento')) {
      return translated.trim();
    }
  } catch (err) {
    logger.debug('Failed to auto-translate welcome message via Gemini:', err?.message);
  }

  return text;
}
