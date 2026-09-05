import { once } from 'node:events';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { botHasPermission } from '../../utils/permissionGuard.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildMusicData, clearUpdateInterval } from './playerStore.js';
import { canControlMusic, requireVoiceChannel, VOICE_CHANNEL_DENIAL } from './permissions.js';
import {
    buildNowPlayingEmbed,
    buildQueueEmbed,
    buildQueuePaginationRow,
    getQueuePageSize,
} from './musicEmbeds.js';
import { refreshPlayerMessage } from './playerHandler.js';
import { t } from '../../utils/i18n/index.js';

const YOUTUBE_URL_PATTERN = /(?:youtube\.com|youtu\.be)/i;
const PLAYER_CONNECT_TIMEOUT_MS = 12_000;

function getConnectedLavalinkNodes(client) {
    if (!client.riffy?.nodeMap) {
        return [];
    }

    return [...client.riffy.nodeMap.values()].filter((node) => node.connected);
}

export function assertLavalinkNodeAvailable(client, target = null) {
    if (!getConnectedLavalinkNodes(client).length) {
        throw new TitanBotError(
            'Lavalink unavailable',
            ErrorTypes.CONFIGURATION,
            t('music.err_lavalink_unavailable', {}, target),
        );
    }
}

function assertBotVoicePermissions(channel, target = null) {
    if (!channel) {
        throw new TitanBotError(
            'Voice channel unavailable',
            ErrorTypes.CONFIGURATION,
            t('music.err_channel_unavailable', {}, target),
        );
    }

    if (!botHasPermission(channel, [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
        throw new TitanBotError(
            'Missing voice permissions',
            ErrorTypes.PERMISSION,
            t('music.err_missing_permissions', {}, target),
        );
    }
}

async function waitForPlayerConnection(player, target = null) {
    if (player.connected) {
        return;
    }

    try {
        await player.connection.resolve();
    } catch {
        // Fall through to event-based wait below.
    }

    if (player.connected) {
        return;
    }

    try {
        await once(player, 'connectionRestored', {
            signal: AbortSignal.timeout(PLAYER_CONNECT_TIMEOUT_MS),
        });
    } catch {
        // Timed out waiting for Lavalink to confirm the voice session.
    }

    if (!player.connected) {
        throw new TitanBotError(
            'Voice connection failed',
            ErrorTypes.CONFIGURATION,
            t('music.err_connection_failed', {}, target),
        );
    }
}

async function startPlayback(player, target = null) {
    await waitForPlayerConnection(player, target);
    await player.play();
}

export function getPlayer(client, guildId) {
    return client.riffy?.players?.get(guildId) || null;
}

export function assertRiffyAvailable(client, target = null) {
    if (!client.riffy) {
        throw new TitanBotError(
            'Lavalink not configured',
            ErrorTypes.CONFIGURATION,
            t('music.err_riffy_unavailable', {}, target),
        );
    }
}

export function assertInVoice(member, target = null) {
    if (!requireVoiceChannel(member)) {
        throw new TitanBotError(
            'Not in voice channel',
            ErrorTypes.USER_INPUT,
            t('music.err_not_in_voice', {}, target || member),
        );
    }
}

export function assertCanControl(member, player, target = null) {
    if (!canControlMusic(member, player)) {
        throw new TitanBotError(
            'Wrong voice channel',
            ErrorTypes.PERMISSION,
            t('music.err_wrong_voice', {}, target || member),
        );
    }
}

export async function ensurePlayer(client, interaction) {
    assertRiffyAvailable(client, interaction);
    assertLavalinkNodeAvailable(client, interaction);
    assertInVoice(interaction.member, interaction);

    const guildId = interaction.guild.id;
    const guildData = getGuildMusicData(guildId);
    let player = getPlayer(client, guildId);

    if (!player) {
        player = client.riffy.createConnection({
            guildId,
            voiceChannel: interaction.member.voice.channel.id,
            textChannel: interaction.channel.id,
            deaf: true,
        });
        guildData.playerChannelId = interaction.channel.id;
    }

    player.setVolume(guildData.volume);
    return { player, guildData };
}

function isDuplicateTrack(player, track) {
    const uri = track?.info?.uri;
    if (!uri) {
        return false;
    }
    if (player.current?.info?.uri === uri) {
        return true;
    }
    return player.queue.some((existing) => existing.info?.uri === uri);
}

export async function joinVoiceChannel(client, interaction) {
    assertRiffyAvailable(client, interaction);
    assertInVoice(interaction.member, interaction);

    const guildId = interaction.guild.id;
    const guildData = getGuildMusicData(guildId);
    const channel = interaction.member.voice.channel;
    assertBotVoicePermissions(channel, interaction);
    let player = getPlayer(client, guildId);

    if (player && player.voiceChannel !== channel.id) {
        try {
            player.destroy();
        } catch {
            // player may already be gone
        }
        player = null;
    }

    if (!player) {
        player = client.riffy.createConnection({
            guildId,
            voiceChannel: channel.id,
            textChannel: interaction.channel.id,
            deaf: true,
        });
        guildData.playerChannelId = interaction.channel.id;
    }

    player.setVolume(guildData.volume);

    return successEmbed(
        t('music.joined_title', {}, interaction),
        t('music.joined_desc', { channel: channel.name }, interaction),
    );
}

export async function playQuery(client, interaction, query) {
    if (YOUTUBE_URL_PATTERN.test(query)) {
        throw new TitanBotError(
            'YouTube URL blocked',
            ErrorTypes.USER_INPUT,
            t('music.err_youtube_blocked', {}, interaction),
        );
    }

    const { player, guildData } = await ensurePlayer(client, interaction);

    const result = await client.riffy.resolve({
        query,
        requester: interaction.user,
    });

    const { loadType, tracks, playlistInfo } = result;

    if (loadType === 'playlist' || loadType === 'PLAYLIST_LOADED') {
        let added = 0;
        let skipped = 0;

        for (const track of tracks) {
            track.info.requester = interaction.user;
            if (isDuplicateTrack(player, track)) {
                skipped += 1;
                continue;
            }
            player.queue.add(track);
            added += 1;
        }

        if (!player.playing && !player.paused) {
            await startPlayback(player, interaction);
        }

        return {
            embed: successEmbed(
                t('music.playlist_added_title', {}, interaction),
                t('music.playlist_added_desc', {
                    name: playlistInfo?.name || 'Playlist',
                    added,
                    total: tracks.length,
                    skipped: skipped ? t('music.playlist_skipped_dup', { skipped }, interaction) : '',
                }, interaction),
            ),
        };
    }

    if (
        loadType === 'search'
        || loadType === 'track'
        || loadType === 'SEARCH_RESULT'
        || loadType === 'TRACK_LOADED'
    ) {
        const track = tracks?.[0];
        if (!track) {
            throw new TitanBotError('No results', ErrorTypes.USER_INPUT, t('music.err_no_results', {}, interaction));
        }

        if (isDuplicateTrack(player, track)) {
            throw new TitanBotError(
                'Duplicate track',
                ErrorTypes.USER_INPUT,
                t('music.err_duplicate_track', { title: track.info.title }, interaction),
            );
        }

        track.info.requester = interaction.user;

        const willPlayNow = !player.playing && !player.paused;
        player.queue.add(track);
        const queuePosition = player.queue.length;

        if (willPlayNow) {
            await startPlayback(player, interaction);
        }

        return {
            embed: successEmbed(
                willPlayNow ? t('music.now_playing_title', {}, interaction) : t('music.track_added_title', {}, interaction),
                willPlayNow
                    ? `**${track.info.title}**\n${track.info.author}`
                    : t('music.track_added_desc', {
                        title: track.info.title,
                        author: track.info.author,
                        position: queuePosition,
                    }, interaction),
            ),
        };
    }

    throw new TitanBotError('No results', ErrorTypes.USER_INPUT, `${t('music.err_no_results', {}, interaction)} (loadType: ${loadType})`);
}

export async function skipTrack(client, interaction) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.current) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_nothing_playing', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);
    const title = player.current.info?.title || 'Unknown';
    // Under track-loop, stop() would replay the same track. Clear it so the skip
    // advances; trackStart re-applies the stored loop mode to the next track.
    if (player.loop === 'track') {
        player.setLoop('none');
    }
    player.stop();
    return successEmbed(t('music.skipped_title', {}, interaction), t('music.skipped_desc', { title }, interaction));
}

export async function stopPlayback(client, interaction) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_no_player', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    const guildData = getGuildMusicData(interaction.guild.id);
    const queueLength = player.queue?.length || 0;

    if (queueLength >= 5 && guildData.stopConfirmPending !== interaction.user.id) {
        guildData.stopConfirmPending = interaction.user.id;
        setTimeout(() => {
            if (guildData.stopConfirmPending === interaction.user.id) {
                guildData.stopConfirmPending = null;
            }
        }, 15000);
        return successEmbed(
            t('music.confirm_stop_title', {}, interaction),
            t('music.confirm_stop_desc', { count: queueLength }, interaction),
        );
    }

    guildData.stopConfirmPending = null;
    await destroyPlayerSession(client, interaction.guild.id, player, guildData);
    return successEmbed(t('music.stopped_title', {}, interaction), t('music.stopped_desc', {}, interaction));
}

export async function applyPause(client, guildId) {
    const player = getPlayer(client, guildId);
    if (!player?.current || player.paused) {
        return false;
    }

    player.pause(true);
    await refreshPlayerMessage(client, guildId);
    return true;
}

export async function applyResume(client, guildId) {
    const player = getPlayer(client, guildId);
    if (!player?.current || !player.paused) {
        return false;
    }

    player.pause(false);
    await refreshPlayerMessage(client, guildId);
    return true;
}

export async function pausePlayback(client, interaction) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.current) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_nothing_playing', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    if (player.paused) {
        throw new TitanBotError('Already paused', ErrorTypes.USER_INPUT, t('music.err_already_paused', {}, interaction));
    }

    await applyPause(client, interaction.guild.id);
    return successEmbed(t('music.paused', {}, interaction));
}

export async function resumePlayback(client, interaction) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.current) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_nothing_playing', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    if (!player.paused) {
        throw new TitanBotError('Not paused', ErrorTypes.USER_INPUT, t('music.err_not_paused', {}, interaction));
    }

    await applyResume(client, interaction.guild.id);
    return successEmbed(t('music.resumed', {}, interaction));
}

export async function shuffleQueue(client, interaction) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.queue?.length) {
        throw new TitanBotError('Empty queue', ErrorTypes.USER_INPUT, t('music.err_empty_queue', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);
    player.queue.shuffle();
    getGuildMusicData(interaction.guild.id).shuffle = true;
    await refreshPlayerMessage(client, interaction.guild.id);
    return successEmbed(t('music.shuffled_title', {}, interaction), t('music.shuffled_desc', {}, interaction));
}

export async function setLoopMode(client, interaction, mode) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_no_player', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    const guildData = getGuildMusicData(interaction.guild.id);
    guildData.loop = mode;
    player.setLoop(mode);

    const modeLabel = t(`music.loop_${mode}`, {}, interaction) || mode;
    await refreshPlayerMessage(client, interaction.guild.id);
    return successEmbed(t('music.loop_updated_title', {}, interaction), t('music.loop_updated_desc', { mode: modeLabel }, interaction));
}

export async function toggleLoop(client, interaction) {
    const guildData = getGuildMusicData(interaction.guild.id);
    const next = guildData.loop === 'none' ? 'track' : guildData.loop === 'track' ? 'queue' : 'none';
    return setLoopMode(client, interaction, next);
}

export async function setVolume(client, interaction, volume) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_no_player', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    const guildData = getGuildMusicData(interaction.guild.id);
    guildData.volume = Math.max(0, Math.min(100, volume));
    player.setVolume(guildData.volume);
    await refreshPlayerMessage(client, interaction.guild.id);
    return successEmbed(t('music.vol_updated_title', {}, interaction), t('music.vol_updated_desc', { volume: guildData.volume }, interaction));
}

export async function adjustVolume(client, interaction, delta) {
    const guildData = getGuildMusicData(interaction.guild.id);
    return setVolume(client, interaction, guildData.volume + delta);
}

export async function seekTrack(client, interaction, seconds) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.current) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_nothing_playing', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    const info = player.current.info || {};
    if (info.isStream || info.isSeekable === false) {
        throw new TitanBotError(
            'Not seekable',
            ErrorTypes.USER_INPUT,
            t('music.err_not_seekable', {}, interaction),
        );
    }

    const position = Math.max(0, seconds * 1000);
    if (info.length && position > info.length) {
        throw new TitanBotError(
            'Seek out of range',
            ErrorTypes.USER_INPUT,
            t('music.err_seek_out_of_range', { seconds: Math.floor(info.length / 1000) }, interaction),
        );
    }

    player.seek(position);
    await refreshPlayerMessage(client, interaction.guild.id);
    return successEmbed(t('music.seeked_title', {}, interaction), t('music.seeked_desc', { seconds }, interaction));
}

export async function removeFromQueue(client, interaction, index) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.queue?.length) {
        throw new TitanBotError('Empty queue', ErrorTypes.USER_INPUT, t('music.err_empty_queue', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    const queueIndex = index - 1;
    if (queueIndex < 0 || queueIndex >= player.queue.length) {
        throw new TitanBotError('Invalid index', ErrorTypes.USER_INPUT, t('music.err_invalid_index', { count: player.queue.length }, interaction));
    }

    const removed = player.queue[queueIndex];
    player.queue.remove(queueIndex);
    await refreshPlayerMessage(client, interaction.guild.id);
    return successEmbed(t('music.removed_title', {}, interaction), t('music.removed_desc', { title: removed.info?.title || 'track' }, interaction));
}

export async function moveInQueue(client, interaction, from, to) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.queue?.length) {
        throw new TitanBotError('Empty queue', ErrorTypes.USER_INPUT, t('music.err_empty_queue', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    const fromIndex = from - 1;
    const toIndex = to - 1;
    if (fromIndex < 0 || fromIndex >= player.queue.length || toIndex < 0 || toIndex >= player.queue.length) {
        throw new TitanBotError('Invalid index', ErrorTypes.USER_INPUT, t('music.err_invalid_positions', {}, interaction));
    }

    const track = player.queue[fromIndex];
    player.queue.remove(fromIndex);
    player.queue.splice(toIndex, 0, track);
    await refreshPlayerMessage(client, interaction.guild.id);
    return successEmbed(t('music.moved_title', {}, interaction), t('music.moved_desc', { title: track.info?.title || 'track', to }, interaction));
}

export async function clearQueue(client, interaction) {
    const player = getPlayer(client, interaction.guild.id);
    if (!player?.queue?.length) {
        throw new TitanBotError('Empty queue', ErrorTypes.USER_INPUT, t('music.err_empty_queue', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);
    player.queue.clear();
    await refreshPlayerMessage(client, interaction.guild.id);
    return successEmbed(t('music.cleared_title', {}, interaction), t('music.cleared_desc', {}, interaction));
}

export async function setTwentyFourSeven(client, interaction, enabled) {
    const guildData = getGuildMusicData(interaction.guild.id);
    guildData.twentyFourSeven = enabled;
    return successEmbed(
        t('music.mode_247_title', {}, interaction),
        enabled
            ? t('music.mode_247_enabled', {}, interaction)
            : t('music.mode_247_disabled', {}, interaction),
    );
}

export function buildNowPlayingReply(client, guildId, target = null) {
    const player = getPlayer(client, guildId);
    if (!player?.current) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_nothing_playing', {}, target || guildId));
    }
    const guildData = getGuildMusicData(guildId);
    return {
        embeds: [buildNowPlayingEmbed(player.current, player, guildData, target || guildId)],
    };
}

export function buildQueueReply(client, guildId, page = 0, target = null) {
    const player = getPlayer(client, guildId);
    if (!player) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_no_player', {}, target || guildId));
    }

    const totalPages = Math.max(1, Math.ceil((player.queue?.length || 0) / getQueuePageSize()));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);

    return {
        embeds: [buildQueueEmbed(player.queue, player.current, safePage, target || guildId)],
        components: totalPages > 1 ? [buildQueuePaginationRow(safePage, totalPages)] : [],
        page: safePage,
        totalPages,
    };
}

export async function destroyPlayerSession(client, guildId, player, guildData, { forceDisconnect = false } = {}) {
    clearUpdateInterval(guildData);
    if (guildData.idleTimeout) {
        clearTimeout(guildData.idleTimeout);
        guildData.idleTimeout = null;
    }

    guildData.previousTracks = [];
    guildData.stopConfirmPending = null;
    guildData.autoPaused = false;
    guildData.queuePages?.clear();

    if (guildData.playerMessageId && guildData.playerChannelId) {
        try {
            const channel = client.channels.cache.get(guildData.playerChannelId);
            if (channel) {
                const msg = await channel.messages.fetch(guildData.playerMessageId);
                await msg.delete();
            }
        } catch {
            // message already deleted
        }
    }

    guildData.playerMessageId = null;
    guildData.playerChannelId = null;

    if (player) {
        player.queue.clear();
        player.stop();
        if (forceDisconnect || !guildData.twentyFourSeven) {
            player.destroy();
        }
    }
}

export async function leaveVoiceChannel(client, interaction) {
    assertRiffyAvailable(client, interaction);

    const guildId = interaction.guild.id;
    const player = getPlayer(client, guildId);
    if (!player) {
        throw new TitanBotError('No player', ErrorTypes.USER_INPUT, t('music.err_not_in_vc', {}, interaction));
    }
    assertCanControl(interaction.member, player, interaction);

    const channel = interaction.guild.channels.cache.get(player.voiceChannel);
    const channelName = channel?.name || 'voice channel';
    const guildData = getGuildMusicData(guildId);

    await destroyPlayerSession(client, guildId, player, guildData, { forceDisconnect: true });

    return successEmbed(t('music.left_title', {}, interaction), t('music.left_desc', { channel: channelName }, interaction));
}

export async function replyMusicSuccess(interaction, embed) {
    const options = { embeds: [embed] };
    if (!interaction._isPrefixCommand) {
        options.flags = MessageFlags.Ephemeral;
    }
    await InteractionHelper.safeReply(interaction, options);
}
