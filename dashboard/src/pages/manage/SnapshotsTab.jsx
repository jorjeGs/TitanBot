import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { safeFormatDateTime } from '../../utils/formatters';
import {
  Archive,
  Plus,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  User,
  Folder,
  Hash,
  Shield,
  FileJson,
  Check,
  RefreshCw,
  AlertOctagon,
  ArrowRight,
  HelpCircle,
  Eye,
  Search,
  Layers,
  Volume2,
  Radio,
  Clock,
} from 'lucide-react';

export function SnapshotsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { currentGuild } = useGuild();

  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Snapshot Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Import JSON Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJsonData, setImportJsonData] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // Restore Modal
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreMode, setRestoreMode] = useState('safe_sync'); // 'safe_sync' | 'full_replace'
  const [confirmText, setConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inspect Modal
  const [inspectTarget, setInspectTarget] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/snapshots`);
      if (res.success && Array.isArray(res.snapshots)) {
        setSnapshots(res.snapshots);
      }
    } catch (err) {
      console.error('Error fetching snapshots:', err);
      setNotification({
        type: 'error',
        message: t('snapshots.errors.loadFailed') || 'Error al cargar las instantáneas del servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [guildId]);

  // Handler: Create snapshot
  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const res = await apiFetch(`/guilds/${guildId}/snapshots`, {
        method: 'POST',
        body: { name: snapshotName.trim() || undefined },
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('snapshots.success.created') || '¡Instantánea creada exitosamente!',
        });
        setIsCreateOpen(false);
        setSnapshotName('');
        await fetchSnapshots();
      }
    } catch (err) {
      console.error('Error creating snapshot:', err);
      setNotification({
        type: 'error',
        message: err.message || (t('snapshots.errors.createFailed') || 'Error al crear la instantánea.'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handler: Download JSON export
  const handleExportJson = async (snapshot) => {
    try {
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const res = await fetch(`${base}/api/guilds/${guildId}/snapshots/${snapshot.id}/export`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to export snapshot');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = String(snapshot.name || snapshot.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `snapshot-${safeName}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting snapshot:', err);
      setNotification({
        type: 'error',
        message: t('snapshots.errors.exportFailed') || 'Error al descargar el archivo de respaldo.',
      });
    }
  };

  // Handler: Inspect Snapshot Detail
  const handleInspect = async (snapshot) => {
    try {
      setInspectTarget(snapshot);
      setInspectLoading(true);
      setInspectData(null);
      const res = await apiFetch(`/guilds/${guildId}/snapshots/${snapshot.id}`);
      if (res.success && res.snapshot) {
        setInspectData(res.snapshot);
      }
    } catch (err) {
      console.error('Error loading snapshot detail:', err);
      setNotification({
        type: 'error',
        message: 'No se pudo cargar el detalle de la instantánea.',
      });
    } finally {
      setInspectLoading(false);
    }
  };

  // Handler: Read JSON file for import
  const handleFileChange = (e) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportError(t('snapshots.errors.invalidFileType') || 'Por favor selecciona un archivo .json válido.');
      return;
    }

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Formato JSON inválido.');
        }
        if (!Array.isArray(parsed.roles) && !Array.isArray(parsed.channels)) {
          throw new Error('El archivo no parece ser un respaldo válido de TitanBot (faltan roles o canales).');
        }
        setImportJsonData(parsed);
      } catch (err) {
        setImportError(err.message || 'Error al procesar el archivo JSON.');
        setImportJsonData(null);
      }
    };
    reader.readAsText(file);
  };

  // Handler: Submit Import
  const handleImportSnapshot = async () => {
    if (!importJsonData) return;
    try {
      setIsImporting(true);
      const res = await apiFetch(`/guilds/${guildId}/snapshots/import`, {
        method: 'POST',
        body: importJsonData,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('snapshots.success.imported') || '¡Copia de respaldo importada con éxito!',
        });
        setIsImportOpen(false);
        setImportJsonData(null);
        setImportFileName('');
        await fetchSnapshots();
      }
    } catch (err) {
      console.error('Error importing snapshot:', err);
      setImportError(err.message || (t('snapshots.errors.importFailed') || 'Error al importar la instantánea.'));
    } finally {
      setIsImporting(false);
    }
  };

  // Handler: Execute Restore
  const handleExecuteRestore = async () => {
    if (!restoreTarget) return;

    if (restoreMode === 'full_replace' && confirmText !== 'CONFIRMAR') {
      return;
    }

    try {
      setIsRestoring(true);
      const res = await apiFetch(`/guilds/${guildId}/snapshots/${restoreTarget.id}/restore`, {
        method: 'POST',
        body: { mode: restoreMode },
      });

      if (res.success) {
        setRestoreResult(res);
        setNotification({
          type: 'success',
          message: t('snapshots.success.restored') || '¡Servidor restaurado exitosamente!',
        });
      }
    } catch (err) {
      console.error('Error restoring snapshot:', err);
      setNotification({
        type: 'error',
        message: err.message || (t('snapshots.errors.restoreFailed') || 'Error al restaurar la instantánea.'),
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Handler: Delete Snapshot
  const handleDeleteSnapshot = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await apiFetch(`/guilds/${guildId}/snapshots/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('snapshots.success.deleted') || 'Instantánea eliminada.',
        });
        setDeleteTarget(null);
        await fetchSnapshots();
      }
    } catch (err) {
      console.error('Error deleting snapshot:', err);
      setNotification({
        type: 'error',
        message: err.message || (t('snapshots.errors.deleteFailed') || 'Error al eliminar la instantánea.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Top KPIs
  const totalSnapshots = snapshots.length;
  const latestSnapshot = snapshots[0] || null;
  const latestRoles = latestSnapshot
    ? (latestSnapshot.counts?.roles ?? latestSnapshot.rolesCount ?? 0)
    : 0;
  const latestCategories = latestSnapshot
    ? (latestSnapshot.counts?.categories ?? latestSnapshot.categoriesCount ?? 0)
    : 0;
  const latestChannels = latestSnapshot
    ? (latestSnapshot.counts?.channels ?? latestSnapshot.channelsCount ?? 0)
    : 0;
  const lastDateFormatted = safeFormatDateTime(latestSnapshot?.createdAt, 'Ninguno');

  // Filtered snapshots
  const filteredSnapshots = useMemo(() => {
    if (!searchQuery.trim()) return snapshots;
    const q = searchQuery.toLowerCase().trim();
    return snapshots.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.createdBy?.tag && s.createdBy.tag.toLowerCase().includes(q))
    );
  }, [snapshots, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-discord-blurple/20 via-slate-800/40 to-indigo-900/20 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-discord-blurple/20 border border-discord-blurple/40 flex items-center justify-center text-discord-blurple shadow-inner">
              <Archive className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {t('snapshots.title') || 'Copias de Seguridad e Instantáneas'}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                {t('snapshots.description') ||
                  'Crea respaldos completos de la arquitectura de tu servidor (roles, categorías, canales y permisos) y restáuralas en cualquier momento.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-discord-dark hover:bg-slate-800 text-slate-200 border border-slate-700/60 font-medium text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>{t('snapshots.importBtn') || 'Importar JSON'}</span>
            </button>

            <button
              onClick={() => {
                setSnapshotName(`Backup ${new Date().toLocaleDateString()}`);
                setIsCreateOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-discord-blurple/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('snapshots.createBtn') || 'Nueva Instantánea'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-xl bg-discord-dark/70 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('snapshots.kpiTotal') || 'Copias Guardadas'}</span>
            <Archive className="w-4 h-4 text-discord-blurple" />
          </div>
          <div className="text-2xl font-bold text-white">
            {totalSnapshots} <span className="text-xs font-normal text-slate-500">/ 15 máx</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-xl bg-discord-dark/70 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('snapshots.kpiLastBackup') || 'Último Respaldo'}</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-slate-200 truncate" title={lastDateFormatted}>
            {lastDateFormatted}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-xl bg-discord-dark/70 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('snapshots.kpiProtectedRoles') || 'Roles Protegidos'}</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {latestRoles} <span className="text-xs font-normal text-slate-400">roles</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-xl bg-discord-dark/70 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{t('snapshots.kpiProtectedChannels') || 'Canales y Categorías'}</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {latestCategories + latestChannels}{' '}
            <span className="text-xs font-normal text-slate-400">
              ({latestCategories} cat. + {latestChannels} ch.)
            </span>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Snapshot Mode Explanatory Card */}
      <div className="bg-discord-darker/60 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-discord-dark/50 border border-slate-800/80">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-300">
            <strong className="text-white text-sm block mb-0.5">
              {t('snapshots.safeSyncTitle') || 'Modo Safe Sync (Recomendado)'}
            </strong>
            {t('snapshots.safeSyncDesc') ||
              'Restaura y sincroniza roles, categorías y canales faltantes preservando los existentes. Ideal para recuperar canales borrados por error.'}
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-discord-dark/50 border border-slate-800/80">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-300">
            <strong className="text-white text-sm block mb-0.5">
              {t('snapshots.fullReplaceTitle') || 'Modo Full Replace (Reemplazo Total)'}
            </strong>
            {t('snapshots.fullReplaceDesc') ||
              'Reconstruye la jerarquía idéntica al backup eliminando canales o roles no pertenecientes a la instantánea. Requiere confirmación estricta.'}
          </div>
        </div>
      </div>

      {/* Snapshots List Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {snapshots.length} {snapshots.length === 1 ? 'Instantánea guardada' : 'Instantáneas guardadas'}
          </span>
          {snapshots.length > 0 && (
            <span className="text-xs text-slate-500">
              ({snapshots.length}/15)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {snapshots.length > 1 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('snapshots.searchPlaceholder') || 'Buscar instantánea...'}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-discord-dark border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-discord-blurple w-48 sm:w-60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={fetchSnapshots}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('common.refresh') || 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Snapshots Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-discord-darker/40 rounded-2xl border border-slate-800">
          <Loader2 className="w-8 h-8 text-discord-blurple animate-spin mb-3" />
          <p className="text-slate-400 text-sm">{t('snapshots.loading') || 'Cargando instantáneas del servidor...'}</p>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="bg-discord-darker/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
          <Archive className="w-16 h-16 text-slate-600 mx-auto opacity-40" />
          <div>
            <h3 className="text-lg font-semibold text-white">
              {t('snapshots.emptyTitle') || 'No hay instantáneas guardadas'}
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              {t('snapshots.emptyDesc') ||
                'Guarda una copia de seguridad ahora para proteger la configuración de tus canales, roles y permisos ante posibles accidentes.'}
            </p>
          </div>
          <button
            onClick={() => {
              setSnapshotName(`Backup Inicial - ${new Date().toLocaleDateString()}`);
              setIsCreateOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-sm inline-flex items-center gap-2 transition-all shadow-lg shadow-discord-blurple/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('snapshots.createFirst') || 'Crear Primera Instantánea'}</span>
          </button>
        </div>
      ) : filteredSnapshots.length === 0 ? (
        <div className="bg-discord-darker/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se encontraron instantáneas con el término "{searchQuery}".</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs text-discord-blurple hover:underline cursor-pointer"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSnapshots.map((s) => {
            // Robust counter resolution
            const rolesCount = s.counts?.roles ?? s.rolesCount ?? (s.roles?.length || 0);
            const categoriesCount = s.counts?.categories ?? s.categoriesCount ?? (s.categories?.length || 0);
            const channelsCount = s.counts?.channels ?? s.channelsCount ?? (s.channels?.length || 0);
            const authorTag =
              s.createdBy?.tag ||
              s.createdBy?.username ||
              s.author?.tag ||
              s.author?.username ||
              (typeof s.author === 'string' ? s.author : null) ||
              'Sistema';

            const formattedDate = safeFormatDateTime(s.createdAt, 'Fecha desconocida');

            return (
              <div
                key={s.id}
                className="bg-discord-dark border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all shadow-md hover:shadow-xl flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Title and Server badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-base leading-snug group-hover:text-discord-blurple transition-colors truncate" title={s.name}>
                        {s.name || 'Instantánea sin nombre'}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" title={`ID: ${s.id}`}>
                        ID: {s.id}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                      {s.guildName || currentGuild?.name || 'Discord'}
                    </span>
                  </div>

                  {/* Metadata chips (Fixed and reactive) */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      <Shield className="w-3 h-3" />
                      <span>
                        {rolesCount} {t('snapshots.roles') || 'roles'}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      <Folder className="w-3 h-3" />
                      <span>
                        {categoriesCount} {t('snapshots.categories') || 'categorías'}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <Hash className="w-3 h-3" />
                      <span>
                        {channelsCount} {t('snapshots.channels') || 'canales'}
                      </span>
                    </span>
                  </div>

                  {/* Author & Date info */}
                  <div className="border-t border-slate-800/80 pt-3 space-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {t('snapshots.createdBy') || 'Por'}: <span className="text-slate-300 font-medium">{authorTag}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Inspect Architecture */}
                    <button
                      type="button"
                      onClick={() => handleInspect(s)}
                      title={t('snapshots.inspectBtn') || 'Ver Contenido'}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Download JSON */}
                    <button
                      type="button"
                      onClick={() => handleExportJson(s)}
                      title={t('snapshots.downloadJson') || 'Descargar JSON'}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete Snapshot */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      title={t('common.delete') || 'Eliminar'}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Restore Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreTarget(s);
                      setRestoreMode('safe_sync');
                      setConfirmText('');
                      setRestoreResult(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-discord-blurple/10 hover:bg-discord-blurple text-discord-blurple hover:text-white border border-discord-blurple/30 font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('snapshots.restoreBtn') || 'Restaurar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREATE SNAPSHOT */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-dark border border-slate-700/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-discord-blurple/10 text-discord-blurple">
                  <Archive className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t('snapshots.modalCreateTitle') || 'Crear Nueva Instantánea'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  {t('snapshots.modalSnapshotName') || 'Nombre de la Instantánea'}
                </label>
                <input
                  type="text"
                  required
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="Ej. Antes de reestructurar canales"
                  className="w-full px-3.5 py-2.5 bg-discord-darker border border-slate-700/70 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition-colors"
                />
              </div>

              <div className="p-3 rounded-xl bg-discord-darker/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-discord-blurple" />
                  <span>{t('snapshots.modalIncludedElements') || 'Elementos incluidos en la copia:'}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                  <li>Todos los roles del servidor, colores, iconos y permisos</li>
                  <li>Todas las categorías y jerarquía de canales</li>
                  <li>Canales de texto, voz, anuncios y foros</li>
                  <li>Permisos específicos y sobrescrituras por rol y canal</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {t('common.cancel') || 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-discord-blurple/25 disabled:opacity-50 cursor-pointer"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreating ? (t('snapshots.creating') || 'Capturando...') : (t('snapshots.confirmCreate') || 'Crear Copia')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT SNAPSHOT JSON */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-dark border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t('snapshots.modalImportTitle') || 'Importar Respaldo JSON'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsImportOpen(false);
                  setImportJsonData(null);
                  setImportFileName('');
                  setImportError(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                {t('snapshots.modalImportDesc') ||
                  'Sube un archivo .json exportado previamente desde TitanBot para guardarlo en la lista de instantáneas de este servidor.'}
              </p>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-700/80 hover:border-discord-blurple/80 rounded-2xl p-6 text-center transition-all bg-discord-darker/40">
                <input
                  type="file"
                  id="snapshot-file-upload"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="snapshot-file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                >
                  <FileJson className="w-10 h-10 text-discord-blurple/80" />
                  <span className="text-sm font-semibold text-white">
                    {importFileName || (t('snapshots.modalImportSelect') || 'Haz clic para seleccionar archivo JSON')}
                  </span>
                  <span className="text-xs text-slate-500">Formato .json de respaldos de TitanBot</span>
                </label>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview of Parsed Data (Fixed count resolution) */}
              {importJsonData && !importError && (
                <div className="p-3.5 rounded-xl bg-discord-darker/80 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>{importJsonData.name || 'Instantánea importada'}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{importJsonData.guildName || 'Servidor'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                    <span className="text-indigo-400 font-medium">
                      {importJsonData.counts?.roles ?? (importJsonData.roles?.length || 0)} roles
                    </span>
                    <span>•</span>
                    <span className="text-amber-400 font-medium">
                      {importJsonData.counts?.categories ??
                        (importJsonData.channels?.filter((c) => c.type === 4)?.length ||
                          (importJsonData.categories?.length || 0))}{' '}
                      categorías
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">
                      {importJsonData.counts?.channels ??
                        (importJsonData.channels?.filter((c) => c.type !== 4)?.length || 0)}{' '}
                      canales
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportJsonData(null);
                    setImportFileName('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {t('common.cancel') || 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={handleImportSnapshot}
                  disabled={!importJsonData || isImporting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isImporting ? (t('snapshots.importing') || 'Guardando...') : (t('snapshots.confirmImport') || 'Importar Instantánea')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESTORE SNAPSHOT */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-dark border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-discord-blurple/10 text-discord-blurple">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {t('snapshots.modalRestoreTitle') || 'Restaurar Instantánea'}
                  </h3>
                  <p className="text-xs text-slate-400">{restoreTarget.name}</p>
                </div>
              </div>
              {!isRestoring && (
                <button
                  onClick={() => setRestoreTarget(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* If restoration has completed */}
            {restoreResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-semibold block text-white">
                      {t('snapshots.restoreSuccessTitle') || '¡Restauración Finalizada con Éxito!'}
                    </strong>
                    <p className="text-xs text-emerald-300">
                      {t('snapshots.restoreSuccessDesc') || 'La arquitectura del servidor ha sido sincronizada según la instantánea.'}
                    </p>
                  </div>
                </div>

                {/* Restored counters (Fixed mapped properties) */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-discord-darker rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">{t('snapshots.roles') || 'Roles'}:</span>
                    <span className="text-white font-semibold">
                      +{restoreResult.counts?.rolesRestored ?? restoreResult.createdRoles ?? 0} creados
                    </span>
                  </div>
                  <div className="p-3 bg-discord-darker rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">{t('snapshots.channels') || 'Canales y Categorías'}:</span>
                    <span className="text-white font-semibold">
                      +{restoreResult.counts?.categoriesRestored ?? restoreResult.createdCategories ?? 0} cat. / +
                      {restoreResult.counts?.channelsRestored ?? restoreResult.createdChannels ?? 0} can.
                      {restoreResult.counts?.channelsDeleted > 0 && (
                        <span className="text-red-400 block text-[11px] mt-0.5">
                          (-{restoreResult.counts.channelsDeleted} eliminados por reemplazo total)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => {
                      setRestoreTarget(null);
                      setRestoreResult(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-xs cursor-pointer"
                  >
                    {t('common.close') || 'Cerrar'}
                  </button>
                </div>
              </div>
            ) : (
              /* Restoration form */
              <div className="space-y-5">
                {/* Warning notice */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    {t('snapshots.modalRestoreWarning') ||
                      'Restaurar una instantánea modificará los roles y canales del servidor en Discord. Asegúrate de que el bot tenga permisos de Administrador y jerarquía alta.'}
                  </p>
                </div>

                {/* Restoration Mode Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {t('snapshots.selectMode') || 'Selecciona el Modo de Restauración:'}
                  </label>

                  {/* Mode 1: Safe Sync */}
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                      restoreMode === 'safe_sync'
                        ? 'bg-discord-blurple/10 border-discord-blurple text-white ring-1 ring-discord-blurple'
                        : 'bg-discord-darker border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      value="safe_sync"
                      checked={restoreMode === 'safe_sync'}
                      onChange={() => setRestoreMode('safe_sync')}
                      className="mt-1 accent-discord-blurple cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {t('snapshots.safeSyncOption') || 'Safe Sync (Recomendado / Aditivo)'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          SEGURO
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {t('snapshots.safeSyncOptionDesc') ||
                          'Crea roles y canales faltantes y sincroniza permisos sin eliminar ningún canal o rol existente en el servidor.'}
                      </p>
                    </div>
                  </label>

                  {/* Mode 2: Full Replace */}
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                      restoreMode === 'full_replace'
                        ? 'bg-red-500/10 border-red-500 text-white ring-1 ring-red-500'
                        : 'bg-discord-darker border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      value="full_replace"
                      checked={restoreMode === 'full_replace'}
                      onChange={() => setRestoreMode('full_replace')}
                      className="mt-1 accent-red-500 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-red-400">
                          {t('snapshots.fullReplaceOption') || 'Full Replace (Reemplazo Total)'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          DESTRUCTIVO
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {t('snapshots.fullReplaceOptionDesc') ||
                          'Borra los canales y roles que no estén en la instantánea para replicar exactamente la estructura guardada.'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* If full replace is selected, ask for confirmation text */}
                {restoreMode === 'full_replace' && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 animate-in fade-in">
                    <label className="block text-xs font-semibold text-red-300">
                      {t('snapshots.confirmReplacePrompt') ||
                        'Escribe "CONFIRMAR" en mayúsculas para autorizar la eliminación de canales y roles:'}
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="CONFIRMAR"
                      className="w-full px-3 py-2 bg-discord-dark border border-red-500/50 rounded-lg text-sm text-red-200 placeholder-red-400/40 focus:outline-none font-mono"
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => setRestoreTarget(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {t('common.cancel') || 'Cancelar'}
                  </button>
                  <button
                    type="button"
                    disabled={isRestoring || (restoreMode === 'full_replace' && confirmText !== 'CONFIRMAR')}
                    onClick={handleExecuteRestore}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      restoreMode === 'full_replace'
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25'
                        : 'bg-discord-blurple hover:bg-discord-blurple/80 text-white shadow-discord-blurple/25'
                    }`}
                  >
                    {isRestoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isRestoring
                        ? (t('snapshots.restoring') || 'Restaurando servidor...')
                        : (t('snapshots.executeRestore') || 'Iniciar Restauración')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-dark border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                {t('snapshots.modalDeleteTitle') || '¿Eliminar Instantánea?'}
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {t('snapshots.modalDeleteDesc', { name: deleteTarget.name }) ||
                `Esta acción eliminará la instantánea "${deleteTarget.name}" de la base de datos de TitanBot. No afectará los canales de tu servidor de Discord.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {t('common.cancel') || 'Cancelar'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSnapshot}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-red-600/25 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? (t('common.deleting') || 'Eliminando...') : (t('common.delete') || 'Eliminar')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: INSPECT SNAPSHOT ARCHITECTURE */}
      {inspectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-dark border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-discord-blurple/10 text-discord-blurple">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {t('snapshots.modalInspectTitle') || 'Arquitectura de la Instantánea'}
                  </h3>
                  <p className="text-xs text-slate-400">{inspectTarget.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectTarget(null);
                  setInspectData(null);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            {inspectLoading ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-discord-blurple animate-spin mb-3" />
                <p className="text-xs text-slate-400">Cargando elementos del servidor...</p>
              </div>
            ) : inspectData ? (
              <div className="space-y-5 overflow-y-auto pr-1 flex-1">
                {/* Meta summary */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-discord-darker rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Roles</span>
                    <span className="text-lg font-bold text-indigo-400">
                      {inspectData.roles?.length || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-discord-darker rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Categorías</span>
                    <span className="text-lg font-bold text-amber-400">
                      {inspectData.channels?.filter((c) => c.type === 4).length || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-discord-darker rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Canales</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {inspectData.channels?.filter((c) => c.type !== 4).length || 0}
                    </span>
                  </div>
                </div>

                {/* Roles Section */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Roles Respaldados ({inspectData.roles?.length || 0})</span>
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-discord-darker/60 rounded-xl border border-slate-800">
                    {inspectData.roles?.length === 0 ? (
                      <span className="text-xs text-slate-500">Sin roles registrados</span>
                    ) : (
                      inspectData.roles?.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-slate-700/60 bg-slate-800/80 font-medium text-slate-200"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                r.color && r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5',
                            }}
                          />
                          <span>{r.name}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Channels & Categories Section */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Canales y Jerarquía ({inspectData.channels?.length || 0})</span>
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto p-3 bg-discord-darker/60 rounded-xl border border-slate-800 text-xs">
                    {/* Categories first */}
                    {inspectData.channels
                      ?.filter((c) => c.type === 4)
                      .map((cat) => {
                        const childChannels = inspectData.channels?.filter(
                          (c) => c.parentId === cat.id && c.type !== 4
                        );
                        return (
                          <div key={cat.id} className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-amber-300 font-semibold uppercase tracking-wider text-[11px]">
                              <Folder className="w-3.5 h-3.5" />
                              <span>{cat.name}</span>
                            </div>
                            <div className="pl-4 space-y-1">
                              {childChannels?.map((ch) => (
                                <div key={ch.id} className="flex items-center gap-2 text-slate-300 py-0.5">
                                  {ch.type === 2 ? (
                                    <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  <span>{ch.name}</span>
                                </div>
                              ))}
                              {childChannels?.length === 0 && (
                                <span className="text-[11px] text-slate-500 italic pl-5">Sin canales en esta categoría</span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* Uncategorized channels */}
                    {inspectData.channels?.filter((c) => !c.parentId && c.type !== 4).length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-800">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Sin categoría:</span>
                        {inspectData.channels
                          ?.filter((c) => !c.parentId && c.type !== 4)
                          .map((ch) => (
                            <div key={ch.id} className="flex items-center gap-2 text-slate-300 py-0.5 pl-2">
                              {ch.type === 2 ? (
                                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <Hash className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{ch.name}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-400">No se pudieron cargar los datos.</p>
            )}

            {/* Footer */}
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleExportJson(inspectTarget)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar JSON</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = inspectTarget;
                  setInspectTarget(null);
                  setInspectData(null);
                  setRestoreTarget(target);
                  setRestoreMode('safe_sync');
                  setConfirmText('');
                  setRestoreResult(null);
                }}
                className="px-5 py-2 rounded-xl bg-discord-blurple hover:bg-discord-blurple/80 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-discord-blurple/25 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Servidor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SnapshotsTab;
