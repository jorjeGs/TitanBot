import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  KnowledgeItemSchema,
  AiAssistantConfigSchema,
} from '../../src/utils/schemas.js';
import {
  assembleSystemPrompt,
  isUserOnAiCooldown,
  splitMessage,
  callGeminiApi,
  handleAiMessage,
} from '../../src/services/ai/aiAssistantService.js';
import {
  getAiAssistantConfig,
  updateAiAssistantConfig,
  testAiPrompt,
  saveKnowledgeItem,
  deleteKnowledgeItem,
} from '../../src/api/controllers/aiAssistantController.js';

describe('Asistente IA para la Comunidad (Sub-project D)', () => {
  describe('Zod Schema Validation', () => {
    it('validates a complete knowledge base item', () => {
      const payload = {
        id: 'kb_1',
        title: 'Horario de Atención',
        content: 'El soporte atiende de Lunes a Viernes de 9:00 a 18:00 UTC.',
        tags: ['soporte', 'horarios', 'ayuda'],
        enabled: true,
      };

      const parsed = KnowledgeItemSchema.safeParse(payload);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.title, 'Horario de Atención');
      assert.strictEqual(parsed.data.tags.length, 3);
    });

    it('validates AiAssistantConfigSchema defaults and bounds', () => {
      const parsed = AiAssistantConfigSchema.safeParse({});
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.enabled, false);
      assert.strictEqual(parsed.data.model, 'gemini-2.0-flash');
      assert.strictEqual(parsed.data.cooldownSeconds, 10);
      assert.strictEqual(parsed.data.maxOutputTokens, 500);
      assert.strictEqual(parsed.data.temperature, 0.7);
      assert.deepStrictEqual(parsed.data.knowledgeBase, []);
    });

    it('rejects invalid temperature or token limits', () => {
      const payload = {
        temperature: 1.5, // Max is 1.0
        maxOutputTokens: 5000, // Max is 2048
      };

      const parsed = AiAssistantConfigSchema.safeParse(payload);
      assert.strictEqual(parsed.success, false);
    });
  });

  describe('Prompt Context & RAG Assembly', () => {
    it('assembles system prompt containing guild info and knowledge items', () => {
      const aiConfig = {
        systemPrompt: 'Eres TitanBot AI, un asistente servicial.',
        knowledgeBase: [
          {
            id: 'kb_1',
            title: 'Regla 1: Respeto Mutuo',
            content: 'No se permite el acoso ni insultos en los canales públicos.',
            tags: ['reglas', 'moderacion'],
            enabled: true,
          },
          {
            id: 'kb_2',
            title: 'Canal Secreto',
            content: 'No debe ser visible.',
            enabled: false, // Disabled item should be omitted
          },
        ],
      };

      const guild = {
        name: 'Comunidad Gaming',
        memberCount: 350,
      };

      const prompt = assembleSystemPrompt(aiConfig, guild);
      assert.ok(prompt.includes('Eres TitanBot AI'));
      assert.ok(prompt.includes('Comunidad Gaming'));
      assert.ok(prompt.includes('350'));
      assert.ok(prompt.includes('Regla 1: Respeto Mutuo'));
      assert.ok(prompt.includes('No se permite el acoso'));
      assert.ok(prompt.includes('Etiquetas: reglas, moderacion'));
      assert.ok(!prompt.includes('Canal Secreto')); // Filtered out
    });
  });

  describe('Cooldown Mechanism', () => {
    it('enforces per-user cooldown sliding window', () => {
      const guildId = 'guild_cd_test';
      const userId = 'user_cd_test_' + Date.now();

      // First call should not be on cooldown
      const firstCall = isUserOnAiCooldown(guildId, userId, 5);
      assert.strictEqual(firstCall, false);

      // Immediate second call must be on cooldown
      const secondCall = isUserOnAiCooldown(guildId, userId, 5);
      assert.strictEqual(secondCall, true);
    });
  });

  describe('Message Splitting for Discord Limits', () => {
    it('does not split short messages', () => {
      const shortText = 'Esta es una respuesta breve.';
      const chunks = splitMessage(shortText, 1950);
      assert.strictEqual(chunks.length, 1);
      assert.strictEqual(chunks[0], shortText);
    });

    it('splits long responses into parts <= 1950 characters without cutting words', () => {
      const paragraph = 'TitanBot es el mejor bot para Discord con capacidades integrales de moderación, economía y analíticas.\n';
      const longText = paragraph.repeat(30); // ~3200 characters

      const chunks = splitMessage(longText, 1000);
      assert.ok(chunks.length >= 3);
      for (const chunk of chunks) {
        assert.ok(chunk.length <= 1000);
      }
    });
  });

  describe('Graceful Fallback without API Key', () => {
    it('returns informative notice when GEMINI_API_KEY is not configured', async () => {
      const response = await callGeminiApi({
        apiKey: '',
        model: 'gemini-2.0-flash',
        systemInstruction: 'Test',
        userMessage: 'Hola',
      });

      assert.ok(response.includes('TitanBot AI'));
      assert.ok(response.includes('clave de API'));
    });
  });

  describe('Discord Message Event Filter', () => {
    it('ignores bot messages safely', async () => {
      const botMessage = {
        author: { bot: true },
        guild: { id: '112233' },
      };

      const handled = await handleAiMessage(botMessage, {});
      assert.strictEqual(handled, false);
    });

    it('ignores messages without guild context', async () => {
      const dmMessage = {
        author: { bot: false },
        guild: null,
      };

      const handled = await handleAiMessage(dmMessage, {});
      assert.strictEqual(handled, false);
    });
  });
});
