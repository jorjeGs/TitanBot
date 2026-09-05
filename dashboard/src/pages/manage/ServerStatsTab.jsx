import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { ServerStatsPreview } from '../../components/preview/ServerStatsPreview';
import {
  BarChart2,
  Users,
  User,
  Bot,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Volume2,
  FolderTree,
  ShieldAlert,
} from 'lucide-react';

export function ServerStatsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels } = useGuild();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const [counters, setCounters] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, humanCount: 0, botCount: 0 });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['members', 'members_only', 'bots']);

  // Filter category channels
  const categories = (channels || []).filter((c) => c.type === 4);

  const fetchServerStatsData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/serverstats`);
      if (res.success) {
        setCounters(Array.isArray(res.counters) ? res.counters : []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load server stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStatsData();
  }, [guildId]);

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSetup = async () => {
    if (selectedTypes.length === 0) {
      setNotification({
        type: 'error',
        message: t('serverstats.errors.noTypeSelected') || 'Por favor selecciona al menos un tipo de contador.',
      });
      return;
    }

    try {
      setActionLoading(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/serverstats/setup`, {
        method: 'POST',
        body: JSON.stringify({
          types: selectedTypes,
          categoryId: selectedCategory || undefined,
        }),
      });

      if (res.success) {
        setCounters(res.counters || []);
        setNotification({
          type: 'success',
          message: t('serverstats.setupSuccess') || '¡Canales de estadísticas creados exitosamente en Discord!',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('serverstats.errors.setupFailed') || 'Error al crear contadores.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('serverstats.errors.setupFailed') || 'Error de conexión.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        t('serverstats.confirmDelete') ||
          '¿Estás seguro de que deseas eliminar todos los canales de estadísticas del servidor?'
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/serverstats`, {
        method: 'DELETE',
      });

      if (res.success) {
        setCounters([]);
        setNotification({
          type: 'success',
          message: t('serverstats.deleteSuccess') || 'Canales de estadísticas eliminados correctamente.',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('serverstats.errors.deleteFailed') || 'Error al eliminar contadores.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('serverstats.errors.deleteFailed') || 'Error de conexión.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
          <span className="text-sm text-slate-400">
            {t('common.loading') || 'Cargando estadísticas del servidor...'}
          </span>
        </div>
      </div>
    );
  }

  const activeTypes = counters.map((c) => c.type);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <BarChart2 className="w-7 h-7 text-emerald-400" />
          <span>{t('serverstats.title') || 'Estadísticas del Servidor (ServerStats)'}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('serverstats.subtitle') ||
            'Muestra el recuento de miembros, humanos y bots en tiempo real mediante canales de voz bloqueados.'}
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{notification.message}</div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Member Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-discord-blurple/15 text-discord-blurple flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {t('serverstats.totalMembers') || 'Miembros Totales'}
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              {stats.totalCount?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {t('serverstats.humanMembers') || 'Usuarios Humanos'}
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              {stats.humanCount?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {t('serverstats.botMembers') || 'Bots Integrados'}
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              {stats.botCount?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Management (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Setup Contadores */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <FolderTree className="w-5 h-5 text-discord-blurple" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('serverstats.configTitle') || 'Aprovisionamiento de Contadores'}
              </h2>
            </div>

            <div>
              <ChannelSelect
                label={t('serverstats.category') || 'Categoría Contenedora (Opcional)'}
                helpText={
                  t('serverstats.categoryHelp') ||
                  'Categoría donde se crearán los canales contadores. Si se deja vacía, se creará una categoría automática "📊 Server Stats".'
                }
                channels={categories}
                value={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-sm font-medium text-slate-300">
                {t('serverstats.selectCounters') || 'Selecciona los contadores a desplegar:'}
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('members')}
                    onChange={() => toggleType('members')}
                    className="w-4 h-4 rounded text-discord-blurple focus:ring-discord-blurple bg-discord-dark border-slate-700"
                  />
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span>👥</span>
                    <span className="font-medium">
                      {t('serverstats.membersCounter') || 'Miembros Totales (Humanos + Bots)'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('members_only')}
                    onChange={() => toggleType('members_only')}
                    className="w-4 h-4 rounded text-discord-blurple focus:ring-discord-blurple bg-discord-dark border-slate-700"
                  />
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span>👤</span>
                    <span className="font-medium">
                      {t('serverstats.humansCounter') || 'Usuarios Humanos Solamente'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('bots')}
                    onChange={() => toggleType('bots')}
                    className="w-4 h-4 rounded text-discord-blurple focus:ring-discord-blurple bg-discord-dark border-slate-700"
                  />
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span>🤖</span>
                    <span className="font-medium">
                      {t('serverstats.botsCounter') || 'Bots Integrados Solamente'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              {counters.length > 0 ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('serverstats.deleteButton') || 'Eliminar Contadores'}</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleSetup}
                disabled={actionLoading || selectedTypes.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>
                  {counters.length > 0
                    ? t('serverstats.syncButton') || 'Sincronizar / Actualizar'
                    : t('serverstats.setupButton') || 'Crear Canales de Estadísticas'}
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Active Counters State */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">
                {t('serverstats.activeCounters') || 'Canales Contadores Activos'} ({counters.length})
              </h3>
              <span className="text-xs text-slate-400">
                {counters.length > 0 ? 'Conectados' : 'Sin contadores'}
              </span>
            </div>

            {counters.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-900/30 rounded-lg">
                {t('serverstats.noCounters') ||
                  'No hay canales contadores creados. Haz clic en "Crear Canales de Estadísticas" arriba para desplegarlos.'}
              </p>
            ) : (
              <div className="space-y-2">
                {counters.map((c) => (
                  <div
                    key={c.id || c.channelId}
                    className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-2.5">
                      <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-slate-200 block">
                          {c.channelName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {c.channelId}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                      Activo
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <ServerStatsPreview
            stats={stats}
            enabledTypes={counters.length > 0 ? activeTypes : selectedTypes}
          />
        </div>
      </div>
    </div>
  );
}
