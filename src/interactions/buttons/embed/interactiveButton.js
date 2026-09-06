import { db } from '../../../utils/database/wrapper.js';
import { logger } from '../../../utils/logger.js';
import { createTicket } from '../../../services/ticket.js';

/**
 * Global button interaction handler for interactive embeds created in the Dashboard.
 * Handles customIds matching 'titan_btn:*'
 */
export default {
  name: 'titan_btn',
  async execute(interaction, client, args = []) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Esta acción solo está disponible dentro de un servidor.',
        ephemeral: true,
      });
    }

    const [actionType, param1, param2] = args;
    const guild = interaction.guild;
    const member = interaction.member;

    try {
      // -------------------------------------------------------------
      // 1. Role Toggle (Self-assignable role)
      // -------------------------------------------------------------
      if (actionType === 'toggle_role') {
        const roleId = param1;
        if (!roleId || roleId === 'none') {
          return interaction.reply({
            content: '⚠️ No se ha especificado un rol válido para este botón.',
            ephemeral: true,
          });
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
          return interaction.reply({
            content: '⚠️ El rol asignado a este botón ya no existe en el servidor.',
            ephemeral: true,
          });
        }

        // Check if bot can manage this role
        const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
        if (botMember && role.comparePositionTo(botMember.roles.highest) >= 0) {
          return interaction.reply({
            content: `⚠️ No tengo permisos para gestionar el rol **@${role.name}** (mi rol más alto está por debajo en la jerarquía).`,
            ephemeral: true,
          });
        }

        const hasRole = member.roles.cache.has(roleId);
        if (hasRole) {
          await member.roles.remove(roleId);
          return interaction.reply({
            content: `❌ Se te ha removido el rol **@${role.name}**.`,
            ephemeral: true,
          });
        } else {
          await member.roles.add(roleId);
          return interaction.reply({
            content: `✅ Se te ha otorgado el rol **@${role.name}**.`,
            ephemeral: true,
          });
        }
      }

      // -------------------------------------------------------------
      // 2. Open Ticket
      // -------------------------------------------------------------
      if (actionType === 'open_ticket') {
        await interaction.deferReply({ ephemeral: true });

        try {
          const result = await createTicket(
            guild,
            member,
            null,
            `Ticket solicitado vía botón interactivo por ${member.user.tag}`
          );

          if (result && result.channel) {
            return interaction.editReply({
              content: `🎟️ ¡Tu ticket ha sido creado exitosamente! Dirígete a <#${result.channel.id}>.`,
            });
          }

          return interaction.editReply({
            content: '🎟️ Tu ticket ha sido creado correctamente.',
          });
        } catch (ticketError) {
          logger.warn('Failed to open ticket from interactive button:', ticketError.message);
          return interaction.editReply({
            content: `⚠️ No se pudo crear el ticket: ${ticketError.message || 'Error desconocido'}.`,
          });
        }
      }

      // -------------------------------------------------------------
      // 3. Ephemeral Message / Custom Feedback
      // -------------------------------------------------------------
      if (actionType === 'msg') {
        const buttonId = param1;
        let messageText = 'Acción completada.';

        if (!db.initialized) {
          await db.initialize();
        }

        if (buttonId) {
          const cached = await db.get(`guild:${guild.id}:interactive_btn:${buttonId}`);
          if (cached && cached.customMessage) {
            messageText = cached.customMessage;
          }
        }

        return interaction.reply({
          content: messageText,
          ephemeral: true,
        });
      }

      // Fallback
      return interaction.reply({
        content: 'Acción ejecutada correctamente.',
        ephemeral: true,
      });
    } catch (err) {
      logger.error('Error executing interactive button:', err);
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: 'Ocurrió un error al procesar la acción del botón.',
          ephemeral: true,
        });
      } else if (interaction.deferred) {
        return interaction.editReply({
          content: 'Ocurrió un error al procesar la acción del botón.',
        });
      }
    }
  },
};
