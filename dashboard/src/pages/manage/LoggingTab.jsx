import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { LogPreview } from '../../components/preview/LogPreview';
import {
  ScrollText,
  ShieldAlert,
  Flag,
  FileText,
  Layers,
  Shield,
  MessageSquare,
  UserCheck,
  Users,
  Trophy,
  Gift,
  EyeOff,
  X,
} from 'lucide-react';

export function LoggingTab() {
  const { t } = useTranslation();
  const { draftConfig, updateDraft, channels } = useGuild();

  if (!draftConfig) return null;

  const loggingConfig = draftConfig.logging || {};
  const loggingEnabled = Boolean(loggingConfig.enabled);
  const loggingChannels = loggingConfig.channels || {};
  const enabledEvents = loggingConfig.enabledEvents || {};
  const ignoreConfig = loggingConfig.ignore || { channels: [], users: [] };
  const ignoredChannelIds = Array.isArray(ignoreConfig.channels) ? ignoreConfig.channels : [];

  // Filter text-only channels for logging destinations
  const textChannels = (channels || []).filter(
    (c) => c.type === 0 || c.type === undefined
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

  // Find names for preview
  const auditChannelName = textChannels.find((c) => c.id === loggingChannels.audit)?.name;
  const reportsChannelName = textChannels.find((c) => c.id === loggingChannels.reports)?.name;
  const applicationsChannelName = textChannels.find((c) => c.id === loggingChannels.applications)?.name;

  const eventCategories = [
    {
      key: 'moderation',
      icon: Shield,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      title: t('logging.categories.moderation') || 'Moderación',
      desc: t('logging.categories.moderationDesc') || 'Baneos, expulsiones, silencios, advertencias y purgas.',
    },
    {
      key: 'message',
      icon: MessageSquare,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      title: t('logging.categories.message') || 'Mensajes',
      desc: t('logging.categories.messageDesc') || 'Edición de mensajes, eliminaciones y borrado masivo.',
    },
    {
      key: 'role',
      icon: UserCheck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      title: t('logging.categories.role') || 'Roles y Permisos',
      desc: t('logging.categories.roleDesc') || 'Creación, actualización y eliminación de roles del servidor.',
    },
    {
      key: 'member',
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      title: t('logging.categories.member') || 'Miembros',
      desc: t('logging.categories.memberDesc') || 'Entradas, salidas del servidor y cambios de apodos/nombres.',
    },
    {
      key: 'leveling',
      icon: Trophy,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      title: t('logging.categories.leveling') || 'Niveles y Rangos',
      desc: t('logging.categories.levelingDesc') || 'Ascensos de nivel y recompensas por actividad en el chat.',
    },
    {
      key: 'giveaway',
      icon: Gift,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      title: t('logging.categories.giveaway') || 'Sorteos',
      desc: t('logging.categories.giveawayDesc') || 'Lanzamiento de sorteos, ganadores y relanzamientos.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('logging.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('logging.subtitle')}</p>
      </div>

      {/* Master Toggle Card */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <ScrollText className="w-5 h-5 text-discord-blurple" />
          <h2 className="text-base font-semibold text-slate-100">{t('logging.systemTitle')}</h2>
        </div>

        <Toggle
          enabled={loggingEnabled}
          onChange={setLoggingEnabled}
          label={t('logging.enableLogging')}
          description={t('logging.enableLoggingHelp')}
        />
      </div>

      <div
        className={`space-y-8 transition-opacity ${
          loggingEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        {/* Destination Channels Card */}
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-slate-100">{t('logging.channelsTitle')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChannelSelect
              label={t('logging.auditChannel')}
              helpText={t('logging.auditChannelHelp')}
              channels={textChannels}
              value={loggingChannels.audit}
              onChange={(val) => setDestinationChannel('audit', val)}
              disabled={!loggingEnabled}
            />

            <ChannelSelect
              label={t('logging.reportsChannel')}
              helpText={t('logging.reportsChannelHelp')}
              channels={textChannels}
              value={loggingChannels.reports}
              onChange={(val) => setDestinationChannel('reports', val)}
              disabled={!loggingEnabled}
            />

            <ChannelSelect
              label={t('logging.applicationsChannel') || 'Canal de Solicitudes'}
              helpText={t('logging.applicationsChannelHelp') || 'Canal donde se enviarán las postulaciones y solicitudes.'}
              channels={textChannels}
              value={loggingChannels.applications}
              onChange={(val) => setDestinationChannel('applications', val)}
              disabled={!loggingEnabled}
            />
          </div>
        </div>

        {/* Event Categories Matrix Card */}
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <Layers className="w-5 h-5 text-discord-blurple" />
            <h2 className="text-base font-semibold text-slate-100">
              {t('logging.eventsMatrixTitle') || 'Matriz de Eventos Registrados'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eventCategories.map((cat) => {
              const Icon = cat.icon;
              const isEnabled = enabledEvents[`${cat.key}.*`] !== false;

              return (
                <div
                  key={cat.key}
                  className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5 pr-4">
                    <div className={`p-2 rounded-lg ${cat.bgColor} ${cat.color} shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-200 block">{cat.title}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">{cat.desc}</span>
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

        {/* Ignored Channels Card */}
        <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <EyeOff className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">
              {t('logging.ignoredChannelsTitle') || 'Canales Ignorados'}
            </h2>
          </div>

          <p className="text-xs text-slate-400">
            {t('logging.ignoredChannelsHelp') ||
              'Los mensajes editados o borrados en estos canales no se registrarán en la auditoría.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <ChannelSelect
              label={t('logging.addIgnoredChannel') || 'Agregar Canal a la Lista de Exclusión'}
              helpText={t('logging.addIgnoredChannelHelp') || 'Selecciona un canal para ignorar sus eventos.'}
              channels={textChannels.filter((c) => !ignoredChannelIds.includes(c.id))}
              value=""
              onChange={addIgnoredChannel}
              disabled={!loggingEnabled}
            />

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                {t('logging.currentlyIgnored') || 'Canales actualmente ignorados'} ({ignoredChannelIds.length})
              </span>

              {ignoredChannelIds.length === 0 ? (
                <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs text-slate-500 italic">
                  {t('logging.noIgnoredChannels') || 'Ningún canal ignorado. Todos los canales generan auditoría.'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {ignoredChannelIds.map((chId) => {
                    const chObj = textChannels.find((c) => c.id === chId);
                    return (
                      <span
                        key={chId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200"
                      >
                        <span>#{chObj?.name || chId}</span>
                        <button
                          type="button"
                          onClick={() => removeIgnoredChannel(chId)}
                          className="text-slate-400 hover:text-red-400 transition-colors p-0.5 rounded"
                          title="Quitar exclusión"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Discord Embed Preview */}
        <LogPreview
          auditChannelName={auditChannelName}
          reportsChannelName={reportsChannelName}
          applicationsChannelName={applicationsChannelName}
        />
      </div>
    </div>
  );
}
