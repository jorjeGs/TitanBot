import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  Eye,
  X,
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

  const fetchLogs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: '20',
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

  const getActionColor = (action = '') => {
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('RESTORE')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('UPDATE') || action.includes('SAVE') || action.includes('CONFIG')) {
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
      default:
        return ClipboardList;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-discord-blurple" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t('auditLogs.title')}
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">{t('auditLogs.subtitle')}</p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-discord-dark border border-slate-700/60 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-discord-blurple' : ''}`} />
          <span>{t('auditLogs.refresh')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('auditLogs.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-all"
          />
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
          <div className="p-8 text-center space-y-3 animate-pulse">
            <div className="h-6 w-48 bg-slate-800 rounded mx-auto" />
            <div className="h-10 bg-slate-800/60 rounded-xl max-w-xl mx-auto" />
            <div className="h-10 bg-slate-800/40 rounded-xl max-w-xl mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">
              {t('auditLogs.emptyTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {t('auditLogs.emptySubtitle')}
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
                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                        <User className="w-4 h-4" />
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

                      <p className="text-xs sm:text-sm text-slate-300 break-words">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title={t('auditLogs.viewDetails')}
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
              {t('auditLogs.totalCount', { count: total })} (Página {page} de {totalPages})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-discord-dark border border-slate-700/60 disabled:opacity-40 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-discord-blurple" />
                <h3 className="text-base font-bold text-white">
                  {t('auditLogs.modalTitle')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 font-semibold">Acción: </span>
                <span className="font-mono text-amber-400">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Usuario: </span>
                <span>{selectedLog.userTag} ({selectedLog.userId})</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Fecha: </span>
                <span>{formatTimestamp(selectedLog.timestamp)}</span>
              </div>
              {selectedLog.ip && (
                <div>
                  <span className="text-slate-400 font-semibold">IP: </span>
                  <span className="font-mono text-slate-400">{selectedLog.ip}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                {t('auditLogs.metadataHeader')}:
              </span>
              <pre className="p-3 rounded-xl bg-discord-darkest border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                {t('common.close', { defaultValue: 'Cerrar' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
