import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { GiveawayPreview } from '../../components/preview/GiveawayPreview';
import {
  Gift,
  PlusCircle,
  Clock,
  Award,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Trash2,
  StopCircle,
  Calendar,
  Hash,
  Sparkles,
  Search,
} from 'lucide-react';

export function GiveawaysTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  const [activeGiveaways, setActiveGiveaways] = useState([]);
  const [endedGiveaways, setEndedGiveaways] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Creation form state
  const [prize, setPrize] = useState('');
  const [channelId, setChannelId] = useState('');
  const [durationValue, setDurationValue] = useState(60);
  const [durationUnit, setDurationUnit] = useState('m'); // 'm', 'h', 'd'
  const [winnerCount, setWinnerCount] = useState(1);
  const [requiredRoleId, setRequiredRoleId] = useState('');

  // Live timer tick for real-time countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter text channels
  const textChannels = (channels || []).filter((c) => c.type === 0 || !c.type);

  // Set default channel when channels load
  useEffect(() => {
    if (!channelId && textChannels.length > 0) {
      setChannelId(textChannels[0].id);
    }
  }, [textChannels, channelId]);

  const fetchGiveaways = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/giveaways`);
      if (res.success) {
        setActiveGiveaways(Array.isArray(res.active) ? res.active : []);
        setEndedGiveaways(Array.isArray(res.ended) ? res.ended : []);
      }
    } catch (err) {
      console.error('Failed to load giveaways:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiveaways();
  }, [guildId]);

  // Compute duration in minutes for preview and API
  const calculateTotalMinutes = () => {
    const val = Math.max(1, parseInt(durationValue, 10) || 1);
    if (durationUnit === 'h') return val * 60;
    if (durationUnit === 'd') return val * 1440;
    return val;
  };

  const selectedChannel = (channels || []).find((c) => c.id === channelId);
  const selectedRole = (roles || []).find((r) => r.id === requiredRoleId);

  const handleCreateGiveaway = async (e) => {
    e.preventDefault();
    if (!prize.trim()) {
      setNotification({
        type: 'error',
        message: t('giveaways.errors.prizeRequired') || 'Debes ingresar un premio válido.',
      });
      return;
    }
    if (!channelId) {
      setNotification({
        type: 'error',
        message: t('giveaways.errors.channelRequired') || 'Debes seleccionar un canal de texto.',
      });
      return;
    }

    try {
      setCreating(true);
      setNotification(null);

      const durationMinutes = calculateTotalMinutes();
      const payload = {
        prize: prize.trim(),
        channelId,
        durationMinutes,
        winnerCount: parseInt(winnerCount, 10) || 1,
        requiredRoleId: requiredRoleId || null,
      };

      const res = await apiFetch(`/guilds/${guildId}/giveaways`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('giveaways.createSuccess') || '¡Sorteo iniciado exitosamente en Discord!',
        });
        setPrize('');
        setWinnerCount(1);
        setRequiredRoleId('');
        await fetchGiveaways();
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('giveaways.errors.createFailed') || 'No se pudo crear el sorteo.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('giveaways.errors.createFailed') || 'Error al conectar con el servidor.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEndNow = async (messageId) => {
    try {
      setActionLoading(`end-${messageId}`);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/giveaways/${messageId}/end`, {
        method: 'POST',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('giveaways.endSuccess') || '¡Sorteo finalizado exitosamente!',
        });
        await fetchGiveaways();
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('giveaways.errors.endFailed') || 'Error al finalizar el sorteo.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('giveaways.errors.endFailed') || 'Error de conexión.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReroll = async (messageId) => {
    try {
      setActionLoading(`reroll-${messageId}`);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/giveaways/${messageId}/reroll`, {
        method: 'POST',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('giveaways.rerollSuccess') || '¡Nuevos ganadores elegidos con éxito!',
        });
        await fetchGiveaways();
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('giveaways.errors.rerollFailed') || 'Error al sortear nuevos ganadores.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('giveaways.errors.rerollFailed') || 'Error de conexión.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm(t('giveaways.confirmDelete') || '¿Deseas eliminar este registro de sorteo?')) {
      return;
    }

    try {
      setActionLoading(`delete-${messageId}`);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/giveaways/${messageId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('giveaways.deleteSuccess') || 'Sorteo eliminado correctamente.',
        });
        await fetchGiveaways();
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('giveaways.errors.deleteFailed') || 'Error al eliminar el sorteo.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('giveaways.errors.deleteFailed') || 'Error de conexión.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatCountdown = (endTime) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return t('giveaways.statusEnding') || 'Finalizando...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h ${minutes}m`;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const filteredEndedGiveaways = endedGiveaways.filter((g) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (g.prize || '').toLowerCase().includes(term) ||
      (g.channelName || '').toLowerCase().includes(term) ||
      (g.messageId || '').includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
          <p className="text-sm text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Gift className="w-7 h-7 text-discord-blurple" />
            <span>{t('giveaways.title') || 'Sorteos y Recompensas'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('giveaways.subtitle') ||
              'Crea, supervisa y automatiza sorteos interactivos en canales de Discord con verificación de roles y selección transparente de ganadores.'}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchGiveaways}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-discord-dark hover:bg-slate-700/60 text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-700/60 shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('giveaways.refreshBtn') || 'Actualizar'}</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-md animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
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

      {/* SECTION 1: Active Giveaways Live Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              {t('giveaways.activeGiveawaysTitle') || 'Sorteos Activos en Vivo'}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30">
            {activeGiveaways.length} {t('giveaways.activeBadge') || 'activos'}
          </span>
        </div>

        {activeGiveaways.length === 0 ? (
          <div className="bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {t('giveaways.noActiveGiveaways') || 'No hay sorteos activos en este momento.'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t('giveaways.noActiveGiveawaysHelp') ||
                'Utiliza el formulario de abajo para lanzar un nuevo sorteo interactivo en cualquiera de tus canales de Discord.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeGiveaways.map((g) => {
              const isEnding = actionLoading === `end-${g.messageId}`;
              return (
                <div
                  key={g.messageId}
                  className="bg-discord-darker/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-discord-blurple font-medium bg-discord-blurple/10 px-2 py-0.5 rounded border border-discord-blurple/20 truncate">
                        <Hash className="w-3 h-3 shrink-0" />
                        <span className="truncate">{g.channelName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatCountdown(g.endTime || g.endsAt)}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-2 leading-snug" title={g.prize}>
                        🎉 {g.prize}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-[#1e1f22] p-2 rounded border border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                          {t('giveaways.winners') || 'Ganadores'}
                        </span>
                        <span className="font-semibold text-slate-200">
                          {g.winnerCount || 1}
                        </span>
                      </div>
                      <div className="bg-[#1e1f22] p-2 rounded border border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                          {t('giveaways.participants') || 'Participantes'}
                        </span>
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {g.participantCount || 0}
                        </span>
                      </div>
                    </div>

                    {g.requiredRoleName && (
                      <div className="text-[11px] text-slate-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded truncate">
                        <span className="text-amber-400 font-medium">Requisito:</span> @{g.requiredRoleName}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      ID: {g.messageId?.slice(-6)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEndNow(g.messageId)}
                      disabled={isEnding}
                      className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isEnding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <StopCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{t('giveaways.endNowBtn') || 'Finalizar Ya'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Create Giveaway Form + Live Preview */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <PlusCircle className="w-5 h-5 text-discord-blurple" />
          <div>
            <h2 className="text-base font-bold text-white">
              {t('giveaways.createCardTitle') || 'Lanzar Nuevo Sorteo'}
            </h2>
            <p className="text-xs text-slate-400">
              {t('giveaways.createCardSubtitle') ||
                'Personaliza el premio, canal de destino, tiempo límite y requisitos de rol antes de publicarlo en Discord.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Creator Form Fields */}
          <form onSubmit={handleCreateGiveaway} className="lg:col-span-7 space-y-5">
            {/* Prize field */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                {t('giveaways.fieldPrize') || 'Premio del Sorteo'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                maxLength={256}
                required
                placeholder={t('giveaways.fieldPrizePlaceholder') || 'Ej: Discord Nitro 1 Mes, Steam Card $20, Rol VIP'}
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
              />
            </div>

            {/* Target Channel */}
            <ChannelSelect
              label={t('giveaways.fieldChannel') || 'Canal de Publicación'}
              helpText={t('giveaways.fieldChannelHelp') || 'Canal de texto donde el bot publicará el embed y los botones.'}
              channels={textChannels}
              value={channelId}
              onChange={(val) => setChannelId(val)}
            />

            {/* Duration Input & Units */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                {t('giveaways.fieldDuration') || 'Duración del Sorteo'} <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={durationValue}
                    onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  />
                </div>
                <div>
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  >
                    <option value="m">{t('giveaways.units.minutes') || 'Minutos'}</option>
                    <option value="h">{t('giveaways.units.hours') || 'Horas'}</option>
                    <option value="d">{t('giveaways.units.days') || 'Días'}</option>
                  </select>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {t('giveaways.durationHelp') || 'El sorteo finalizará automáticamente al cumplirse el tiempo seleccionado.'}
              </p>
            </div>

            {/* Winners count and Required Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                  {t('giveaways.fieldWinners') || 'Número de Ganadores (1-10)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={winnerCount}
                  onChange={(e) => setWinnerCount(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                />
              </div>

              <RoleSelect
                label={t('giveaways.fieldRequiredRole') || 'Rol Requerido (Opcional)'}
                helpText={t('giveaways.fieldRequiredRoleHelp') || 'Solo miembros con este rol podrán registrarse.'}
                roles={roles || []}
                value={requiredRoleId}
                onChange={(val) => setRequiredRoleId(val)}
              />
            </div>

            {/* Launch Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={creating || !prize.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-discord-blurple hover:bg-discord-blurple/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-discord-blurple/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('giveaways.launching') || 'Iniciando en Discord...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('giveaways.launchBtn') || 'Iniciar Sorteo en Discord'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live Discord Embed Preview */}
          <div className="lg:col-span-5 sticky top-6">
            <GiveawayPreview
              prize={prize}
              channelName={selectedChannel?.name || 'general'}
              durationMinutes={calculateTotalMinutes()}
              winnerCount={winnerCount}
              requiredRoleName={selectedRole?.name}
              hostName={currentGuild?.name || 'TitanBot Admin'}
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: Ended Giveaways History Table */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span>{t('giveaways.endedTitle') || 'Historial de Sorteos Finalizados'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('giveaways.endedSubtitle') ||
                'Consulta ganadores pasados, genera nuevos ganadores (reroll) o limpia registros antiguos.'}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('giveaways.searchPlaceholder') || 'Buscar por premio o canal...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
            />
          </div>
        </div>

        {filteredEndedGiveaways.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {endedGiveaways.length === 0
              ? t('giveaways.noEndedGiveaways') || 'Aún no se han completado sorteos en este servidor.'
              : t('giveaways.noSearchResults') || 'No se encontraron sorteos que coincidan con la búsqueda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="pb-3 px-3">{t('giveaways.tableColPrize') || 'Premio'}</th>
                  <th className="pb-3 px-3">{t('giveaways.tableColChannel') || 'Canal'}</th>
                  <th className="pb-3 px-3">{t('giveaways.tableColParticipants') || 'Participantes'}</th>
                  <th className="pb-3 px-3">{t('giveaways.tableColWinners') || 'Ganadores'}</th>
                  <th className="pb-3 px-3 text-right">{t('giveaways.tableColActions') || 'Acciones'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredEndedGiveaways.map((g) => {
                  const isRerolling = actionLoading === `reroll-${g.messageId}`;
                  const isDeleting = actionLoading === `delete-${g.messageId}`;
                  const winnersList = Array.isArray(g.winnerIds) && g.winnerIds.length > 0
                    ? g.winnerIds.map((id) => `<@${id}>`).join(', ')
                    : (t('giveaways.noWinners') || 'Sin ganadores');

                  return (
                    <tr key={g.messageId} className="hover:bg-discord-dark/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-100 max-w-[200px] truncate">
                        🎉 {g.prize}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div className="flex items-center gap-1 text-slate-300 font-mono">
                          <Hash className="w-3 h-3 text-slate-500" />
                          <span>{g.channelName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Users className="w-3 h-3 text-slate-500" />
                          {g.participantCount || 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        <span className="bg-[#1e1f22] px-2 py-0.5 rounded text-[11px] font-mono text-amber-300 border border-amber-500/20">
                          {winnersList}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleReroll(g.messageId)}
                            disabled={isRerolling || isDeleting}
                            title={t('giveaways.rerollTooltip') || 'Elegir nuevos ganadores'}
                            className="px-2.5 py-1.5 bg-discord-blurple/15 hover:bg-discord-blurple/25 text-discord-blurple border border-discord-blurple/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {isRerolling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span>{t('giveaways.rerollBtn') || 'Reroll'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(g.messageId)}
                            disabled={isRerolling || isDeleting}
                            title={t('giveaways.deleteTooltip') || 'Eliminar registro'}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
