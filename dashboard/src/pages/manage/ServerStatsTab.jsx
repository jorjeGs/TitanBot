import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { ServerStatsPreview } from '../../components/preview/ServerStatsPreview';
import {
  BarChart2,
  TrendingUp,
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
  MessageSquare,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Flame,
  Hash,
  RefreshCw,
} from 'lucide-react';

export function ServerStatsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels } = useGuild();

  const [activeSubTab, setActiveSubTab] = useState('insights'); // 'insights' | 'counters'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Counter channels state
  const [counters, setCounters] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, humanCount: 0, botCount: 0 });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['members', 'members_only', 'bots']);

  // Insights Analytics state
  const [rangeDays, setRangeDays] = useState(30);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

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

  const fetchInsightsData = async () => {
    try {
      setInsightsLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/insights/overview?range=${rangeDays}`);
      if (res.success) {
        setInsights(res);
      }
    } catch (err) {
      console.error('Failed to load insights data:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStatsData();
    fetchInsightsData();
  }, [guildId]);

  useEffect(() => {
    if (activeSubTab === 'insights') {
      fetchInsightsData();
    }
  }, [guildId, rangeDays, activeSubTab]);

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

  // Day names for 7x24 heatmap (Sunday=0 .. Saturday=6)
  const dayLabels = [
    t('insights.days.sun') || 'Dom',
    t('insights.days.mon') || 'Lun',
    t('insights.days.tue') || 'Mar',
    t('insights.days.wed') || 'Mié',
    t('insights.days.thu') || 'Jue',
    t('insights.days.fri') || 'Vie',
    t('insights.days.sat') || 'Sáb',
  ];

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

  // Calculate max heatmap message count for relative cell brightness
  let maxHeatmapVal = 1;
  if (insights?.heatmap?.matrix) {
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const val = insights.heatmap.matrix[d]?.[h] || 0;
        if (val > maxHeatmapVal) maxHeatmapVal = val;
      }
    }
  }

  // Calculate maximum values for growth chart scaling
  const historyData = insights?.history || [];
  const maxGrowthValue = Math.max(
    1,
    ...historyData.map((d) => Math.max(d.joins || 0, d.leaves || 0, Math.abs(d.net || 0)))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-slate-800/40 to-discord-blurple/15 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <BarChart2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {t('serverstats.title') || 'Estadísticas del Servidor'}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                {t('serverstats.subtitle') ||
                  'Analiza el crecimiento, la actividad del chat y configura contadores en canales de voz en tiempo real.'}
              </p>
            </div>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex items-center bg-discord-dark p-1 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveSubTab('insights')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'insights'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('serverstats.subtabs.insights') || 'Analíticas y Crecimiento'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('counters')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'counters'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t('serverstats.subtabs.counters') || 'Canales Contadores'}</span>
            </button>
          </div>
        </div>
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
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: INSIGHTS & ANALYTICS */}
      {activeSubTab === 'insights' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-discord-darker/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('insights.rangeLabel') || 'Período:'}
              </span>
              <div className="flex items-center bg-discord-dark rounded-xl p-1 border border-slate-700/60 text-xs">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setRangeDays(d)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      rangeDays === d
                        ? 'bg-discord-blurple text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d} {t('insights.daysUnit') || 'días'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={fetchInsightsData}
              disabled={insightsLoading}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-discord-dark hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh') || 'Actualizar'}</span>
            </button>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Members */}
            <div className="bg-discord-dark border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('insights.kpi.totalMembers') || 'Miembros Totales'}</span>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono">
                  {insights?.totalMembers?.toLocaleString() || stats.totalCount || 0}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+{insights?.growth30d || 0}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {t('insights.kpi.growthHint', { days: rangeDays }) || `Crecimiento neto en los últimos ${rangeDays} días`}
              </p>
            </div>

            {/* Net Growth */}
            <div className="bg-discord-dark border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('insights.kpi.netGrowth') || 'Balance Neto'}</span>
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-bold font-mono ${
                    (insights?.growth7d || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {(insights?.growth7d || 0) >= 0 ? `+${insights?.growth7d || 0}` : insights?.growth7d}
                </span>
                <span className="text-xs text-slate-400">/ 7 {t('insights.daysUnit') || 'días'}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {t('insights.kpi.netGrowthHint') || 'Nuevas uniones menos salidas registradas'}
              </p>
            </div>

            {/* Total Messages */}
            <div className="bg-discord-dark border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('insights.kpi.messages') || 'Mensajes de Chat'}</span>
                <MessageSquare className="w-5 h-5 text-discord-blurple" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono">
                  {insights?.messages7d?.toLocaleString() || 0}
                </span>
                <span className="text-xs text-slate-400">/ 7 {t('insights.daysUnit') || 'días'}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {t('insights.kpi.messagesToday') || 'Hoy'}: <strong className="text-slate-300 font-mono">+{insights?.messagesToday || 0}</strong>
              </p>
            </div>

            {/* Peak Activity Time */}
            <div className="bg-discord-dark border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">{t('insights.kpi.peakActivity') || 'Momento Más Activo'}</span>
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-lg font-bold text-white block truncate">
                  {dayLabels[insights?.peakDay ?? 5]} • {String(insights?.peakHour ?? 18).padStart(2, '0')}:00 UTC
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('insights.kpi.peakActivityHint') || 'Hora y día de mayor concurrencia en chat'}
                </p>
              </div>
            </div>
          </div>

          {/* Growth Chart Section */}
          <div className="bg-discord-dark border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>{t('insights.growthChartTitle') || 'Tendencia de Miembros (Uniones vs Salidas)'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('insights.growthChartSubtitle') ||
                    'Visualiza el flujo diario de personas que ingresan y abandonan el servidor.'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span className="text-slate-300">{t('insights.joins') || 'Uniones'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-500 inline-block" />
                  <span className="text-slate-300">{t('insights.leaves') || 'Salidas'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-discord-blurple inline-block" />
                  <span className="text-slate-300">{t('insights.total') || 'Total'}</span>
                </div>
              </div>
            </div>

            {/* Interactive SVG / Bar Growth Chart */}
            <div className="h-64 flex items-end gap-2 pt-6 pb-2 overflow-x-auto">
              {historyData.map((day, idx) => {
                const joinH = Math.min(100, Math.round(((day.joins || 0) / maxGrowthValue) * 100));
                const leaveH = Math.min(100, Math.round(((day.leaves || 0) / maxGrowthValue) * 100));
                const shortDate = day.date?.slice(5) || ''; // 'MM-DD'

                return (
                  <div
                    key={day.date || idx}
                    className="flex-1 min-w-[20px] max-w-[36px] flex flex-col items-center gap-1 h-full justify-end group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col z-20 bg-discord-darkest border border-slate-700 rounded-xl p-2.5 shadow-2xl text-[11px] whitespace-nowrap pointer-events-none">
                      <strong className="text-white mb-1">{day.date}</strong>
                      <span className="text-emerald-400">+{day.joins || 0} {t('insights.joins') || 'uniones'}</span>
                      <span className="text-red-400">-{day.leaves || 0} {t('insights.leaves') || 'salidas'}</span>
                      <span className="text-indigo-300 font-semibold mt-0.5">
                        Total: {day.totalMembers || 0}
                      </span>
                    </div>

                    {/* Bars */}
                    <div className="w-full flex items-end justify-center gap-1 h-44">
                      <div
                        style={{ height: `${Math.max(4, joinH)}%` }}
                        className="w-2 rounded-t bg-emerald-500/80 group-hover:bg-emerald-400 transition-all"
                      />
                      <div
                        style={{ height: `${Math.max(4, leaveH)}%` }}
                        className="w-2 rounded-t bg-red-500/80 group-hover:bg-red-400 transition-all"
                      />
                    </div>

                    {/* X-axis label */}
                    <span className="text-[10px] text-slate-500 font-mono tracking-tighter truncate w-full text-center">
                      {idx % (rangeDays > 14 ? 3 : 1) === 0 ? shortDate : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7x24 Weekly Activity Heatmap */}
          <div className="bg-discord-dark border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>{t('insights.heatmapTitle') || 'Mapa de Calor de Actividad Semanal (7 Días × 24 Horas)'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('insights.heatmapSubtitle') ||
                    'Identifica las franjas horarias y días de mayor dinamismo y participación comunitaria.'}
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{t('insights.lessActive') || 'Poco activo'}</span>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-[#1e2024] border border-slate-700/40" />
                  <span className="w-3.5 h-3.5 rounded bg-indigo-900/60" />
                  <span className="w-3.5 h-3.5 rounded bg-indigo-600/80" />
                  <span className="w-3.5 h-3.5 rounded bg-discord-blurple" />
                </div>
                <span>{t('insights.moreActive') || 'Muy activo'}</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[700px] space-y-1.5">
                {/* Hours Header (00 to 23) */}
                <div className="grid grid-cols-25 gap-1 text-[10px] text-slate-500 font-mono text-center">
                  <span className="w-10 text-left font-sans text-slate-400" />
                  {Array.from({ length: 24 }).map((_, hr) => (
                    <span key={hr}>{hr % 2 === 0 ? hr : ''}</span>
                  ))}
                </div>

                {/* 7 Days Rows */}
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <div key={day} className="grid grid-cols-25 gap-1 items-center">
                    <span className="w-10 text-xs font-semibold text-slate-400 truncate">
                      {dayLabels[day]}
                    </span>
                    {Array.from({ length: 24 }).map((_, hr) => {
                      const count = insights?.heatmap?.matrix?.[day]?.[hr] || 0;
                      const ratio = count / maxHeatmapVal;

                      let bgClass = 'bg-[#1e2024] border border-slate-800/80';
                      if (count > 0 && ratio < 0.25) bgClass = 'bg-indigo-950/70 border border-indigo-900/40';
                      else if (ratio >= 0.25 && ratio < 0.6) bgClass = 'bg-indigo-700/80 text-white';
                      else if (ratio >= 0.6) bgClass = 'bg-discord-blurple text-white shadow-sm shadow-discord-blurple/30';

                      return (
                        <div
                          key={hr}
                          onMouseEnter={() => setHoveredCell({ day, hr, count })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`h-7 rounded-md flex items-center justify-center transition-all cursor-pointer hover:scale-110 hover:ring-2 hover:ring-white/80 ${bgClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

                {/* Hovered Cell Info Footer */}
                <div className="h-6 flex items-center justify-end text-xs text-slate-400 pr-2">
                  {hoveredCell ? (
                    <span>
                      <strong className="text-white">{dayLabels[hoveredCell.day]} {String(hoveredCell.hr).padStart(2, '0')}:00 UTC</strong>: {hoveredCell.count} {t('insights.messages') || 'mensajes'}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">{t('insights.hoverHeatmapHint') || 'Pasa el cursor sobre una celda para ver detalles'}</span>
                  )}
                </div>
            </div>
          </div>

          {/* Top Channels Distribution */}
          <div className="bg-discord-dark border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                <span>{t('insights.topChannelsTitle') || 'Canales Más Activos de la Comunidad'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('insights.topChannelsSubtitle') ||
                  'Distribución porcentual del volumen de mensajes enviados en cada canal de texto.'}
              </p>
            </div>

            {(!insights?.topChannels || insights.topChannels.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                {t('insights.noChannelsData') || 'No se han registrado mensajes suficientes en canales de texto todavía.'}
              </p>
            ) : (
              <div className="space-y-3.5">
                {insights.topChannels.slice(0, 6).map((ch, idx) => (
                  <div key={ch.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 font-mono text-slate-500 text-[11px]">#{idx + 1}</span>
                        <span className="font-semibold text-white flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ch.name}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400">{ch.count} {t('insights.messages') || 'mensajes'}</span>
                        <span className="font-bold text-emerald-400 font-mono text-right w-12">{ch.percentage}%</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-discord-darker overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${Math.max(2, ch.percentage)}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-discord-blurple to-emerald-400 transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: VOICE COUNTER CHANNELS (ORIGINAL FUNCTIONALITY) */}
      {activeSubTab === 'counters' && (
        <div className="space-y-8">
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
                  {t('serverstats.humans') || 'Usuarios Humanos'}
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
                  {t('serverstats.bots') || 'Bots'}
                </span>
                <span className="text-2xl font-bold text-white font-mono">
                  {stats.botCount?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Configuration Column (7 cols) */}
            <div className="lg:col-span-7 bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                  <span>{t('serverstats.channelConfig') || 'Configuración de Contadores'}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {t('serverstats.channelConfigHelp') ||
                    'Elige qué contadores deseas crear en tu servidor de Discord y en qué categoría organizarlos.'}
                </p>
              </div>

              {/* Counter Types Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('serverstats.selectCounters') || 'Selecciona los contadores a activar:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { type: 'members', label: t('serverstats.typeMembers') || 'Miembros Totales', icon: Users },
                    { type: 'members_only', label: t('serverstats.typeHumans') || 'Solo Humanos', icon: User },
                    { type: 'bots', label: t('serverstats.typeBots') || 'Solo Bots', icon: Bot },
                  ].map((item) => {
                    const isSelected = selectedTypes.includes(item.type);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => toggleType(item.type)}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/30'
                            : 'bg-discord-dark border-slate-700/60 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                        <span className="font-semibold text-xs leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('serverstats.categoryLabel') || 'Categoría Contenedora (Opcional)'}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">{t('serverstats.categoryAuto') || '✨ Crear categoría "📊 Estadísticas" automáticamente'}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      📁 {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  {t('serverstats.categoryHelp') || 'Si no seleccionas una, TitanBot creará una categoría bloqueada en la parte superior.'}
                </p>
              </div>

              {/* Active Channels List or Empty Notice */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('serverstats.activeChannels') || 'Canales en Discord:'}
                </h3>
                {counters.length === 0 ? (
                  <div className="p-4 rounded-xl bg-discord-dark/50 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
                    <FolderTree className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{t('serverstats.noCountersActive') || 'Aún no se han configurado canales de estadísticas para este servidor.'}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {counters.map((c) => (
                      <div
                        key={c.type}
                        className="flex items-center justify-between p-3 rounded-xl bg-discord-dark border border-slate-800 text-xs text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono">{c.channelName || c.type}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium text-[10px]">
                          {t('common.active') || 'Activo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {counters.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-medium rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('serverstats.deleteCounters') || 'Eliminar Contadores'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSetup}
                  disabled={actionLoading}
                  className="ml-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{t('serverstats.applyCounters') || 'Crear o Actualizar Canales'}</span>
                </button>
              </div>
            </div>

            {/* Preview Column (5 cols, sticky) */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <ServerStatsPreview
                counters={selectedTypes}
                stats={stats}
                categoryName={categories.find((c) => c.id === selectedCategory)?.name || '📊 Estadísticas'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerStatsTab;
