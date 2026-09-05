import { PermissionFlagsBits, ChannelType } from 'discord.js';
import { db, getFromDb } from '../../utils/database/wrapper.js';
import { getGuildConfigKey, getAntiRaidConfigKey } from '../../utils/database/keys.js';
import { AntiRaidConfigSchema } from '../../utils/schemas.js';
import { logger } from '../../utils/logger.js';
import { createEmbed } from '../../utils/embeds.js';

// In-memory sliding window queues: Map<guildId, Array<{ userId, joinedAt, createdAt }>>
const joinQueues = new Map();

/**
 * Resets sliding window queue (useful for testing or manual flush).
 */
export function clearJoinQueue(guildId) {
  if (guildId) {
    joinQueues.delete(guildId);
  } else {
    joinQueues.clear();
  }
}

/**
 * Retrieves the Anti-Raid configuration for a guild.
 */
export async function getAntiRaidConfig(guildId) {
  if (!db.initialized) {
    await db.initialize();
  }

  // 1. Try dedicated Anti-Raid key first
  const dedicatedKey = getAntiRaidConfigKey(guildId);
  const dedicated = await getFromDb(dedicatedKey, null);

  if (dedicated && typeof dedicated === 'object') {
    return AntiRaidConfigSchema.parse(dedicated);
  }

  // 2. Fallback to guild canonical config antiRaid block
  const configKey = getGuildConfigKey(guildId);
  const guildConfig = await getFromDb(configKey, {});

  if (guildConfig?.antiRaid && typeof guildConfig.antiRaid === 'object') {
    return AntiRaidConfigSchema.parse(guildConfig.antiRaid);
  }

  return AntiRaidConfigSchema.parse({});
}

/**
 * Updates the Anti-Raid configuration for a guild.
 */
export async function updateAntiRaidConfig(guildId, patch = {}) {
  if (!db.initialized) {
    await db.initialize();
  }

  const current = await getAntiRaidConfig(guildId);
  const merged = { ...current, ...patch };
  const validated = AntiRaidConfigSchema.parse(merged);

  // Save to both dedicated key and guild config block
  const dedicatedKey = getAntiRaidConfigKey(guildId);
  await db.set(dedicatedKey, validated);

  const configKey = getGuildConfigKey(guildId);
  const guildConfig = await getFromDb(configKey, {});
  await db.set(configKey, { ...guildConfig, antiRaid: validated });

  logger.info(`Updated Anti-Raid config for guild ${guildId}`, validated);
  return validated;
}

/**
 * Processes a newly joined guild member through the Anti-Raid shield.
 */
export async function handleMemberJoin(member) {
  try {
    if (!member || !member.guild || member.user?.bot) {
      return { handled: false, reason: 'ignored' };
    }

    const guild = member.guild;
    const guildId = guild.id;
    const config = await getAntiRaidConfig(guildId);

    if (!config.enabled) {
      return { handled: false, reason: 'disabled' };
    }

    const now = Date.now();
    const windowMs = (config.windowSeconds || 10) * 1000;
    const cutoff = now - windowMs;

    // Prune sliding window
    let queue = joinQueues.get(guildId) || [];
    queue = queue.filter((j) => j.joinedAt >= cutoff);

    const userCreatedAt = member.user?.createdTimestamp || now;
    const accountAgeMs = now - userCreatedAt;
    const accountAgeHours = accountAgeMs / (1000 * 60 * 60);

    const isSuspiciousAge = config.minAccountAgeHours > 0 && accountAgeHours < config.minAccountAgeHours;

    queue.push({
      userId: member.id,
      joinedAt: now,
      userCreatedAt,
      isSuspiciousAge,
    });
    joinQueues.set(guildId, queue);

    // Evaluate Raid Threshold
    const isBurstThreshold = queue.length >= config.joinThreshold;
    const isRaid = isBurstThreshold || (isSuspiciousAge && queue.length >= Math.max(2, Math.floor(config.joinThreshold / 2)));

    if (!isRaid) {
      return { handled: true, raidDetected: false, queueCount: queue.length };
    }

    logger.warn(`🚨 [Anti-Raid] Burst detected in guild ${guildId}! Queue: ${queue.length}, Member: ${member.id}`);

    // Execute configured action
    let actionTaken = config.action;
    let actionSuccess = false;

    if (config.action === 'quarantine' && config.quarantineRoleId) {
      try {
        const quarantineRole = guild.roles?.cache?.get(config.quarantineRoleId) ||
          (await guild.roles?.fetch?.(config.quarantineRoleId).catch(() => null));

        if (quarantineRole && member.roles?.add) {
          await member.roles.add(quarantineRole, '[TitanBot Anti-Raid] Join burst quarantine');
          actionSuccess = true;
        }
      } catch (err) {
        logger.error(`Failed to assign quarantine role in guild ${guildId}:`, err);
      }
    } else if (config.action === 'kick') {
      try {
        if (member.kickable && typeof member.kick === 'function') {
          await member.kick('[TitanBot Anti-Raid] Join burst kick');
          actionSuccess = true;
        }
      } catch (err) {
        logger.error(`Failed to kick member in guild ${guildId}:`, err);
      }
    } else if (config.action === 'ban') {
      try {
        if (member.bannable && typeof member.ban === 'function') {
          await member.ban({ deleteMessageSeconds: 86400, reason: '[TitanBot Anti-Raid] Join burst ban' });
          actionSuccess = true;
        }
      } catch (err) {
        logger.error(`Failed to ban member in guild ${guildId}:`, err);
      }
    }

    // Trigger Lockdown if enabled and not already active
    let lockdownTriggered = false;
    if (config.lockdownOnRaid && !config.isLockdownActive) {
      const lockdownRes = await toggleEmergencyLockdown(guildId, guild.client, true);
      lockdownTriggered = lockdownRes.isLockdownActive;
    }

    // Record last raid timestamp
    await updateAntiRaidConfig(guildId, {
      lastRaidTimestamp: new Date().toISOString(),
      ...(lockdownTriggered ? { isLockdownActive: true } : {}),
    });

    // Send Alert to configured channel or mod logs
    const alertChannelId = config.alertChannelId;
    if (alertChannelId && guild.channels) {
      try {
        const alertChannel = guild.channels?.cache?.get(alertChannelId) ||
          (await guild.channels?.fetch?.(alertChannelId).catch(() => null));

        if (alertChannel && typeof alertChannel.send === 'function') {
          const alertEmbed = createEmbed({
            title: '🚨 ¡Alerta del Escudo Anti-Raid!',
            description: [
              `Se ha detectado una ráfaga inusual de uniones masivas en el servidor.`,
              `**Miembro detectado:** <@${member.id}> (${member.user?.tag || member.id})`,
              `**Acción ejecutada:** \`${actionTaken.toUpperCase()}\` (${actionSuccess ? 'Exitosa' : 'Fallida / Sin permisos'})`,
              `**Uniones en ventana (${config.windowSeconds}s):** ${queue.length} / ${config.joinThreshold}`,
              `**Edad de la cuenta:** ${Math.round(accountAgeHours)} horas ${isSuspiciousAge ? '⚠️ *(Sospechosa)*' : ''}`,
              `**Estado de Lockdown:** ${lockdownTriggered || config.isLockdownActive ? '🔒 ACTIVO' : '🔓 Inactivo'}`,
            ].join('\n'),
            color: '#e74c3c',
            footer: { text: 'TitanBot Anti-Raid Shield' },
          });

          await alertChannel.send({ embeds: [alertEmbed] });
        }
      } catch (alertErr) {
        logger.warn('Failed to send Anti-Raid alert embed:', alertErr);
      }
    }

    return {
      handled: true,
      raidDetected: true,
      action: actionTaken,
      actionSuccess,
      lockdownTriggered,
      queueCount: queue.length,
      memberId: member.id,
    };
  } catch (error) {
    logger.error('Error in handleMemberJoin Anti-Raid handler:', error);
    return { handled: false, error: error.message };
  }
}

/**
 * Toggles emergency lockdown for guild text channels.
 */
export async function toggleEmergencyLockdown(guildId, client, forceState = null) {
  try {
    const config = await getAntiRaidConfig(guildId);
    const targetState = forceState !== null ? Boolean(forceState) : !config.isLockdownActive;

    const guild = client?.guilds?.cache?.get(guildId) ||
      (await client?.guilds?.fetch?.(guildId).catch(() => null));

    let affectedChannelsCount = 0;

    if (guild && guild.channels) {
      const channelsToLock = [];

      if (config.lockdownChannelIds && config.lockdownChannelIds.length > 0) {
        for (const cid of config.lockdownChannelIds) {
          const ch = guild.channels?.cache?.get(cid);
          if (ch) channelsToLock.push(ch);
        }
      } else {
        // Fallback: lock text channels where @everyone is currently present
        const allChannels = guild.channels?.cache?.values
          ? Array.from(guild.channels.cache.values())
          : [];

        for (const ch of allChannels) {
          if (
            ch.type === ChannelType.GuildText ||
            ch.type === ChannelType.GuildAnnouncement ||
            ch.type === 0
          ) {
            channelsToLock.push(ch);
          }
        }
      }

      const everyoneRole = guild.roles?.everyone || guild.roles?.cache?.get(guildId);

      for (const ch of channelsToLock) {
        try {
          if (typeof ch.permissionOverwrites?.edit === 'function' && everyoneRole) {
            // targetState === true -> SendMessages: false; targetState === false -> SendMessages: null (reset)
            await ch.permissionOverwrites.edit(everyoneRole, {
              [PermissionFlagsBits.SendMessages]: targetState ? false : null,
            }, { reason: `[TitanBot Anti-Raid] Emergency lockdown ${targetState ? 'enabled' : 'lifted'}` });
            affectedChannelsCount += 1;
          }
        } catch (lockErr) {
          logger.warn(`Could not adjust permissions for channel ${ch.id} during lockdown:`, lockErr);
        }
      }
    }

    await updateAntiRaidConfig(guildId, {
      isLockdownActive: targetState,
    });

    logger.info(`Lockdown in guild ${guildId} set to ${targetState}. Affected ${affectedChannelsCount} channels.`);

    return {
      success: true,
      isLockdownActive: targetState,
      affectedChannelsCount,
    };
  } catch (error) {
    logger.error(`Error toggling emergency lockdown for guild ${guildId}:`, error);
    throw error;
  }
}
