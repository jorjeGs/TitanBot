import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { LogPreview } from '../../components/preview/LogPreview';
import { apiFetch } from '../../api/client';
import {
  ScrollText,
  ShieldAlert,
  Layers,
  Shield,
  MessageSquare,
  UserCheck,
  Users,
  Trophy,
  Gift,
  EyeOff,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export function LoggingTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { draftConfig, updateDraft, channels } = useGuild();

  const [activeSubtab, setActiveSubtab] = useState('channels'); // 'channels' | 'events' | 'exclusions' | 'guide'
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testCategory, setTestCategory] = useState('moderation');
  const [testDestination, setTestDestination] = useState('audit');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { type: 'success' | 'error', message: string }

  if (!draftConfig) return null;

  const loggingConfig = draftConfig.logging || {};
  const loggingEnabled = Boolean(loggingConfig.enabled);
  const loggingChannels = loggingConfig.channels || {};
  const enabledEvents = loggingConfig.enabledEvents || {};
  const ignoreConfig = loggingConfig.ignore || { channels: [], users: [] };
  const ignoredChannelIds = Array.isArray(ignoreConfig.channels) ? ignoreConfig.channels : [];

  // Filter text-only channels for logging destinations
  const textChannels = (channels || []).filter(
    (c) => c.type === 0 || c.type === 5 || c.type === undefined
  );

  const setLoggingEnabled = (val) => {
    updateDraft('logging.enabled', val);
  };

  const setDestinationChannel = (destination, channelId) => {
    updateDraft('logging', {
      ...loggingConfig,
      channels: {
        ...loggingChannels,
        [destination]: channelId || null,
      },
    });
  };

  const toggleEventCategory = (categoryKey, isEnabled) => {
    updateDraft('logging', {
      ...loggingConfig,
      enabledEvents: {
        ...enabledEvents,
        [`${categoryKey}.*`]: isEnabled,
      },
    });
  };

  const handleBulkEvents = (mode) => {
    const keys = ['moderation', 'message', 'role', 'member', 'leveling', 'giveaway'];
    const updated = { ...enabledEvents };
    keys.forEach((k) => {
      updated[`${k}.*`] = mode === 'enable' || mode === 'recommended';
    });
    updateDraft('logging', {
      ...loggingConfig,
      enabledEvents: updated,
    });
  };

  const addIgnoredChannel = (channelId) => {
    if (!channelId || ignoredChannelIds.includes(channelId)) return;
    updateDraft('logging', {
      ...loggingConfig,
      ignore: {
        ...ignoreConfig,
        channels: [...ignoredChannelIds, channelId],
      },
    });
  };

  const removeIgnoredChannel = (channelId) => {
    updateDraft('logging', {
      ...loggingConfig,
      ignore: {
        ...ignoreConfig,
        channels: ignoredChannelIds.filter((id) => id !== channelId),
      },
    });
  };

  const clearAllIgnored = () => {
    updateDraft('logging', {
      ...loggingConfig,
      ignore: {
        ...ignoreConfig,
        channels: [],
      },
    });
  };

  const handleSendTestLog = async ({ category = testCategory, destination = testDestination } = {}) => {
    setIsSendingTest(true);
    setTestStatus(null);

    try {
      const res = await apiFetch(`/guilds/${guildId}/logging/test`, {
        method: 'POST',
        body: JSON.stringify({
          category,
          destination,
        }),
      });

      if (res && res.success) {
        setTestStatus({
          type: 'success',
          message: res.message || t('logging.testSuccess', { defaultValue: '¡Registro de prueba enviado exitosamente!' }),
        });
      } else {
        setTestStatus({
          type: 'error',
          message: res?.message || t('logging.testFailed', { defaultValue: 'No se pudo enviar el registro de prueba.' }),
        });
      }
    } catch (err) {
      setTestStatus({
        type: 'error',
        message: err.message || t('logging.testFailed', { defaultValue: 'Error al comunicarse con Discord.' }),
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Channel names for preview
  const auditChannelName = textChannels.find((c) => c.id === loggingChannels.audit)?.name;
  const reportsChannelName = textChannels.find((c) => c.id === loggingChannels.reports)?.name;
  const applicationsChannelName = textChannels.find((c) => c.id === loggingChannels.applications)?.name;

  const eventCategories = [
    {
      key: 'moderation',
      icon: Shield,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      title: t('logging.categories.moderation', { defaultValue: 'Moderación' }),
      desc: t('logging.categories.moderationDesc', { defaultValue: 'Baneos, expulsiones, silencios, advertencias y purgas.' }),
    },
    {
      key: 'message',
      icon: MessageSquare,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      title: t('logging.categories.message', { defaultValue: 'Mensajes' }),
      desc: t('logging.categories.messageDesc', { defaultValue: 'Edición de mensajes, eliminaciones y borrado masivo.' }),
    },
    {
      key: 'role',
      icon: UserCheck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      title: t('logging.categories.role', { defaultValue: 'Roles y Permisos' }),
      desc: t('logging.categories.roleDesc', { defaultValue: 'Creación, actualización y eliminación de roles del servidor.' }),
    },
    {
      key: 'member',
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      title: t('logging.categories.member', { defaultValue: 'Miembros' }),
      desc: t('logging.categories.memberDesc', { defaultValue: 'Entradas, salidas del servidor y cambios de apodos/nombres.' }),
    },
    {
      key: 'leveling',
      icon: Trophy,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      title: t('logging.categories.leveling', { defaultValue: 'Niveles y XP' }),
      desc: t('logging.categories.levelingDesc', { defaultValue: 'Ascensos de nivel y recompensas por actividad en el chat.' }),
    },
    {
      key: 'giveaway',
      icon: Gift,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      title: t('logging.categories.giveaway', { defaultValue: 'Sorteos' }),
      desc: t('logging.categories.giveawayDesc', { defaultValue: 'Lanzamiento de sorteos, ganadores y relanzamientos.' }),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-7 h-7 text-discord-blurple" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {t('logging.title', { defaultValue: 'Registros de Canales de Discord' })}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                loggingEnabled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {loggingEnabled ? 'Activo' : 'Desactivado'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('logging.subtitle', { defaultValue: 'Supervisa en tiempo real eventos de moderación, mensajes, roles, miembros y actividad del servidor.' })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTestStatus(null);
            setTestModalOpen(true);
          }}
          disabled={!loggingEnabled}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-discord-blurple to-indigo-600 hover:from-discord-blurple/90 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-discord-blurple/25 transition-all disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{t('logging.testButton', { defaultValue: 'Enviar Registro de Prueba' })}</span>
        </button>
      </div>

      {/* Test Status Banner (if triggered) */}
      {testStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${
            testStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {testStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{testStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setTestStatus(null)}
            className="p-1 rounded hover:bg-black/20 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Master Toggle Card */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-discord-blurple" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {t('logging.systemTitle', { defaultValue: 'Estado del Sistema de Registros' })}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('logging.enableLoggingHelp', { defaultValue: 'Envía automáticamente mensajes embed a tus canales designados cada vez que ocurra un evento relevante.' })}
              </p>
            </div>
          </div>

          <Toggle
            enabled={loggingEnabled}
            onChange={setLoggingEnabled}
            label={t('logging.enableLogging', { defaultValue: 'Activar Registros' })}
          />
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubtab('channels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeSubtab === 'channels'
              ? 'border-discord-blurple text-discord-blurple bg-discord-blurple/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t('logging.subtabs.channels', { defaultValue: 'Canales de Destino' })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeSubtab === 'events'
              ? 'border-discord-blurple text-discord-blurple bg-discord-blurple/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('logging.subtabs.events', { defaultValue: 'Matriz de Eventos' })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab('exclusions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeSubtab === 'exclusions'
              ? 'border-discord-blurple text-discord-blurple bg-discord-blurple/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <EyeOff className="w-4 h-4" />
          <span>{t('logging.subtabs.exclusions', { defaultValue: 'Canales Ignorados' })}</span>
          {ignoredChannelIds.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
              {ignoredChannelIds.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeSubtab === 'guide'
              ? 'border-discord-blurple text-discord-blurple bg-discord-blurple/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t('logging.subtabs.guide', { defaultValue: 'Guía y Permisos' })}</span>
        </button>
      </div>

      {/* Main Content Areas */}
      <div
        className={`space-y-8 transition-opacity ${
          loggingEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        {/* SUBTAB 1: Canales de Destino */}
        {activeSubtab === 'channels' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Auditoría General */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      loggingChannels.audit
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {loggingChannels.audit
                      ? t('logging.channelStatus.configured', { defaultValue: 'Asignado' })
                      : t('logging.channelStatus.notConfigured', { defaultValue: 'Sin asignar' })}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {t('logging.auditChannel', { defaultValue: 'Canal de Auditoría General' })}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('logging.auditChannelHelp', { defaultValue: 'Eventos de moderación, mensajes editados/borrados, roles, miembros y subidas de nivel.' })}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <ChannelSelect
                  label=""
                  channels={textChannels}
                  value={loggingChannels.audit}
                  onChange={(val) => setDestinationChannel('audit', val)}
                  disabled={!loggingEnabled}
                />
              </div>
            </div>

            {/* Card 2: Reportes y Sorteos */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      loggingChannels.reports
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {loggingChannels.reports
                      ? t('logging.channelStatus.configured', { defaultValue: 'Asignado' })
                      : t('logging.channelStatus.notConfigured', { defaultValue: 'Sin asignar' })}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {t('logging.reportsChannel', { defaultValue: 'Canal de Reportes y Sorteos' })}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('logging.reportsChannelHelp', { defaultValue: 'Reportes enviados por usuarios, alertas de seguridad y ganadores de sorteos.' })}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <ChannelSelect
                  label=""
                  channels={textChannels}
                  value={loggingChannels.reports}
                  onChange={(val) => setDestinationChannel('reports', val)}
                  disabled={!loggingEnabled}
                />
              </div>
            </div>

            {/* Card 3: Solicitudes y Postulaciones */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      loggingChannels.applications
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {loggingChannels.applications
                      ? t('logging.channelStatus.configured', { defaultValue: 'Asignado' })
                      : t('logging.channelStatus.notConfigured', { defaultValue: 'Sin asignar' })}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {t('logging.applicationsChannel', { defaultValue: 'Canal de Solicitudes' })}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('logging.applicationsChannelHelp', { defaultValue: 'Postulaciones de staff y solicitudes enviadas por la comunidad.' })}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <ChannelSelect
                  label=""
                  channels={textChannels}
                  value={loggingChannels.applications}
                  onChange={(val) => setDestinationChannel('applications', val)}
                  disabled={!loggingEnabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: Matriz de Eventos */}
        {activeSubtab === 'events' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-discord-darker/60 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  {t('logging.eventsMatrixTitle', { defaultValue: 'Matriz de Eventos Registrados' })}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('logging.eventsMatrixHelp', { defaultValue: 'Elige qué tipo de eventos deseas que TitanBot registre y envíe a tus canales.' })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkEvents('enable')}
                  className="px-3 py-1.5 rounded-lg bg-discord-dark border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-600 transition-colors"
                >
                  {t('logging.bulkActions.enableAll', { defaultValue: 'Activar Todos' })}
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkEvents('disable')}
                  className="px-3 py-1.5 rounded-lg bg-discord-dark border border-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  {t('logging.bulkActions.disableAll', { defaultValue: 'Desactivar Todos' })}
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkEvents('recommended')}
                  className="px-3 py-1.5 rounded-lg bg-discord-blurple/20 border border-discord-blurple/40 text-xs font-semibold text-discord-blurple hover:bg-discord-blurple/30 transition-colors"
                >
                  {t('logging.bulkActions.recommended', { defaultValue: 'Recomendados' })}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventCategories.map((cat) => {
                const Icon = cat.icon;
                const isEnabled = enabledEvents[`${cat.key}.*`] !== false;

                return (
                  <div
                    key={cat.key}
                    className="flex items-center justify-between p-4 bg-discord-darker/80 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 pr-4">
                      <div className={`p-2 rounded-xl ${cat.bgColor} ${cat.color} shrink-0 mt-0.5`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{cat.title}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
                            }`}
                          >
                            {isEnabled ? 'Activado' : 'Silenciado'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-1 leading-snug">{cat.desc}</span>
                      </div>
                    </div>

                    <Toggle
                      enabled={isEnabled}
                      onChange={(checked) => toggleEventCategory(cat.key, checked)}
                      disabled={!loggingEnabled}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 3: Canales Ignorados */}
        {activeSubtab === 'exclusions' && (
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    {t('logging.ignoredChannelsTitle', { defaultValue: 'Canales de Texto Ignorados' })}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('logging.ignoredChannelsHelp', { defaultValue: 'Los mensajes editados o borrados en estos canales no se registrarán en la auditoría para evitar saturación innecesaria.' })}
                  </p>
                </div>
              </div>

              {ignoredChannelIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllIgnored}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                >
                  {t('logging.clearAllExclusions', { defaultValue: 'Limpiar Todo' })}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-2">
                <ChannelSelect
                  label={t('logging.addIgnoredChannel', { defaultValue: 'Agregar Canal a Exclusiones' })}
                  helpText={t('logging.addIgnoredChannelHelp', { defaultValue: 'Selecciona un canal para evitar registrar sus mensajes.' })}
                  channels={textChannels.filter((c) => !ignoredChannelIds.includes(c.id))}
                  value=""
                  onChange={addIgnoredChannel}
                  disabled={!loggingEnabled}
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  {t('logging.currentlyIgnored', { defaultValue: 'Canales Excluidos' })} ({ignoredChannelIds.length})
                </span>

                {ignoredChannelIds.length === 0 ? (
                  <div className="p-4 bg-discord-dark/50 border border-slate-800 rounded-xl text-xs text-slate-400 italic flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t('logging.noIgnoredChannels', { defaultValue: 'Ningún canal ignorado. Todos los canales generan registros de auditoría.' })}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ignoredChannelIds.map((chId) => {
                      const chObj = textChannels.find((c) => c.id === chId);
                      return (
                        <span
                          key={chId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-200 shadow-sm"
                        >
                          <span>#{chObj?.name || chId}</span>
                          <button
                            type="button"
                            onClick={() => removeIgnoredChannel(chId)}
                            className="text-slate-400 hover:text-rose-400 transition-colors p-0.5 rounded ml-1"
                            title={t('logging.removeExclusion', { defaultValue: 'Quitar exclusión' })}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: Guía y Permisos */}
        {activeSubtab === 'guide' && (
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <HelpCircle className="w-5 h-5 text-discord-blurple" />
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  {t('logging.permissionsGuide.title', { defaultValue: 'Guía de Permisos y Funcionamiento' })}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('logging.permissionsGuide.desc', { defaultValue: 'Para que TitanBot pueda publicar registros correctamente, asegúrate de que su rol posea los siguientes permisos en los canales de destino:' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-slate-200">
                    {t('logging.permissionsGuide.viewChannel', { defaultValue: 'Ver Canal (ViewChannel)' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('logging.permissionsGuide.viewChannelDesc', { defaultValue: 'Necesario para detectar el canal de texto y enviar mensajes.' })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-slate-200">
                    {t('logging.permissionsGuide.sendMessages', { defaultValue: 'Enviar Mensajes (SendMessages)' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('logging.permissionsGuide.sendMessagesDesc', { defaultValue: 'Permite al bot publicar los registros en el canal.' })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-slate-200">
                    {t('logging.permissionsGuide.embedLinks', { defaultValue: 'Insertar Enlaces (EmbedLinks)' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('logging.permissionsGuide.embedLinksDesc', { defaultValue: 'Requerido obligatoriamente para renderizar los recuadros estilizados con colores y campos.' })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-discord-dark/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-slate-200">
                    {t('logging.permissionsGuide.viewAuditLog', { defaultValue: 'Ver Registro de Auditoría (ViewAuditLog)' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('logging.permissionsGuide.viewAuditLogDesc', { defaultValue: 'Permite a TitanBot identificar qué moderador expulsó o baneó a un usuario en Discord.' })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Interactive Preview */}
        <LogPreview
          auditChannelName={auditChannelName}
          reportsChannelName={reportsChannelName}
          applicationsChannelName={applicationsChannelName}
          onTriggerTest={handleSendTestLog}
          isTesting={isSendingTest}
        />
      </div>

      {/* Test Log Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-discord-blurple" />
                <h3 className="text-base font-bold text-white">
                  {t('logging.testModalTitle', { defaultValue: 'Enviar Registro de Prueba a Discord' })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t('logging.testModalDesc', { defaultValue: 'Selecciona la categoría y canal para verificar que TitanBot tiene permisos de escritura e inserción de enlaces en Discord.' })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  {t('logging.testCategoryLabel', { defaultValue: 'Categoría del Evento' })}
                </label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-discord-dark border border-slate-700/70 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-discord-blurple cursor-pointer"
                >
                  <option value="moderation">🔨 Moderación (Ban, Kick, Timeout)</option>
                  <option value="message">✏️ Mensajes (Edición, Borrado)</option>
                  <option value="role">➕ Roles y Permisos</option>
                  <option value="member">👋 Miembros (Entradas, Salidas)</option>
                  <option value="leveling">📈 Niveles y XP</option>
                  <option value="giveaway">🎉 Sorteos y Ganadores</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  {t('logging.testChannelLabel', { defaultValue: 'Canal de Destino' })}
                </label>
                <select
                  value={testDestination}
                  onChange={(e) => setTestDestination(e.target.value)}
                  className="w-full px-3 py-2 bg-discord-dark border border-slate-700/70 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-discord-blurple cursor-pointer"
                >
                  <option value="audit">
                    Canal de Auditoría General (#{auditChannelName || 'No asignado'})
                  </option>
                  <option value="reports">
                    Canal de Reportes y Sorteos (#{reportsChannelName || 'No asignado'})
                  </option>
                  <option value="applications">
                    Canal de Solicitudes (#{applicationsChannelName || 'No asignado'})
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Cancelar' })}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSendTestLog({ category: testCategory, destination: testDestination });
                  setTestModalOpen(false);
                }}
                disabled={isSendingTest}
                className="inline-flex items-center gap-2 px-5 py-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-xs font-bold shadow-lg shadow-discord-blurple/25 transition-all disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('logging.testSending', { defaultValue: 'Enviando...' })}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('logging.testDispatch', { defaultValue: 'Enviar Ahora' })}</span>
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
