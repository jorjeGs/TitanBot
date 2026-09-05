import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { MusicPlayerCard } from '../../components/preview/MusicPlayerCard';
import {
  Disc3,
  Radio,
  Wifi,
  WifiOff,
  ListMusic,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Clock,
  Shuffle,
  Square,
  Sparkles,
  Loader2,
  Music,
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

export function MusicTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await apiFetch(`/guilds/${guildId}/music/status`);
      if (isMountedRef.current) {
        setStatus(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setFeedback({
          type: 'error',
          message: err.message || t('music.fetchError'),
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    }
  }, [guildId, t]);

  // Initial fetch and 4-second polling to synchronize state with Discord bot
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Auto-dismiss feedback message after 4 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleAction = async (action, value) => {
    setActionLoading(true);
    try {
      await apiFetch(`/guilds/${guildId}/music/action`, {
        method: 'POST',
        body: JSON.stringify({ action, value }),
      });
      // Refresh status immediately
      await fetchStatus();
      setFeedback({
        type: 'success',
        message: t(`music.actions.${action}Success`, `Action '${action}' applied successfully.`),
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || t('music.actionError'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const isNodeConnected = status?.nodes?.some((n) => n.connected) ?? false;
  const queueLength = status?.queue?.length || 0;
  const totalQueueDuration = status?.queue?.reduce((acc, tr) => acc + (tr.duration || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Disc3 className="w-6 h-6 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {t('music.title', 'Reproductor de Música en Vivo')}
              </h1>
              <p className="text-sm text-slate-400">
                {t('music.subtitle', 'Monitorea y controla la reproducción de audio de TitanBot en tiempo real.')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-sm font-medium text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('common.refresh', 'Actualizar')}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="flex-1">{feedback.message}</span>
        </div>
      )}

      {/* System Status Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Node status */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-lg ${
              isNodeConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isNodeConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('music.nodeStatus', 'Servidor Lavalink')}</p>
            <p className="text-sm font-semibold text-white">
              {isNodeConnected ? t('music.nodeConnected', 'Conectado') : t('music.nodeDisconnected', 'Desconectado')}
            </p>
          </div>
        </div>

        {/* Voice Channel */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-lg ${
              status?.voiceChannel
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">{t('music.voiceChannel', 'Canal de Voz')}</p>
            <p className="text-sm font-semibold text-white truncate">
              {status?.voiceChannel ? status.voiceChannel.name : t('music.noVoiceChannel', 'No conectado')}
            </p>
          </div>
        </div>

        {/* Queue Count */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('music.queueTracks', 'En Cola')}</p>
            <p className="text-sm font-semibold text-white">
              {t('music.queueCount', '{{count}} pistas', { count: queueLength })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">{t('music.loadingStatus', 'Cargando estado de música...')}</p>
        </div>
      ) : status?.current ? (
        <div className="space-y-6">
          {/* Active Player Card */}
          <MusicPlayerCard
            status={status}
            onAction={handleAction}
            loading={actionLoading}
          />

          {/* Queue Section */}
          <div className="rounded-2xl bg-discord-darker border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">
                  {t('music.queueTitle', 'Cola de Reproducción')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {queueLength}
                </span>
                {totalQueueDuration > 0 && (
                  <span className="text-xs text-slate-400 ml-2">
                    ({formatDuration(totalQueueDuration)})
                  </span>
                )}
              </div>

              {queueLength > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction('shuffle')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{t('music.shuffleQueue', 'Mezclar')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('stop')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 text-xs font-medium text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>{t('music.clearQueue', 'Detener')}</span>
                  </button>
                </div>
              )}
            </div>

            {queueLength === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Music className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-medium text-slate-300">
                  {t('music.queueEmpty', 'No hay más canciones en la cola')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {t('music.queueEmptyHint', 'Usa /play en Discord para agregar canciones a la lista.')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {status.queue.map((track, idx) => (
                  <div
                    key={`${track.uri || track.title}-${idx}`}
                    className="flex items-center gap-4 p-4 hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="w-6 text-center text-xs font-mono text-slate-500 shrink-0">
                      #{track.index || idx + 1}
                    </span>

                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Disc3 className="w-6 h-6 text-slate-600" />
                      )}
                    </div>

                    {/* Track Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate hover:text-indigo-300 transition-colors">
                          {track.title}
                        </p>
                        {track.uri && (
                          <a
                            href={track.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{track.author}</p>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State when no music is playing */
        <div className="p-8 sm:p-12 rounded-2xl bg-discord-darker border border-slate-800 text-center shadow-xl">
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6 shadow-inner">
            <Disc3 className="w-12 h-12 animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {t('music.emptyTitle', 'No hay música en reproducción')}
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base mb-8">
            {t(
              'music.emptyDescription',
              'TitanBot está disponible para reproducir música en alta calidad. Conéctate a un canal de voz e inicia la música usando comandos de Discord.'
            )}
          </p>

          {/* Quick Discord Command Helpers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-mono font-semibold text-xs mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>/play &lt;canción&gt;</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('music.cmdPlay', 'Reproduce pistas de YouTube, Spotify o SoundCloud.')}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-mono font-semibold text-xs mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>/join</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('music.cmdJoin', 'Invita a TitanBot a tu canal de voz actual.')}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-mono font-semibold text-xs mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>/music</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('music.cmdMusic', 'Abre el controlador visual con botones en Discord.')}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-mono font-semibold text-xs mb-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>/queue</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('music.cmdQueue', 'Consulta las canciones en cola desde Discord.')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
