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
} from 'lucide-react';

export function TicketsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

  const [activeSubTab, setActiveSubTab] = useState('panel'); // 'panel' | 'transcripts'
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
  });

  // Transcripts list state
  const [transcripts, setTranscripts] = useState([]);
  const [transcriptsLoading, setTranscriptsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Filter text-only channels vs category channels
  const textChannels = (channels || []).filter((c) => c.type === 0 || c.type === undefined);
  const categoryChannels = (channels || []).filter((c) => c.type === 4);

  const fetchTicketSettings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/tickets`);
      if (res.success && res.tickets) {
        setTicketConfig((prev) => ({
          ...prev,
          ...res.tickets,
          ticketPanelChannelId: res.tickets.ticketPanelChannelId || '',
          ticketCategoryId: res.tickets.ticketCategoryId || '',
          ticketClosedCategoryId: res.tickets.ticketClosedCategoryId || '',
          ticketStaffRoleId: res.tickets.ticketStaffRoleId || '',
          ticketPanelMessage: res.tickets.ticketPanelMessage || prev.ticketPanelMessage,
          ticketButtonLabel: res.tickets.ticketButtonLabel || prev.ticketButtonLabel,
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
      if (res.success && Array.isArray(res.transcripts)) {
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
    e.preventDefault();
    if (!ticketConfig.ticketPanelChannelId) {
      setNotification({
        type: 'error',
        message: t('tickets.errors.noChannel') || 'Por favor selecciona un canal para el panel de tickets.',
      });
      return;
    }

    if (isStaffRoleUnmanageable) {
      setNotification({
        type: 'error',
        message: t('tickets.errors.roleHierarchy') || 'El rol de staff seleccionado está por encima de TitanBot en la jerarquía.',
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

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('tickets.publishSuccess') || '¡Panel de tickets publicado exitosamente en Discord!',
        });
        await fetchTicketSettings();
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('tickets.errors.publishFailed') || 'Error al publicar el panel.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('tickets.errors.publishFailed') || 'Error de conexión al publicar.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePanel = async () => {
    if (!window.confirm(t('tickets.confirmDeletePanel') || '¿Estás seguro de que deseas eliminar el panel de tickets activo?')) {
      return;
    }

    try {
      setDeleting(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/tickets/panel`, {
        method: 'DELETE',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('tickets.deleteSuccess') || 'Panel de tickets despublicado y eliminado.',
        });
        await fetchTicketSettings();
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('tickets.errors.deleteFailed') || 'Error al eliminar el panel.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('tickets.errors.deleteFailed') || 'Error de conexión.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenTranscriptModal = async (transcriptSummary) => {
    try {
      const res = await apiFetch(`/guilds/${guildId}/transcripts/${transcriptSummary.id}`);
      if (res.success && res.transcript) {
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
    if (!window.confirm(t('transcripts.confirmDelete') || '¿Estás seguro de eliminar este registro de transcripción?')) {
      return;
    }

    try {
      const res = await apiFetch(`/guilds/${guildId}/transcripts/${transcriptId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setNotification({
          type: 'success',
          message: t('transcripts.deleteSuccess') || 'Transcripción eliminada.',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
          <span className="text-sm text-slate-400">{t('common.loading') || 'Cargando ajustes de tickets...'}</span>
        </div>
      </div>
    );
  }

  const panelChannel = textChannels.find((c) => c.id === ticketConfig.ticketPanelChannelId);
  const openCategory = categoryChannels.find((c) => c.id === ticketConfig.ticketCategoryId);
  const hasActivePanel = Boolean(ticketConfig.panelStatus?.exists);

  return (
    <div className="space-y-8">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-discord-blurple" />
            <span>{t('tickets.title') || 'Sistema de Tickets'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('tickets.subtitle') || 'Configura y publica paneles de soporte interactivos y consulta el historial de transcripciones.'}
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="inline-flex p-1 bg-discord-dark border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('panel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'panel'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>{t('tickets.tabs.panel') || 'Panel Interactivo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('transcripts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'transcripts'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('tickets.tabs.transcripts') || 'Historial & Transcripts'}</span>
          </button>
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

      {/* VIEW 1: Panel Configuration */}
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
                        ? t('tickets.panelStatusActive') || 'Panel de Tickets Activo'
                        : t('tickets.panelStatusInactive') || 'Sin Panel Publicado'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        hasActivePanel
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {hasActivePanel ? t('common.active') || 'Activo' : t('common.inactive') || 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {hasActivePanel
                      ? t('tickets.panelActiveDescription', { channel: panelChannel?.name || ticketConfig.ticketPanelChannelId }) ||
                        `El panel está activo en #${panelChannel?.name || ticketConfig.ticketPanelChannelId}. Los miembros pueden abrir tickets pulsando el botón.`
                      : t('tickets.panelInactiveDescription') ||
                        'Aún no has publicado un panel de tickets en ningún canal de Discord.'}
                  </p>
                </div>
              </div>

              {hasActivePanel && (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://discord.com/channels/${guildId}/${ticketConfig.ticketPanelChannelId}/${ticketConfig.ticketPanelMessageId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 text-xs font-medium rounded-lg bg-discord-dark hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('tickets.goToDiscord') || 'Ver en Discord'}</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleDeletePanel}
                    disabled={deleting}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{t('tickets.deletePanel') || 'Eliminar Panel'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form & Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column (7 cols) */}
            <div className="lg:col-span-7 bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <form onSubmit={handlePublish} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                    <MessageSquare className="w-5 h-5 text-discord-blurple" />
                    <span>{t('tickets.contentSection') || 'Mensaje del Panel'}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    {t('tickets.contentSectionHelp') || 'Personaliza el texto y el botón con el que interactuarán los usuarios.'}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.panelChannel') || 'Canal del Panel'} <span className="text-red-400">*</span>
                      </label>
                      <ChannelSelect
                        channels={textChannels}
                        value={ticketConfig.ticketPanelChannelId}
                        onChange={(val) => updateField('ticketPanelChannelId', val)}
                        placeholder={t('tickets.selectChannelPlaceholder') || 'Selecciona un canal de texto'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.panelMessage') || 'Mensaje Informativo'}
                      </label>
                      <textarea
                        rows={3}
                        value={ticketConfig.ticketPanelMessage}
                        onChange={(e) => updateField('ticketPanelMessage', e.target.value)}
                        placeholder={t('tickets.panelMessagePlaceholder') || 'Escribe el mensaje explicativo para el ticket...'}
                        className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.buttonLabel') || 'Etiqueta del Botón'}
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={ticketConfig.ticketButtonLabel}
                        onChange={(e) => updateField('ticketButtonLabel', e.target.value)}
                        placeholder="Crear Ticket"
                        className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-800" />

                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                    <Folder className="w-5 h-5 text-discord-blurple" />
                    <span>{t('tickets.organizationSection') || 'Organización y Categorías'}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    {t('tickets.organizationSectionHelp') || 'Define dónde se crearán los canales de soporte al abrirse y cerrarse.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.openCategory') || 'Categoría para Tickets Abiertos'}
                      </label>
                      <ChannelSelect
                        channels={categoryChannels}
                        value={ticketConfig.ticketCategoryId}
                        onChange={(val) => updateField('ticketCategoryId', val)}
                        placeholder={t('tickets.selectCategoryPlaceholder') || 'Seleccionar categoría...'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.closedCategory') || 'Categoría para Tickets Cerrados'}
                      </label>
                      <ChannelSelect
                        channels={categoryChannels}
                        value={ticketConfig.ticketClosedCategoryId}
                        onChange={(val) => updateField('ticketClosedCategoryId', val)}
                        placeholder={t('tickets.selectCategoryPlaceholder') || 'Seleccionar categoría...'}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-800" />

                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
                    <Users className="w-5 h-5 text-discord-blurple" />
                    <span>{t('tickets.permissionsSection') || 'Permisos y Comportamiento'}</span>
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('tickets.staffRole') || 'Rol de Staff / Soporte'}
                      </label>
                      <RoleSelect
                        roles={roles}
                        value={ticketConfig.ticketStaffRoleId}
                        onChange={(val) => updateField('ticketStaffRoleId', val)}
                      />

                      {isStaffRoleUnmanageable && (
                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-xs text-red-300">
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span>
                            {t('tickets.unmanageableRoleWarning') ||
                              'Advertencia: El rol de staff está por encima del rol de TitanBot en Discord. Asegúrate de mover el rol del bot por encima para garantizar que pueda gestionar permisos.'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-center">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          {t('tickets.maxTickets') || 'Límite de tickets por usuario'}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={ticketConfig.maxTicketsPerUser}
                          onChange={(e) => updateField('maxTicketsPerUser', parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                        />
                      </div>

                      <div className="pt-2 sm:pt-0">
                        <Toggle
                          enabled={ticketConfig.dmOnClose}
                          onChange={(val) => updateField('dmOnClose', val)}
                          label={t('tickets.dmOnClose') || 'Notificar por MD al cerrar'}
                          description={t('tickets.dmOnCloseHelp') || 'Envía un mensaje directo al usuario cuando su ticket sea cerrado.'}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={publishing || !ticketConfig.ticketPanelChannelId || isStaffRoleUnmanageable}
                    className="bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-discord-blurple/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {publishing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {hasActivePanel
                        ? t('tickets.updatePanelButton') || 'Actualizar Panel en Discord'
                        : t('tickets.publishPanelButton') || 'Publicar Panel en Discord'}
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
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Transcripts History */}
      {activeSubTab === 'transcripts' && (
        <div className="space-y-6">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-discord-darker/60 border border-slate-800 rounded-2xl p-4">
            <div className="relative flex-1 w-full sm:w-auto max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('transcripts.searchPlaceholder') || 'Buscar por ticket #, creador o motivo...'}
                className="w-full pl-9 pr-4 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition-colors"
              />
            </div>

            <button
              onClick={fetchTranscripts}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-discord-dark hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${transcriptsLoading ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh') || 'Actualizar'}</span>
            </button>
          </div>

          {/* Transcripts Table / Cards */}
          {transcriptsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
            </div>
          ) : transcripts.length === 0 ? (
            <div className="bg-discord-darker/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <FileText className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
              <h3 className="text-base font-semibold text-white">
                {t('transcripts.noTranscripts') || 'No hay transcripciones registradas'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t('transcripts.noTranscriptsHelp') || 'Cuando los usuarios o el staff cierren y eliminen tickets, su historial de mensajes se guardará automáticamente aquí.'}
              </p>
            </div>
          ) : (
            <div className="bg-discord-darker/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-discord-dark/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">{t('transcripts.ticket') || 'Ticket'}</th>
                      <th className="px-6 py-4">{t('transcripts.creator') || 'Creador'}</th>
                      <th className="px-6 py-4">{t('transcripts.closedBy') || 'Cerrado por'}</th>
                      <th className="px-6 py-4">{t('transcripts.messages') || 'Mensajes'}</th>
                      <th className="px-6 py-4">{t('transcripts.date') || 'Fecha'}</th>
                      <th className="px-6 py-4 text-right">{t('common.actions') || 'Acciones'}</th>
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
                          <span className="px-2.5 py-1 bg-slate-800/80 rounded-md text-xs font-semibold text-slate-300">
                            {item.messageCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                          {new Date(item.closedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenTranscriptModal(item)}
                            title={t('transcripts.view') || 'Ver Transcripción'}
                            className="p-1.5 rounded-lg bg-discord-blurple/10 hover:bg-discord-blurple/20 text-discord-blurple transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('transcripts.view') || 'Ver'}</span>
                          </button>

                          <a
                            href={`/api/guilds/${guildId}/transcripts/${item.id}/download`}
                            download
                            title={t('transcripts.downloadHtml') || 'Descargar HTML'}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>HTML</span>
                          </a>

                          <button
                            onClick={() => handleCopyPublicLink(item)}
                            title={t('transcripts.copyLink') || 'Copiar enlace público'}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center text-xs px-2 py-1"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteTranscript(item.id)}
                            title={t('common.delete') || 'Eliminar'}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer inline-flex items-center text-xs px-2 py-1"
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
