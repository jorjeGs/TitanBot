import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Disc3,
  ExternalLink,
  User,
  Radio,
  Loader2,
} from 'lucide-react';

function formatDuration(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;

  if (hours > 0) {
    const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

export function MusicPlayerCard({
  status,
  onAction,
  loading = false,
}) {
  const { t } = useTranslation();

  const current = status?.current;
  const isPlaying = Boolean(status?.isPlaying);
  const isPaused = Boolean(status?.isPaused);
  const volume = status?.volume ?? 75;
  const loop = status?.loop || 'none';

  // Live Position ticker
  const [position, setPosition] = useState(current?.position || 0);
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    setPosition(current?.position || 0);
  }, [current?.position, current?.uri]);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  // Advance position ticker every second when actively playing
  useEffect(() => {
    if (!isPlaying || isPaused || !current?.duration) return;

    const interval = setInterval(() => {
      setPosition((prev) => {
        const next = prev + 1000;
        return next > current.duration ? current.duration : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, current?.duration]);

  if (!current) return null;

  const duration = current.duration || 0;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

  // Handle loop cycling: none -> track -> queue -> none
  const handleLoopCycle = () => {
    if (loading) return;
    let nextMode = 'none';
    if (loop === 'none') nextMode = 'track';
    else if (loop === 'track') nextMode = 'queue';
    else nextMode = 'none';
    onAction('loop', nextMode);
  };

  const handleVolumeCommit = (e) => {
    const newVol = Number(e.target.value);
    onAction('volume', newVol);
  };

  const getVolumeIcon = () => {
    if (localVolume === 0) return <VolumeX className="w-4 h-4 text-slate-400" />;
    if (localVolume < 50) return <Volume1 className="w-4 h-4 text-slate-300" />;
    return <Volume2 className="w-4 h-4 text-slate-200" />;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-discord-darker to-slate-900 border border-slate-700/80 shadow-2xl p-6 transition-all">
      {/* Background ambient blur effect */}
      {current.thumbnail && (
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cover bg-center opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundImage: `url(${current.thumbnail})` }}
        />
      )}

      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
        {/* Album Artwork with vinyl pulse glow */}
        <div className="relative group shrink-0">
          <div
            className={`w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden bg-slate-800 border-2 shadow-xl flex items-center justify-center transition-all ${
              isPlaying && !isPaused
                ? 'border-indigo-500/80 shadow-indigo-500/20 ring-4 ring-indigo-500/10'
                : 'border-slate-700'
            }`}
          >
            {current.thumbnail ? (
              <img
                src={current.thumbnail}
                alt={current.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying && !isPaused ? 'scale-105' : 'scale-100'
                }`}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <Disc3
                className={`w-16 h-16 text-slate-600 ${
                  isPlaying && !isPaused ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
              />
            )}
          </div>

          {/* Playing indicator badge */}
          <div className="absolute top-2 left-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border shadow-md ${
                isPlaying && !isPaused
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlaying && !isPaused ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              {isPlaying && !isPaused ? t('music.playing') : t('music.paused')}
            </span>
          </div>
        </div>

        {/* Track Info & Progress */}
        <div className="flex-1 w-full min-w-0 flex flex-col justify-between">
          <div>
            {/* Requester & Source Tag */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {current.requester && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                  <User className="w-3 h-3 text-indigo-400" />
                  <span>{t('music.requestedBy')}:</span>
                  <span className="font-semibold text-white">{current.requester.username}</span>
                </span>
              )}
              {status?.voiceChannel && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300">
                  <Radio className="w-3 h-3 text-indigo-400" />
                  <span>{status.voiceChannel.name}</span>
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight line-clamp-2 hover:text-indigo-300 transition-colors">
                {current.title}
              </h3>
              {current.uri && (
                <a
                  href={current.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
                  title={t('music.openSource')}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Artist / Author */}
            <p className="text-sm md:text-base text-slate-400 font-medium mt-1">
              {current.author}
            </p>
          </div>

          {/* Progress Slider / Bar */}
          <div className="mt-5">
            <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden cursor-default">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 font-mono mt-1.5">
              <span>{formatDuration(position)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Action Controls & Volume */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
            {/* Primary Playback buttons */}
            <div className="flex items-center gap-2">
              {/* Shuffle button */}
              <button
                type="button"
                onClick={() => onAction('shuffle')}
                disabled={loading}
                title={t('music.shuffle')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition-all disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={() => onAction(isPlaying && !isPaused ? 'pause' : 'resume')}
                disabled={loading}
                title={isPlaying && !isPaused ? t('music.pause') : t('music.resume')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying && !isPaused ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>{t('music.pause')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{t('music.resume')}</span>
                  </>
                )}
              </button>

              {/* Skip button */}
              <button
                type="button"
                onClick={() => onAction('skip')}
                disabled={loading}
                title={t('music.skip')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white transition-all disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Stop button */}
              <button
                type="button"
                onClick={() => onAction('stop')}
                disabled={loading}
                title={t('music.stop')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 border border-slate-700/80 text-slate-300 transition-all disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
              </button>

              {/* Loop button */}
              <button
                type="button"
                onClick={handleLoopCycle}
                disabled={loading}
                title={`${t('music.loop')}: ${loop.toUpperCase()}`}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                  loop !== 'none'
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {loop === 'track' ? (
                  <Repeat1 className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
                <span className="capitalize">{loop === 'none' ? t('music.loopOff') : loop}</span>
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2.5 min-w-[150px] max-w-[200px]">
              <button
                type="button"
                onClick={() => {
                  const targetVol = localVolume > 0 ? 0 : 75;
                  setLocalVolume(targetVol);
                  onAction('volume', targetVol);
                }}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title={t('music.muteUnmute')}
              >
                {getVolumeIcon()}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={localVolume}
                onChange={(e) => setLocalVolume(Number(e.target.value))}
                onMouseUp={handleVolumeCommit}
                onTouchEnd={handleVolumeCommit}
                disabled={loading}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <span className="text-xs font-mono text-slate-400 w-8 text-right">
                {localVolume}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
