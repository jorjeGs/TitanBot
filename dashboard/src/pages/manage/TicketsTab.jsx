import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { TicketPreview } from '../../components/preview/TicketPreview';
import { TranscriptModal } from '../../components/preview/TranscriptModal';
import {
  Ticket,
  Send,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  Loader2,
  Folder,
  MessageSquare,
  Users,
  Settings2,
  FileText,
  Eye,
  Download,
  Search,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Star,
  Activity,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export function TicketsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

  const [activeSubTab, setActiveSubTab] = useState('panel'); // 'panel' | 'transcripts' | 'analytics' | 'guide'
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [ticketConfig, setTicketConfig] = useState({
    ticketPanelChannelId: '',
    ticketPanelMessageId: '',
    ticketPanelMessage: 'Para abrir un ticket de soporte, haz clic en el botón de abajo. Nuestro equipo te responderá lo antes posible.',
    ticketButtonLabel: 'Crear Ticket',
    ticketCategoryId: '',
    ticketClosedCategoryId: '',
    ticketStaffRoleId: '',
    maxTicketsPerUser: 3,
    dmOnClose: true,
    panelStatus: { exists: false },
    stats: {
      openCount: 0,
      closedCount: 0,
      avgCloseTimeMs: null,
      feedbackCount: 0,
      avgRating: null,
    },
  });

  // Transcripts list state
  const [transcripts, setTranscripts] = useState([]);
  const [transcriptsLoading, setTranscriptsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Filter text-only channels vs category channels
  const textChannels = (channels || []).filter((c) => c.type === 0 || c.type === 5 || c.type === undefined);
  const categoryChannels = (channels || []).filter((c) => c.type === 4);

  const fetchTicketSettings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/tickets`);
      if (res && res.success && res.tickets) {
        setTicketConfig((prev) => ({
          ...prev,
          ...res.tickets,
          ticketPanelChannelId: res.tickets.ticketPanelChannelId || '',
          ticketCategoryId: res.tickets.ticketCategoryId || '',
          ticketClosedCategoryId: res.tickets.ticketClosedCategoryId || '',
          ticketStaffRoleId: res.tickets.ticketStaffRoleId || '',
          ticketPanelMessage: res.tickets.ticketPanelMessage || prev.ticketPanelMessage,
          ticketButtonLabel: res.tickets.ticketButtonLabel || prev.ticketButtonLabel,
          stats: res.tickets.stats || prev.stats,
        }));
      }
    } catch (err) {
      console.error('Failed to load ticket settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscripts = async () => {
    try {
      setTranscriptsLoading(true);
      const url = `/guilds/${guildId}/transcripts?limit=50&search=${encodeURIComponent(searchQuery)}`;
      const res = await apiFetch(url);
      if (res && res.success && Array.isArray(res.transcripts)) {
        setTranscripts(res.transcripts);
      }
    } catch (err) {
      console.error('Failed to fetch transcripts:', err);
    } finally {
      setTranscriptsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketSettings();
  }, [guildId]);

  useEffect(() => {
    if (activeSubTab === 'transcripts') {
      fetchTranscripts();
    }
  }, [guildId, activeSubTab, searchQuery]);

  const updateField = (field, val) => {
    setTicketConfig((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const selectedStaffRole = roles.find((r) => r.id === ticketConfig.ticketStaffRoleId);
  const isStaffRoleUnmanageable = Boolean(selectedStaffRole && selectedStaffRole.canManage === false);

  const handlePublish = async (e) => {
    if (e) e.preventDefault();
    if (!ticketConfig.ticketPanelChannelId) {
      setNotification({
        type: 'error',
        message: t('tickets.errors.noChannel', { defaultValue: 'Por favor selecciona un canal para el panel de tickets.' }),
      });
      return;
    }

    if (isStaffRoleUnmanageable) {
      setNotification({
        type: 'error',
        message: t('tickets.errors.roleHierarchy', { defaultValue: 'El rol de staff seleccionado está por encima de TitanBot en la jerarquía.' }),
      });
      return;
    }

    try {
      setPublishing(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/tickets/publish`, {
        method: 'POST',
        body: JSON.stringify({
          panelChannelId: ticketConfig.ticketPanelChannelId,
          panelMessage: ticketConfig.ticketPanelMessage,
          buttonLabel: ticketConfig.ticketButtonLabel,
          categoryId: ticketConfig.ticketCategoryId || null,
          closedCategoryId: ticketConfig.ticketClosedCategoryId || null,
          staffRoleId: ticketConfig.ticketStaffRoleId || null,
          maxTicketsPerUser: ticketConfig.maxTicketsPerUser,
          dmOnClose: ticketConfig.dmOnClose,
        }),
      });

      if (res && res.success) {
        setNotification({
          type: 'success',
          message: res.message || t('tickets.publishSuccess', { defaultValue: '¡Panel de tickets publicado exitosamente en Discord!' }),
        });
        await fetchTicketSettings();
      } else {
        setNotification({
          type: 'error',
          message: res?.message || t('tickets.errors.publishFailed', { defaultValue: 'Error al publicar el panel.' }),
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('tickets.errors.publishFailed', { defaultValue: 'Error de conexión al publicar.' }),
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePanel = async () => {
    if (!window.confirm(t('tickets.confirmDeletePanel', { defaultValue: '¿Estás seguro de que deseas eliminar el panel de tickets activo?' }))) {
      return;
    }

    try {
      setDeleting(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/tickets/panel`, {
        method: 'DELETE',
      });

      if (res && res.success) {
        setNotification({
          type: 'success',
          message: res.message || t('tickets.deleteSuccess', { defaultValue: 'Panel de tickets despublicado y eliminado.' }),
        });
        await fetchTicketSettings();
      } else {
        setNotification({
          type: 'error',
          message: res?.message || t('tickets.errors.deleteFailed', { defaultValue: 'Error al eliminar el panel.' }),
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('tickets.errors.deleteFailed', { defaultValue: 'Error de conexión.' }),
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenTranscriptModal = async (transcriptSummary) => {
    try {
      const res = await apiFetch(`/guilds/${guildId}/transcripts/${transcriptSummary.id}`);
      if (res && res.success && res.transcript) {
        setSelectedTranscript(res.transcript);
        setIsModalOpen(true);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Error al cargar los detalles de la transcripción.',
      });
    }
  };

  const handleDeleteTranscript = async (transcriptId) => {
    if (!window.confirm(t('transcripts.confirmDelete', { defaultValue: '¿Estás seguro de eliminar este registro de transcripción?' }))) {
      return;
    }

    try {
      const res = await apiFetch(`/guilds/${guildId}/transcripts/${transcriptId}`, {
        method: 'DELETE',
      });
      if (res && res.success) {
        setNotification({
          type: 'success',
          message: t('transcripts.deleteSuccess', { defaultValue: 'Transcripción eliminada.' }),
        });
        fetchTranscripts();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Error al eliminar la transcripción.',
      });
    }
  };

  const handleCopyPublicLink = (item) => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const url = `${window.location.origin}${base}/api/transcripts/${item.id}?token=${item.viewToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDuration = (ms) => {
    if (!ms || ms <= 0) return 'N/A';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = (mins / 60).toFixed(1);
    return `${hours} h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
          <span className="text-sm text-slate-400">{t('common.loading', { defaultValue: 'Cargando ajustes de tickets...' })}</span>
        </div>
      </div>
    );
  }

  const panelChannel = textChannels.find((c) => c.id === ticketConfig.ticketPanelChannelId);
  const openCategory = categoryChannels.find((c) => c.id === ticketConfig.ticketCategoryId);
  const hasActivePanel = Boolean(ticketConfig.panelStatus?.exists);
  const stats = ticketConfig.stats || { openCount: 0, closedCount: 0, avgCloseTimeMs: null, feedbackCount: 0, avgRating: null };

  const totalHandled = (stats.openCount || 0) + (stats.closedCount || 0);
  const resolutionRate = totalHandled > 0 ? Math.round(((stats.closedCount || 0) / totalHandled) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-discord-blurple" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t('tickets.title', { defaultValue: 'Sistema de Tickets de Soporte' })}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                hasActivePanel
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {hasActivePanel ? 'Panel Activo' : 'Sin Panel'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('tickets.subtitle', { defaultValue: 'Configura y publica paneles interactivos de atención, define categorías de organización y consulta métricas de soporte.' })}
          </p>
        </div>

        {/* Sub-tab Switcher Buttons */}
        <div className="inline-flex p-1 bg-discord-dark border border-slate-800 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('panel')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === 'panel'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>{t('tickets.tabs.panel', { defaultValue: 'Panel' })}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('transcripts')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === 'transcripts'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('tickets.tabs.transcripts', { defaultValue: 'Transcripciones' })}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === 'analytics'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('tickets.tabs.analytics', { defaultValue: 'Métricas' })}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('guide')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === 'guide'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t('tickets.tabs.guide', { defaultValue: 'Guía' })}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-discord-blurple/10 text-discord-blurple shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('tickets.kpis.openTickets', { defaultValue: 'Tickets Abiertos' })}
            </span>
            <span className="text-xl font-bold text-white block mt-0.5">{stats.openCount || 0}</span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('tickets.kpis.closedTickets', { defaultValue: 'Tickets Resueltos' })}
            </span>
            <span className="text-xl font-bold text-white block mt-0.5">{stats.closedCount || 0}</span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('tickets.kpis.avgResolutionTime', { defaultValue: 'Tiempo Medio de Cierre' })}
            </span>
            <span className="text-sm font-bold text-white block mt-0.5">
              {formatDuration(stats.avgCloseTimeMs)}
            </span>
          </div>
        </div>

        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {t('tickets.kpis.satisfactionRating', { defaultValue: 'Satisfacción' })}
            </span>
            <span className="text-sm font-bold text-white block mt-0.5 truncate">
              {stats.avgRating ? `${stats.avgRating} / 5.0 ⭐` : t('tickets.kpis.noRatings', { defaultValue: 'Sin valoraciones' })}
            </span>
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
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUBTAB 1: Panel Interactivo */}
      {activeSubTab === 'panel' && (
        <div className="space-y-8">
          {/* Active Panel Status Card */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    hasActivePanel ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">
                      {hasActivePanel
                        ? t('tickets.panelStatusActive', { defaultValue: 'Panel de Tickets Activo' })
                        : t('tickets.panelStatusInactive', { defaultValue: 'Sin Panel Publicado' })}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        hasActivePanel
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {hasActivePanel ? t('common.active', { defaultValue: 'Activo' }) : t('common.inactive', { defaultValue: 'Inactivo' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {hasActivePanel
                      ? t('tickets.panelActiveDescription', {
                          channel: panelChannel?.name || ticketConfig.ticketPanelChannelId,
                          defaultValue: `El panel está activo en #${panelChannel?.name || ticketConfig.ticketPanelChannelId}. Los miembros pueden abrir tickets pulsando el botón.`,
                        })
                      : t('tickets.panelInactiveDescription', {
                          defaultValue: 'Aún no has publicado un panel de tickets en ningún canal de Discord.',
                        })}
                  </p>
                </div>
              </div>

              {hasActivePanel && (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://discord.com/channels/${guildId}/${ticketConfig.ticketPanelChannelId}/${ticketConfig.ticketPanelMessageId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 text-xs font-medium rounded-xl bg-discord-dark hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('tickets.goToDiscord', { defaultValue: 'Ver en Discord' })}</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleDeletePanel}
                    disabled={deleting}
                    className="px-3.5 py-2 text-xs font-medium rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{t('tickets.deletePanel', { defaultValue: 'Eliminar Panel' })}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form & Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column (7 cols) */}
            <div className="lg:col-span-7 bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <form onSubmit={handlePublish} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                    <MessageSquare className="w-5 h-5 text-discord-blurple" />
                    <span>{t('tickets.contentSection', { defaultValue: 'Mensaje del Panel' })}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    {t('tickets.contentSectionHelp', { defaultValue: 'Personaliza el texto y el botón con el que interactuarán los usuarios.' })}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.panelChannel', { defaultValue: 'Canal del Panel' })} <span className="text-red-400">*</span>
                      </label>
                      <ChannelSelect
                        channels={textChannels}
                        value={ticketConfig.ticketPanelChannelId}
                        onChange={(val) => updateField('ticketPanelChannelId', val)}
                        placeholder={t('tickets.selectChannelPlaceholder', { defaultValue: 'Selecciona un canal de texto...' })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.panelMessage', { defaultValue: 'Mensaje Informativo' })}
                      </label>
                      <textarea
                        rows={3}
                        value={ticketConfig.ticketPanelMessage}
                        onChange={(e) => updateField('ticketPanelMessage', e.target.value)}
                        placeholder={t('tickets.panelMessagePlaceholder', { defaultValue: 'Escribe el mensaje explicativo para el panel de tickets...' })}
                        className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.buttonLabel', { defaultValue: 'Etiqueta del Botón' })}
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={ticketConfig.ticketButtonLabel}
                        onChange={(e) => updateField('ticketButtonLabel', e.target.value)}
                        placeholder="Crear Ticket"
                        className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-800" />

                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                    <Folder className="w-5 h-5 text-discord-blurple" />
                    <span>{t('tickets.organizationSection', { defaultValue: 'Organización y Categorías' })}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    {t('tickets.organizationSectionHelp', { defaultValue: 'Define dónde se crearán los canales de soporte al abrirse y cerrarse.' })}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.openCategory', { defaultValue: 'Categoría para Tickets Abiertos' })}
                      </label>
                      <ChannelSelect
                        channels={categoryChannels}
                        value={ticketConfig.ticketCategoryId}
                        onChange={(val) => updateField('ticketCategoryId', val)}
                        placeholder={t('tickets.selectCategoryPlaceholder', { defaultValue: 'Seleccionar categoría contenedora...' })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.closedCategory', { defaultValue: 'Categoría para Tickets Cerrados' })}
                      </label>
                      <ChannelSelect
                        channels={categoryChannels}
                        value={ticketConfig.ticketClosedCategoryId}
                        onChange={(val) => updateField('ticketClosedCategoryId', val)}
                        placeholder={t('tickets.selectCategoryPlaceholder', { defaultValue: 'Seleccionar categoría contenedora...' })}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-800" />

                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                    <Users className="w-5 h-5 text-discord-blurple" />
                    <span>{t('tickets.permissionsSection', { defaultValue: 'Permisos y Comportamiento' })}</span>
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.staffRole', { defaultValue: 'Rol de Staff / Soporte' })}
                      </label>
                      <RoleSelect
                        roles={roles}
                        value={ticketConfig.ticketStaffRoleId}
                        onChange={(val) => updateField('ticketStaffRoleId', val)}
                      />

                      {isStaffRoleUnmanageable && (
                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-300">
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span>
                            {t('tickets.unmanageableRoleWarning', {
                              defaultValue: 'Advertencia: El rol de staff está por encima o al mismo nivel del rol de TitanBot en Discord. Sube el rol del bot para asegurar la asignación de permisos.',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-center">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          {t('tickets.maxTickets', { defaultValue: 'Límite de tickets por usuario' })}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={ticketConfig.maxTicketsPerUser}
                          onChange={(e) => updateField('maxTicketsPerUser', parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                        />
                      </div>

                      <div className="pt-2 sm:pt-0">
                        <Toggle
                          enabled={ticketConfig.dmOnClose}
                          onChange={(val) => updateField('dmOnClose', val)}
                          label={t('tickets.dmOnClose', { defaultValue: 'Notificar por MD al cerrar' })}
                          description={t('tickets.dmOnCloseHelp', { defaultValue: 'Envía un mensaje directo automático con confirmación y encuesta.' })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={publishing || !ticketConfig.ticketPanelChannelId || isStaffRoleUnmanageable}
                    className="bg-discord-blurple hover:bg-discord-blurple/90 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-discord-blurple/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {publishing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {hasActivePanel
                        ? t('tickets.updatePanelButton', { defaultValue: 'Actualizar Panel en Discord' })
                        : t('tickets.publishPanelButton', { defaultValue: 'Publicar Panel en Discord' })}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview (5 cols, sticky) */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <TicketPreview
                panelMessage={ticketConfig.ticketPanelMessage}
                buttonLabel={ticketConfig.ticketButtonLabel}
                channelName={panelChannel?.name}
                categoryName={openCategory?.name}
                staffRoleName={selectedStaffRole?.name}
                serverName={currentGuild?.name}
                onSelectPreset={({ message, buttonLabel: bLabel }) => {
                  updateField('ticketPanelMessage', message);
                  updateField('ticketButtonLabel', bLabel);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Historial y Transcripciones */}
      {activeSubTab === 'transcripts' && (
        <div className="space-y-6">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-discord-darker/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="relative flex-1 w-full sm:w-auto max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('transcripts.searchPlaceholder', { defaultValue: 'Buscar por ticket #, creador o motivo...' })}
                className="w-full pl-9 pr-8 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={fetchTranscripts}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-discord-dark hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${transcriptsLoading ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh', { defaultValue: 'Actualizar' })}</span>
            </button>
          </div>

          {/* Transcripts Table */}
          {transcriptsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
            </div>
          ) : transcripts.length === 0 ? (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-lg">
              <FileText className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <h3 className="text-base font-semibold text-white">
                {t('transcripts.noTranscripts', { defaultValue: 'No hay transcripciones registradas' })}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {t('transcripts.noTranscriptsHelp', { defaultValue: 'Cuando los usuarios o el staff cierren y eliminen tickets, su historial completo de mensajes se guardará automáticamente aquí.' })}
              </p>
            </div>
          ) : (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead className="bg-discord-dark text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">{t('transcripts.ticket', { defaultValue: 'Ticket' })}</th>
                      <th className="px-6 py-4">{t('transcripts.creator', { defaultValue: 'Creador' })}</th>
                      <th className="px-6 py-4">{t('transcripts.closedBy', { defaultValue: 'Cerrado por' })}</th>
                      <th className="px-6 py-4">{t('transcripts.messages', { defaultValue: 'Mensajes' })}</th>
                      <th className="px-6 py-4">{t('transcripts.date', { defaultValue: 'Fecha' })}</th>
                      <th className="px-6 py-4 text-right">{t('common.actions', { defaultValue: 'Acciones' })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {transcripts.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="text-discord-blurple">#</span>
                            {item.ticketNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-200">
                          {item.ticketCreatorTag || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                          {item.closedByTag || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs font-semibold text-slate-300">
                            {item.messageCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                          {new Date(item.closedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenTranscriptModal(item)}
                            title={t('transcripts.view', { defaultValue: 'Ver' })}
                            className="p-1.5 rounded-xl bg-discord-blurple/10 hover:bg-discord-blurple/20 text-discord-blurple transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('transcripts.view', { defaultValue: 'Ver' })}</span>
                          </button>

                          <a
                            href={`/api/guilds/${guildId}/transcripts/${item.id}/download`}
                            download
                            title={t('transcripts.downloadHtml', { defaultValue: 'Descargar HTML' })}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-slate-700/60"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>HTML</span>
                          </a>

                          <button
                            onClick={() => handleCopyPublicLink(item)}
                            title={t('transcripts.copyLink', { defaultValue: 'Copiar enlace público' })}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center text-xs px-2 py-1 border border-slate-700/60"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteTranscript(item.id)}
                            title={t('common.delete', { defaultValue: 'Eliminar' })}
                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer inline-flex items-center text-xs px-2 py-1 border border-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: Métricas y Rendimiento */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  {t('tickets.analytics.title', { defaultValue: 'Métricas de Atención y Rendimiento' })}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('tickets.analytics.desc', { defaultValue: 'Estadísticas del tiempo de respuesta y resolución de tickets en este servidor.' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Card 1: Resolution Rate */}
              <div className="bg-discord-dark/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  {t('tickets.analytics.resolutionRate', { defaultValue: 'Tasa de Resolución' })}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400">{resolutionRate}%</span>
                  <span className="text-xs text-slate-400">({stats.closedCount} resueltos de {totalHandled})</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${resolutionRate}%` }} />
                </div>
              </div>

              {/* Card 2: Average Time */}
              <div className="bg-discord-dark/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  {t('tickets.kpis.avgResolutionTime', { defaultValue: 'Tiempo Medio de Cierre' })}
                </span>
                <div className="text-3xl font-black text-blue-400">
                  {formatDuration(stats.avgCloseTimeMs)}
                </div>
                <p className="text-xs text-slate-400">
                  Tiempo promedio desde la creación del ticket hasta su cierre definitivo.
                </p>
              </div>

              {/* Card 3: Satisfaction */}
              <div className="bg-discord-dark/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  {t('tickets.kpis.satisfactionRating', { defaultValue: 'Satisfacción Promedio' })}
                </span>
                <div className="text-3xl font-black text-amber-400">
                  {stats.avgRating ? `${stats.avgRating} / 5.0 ⭐` : '5.0 ⭐'}
                </div>
                <p className="text-xs text-slate-400">
                  Basado en {stats.feedbackCount || 0} valoraciones de usuarios recibidas por MD.
                </p>
              </div>
            </div>

            {/* Support Best Practice Tips */}
            <div className="bg-discord-dark/40 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-discord-blurple" />
                <h3 className="text-sm font-bold text-slate-200">
                  {t('tickets.analytics.tipsTitle', { defaultValue: 'Consejos para Optimizar la Atención' })}
                </h3>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
                <li className="p-3 bg-discord-darker rounded-lg border border-slate-800 leading-relaxed">
                  💡 {t('tickets.analytics.tip1', { defaultValue: 'Asigna una categoría separada para tickets cerrados para no saturar la vista del servidor.' })}
                </li>
                <li className="p-3 bg-discord-darker rounded-lg border border-slate-800 leading-relaxed">
                  ⭐ {t('tickets.analytics.tip2', { defaultValue: 'Usa el botón Reclamar dentro del ticket para que un moderador asuma el liderazgo del caso.' })}
                </li>
                <li className="p-3 bg-discord-darker rounded-lg border border-slate-800 leading-relaxed">
                  📜 {t('tickets.analytics.tip3', { defaultValue: 'Las transcripciones se guardan con todos los mensajes y archivos automáticamente al cerrar.' })}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Guía y Permisos */}
      {activeSubTab === 'guide' && (
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <HelpCircle className="w-5 h-5 text-discord-blurple" />
            <div>
              <h2 className="text-base font-semibold text-white">
                {t('tickets.guide.title', { defaultValue: 'Guía de Permisos y Funcionamiento' })}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('tickets.guide.desc', { defaultValue: 'Asegúrate de que TitanBot cuente con los siguientes permisos en Discord para gestionar tickets sin problemas:' })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('tickets.guide.permManageChannels', { defaultValue: 'Gestionar Canales (ManageChannels)' })}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permite crear el canal privado de texto al instante y moverlo a la categoría de cerrados.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('tickets.guide.permViewChannels', { defaultValue: 'Ver Canales (ViewChannels)' })}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Requerido para escuchar las interacciones de los botones y leer mensajes del panel.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('tickets.guide.permSendMessages', { defaultValue: 'Enviar Mensajes (SendMessages)' })}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para enviar el mensaje del panel y los controles de bienvenida dentro del ticket.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('tickets.guide.permEmbedLinks', { defaultValue: 'Insertar Enlaces (EmbedLinks)' })}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Imprescindible para renderizar el panel interactivo con recuadros coloreados y campos.
              </p>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Lifecycle guide */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200">
              {t('tickets.guide.lifecycleTitle', { defaultValue: 'Ciclo de Vida Automático del Ticket' })}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-discord-dark/50 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-discord-blurple block">
                  {t('tickets.guide.step1Title', { defaultValue: '1. Creación con 1 Clic' })}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('tickets.guide.step1Text', { defaultValue: 'El miembro pulsa el botón en el canal del panel y TitanBot crea un canal de texto privado exclusivo.' })}
                </p>
              </div>

              <div className="p-3 bg-discord-dark/50 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-amber-400 block">
                  {t('tickets.guide.step2Title', { defaultValue: '2. Notificación al Staff' })}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('tickets.guide.step2Text', { defaultValue: 'El rol de soporte configurado recibe acceso al canal y el bot envía los controles de gestión.' })}
                </p>
              </div>

              <div className="p-3 bg-discord-dark/50 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-blue-400 block">
                  {t('tickets.guide.step3Title', { defaultValue: '3. Atención y Reclamación' })}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('tickets.guide.step3Text', { defaultValue: 'Un moderador puede reclamar el ticket con el botón ⭐ Reclamar para liderar la conversación.' })}
                </p>
              </div>

              <div className="p-3 bg-discord-dark/50 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-emerald-400 block">
                  {t('tickets.guide.step4Title', { defaultValue: '4. Transcripción y Cierre' })}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t('tickets.guide.step4Text', { defaultValue: 'Al cerrar el ticket, se genera una transcripción HTML completa guardada en el Dashboard y se notifica al usuario por MD.' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Viewer Modal */}
      <TranscriptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transcript={selectedTranscript}
        guildId={guildId}
      />
    </div>
  );
}
