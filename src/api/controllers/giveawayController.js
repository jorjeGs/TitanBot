import { PermissionFlagsBits } from 'discord.js';
import {
  getGuildGiveaways,
  saveGiveaway,
  deleteGiveaway,
  isGiveawayEnded,
} from '../../utils/giveaways.js';
import {
  endGiveaway,
  selectWinners,
  createGiveawayEmbed,
  createGiveawayButtons,
} from '../../services/giveawayService.js';
import { CreateGiveawaySchema } from '../../utils/schemas.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/guilds/:guildId/giveaways
 * Lists active and ended giveaways for the guild.
 */
export async function getGiveaways(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    const rawGiveaways = await getGuildGiveaways(req.client, guildId);
    const giveaways = Array.isArray(rawGiveaways) ? rawGiveaways : [];

    const active = [];
    const ended = [];

    for (const g of giveaways) {
      if (!g || !g.messageId) continue;

      const isEnded = Boolean(g.ended || g.isEnded || isGiveawayEnded(g));
      const channel = guild?.channels?.cache?.get(g.channelId);
      const role = g.requiredRoleId ? guild?.roles?.cache?.get(g.requiredRoleId) : null;

      const item = {
        ...g,
        isEnded,
        channelName: channel?.name || `channel-${g.channelId.slice(-4)}`,
        requiredRoleName: role?.name || null,
        participantCount: Array.isArray(g.participants) ? g.participants.length : 0,
        winnerIds: Array.isArray(g.winnerIds) ? g.winnerIds : [],
      };

      if (isEnded) {
        ended.push(item);
      } else {
        active.push(item);
      }
    }

    active.sort((a, b) => (a.endTime || a.endsAt || 0) - (b.endTime || b.endsAt || 0));
    ended.sort((a, b) => {
      const aTime = new Date(a.endedAt || a.endTime || 0).getTime();
      const bTime = new Date(b.endedAt || b.endTime || 0).getTime();
      return bTime - aTime;
    });

    return res.json({
      success: true,
      active,
      ended,
      total: giveaways.length,
    });
  } catch (error) {
    logger.error('Error fetching guild giveaways:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to retrieve giveaways.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/giveaways
 * Creates a new giveaway from the web dashboard and posts the message to Discord.
 */
export async function createGiveawayHandler(req, res) {
  try {
    const { guildId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'GuildNotFound',
        message: 'Guild not found or TitanBot is not present.',
      });
    }

    const parsed = CreateGiveawaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid giveaway parameters.',
        issues: parsed.error.issues,
      });
    }

    const { channelId, prize, durationMinutes, winnerCount, requiredRoleId } = parsed.data;

    let targetChannel = guild.channels?.cache?.get(channelId);
    if (!targetChannel && typeof guild.channels?.fetch === 'function') {
      targetChannel = await guild.channels.fetch(channelId).catch(() => null);
    }

    if (!targetChannel) {
      return res.status(404).json({
        success: false,
        error: 'ChannelNotFound',
        message: 'The selected channel could not be found in this server.',
      });
    }

    if (typeof targetChannel.isTextBased === 'function' && !targetChannel.isTextBased()) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Target channel must be a text-based channel.',
      });
    }

    // Verify bot permissions in channel
    const botMember = guild.members?.me || guild.members?.cache?.get(req.client?.user?.id);
    if (botMember && typeof targetChannel.permissionsFor === 'function') {
      const perms = targetChannel.permissionsFor(botMember);
      const missing = [];
      if (!perms.has(PermissionFlagsBits.ViewChannel)) missing.push('ViewChannel');
      if (!perms.has(PermissionFlagsBits.SendMessages)) missing.push('SendMessages');
      if (!perms.has(PermissionFlagsBits.EmbedLinks)) missing.push('EmbedLinks');

      if (missing.length > 0) {
        return res.status(422).json({
          success: false,
          error: 'PermissionError',
          message: `TitanBot lacks required permissions in #${targetChannel.name}: ${missing.join(', ')}`,
        });
      }
    }

    const durationMs = durationMinutes * 60 * 1000;
    const endTime = Date.now() + durationMs;

    const giveawayData = {
      messageId: 'placeholder',
      channelId: targetChannel.id,
      guildId,
      prize,
      hostId: req.user.id,
      endTime,
      endsAt: endTime,
      winnerCount,
      requiredRoleId: requiredRoleId || null,
      participants: [],
      isEnded: false,
      ended: false,
      createdAt: new Date().toISOString(),
    };

    const embed = createGiveawayEmbed(giveawayData, 'active', [], guild);
    const buttons = createGiveawayButtons(false, guild);

    let messageContent = '🎉 **NUEVO SORTEO / NEW GIVEAWAY** 🎉';
    if (requiredRoleId) {
      messageContent += `\n🔒 *Rol Requerido / Required Role:* <@&${requiredRoleId}>`;
    }

    const giveawayMessage = await targetChannel.send({
      content: messageContent,
      embeds: [embed],
      components: [buttons],
    });

    giveawayData.messageId = giveawayMessage.id;
    await saveGiveaway(req.client, guildId, giveawayData);

    try {
      await logEvent({
        client: req.client,
        guildId,
        eventType: EVENT_TYPES.GIVEAWAY_CREATE,
        data: {
          description: `Giveaway created via Web Dashboard: ${prize}`,
          channelId: targetChannel.id,
          userId: req.user.id,
          fields: [
            { name: 'Prize', value: prize, inline: true },
            { name: 'Winners', value: String(winnerCount), inline: true },
            { name: 'Duration', value: `${durationMinutes}m`, inline: true },
          ],
        },
      });
    } catch (logErr) {
      logger.debug('Non-critical: logEvent failed in createGiveawayHandler:', logErr);
    }

    logger.info(`Giveaway created via web: ${giveawayMessage.id} in #${targetChannel.name}`);

    return res.json({
      success: true,
      giveaway: giveawayData,
      message: 'Giveaway started successfully.',
    });
  } catch (error) {
    logger.error('Error creating giveaway via web:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to create giveaway.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/giveaways/:messageId/end
 * Force ends an active giveaway immediately, selects winners, and announces them.
 */
export async function endGiveawayHandler(req, res) {
  try {
    const { guildId, messageId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    const giveaways = await getGuildGiveaways(req.client, guildId);
    const giveaway = (Array.isArray(giveaways) ? giveaways : []).find((g) => g.messageId === messageId);

    if (!giveaway) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Giveaway with message ID ${messageId} not found.`,
      });
    }

    if (giveaway.ended || giveaway.isEnded) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'This giveaway has already ended.',
      });
    }

    const endResult = await endGiveaway(req.client, giveaway, guildId, req.user.id);
    const updatedGiveaway = endResult.giveaway;
    const winners = endResult.winners || [];

    // Update Discord message if possible
    try {
      let channel = guild?.channels?.cache?.get(updatedGiveaway.channelId);
      if (!channel && typeof guild?.channels?.fetch === 'function') {
        channel = await guild.channels.fetch(updatedGiveaway.channelId).catch(() => null);
      }

      if (channel && typeof channel.messages?.fetch === 'function') {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) {
          const endedEmbed = createGiveawayEmbed(updatedGiveaway, 'ended', winners, guild);
          const endedButtons = createGiveawayButtons(true, guild);

          await message.edit({
            embeds: [endedEmbed],
            components: [endedButtons],
          }).catch(() => null);

          if (winners.length > 0) {
            const winnerMentions = winners.map((id) => `<@${id}>`).join(', ');
            await channel.send({
              content: `🎉 ¡Felicidades / Congratulations ${winnerMentions}! Ganaste **${updatedGiveaway.prize}**!`,
            }).catch(() => null);
          } else {
            await channel.send({
              content: `El sorteo por **${updatedGiveaway.prize}** ha finalizado sin participantes válidos.`,
            }).catch(() => null);
          }
        }
      }
    } catch (discordErr) {
      logger.warn('Non-critical: Failed to update Discord message on giveaway end:', discordErr.message);
    }

    await saveGiveaway(req.client, guildId, updatedGiveaway);

    return res.json({
      success: true,
      giveaway: updatedGiveaway,
      winners,
      message: 'Giveaway ended successfully.',
    });
  } catch (error) {
    logger.error('Error ending giveaway via web:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to end giveaway.',
    });
  }
}

/**
 * POST /api/guilds/:guildId/giveaways/:messageId/reroll
 * Rerolls winners for an ended giveaway.
 */
export async function rerollGiveawayHandler(req, res) {
  try {
    const { guildId, messageId } = req.params;
    const guild = req.guild || req.client?.guilds?.cache?.get(guildId);

    const giveaways = await getGuildGiveaways(req.client, guildId);
    const giveaway = (Array.isArray(giveaways) ? giveaways : []).find((g) => g.messageId === messageId);

    if (!giveaway) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Giveaway with message ID ${messageId} not found.`,
      });
    }

    if (!giveaway.ended && !giveaway.isEnded && !isGiveawayEnded(giveaway)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Cannot reroll an active giveaway. End it first.',
      });
    }

    const participants = giveaway.participants || [];
    if (participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Cannot reroll: no participants entered the giveaway.',
      });
    }

    const newWinners = selectWinners(participants, giveaway.winnerCount || 1);
    const updatedGiveaway = {
      ...giveaway,
      winnerIds: newWinners,
      rerolledAt: new Date().toISOString(),
    };

    try {
      let channel = guild?.channels?.cache?.get(updatedGiveaway.channelId);
      if (!channel && typeof guild?.channels?.fetch === 'function') {
        channel = await guild.channels.fetch(updatedGiveaway.channelId).catch(() => null);
      }

      if (channel && typeof channel.messages?.fetch === 'function') {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) {
          const rerollEmbed = createGiveawayEmbed(updatedGiveaway, 'reroll', newWinners, guild);
          const rerollButtons = createGiveawayButtons(true, guild);

          await message.edit({
            embeds: [rerollEmbed],
            components: [rerollButtons],
          }).catch(() => null);

          if (newWinners.length > 0) {
            const winnerMentions = newWinners.map((id) => `<@${id}>`).join(', ');
            await channel.send({
              content: `🔄 **Nuevo Ganador / New Winner!** Felicidades ${winnerMentions}, ganaste **${updatedGiveaway.prize}**!`,
            }).catch(() => null);
          }
        }
      }
    } catch (discordErr) {
      logger.warn('Non-critical: Failed to update Discord message on reroll:', discordErr.message);
    }

    await saveGiveaway(req.client, guildId, updatedGiveaway);

    return res.json({
      success: true,
      winners: newWinners,
      giveaway: updatedGiveaway,
      message: 'Winners rerolled successfully.',
    });
  } catch (error) {
    logger.error('Error rerolling giveaway via web:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to reroll giveaway.',
    });
  }
}

/**
 * DELETE /api/guilds/:guildId/giveaways/:messageId
 * Removes a giveaway from the database.
 */
export async function deleteGiveawayHandler(req, res) {
  try {
    const { guildId, messageId } = req.params;

    const deleted = await deleteGiveaway(req.client, guildId, messageId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Giveaway ${messageId} not found.`,
      });
    }

    return res.json({
      success: true,
      message: 'Giveaway deleted successfully.',
    });
  } catch (error) {
    logger.error('Error deleting giveaway via web:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalError',
      message: error.message || 'Failed to delete giveaway.',
    });
  }
}
