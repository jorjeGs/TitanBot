import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { TicketPreview } from '../../components/preview/TicketPreview';
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
} from 'lucide-react';

export function TicketsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

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

  useEffect(() => {
    fetchTicketSettings();
  }, [guildId]);

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Ticket className="w-7 h-7 text-discord-blurple" />
          <span>{t('tickets.title') || 'Sistema de Tickets'}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('tickets.subtitle') || 'Configura y publica paneles de soporte interactivos para atender a tu comunidad.'}
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
              <p className="text-xs text-slate-400 mt-1">
                {hasActivePanel
                  ? `${t('tickets.panelActiveIn') || 'Publicado en'} #${panelChannel?.name || ticketConfig.ticketPanelChannelId}`
                  : t('tickets.panelNotPublishedDesc') || 'Personaliza los ajustes abajo y haz clic en Publicar para enviarlo a Discord.'}
              </p>
            </div>
          </div>

          {hasActivePanel && (
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://discord.com/channels/${guildId}/${ticketConfig.ticketPanelChannelId}/${ticketConfig.ticketPanelMessageId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('tickets.viewInDiscord') || 'Ver en Discord'}</span>
              </a>

              <button
                type="button"
                onClick={handleDeletePanel}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{t('tickets.deletePanel') || 'Despublicar Panel'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Builder Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handlePublish} className="space-y-6">
            {/* Card 1: Channels and Categories */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Folder className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('tickets.channelsSectionTitle') || 'Canales y Categorías de Destino'}
                </h2>
              </div>

              <ChannelSelect
                label={t('tickets.panelChannel') || 'Canal donde se publicará el panel *'}
                helpText={t('tickets.panelChannelHelp') || 'El canal de texto donde los usuarios verán el botón para abrir tickets.'}
                channels={textChannels}
                value={ticketConfig.ticketPanelChannelId}
                onChange={(val) => updateField('ticketPanelChannelId', val)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <ChannelSelect
                  label={t('tickets.category') || 'Categoría para tickets abiertos (opcional)'}
                  helpText={t('tickets.categoryHelp') || 'Categoría donde se crearán los canales de nuevos tickets.'}
                  channels={categoryChannels}
                  value={ticketConfig.ticketCategoryId}
                  onChange={(val) => updateField('ticketCategoryId', val)}
                />

                <ChannelSelect
                  label={t('tickets.closedCategory') || 'Categoría para tickets cerrados (opcional)'}
                  helpText={t('tickets.closedCategoryHelp') || 'Categoría donde se moverán los tickets al cerrarse.'}
                  channels={categoryChannels}
                  value={ticketConfig.ticketClosedCategoryId}
                  onChange={(val) => updateField('ticketClosedCategoryId', val)}
                />
              </div>
            </div>

            {/* Card 2: Embed & Button Content */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <MessageSquare className="w-5 h-5 text-discord-blurple" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('tickets.contentSectionTitle') || 'Personalización del Panel'}
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('tickets.panelMessage') || 'Descripción del Embed de Tickets'}
                </label>
                <textarea
                  rows={3}
                  value={ticketConfig.ticketPanelMessage}
                  onChange={(e) => updateField('ticketPanelMessage', e.target.value)}
                  placeholder={t('tickets.panelMessagePlaceholder') || 'Describe cómo funciona tu soporte...'}
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('tickets.panelMessageHelp') || 'Texto explicativo que se muestra dentro del mensaje en Discord.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('tickets.buttonLabel') || 'Texto del Botón de Creación'}
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={ticketConfig.ticketButtonLabel}
                  onChange={(e) => updateField('ticketButtonLabel', e.target.value)}
                  placeholder={t('tickets.panelPlaceholder', 'Crear Ticket')}
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('tickets.buttonLabelHelp') || 'Etiqueta del botón que pulsará el usuario en Discord.'}
                </p>
              </div>
            </div>

            {/* Card 3: Permissions & Policy */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Settings2 className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('tickets.policySectionTitle') || 'Reglas y Permisos de Soporte'}
                </h2>
              </div>

              <div>
                <RoleSelect
                  label={t('tickets.staffRole') || 'Rol de Staff / Moderación (opcional)'}
                  helpText={t('tickets.staffRoleHelp') || 'Este rol tendrá acceso automático de lectura y escritura en los canales de ticket creados.'}
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
                  <p className="mt-1 text-xs text-slate-400">
                    {t('tickets.maxTicketsHelp') || 'Máximo de tickets abiertos simultáneamente (1-10).'}
                  </p>
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
  );
}
