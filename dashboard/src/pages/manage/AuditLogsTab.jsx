import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Radio,
  FileCode,
  Trash2,
  AlertTriangle,
  Eye,
  X,
  Download,
  Copy,
  Check,
  Activity,
  UserCheck,
  Calendar,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', labelKey: 'auditLogs.categories.all' },
  { id: 'general', labelKey: 'auditLogs.categories.general' },
  { id: 'automations', labelKey: 'auditLogs.categories.automations' },
  { id: 'snapshots', labelKey: 'auditLogs.categories.snapshots' },
  { id: 'security', labelKey: 'auditLogs.categories.security' },
  { id: 'social', labelKey: 'auditLogs.categories.social' },
  { id: 'ai', labelKey: 'auditLogs.categories.ai' },
  { id: 'embeds', labelKey: 'auditLogs.categories.embeds' },
  { id: 'moderation', labelKey: 'auditLogs.categories.moderation' },
  { id: 'tickets', labelKey: 'auditLogs.categories.tickets' },
];

export default function AuditLogsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [copiedMetadata, setCopiedMetadata] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  const fetchLogs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: '25',
        });
        if (category && category !== 'all') {
          queryParams.append('category', category);
        }
        if (search && search.trim()) {
          queryParams.append('search', search.trim());
        }

        const res = await apiFetch(`/guilds/${guildId}/audit-logs?${queryParams.toString()}`);
        if (res && res.success) {
          setLogs(res.logs || []);
          setTotal(res.total || 0);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [guildId, page, category, search]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Compute KPI Statistics
  const kpis = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let actions24h = 0;
    const userCounts = {};
    const catCounts = {};

    logs.forEach((item) => {
      const ts = new Date(item.timestamp).getTime();
      if (ts >= oneDayAgo) actions24h++;

      const u = item.userTag || 'Staff';
      userCounts[u] = (userCounts[u] || 0) + 1;

      const c = item.category || 'general';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    let topStaff = '-';
    let maxStaffCount = 0;
    Object.entries(userCounts).forEach(([u, count]) => {
      if (count > maxStaffCount) {
        maxStaffCount = count;
        topStaff = u;
      }
    });

    let topCategory = '-';
    let maxCatCount = 0;
    Object.entries(catCounts).forEach(([c, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = c;
      }
    });

    return {
      total: total || logs.length,
      actions24h,
      topStaff,
      topCategory,
    };
  }, [logs, total]);

  const handleClearAuditLogs = async () => {
    setIsClearing(true);
    setActionFeedback(null);
    try {
      const res = await apiFetch(`/guilds/${guildId}/audit-logs`, {
        method: 'DELETE',
      });
      if (res && res.success) {
        setClearModalOpen(false);
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
        setActionFeedback({
          type: 'success',
          message: t('auditLogs.actions.clearSuccess', { defaultValue: '¡Historial de auditoría vaciado correctamente!' }),
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res?.message || t('auditLogs.actions.clearFailed', { defaultValue: 'Error al vaciar los registros de auditoría.' }),
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || t('auditLogs.actions.clearFailed', { defaultValue: 'Error al vaciar los registros de auditoría.' }),
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `titanbot_audit_logs_${guildId}_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'UserTag', 'UserId', 'Action', 'Category', 'Details', 'IP'];
    const rows = logs.map((l) => [
      `"${l.id || ''}"`,
      `"${l.timestamp || ''}"`,
      `"${(l.userTag || '').replace(/"/g, '""')}"`,
      `"${l.userId || ''}"`,
      `"${l.action || ''}"`,
      `"${l.category || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ip || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', encodeURI(csvContent));
    dlAnchorElem.setAttribute('download', `titanbot_audit_logs_${guildId}_${new Date().toISOString().slice(0, 10)}.csv`);
    dlAnchorElem.click();
  };

  const copyMetadataJson = (metadata) => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    setCopiedMetadata(true);
    setTimeout(() => setCopiedMetadata(false), 2000);
  };

  const getActionColor = (action = '') => {
    if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('CLEAR')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('RESTORE')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('UPDATE') || action.includes('SAVE') || action.includes('CONFIG') || action.includes('PATCH')) {
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
    return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  };

  const getCategoryIcon = (cat = '') => {
    switch (cat) {
      case 'automations':
        return Zap;
      case 'snapshots':
        return Layers;
      case 'security':
        return Shield;
      case 'social':
        return Radio;
      case 'ai':
        return Sparkles;
      case 'embeds':
        return FileCode;
      case 'moderation':
        return Shield;
      case 'tickets':
        return ClipboardList;
      default:
        return Sliders;
    }
  };

  const formatTimestamp = (iso) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-discord-blurple" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t('auditLogs.title', { defaultValue: 'Auditoría del Staff del Dashboard' })}
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('auditLogs.subtitle', { defaultValue: 'Historial inmutable de todas las acciones y modificaciones administrativas efectuadas en el panel web.' })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-discord-dark border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold shadow transition-all disabled:opacity-40"
            title="Descargar como archivo CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-discord-dark border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold shadow transition-all disabled:opacity-40"
            title="Descargar como JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold shadow transition-all disabled:opacity-40"
            title="Eliminar historial de auditoría"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('auditLogs.actions.clearLogs', { defaultValue: 'Vaciar' })}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('auditLogs.refresh', { defaultValue: 'Actualizar' })}</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Toast / Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded hover:bg-black/20 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-discord-blurple/10 text-discord-blurple shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('auditLogs.kpis.totalLogs', { defaultValue: 'Total de Registros' })}
            </span>
            <span className="text-xl font-bold text-white block mt-0.5">{kpis.total}</span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('auditLogs.kpis.actionsToday', { defaultValue: 'Acciones en 24h' })}
            </span>
            <span className="text-xl font-bold text-white block mt-0.5">{kpis.actions24h}</span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('auditLogs.kpis.topStaff', { defaultValue: 'Staff Más Activo' })}
            </span>
            <span className="text-sm font-bold text-white block mt-0.5 truncate" title={kpis.topStaff}>
              {kpis.topStaff}
            </span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('auditLogs.kpis.topCategory', { defaultValue: 'Categoría Principal' })}
            </span>
            <span className="text-sm font-bold text-white block mt-0.5 capitalize truncate" title={kpis.topCategory}>
              {kpis.topCategory}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('auditLogs.searchPlaceholder', { defaultValue: 'Buscar por usuario, acción o detalles...' })}
            className="w-full pl-10 pr-9 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="p-1 text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-discord-blurple cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.labelKey, { defaultValue: c.id })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center space-y-3 animate-pulse">
            <div className="h-6 w-48 bg-slate-800 rounded mx-auto" />
            <div className="h-12 bg-slate-800/60 rounded-xl max-w-xl mx-auto" />
            <div className="h-12 bg-slate-800/40 rounded-xl max-w-xl mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">
              {t('auditLogs.emptyTitle', { defaultValue: 'No se encontraron registros de auditoría' })}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {t('auditLogs.emptySubtitle', { defaultValue: 'Las acciones que realice el staff en el Dashboard aparecerán aquí registradas automáticamente.' })}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {logs.map((log) => {
              const CatIcon = getCategoryIcon(log.category);
              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* User Avatar */}
                    {log.userAvatar ? (
                      <img
                        src={log.userAvatar}
                        alt={log.userTag}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-700 shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold shrink-0">
                        {log.userTag?.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-200">
                          {log.userTag}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40">
                          <CatIcon className="w-3 h-3 text-slate-400" />
                          <span className="capitalize">{log.category}</span>
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 break-words leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                        title={t('auditLogs.viewDetails', { defaultValue: 'Ver detalles de la acción' })}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-discord-dark/50">
            <span>
              {t('auditLogs.totalCount', { count: total, defaultValue: `${total} registros registrados` })} (Página {page} de {totalPages})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-discord-dark border border-slate-700/60 disabled:opacity-40 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-discord-dark border border-slate-700/60 disabled:opacity-40 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-discord-blurple" />
                <h3 className="text-base font-bold text-white">
                  {t('auditLogs.modalTitle', { defaultValue: 'Detalles del Registro de Auditoría' })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Acción: </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${getActionColor(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Staff: </span>
                <span className="font-semibold text-white">{selectedLog.userTag} ({selectedLog.userId})</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Fecha: </span>
                <span className="font-mono text-slate-300">{formatTimestamp(selectedLog.timestamp)}</span>
              </div>
              {selectedLog.ip && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-semibold">Dirección IP: </span>
                  <span className="font-mono text-slate-400">{selectedLog.ip}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 block">
                  {t('auditLogs.metadataHeader', { defaultValue: 'Metadatos Adicionales' })}:
                </span>
                <button
                  type="button"
                  onClick={() => copyMetadataJson(selectedLog.metadata)}
                  className="inline-flex items-center gap-1 text-[11px] text-discord-blurple hover:underline font-semibold"
                >
                  {copiedMetadata ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">{t('auditLogs.copied', { defaultValue: '¡Copiado!' })}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{t('auditLogs.copyJson', { defaultValue: 'Copiar JSON' })}</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-discord-darkest border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56 shadow-inner">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                {t('common.close', { defaultValue: 'Cerrar' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-darker border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t('auditLogs.actions.clearConfirmTitle', { defaultValue: '¿Vaciar Historial de Auditoría?' })}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t('auditLogs.actions.clearConfirmDesc', {
                defaultValue: 'Esta acción eliminará de forma permanente todos los registros históricos del staff en este servidor. No se puede deshacer.',
              })}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                disabled={isClearing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Cancelar' })}
              </button>
              <button
                type="button"
                onClick={handleClearAuditLogs}
                disabled={isClearing}
                className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('auditLogs.actions.clearing', { defaultValue: 'Vaciando...' })}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('auditLogs.actions.clearLogs', { defaultValue: 'Sí, Vaciar Auditoría' })}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
