import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { ApplicationPreview } from '../../components/preview/ApplicationPreview';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
  Eye,
  Shield,
  MessageSquare,
  Sparkles,
  Save,
} from 'lucide-react';

export function ApplicationsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  // Active top tab
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'config'

  // Inbox state
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'denied'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewModal, setReviewModal] = useState(null); // { appId, action: 'approve'|'deny' }
  const [reviewReason, setReviewReason] = useState('');

  // Settings state
  const [enabled, setEnabled] = useState(false);
  const [applicationChannelId, setApplicationChannelId] = useState('');
  const [logChannelId, setLogChannelId] = useState('');
  const [targetRoleId, setTargetRoleId] = useState('');
  const [questions, setQuestions] = useState([
    '¿Por qué deseas unirte al equipo de staff?',
    '¿Qué experiencia previa tienes en moderación?',
    '¿Cuántas horas semanales puedes dedicar?',
  ]);
  const [newQuestion, setNewQuestion] = useState('');
  const [cooldownHours, setCooldownHours] = useState(24);

  // Filter text channels
  const textChannels = (channels || []).filter((c) => c.type === 0 || !c.type);

  const fetchAppData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/applications`);
      if (res.success) {
        setApplications(Array.isArray(res.applications) ? res.applications : []);
        if (res.settings) {
          setEnabled(Boolean(res.settings.enabled));
          setApplicationChannelId(res.settings.applicationChannelId || '');
          setLogChannelId(res.settings.logChannelId || '');
          setTargetRoleId(res.settings.targetRoleId || res.settings.roles?.accepted || '');
          if (Array.isArray(res.settings.questions) && res.settings.questions.length > 0) {
            setQuestions(res.settings.questions);
          }
          setCooldownHours(res.settings.cooldown || 24);
        }
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, [guildId]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/applications/config`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled,
          applicationChannelId: applicationChannelId || null,
          logChannelId: logChannelId || null,
          targetRoleId: targetRoleId || null,
          questions,
          cooldownHours: parseInt(cooldownHours, 10) || 24,
        }),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('applications.saveSuccess') || '¡Ajustes de postulaciones guardados exitosamente!',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('applications.errors.saveFailed') || 'Error al guardar los ajustes.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('applications.errors.saveFailed') || 'Error de conexión.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (appId, action, reason) => {
    try {
      setActionLoading(`review-${appId}`);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/applications/${appId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          reason: reason?.trim() || null,
        }),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message:
            action === 'approve'
              ? t('applications.approveSuccess') || '¡Postulación aprobada y rol otorgado!'
              : t('applications.denySuccess') || 'Postulación denegada.',
        });
        setReviewModal(null);
        setReviewReason('');
        if (selectedApp?.id === appId) {
          setSelectedApp(res.application);
        }
        await fetchAppData();
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('applications.errors.reviewFailed') || 'Error al procesar la postulación.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('applications.errors.reviewFailed') || 'Error de conexión.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm(t('applications.confirmDelete') || '¿Deseas eliminar este registro de postulación?')) {
      return;
    }

    try {
      setActionLoading(`delete-${appId}`);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/applications/${appId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('applications.deleteSuccess') || 'Postulación eliminada correctamente.',
        });
        setApplications((prev) => prev.filter((a) => a.id !== appId));
        if (selectedApp?.id === appId) {
          setSelectedApp(null);
        }
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('applications.errors.deleteFailed') || 'Error al eliminar la postulación.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('applications.errors.deleteFailed') || 'Error de conexión.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    if (questions.length >= 10) {
      setNotification({
        type: 'error',
        message: t('applications.errors.maxQuestions') || 'Máximo 10 preguntas permitidas.',
      });
      return;
    }
    setQuestions((prev) => [...prev, q]);
    setNewQuestion('');
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) {
      setNotification({
        type: 'error',
        message: t('applications.errors.minQuestions') || 'Debe haber al menos 1 pregunta.',
      });
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  const filteredApplications = applications.filter((app) => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchUsername = (app.username || '').toLowerCase().includes(term);
      const matchDisplay = (app.displayName || '').toLowerCase().includes(term);
      const matchId = (app.id || '').toLowerCase().includes(term);
      const matchRole = (app.roleName || '').toLowerCase().includes(term);
      if (!matchUsername && !matchDisplay && !matchId && !matchRole) return false;
    }
    return true;
  });

  const selectedChannel = (channels || []).find((c) => c.id === applicationChannelId);
  const selectedRole = (roles || []).find((r) => r.id === targetRoleId);

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
            <ClipboardList className="w-7 h-7 text-discord-blurple" />
            <span>{t('applications.title') || 'Postulaciones de la Comunidad'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('applications.subtitle') ||
              'Gestiona el cuestionario de ingreso para roles de staff, revisa las respuestas de los candidatos y aprueba o rechaza con notas.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAppData}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-discord-dark hover:bg-slate-700/60 text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-700/60 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('common.refresh') || 'Actualizar'}</span>
          </button>
        </div>
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

      {/* Top Tabs Switcher */}
      <div className="flex p-1 bg-discord-darker border border-slate-800 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'inbox'
              ? 'bg-discord-blurple text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>{t('applications.tabInbox') || 'Bandeja de Candidatos'}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-900 text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-discord-blurple text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t('applications.tabConfig') || 'Configuración del Formulario'}</span>
        </button>
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-discord-darker/70 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t('applications.filterAll') || 'Todas'} ({applications.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('applications.filterPending') || 'Pendientes'} ({pendingCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('applications.filterApproved') || 'Aprobadas'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('denied')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'denied'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-red-300 hover:bg-slate-800'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>{t('applications.filterDenied') || 'Denegadas'}</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('applications.searchPlaceholder') || 'Buscar por usuario o rol...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 bg-discord-dark border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
              />
            </div>
          </div>

          {/* Applications Table / Cards */}
          {filteredApplications.length === 0 ? (
            <div className="bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                <ClipboardList className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {applications.length === 0
                  ? t('applications.noApplicationsYet') || 'No se han recibido postulaciones en este servidor.'
                  : t('applications.noFilterResults') || 'No hay postulaciones que coincidan con los filtros.'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t('applications.noApplicationsHelp') ||
                  'Activa las postulaciones en la pestaña de configuración para que los usuarios puedan postularse con /apply.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredApplications.map((app) => {
                const isPending = app.status === 'pending';
                const isApproved = app.status === 'approved';
                const isDenied = app.status === 'denied';

                return (
                  <div
                    key={app.id}
                    className={`bg-discord-darker border rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all ${
                      isPending
                        ? 'border-amber-500/40 hover:border-amber-500'
                        : isApproved
                        ? 'border-emerald-500/40 hover:border-emerald-500'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Candidate Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {app.avatar ? (
                            <img
                              src={app.avatar}
                              alt={app.displayName}
                              className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-discord-blurple/20 border border-discord-blurple/30 flex items-center justify-center font-bold text-sm text-discord-blurple shrink-0">
                              {app.displayName?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate" title={app.displayName}>
                              {app.displayName}
                            </h3>
                            <p className="text-[11px] text-slate-400 truncate">@{app.username}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : isApproved
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/15 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {isPending && <Clock className="w-3 h-3" />}
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isDenied && <XCircle className="w-3 h-3" />}
                          <span>
                            {isPending
                              ? t('applications.statusPending') || 'Pendiente'
                              : isApproved
                              ? t('applications.statusApproved') || 'Aprobada'
                              : t('applications.statusDenied') || 'Denegada'}
                          </span>
                        </span>
                      </div>

                      {/* Role Info */}
                      <div className="flex items-center gap-2 text-xs bg-[#1e1f22] px-3 py-1.5 rounded-lg border border-slate-700/40">
                        <Shield className="w-3.5 h-3.5 text-discord-blurple shrink-0" />
                        <span className="text-slate-400 text-[11px]">{t('applications.roleColon', 'Rol:')}</span>
                        <span className="font-semibold text-slate-200 truncate">
                          {app.roleName || 'Staff'}
                        </span>
                      </div>

                      {/* Answers Snapshot */}
                      <div className="text-xs text-slate-300 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500">
                          {Array.isArray(app.answers) ? app.answers.length : 0} {t('applications.answersSubmitted') || 'respuestas enviadas'}
                        </span>
                        {Array.isArray(app.answers) && app.answers[0] && (
                          <p className="text-slate-400 line-clamp-2 italic text-[11px] bg-discord-dark/50 p-2 rounded">
                            "{app.answers[0].answer}"
                          </p>
                        )}
                      </div>

                      {/* Review Reason / Note if processed */}
                      {!isPending && app.reviewMessage && (
                        <div className="text-[11px] text-slate-400 bg-[#1e1f22]/70 p-2 rounded border border-slate-700/40">
                          <span className="font-semibold text-slate-300">{t('applications.noteColon', 'Nota:')}</span> {app.reviewMessage}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="px-3 py-1.5 bg-discord-dark hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700/60"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('applications.viewAnswersBtn') || 'Ver Respuestas'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => setReviewModal({ appId: app.id, action: 'approve' })}
                              className="p-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
                              title={t('applications.approveTooltip') || 'Aprobar postulación'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReviewModal({ appId: app.id, action: 'deny' })}
                              className="p-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                              title={t('applications.denyTooltip') || 'Denegar postulación'}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteApplication(app.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title={t('applications.deleteTooltip') || 'Eliminar registro'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <Settings className="w-5 h-5 text-discord-blurple" />
            <div>
              <h2 className="text-base font-bold text-white">
                {t('applications.configCardTitle') || 'Configuración del Cuestionario y Roles'}
              </h2>
              <p className="text-xs text-slate-400">
                {t('applications.configCardSubtitle') ||
                  'Configura los canales de publicación, rol concedido en Discord al ser aprobado y las preguntas del formulario.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-5">
              {/* Enabled Toggle */}
              <div className="flex items-center justify-between p-4 bg-discord-dark rounded-xl border border-slate-700/60">
                <div>
                  <span className="font-semibold text-sm text-slate-200 block">
                    {t('applications.enableApplications') || 'Activar Sistema de Postulaciones'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t('applications.enableApplicationsHelp') || 'Permite que los usuarios puedan enviar solicitudes con /apply.'}
                  </span>
                </div>
                <Toggle checked={enabled} onChange={setEnabled} />
              </div>

              {/* Channels selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChannelSelect
                  label={t('applications.fieldAppChannel') || 'Canal de Anuncio / Panel'}
                  helpText={t('applications.fieldAppChannelHelp') || 'Canal donde se publicará el panel de postulación.'}
                  channels={textChannels}
                  value={applicationChannelId}
                  onChange={(val) => setApplicationChannelId(val)}
                />

                <ChannelSelect
                  label={t('applications.fieldLogChannel') || 'Canal de Auditoría / Logs'}
                  helpText={t('applications.fieldLogChannelHelp') || 'Canal donde se envían alertas de nuevas postulaciones.'}
                  channels={textChannels}
                  value={logChannelId}
                  onChange={(val) => setLogChannelId(val)}
                />
              </div>

              {/* Target Role & Cooldown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RoleSelect
                  label={t('applications.fieldTargetRole') || 'Rol Otorgado al Aprobar'}
                  helpText={t('applications.fieldTargetRoleHelp') || 'Rol asignado automáticamente al miembro en Discord al ser aceptado.'}
                  roles={roles || []}
                  value={targetRoleId}
                  onChange={(val) => setTargetRoleId(val)}
                  warnHierarchy={true}
                />

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                    {t('applications.fieldCooldown') || 'Cooldown de Postulación (Horas)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    value={cooldownHours}
                    onChange={(e) => setCooldownHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {t('applications.cooldownHelp') || 'Tiempo mínimo de espera entre solicitudes por usuario.'}
                  </p>
                </div>
              </div>

              {/* Questions Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-200">
                    {t('applications.questionsListTitle') || 'Preguntas del Cuestionario (Máx. 10)'}
                  </label>
                  <span className="text-xs text-slate-400">{questions.length} / 10</span>
                </div>

                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 bg-discord-dark rounded-lg border border-slate-700/60"
                    >
                      <span className="text-xs font-bold text-discord-blurple w-6 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-xs text-slate-200 flex-1 truncate">{q}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors shrink-0"
                        title={t('applications.deleteQuestionTooltip', 'Eliminar pregunta')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {questions.length < 10 && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={200}
                      placeholder={t('applications.newQuestionPlaceholder') || 'Escribe una nueva pregunta...'}
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuestion();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('common.add') || 'Añadir'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-discord-blurple hover:bg-discord-blurple/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-discord-blurple/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('common.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t('common.save')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Live Discord Embed Preview */}
            <div className="lg:col-span-5 sticky top-6">
              <ApplicationPreview
                channelName={selectedChannel?.name}
                roleName={selectedRole?.name}
                questions={questions}
                serverName={currentGuild?.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: View Full Application Details */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-discord-darker border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {selectedApp.avatar ? (
                  <img
                    src={selectedApp.avatar}
                    alt={selectedApp.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-discord-blurple"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-discord-blurple/20 flex items-center justify-center font-bold text-base text-discord-blurple">
                    {selectedApp.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white">{selectedApp.displayName}</h3>
                  <p className="text-xs text-slate-400">@{selectedApp.username} • ID: {selectedApp.userId}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Application Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#1e1f22] p-3 rounded-xl border border-slate-700/40">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('applications.tableRole', 'Rol Postulado')}</span>
                <span className="font-bold text-discord-blurple">{selectedApp.roleName || 'Staff'}</span>
              </div>
              <div className="bg-[#1e1f22] p-3 rounded-xl border border-slate-700/40">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('applications.tableStatus', 'Estado')}</span>
                <span className="font-bold text-slate-200 capitalize">{selectedApp.status}</span>
              </div>
              <div className="bg-[#1e1f22] p-3 rounded-xl border border-slate-700/40 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('applications.tableSubmitted', 'Enviado')}</span>
                <span className="font-semibold text-slate-300">
                  {new Date(selectedApp.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Questions & Answers */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('applications.answersSubmitted', 'Respuestas del Cuestionario:')}
              </h4>
              <div className="space-y-3">
                {Array.isArray(selectedApp.answers) && selectedApp.answers.length > 0 ? (
                  selectedApp.answers.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-discord-dark p-4 rounded-xl border border-slate-700/50 space-y-1.5"
                    >
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="text-discord-blurple font-mono">Q{idx + 1}:</span>
                        <span>{item.question}</span>
                      </div>
                      <div className="text-xs text-slate-300 whitespace-pre-line bg-[#1e1f22] p-3 rounded-lg border border-slate-700/30 leading-relaxed font-sans">
                        {item.answer}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">{t('applications.noAnswersRecorded', 'No se registraron respuestas detalladas.')}</p>
                )}
              </div>
            </div>

            {/* Review / Decision Banner if processed */}
            {selectedApp.status !== 'pending' && selectedApp.reviewMessage && (
              <div className="p-3.5 bg-discord-dark rounded-xl border border-slate-700/60 text-xs space-y-1">
                <span className="font-semibold text-slate-300 block">
                  {t('applications.decision', 'Decisión de Moderación')} ({selectedApp.status}):
                </span>
                <p className="text-slate-400 italic">"{selectedApp.reviewMessage}"</p>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              {selectedApp.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewModal({ appId: selectedApp.id, action: 'deny' });
                    }}
                    className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t('applications.deny', 'Denegar')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewModal({ appId: selectedApp.id, action: 'approve' });
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('applications.approveAndAssign', 'Aprobar y Asignar Rol')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Review Reason Input */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-discord-darker border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {reviewModal.action === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>{t('applications.approveModalTitle', 'Aprobar Postulación')}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span>{t('applications.denyModalTitle', 'Denegar Postulación')}</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {reviewModal.action === 'approve'
                ? 'El miembro recibirá el rol en Discord automáticamente si los permisos lo permiten.'
                : 'La postulación será marcada como denegada.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Motivo / Nota para el candidato (opcional):
              </label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder={
                  reviewModal.action === 'approve'
                    ? '¡Bienvenido al equipo de staff!'
                    : 'Gracias por postularte, no cumples los requisitos actualmente.'
                }
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleReview(reviewModal.appId, reviewModal.action, reviewReason)}
                disabled={actionLoading === `review-${reviewModal.appId}`}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 ${
                  reviewModal.action === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                }`}
              >
                {actionLoading === `review-${reviewModal.appId}` && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirmar {reviewModal.action === 'approve' ? 'Aprobación' : 'Rechazo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
