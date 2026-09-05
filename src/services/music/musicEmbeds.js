import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getPaginationRow } from '../../utils/components.js';
import { t } from '../../utils/i18n/index.js';

const QUEUE_PAGE_SIZE = 10;

export const MUSIC_BUTTON_IDS = {
    PAUSE: 'music_pause',
    RESUME: 'music_resume',
    SKIP: 'music_skip',
    STOP: 'music_stop',
    SHUFFLE: 'music_shuffle',
    LOOP: 'music_loop',
    VOL_DOWN: 'music_vol_down',
    VOL_UP: 'music_vol_up',
    QUEUE: 'music_queue',
    QUEUE_FIRST: 'music_queue_first',
    QUEUE_PREV: 'music_queue_prev',
    QUEUE_NEXT: 'music_queue_next',
    QUEUE_LAST: 'music_queue_last',
};

export function formatDuration(ms) {
    if (!ms || Number.isNaN(ms)) {
        return 'Live';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getTrackArtwork(track) {
    return track?.info?.artworkUrl || track?.info?.thumbnail || null;
}

function getLoopLabel(loop, target) {
    switch (loop) {
        case 'track':
            return t('music.loop_track', {}, target);
        case 'queue':
            return t('music.loop_queue', {}, target);
        default:
            return t('music.loop_off', {}, target);
    }
}

export function buildNowPlayingEmbed(track, player, guildData, target = null) {
    const requester = track?.info?.requester;
    const requesterLabel = requester
        ? (requester.username || requester.tag || 'Unknown')
        : 'Unknown';

    const position = formatDuration(player?.position || 0);
    const duration = formatDuration(track?.info?.length || 0);

    return createEmbed({
        title: t('music.now_playing_title', {}, target),
        description: track?.info?.title || 'Unknown track',
        color: 'primary',
        fields: [
            { name: t('music.field_artist', {}, target), value: track?.info?.author || 'Unknown', inline: true },
            { name: t('music.field_requester', {}, target), value: requesterLabel, inline: true },
            { name: t('music.field_progress', {}, target), value: `${position} / ${duration}`, inline: true },
            { name: t('music.field_volume', {}, target), value: `${guildData?.volume ?? 75}%`, inline: true },
            { name: t('music.field_loop', {}, target), value: getLoopLabel(guildData?.loop, target), inline: true },
            { name: t('music.field_queue', {}, target), value: `${player?.queue?.length || 0} track(s)`, inline: true },
        ],
        thumbnail: getTrackArtwork(track),
        footer: player?.paused ? t('music.status_paused', {}, target) : t('music.status_playing', {}, target),
    });
}

export function buildQueueEmbed(queue, currentTrack, page = 0, target = null) {
    const totalTracks = queue?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalTracks / QUEUE_PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    const start = safePage * QUEUE_PAGE_SIZE;
    const slice = queue?.slice(start, start + QUEUE_PAGE_SIZE) || [];

    let description = '';
    if (currentTrack) {
        description += t('music.queue_now_playing', {
            title: currentTrack.info?.title || 'Unknown',
            author: currentTrack.info?.author || 'Unknown'
        }, target);
    }

    if (slice.length === 0) {
        description += t('music.queue_empty', {}, target);
    } else {
        description += slice
            .map((track, index) => {
                const num = start + index + 1;
                return `${num}. ${track.info?.title || 'Unknown'} — ${track.info?.author || 'Unknown'}`;
            })
            .join('\n');
    }

    return createEmbed({
        title: t('music.queue_title', {}, target),
        description: description.substring(0, 4096),
        color: 'info',
        footer: t('music.queue_footer', {
            page: safePage + 1,
            pages: totalPages,
            total: totalTracks
        }, target),
    });
}

export function buildPlayerButtonRows(player, guildData, target = null) {
    const paused = player?.paused;
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.PAUSE)
            .setLabel(t('music.btn_pause', {}, target))
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⏸️')
            .setDisabled(Boolean(paused)),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.RESUME)
            .setLabel(t('music.btn_resume', {}, target))
            .setStyle(ButtonStyle.Success)
            .setEmoji('▶️')
            .setDisabled(!paused),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.SKIP)
            .setLabel(t('music.btn_skip', {}, target))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏭️'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.STOP)
            .setLabel(t('music.btn_stop', {}, target))
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⏹️'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.SHUFFLE)
            .setLabel(t('music.btn_shuffle', {}, target))
            .setStyle(guildData?.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🔀'),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.LOOP)
            .setLabel(t('music.btn_loop', {}, target))
            .setStyle(guildData?.loop !== 'none' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji('🔁'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.VOL_DOWN)
            .setLabel(t('music.btn_vol_down', {}, target))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔉'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.VOL_UP)
            .setLabel(t('music.btn_vol_up', {}, target))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔊'),
        new ButtonBuilder()
            .setCustomId(MUSIC_BUTTON_IDS.QUEUE)
            .setLabel(t('music.btn_queue', {}, target))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
    );

    return [row1, row2];
}

export function buildQueuePaginationRow(page, totalPages) {
    return getPaginationRow('music_queue', page + 1, totalPages);
}

export function getQueuePageSize() {
    return QUEUE_PAGE_SIZE;
}
