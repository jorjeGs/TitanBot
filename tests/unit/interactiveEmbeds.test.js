import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ButtonStyle } from 'discord.js';
import {
  InteractiveButtonComponentSchema,
  InteractiveEmbedPayloadSchema,
} from '../../src/utils/schemas.js';
import {
  mapButtonStyle,
  buildInteractiveComponents,
  buildDiscordEmbed,
} from '../../src/services/embed/interactiveEmbedService.js';

describe('Interactive Embeds & Components (Feature C)', () => {
  describe('Zod Schema Validation', () => {
    it('validates a valid toggle_role button', () => {
      const btn = {
        id: 'btn_role_1',
        style: 'primary',
        label: 'Obtener Rol Gamer',
        emoji: '🎮',
        actionType: 'toggle_role',
        roleId: '123456789012345678',
      };

      const parsed = InteractiveButtonComponentSchema.safeParse(btn);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.style, 'primary');
      assert.strictEqual(parsed.data.actionType, 'toggle_role');
      assert.strictEqual(parsed.data.roleId, '123456789012345678');
    });

    it('validates a valid link button', () => {
      const btn = {
        id: 'btn_link_1',
        style: 'link',
        label: 'Visitar Web Oficial',
        actionType: 'link',
        url: 'https://titanbot.gg',
      };

      const parsed = InteractiveButtonComponentSchema.safeParse(btn);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.style, 'link');
      assert.strictEqual(parsed.data.url, 'https://titanbot.gg');
    });

    it('rejects invalid actionType', () => {
      const btn = {
        id: 'btn_bad',
        style: 'primary',
        label: 'Invalido',
        actionType: 'unsupported_action',
      };

      const parsed = InteractiveButtonComponentSchema.safeParse(btn);
      assert.strictEqual(parsed.success, false);
    });

    it('validates a full interactive embed payload', () => {
      const payload = {
        targetChannelId: '111222333444555666',
        content: '¡Mensaje especial para la comunidad!',
        embed: {
          title: 'Roles de Notificación',
          description: 'Haz clic en los botones para asignarte roles.',
          color: '#5865F2',
          fields: [{ name: 'Norma', value: 'Respeta a los demás', inline: false }],
          timestamp: true,
        },
        buttons: [
          {
            id: 'btn_1',
            style: 'primary',
            label: 'Eventos',
            emoji: '🎉',
            actionType: 'toggle_role',
            roleId: '999888777666555444',
          },
          {
            id: 'btn_2',
            style: 'secondary',
            label: 'Abrir Ticket',
            emoji: '🎟️',
            actionType: 'open_ticket',
          },
        ],
      };

      const parsed = InteractiveEmbedPayloadSchema.safeParse(payload);
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data.buttons.length, 2);
    });
  });

  describe('Component & Embed Builders', () => {
    it('maps string styles to Discord.js ButtonStyle values', () => {
      assert.strictEqual(mapButtonStyle('primary'), ButtonStyle.Primary);
      assert.strictEqual(mapButtonStyle('secondary'), ButtonStyle.Secondary);
      assert.strictEqual(mapButtonStyle('success'), ButtonStyle.Success);
      assert.strictEqual(mapButtonStyle('danger'), ButtonStyle.Danger);
      assert.strictEqual(mapButtonStyle('link'), ButtonStyle.Link);
    });

    it('builds action rows grouping max 5 buttons per row', async () => {
      const buttons = [];
      for (let i = 1; i <= 7; i++) {
        buttons.push({
          id: `btn_${i}`,
          style: 'primary',
          label: `Rol ${i}`,
          actionType: 'toggle_role',
          roleId: `role_${i}`,
        });
      }

      const rows = await buildInteractiveComponents(buttons, '123456789012345678');
      assert.strictEqual(rows.length, 2);
      assert.strictEqual(rows[0].components.length, 5);
      assert.strictEqual(rows[1].components.length, 2);

      // Verify customId on first button
      const firstBtn = rows[0].components[0].data;
      assert.strictEqual(firstBtn.custom_id, 'titan_btn:toggle_role:role_1:btn_1');
      assert.strictEqual(firstBtn.label, 'Rol 1');
    });

    it('builds discord embed with fields, author, footer, and color', () => {
      const embed = buildDiscordEmbed({
        title: 'Título del Embed',
        description: 'Descripción detallada',
        color: '#FF5500',
        fields: [{ name: 'Campo 1', value: 'Valor 1', inline: true }],
        footerText: 'Pie de página',
        authorName: 'Titan Bot',
        timestamp: true,
      });

      const data = embed.toJSON();
      assert.strictEqual(data.title, 'Título del Embed');
      assert.strictEqual(data.description, 'Descripción detallada');
      assert.strictEqual(data.color, 0xff5500);
      assert.strictEqual(data.fields.length, 1);
      assert.strictEqual(data.fields[0].name, 'Campo 1');
      assert.strictEqual(data.footer.text, 'Pie de página');
      assert.strictEqual(data.author.name, 'Titan Bot');
    });
  });
});
