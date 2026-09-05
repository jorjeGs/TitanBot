import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { ScrollText, ShieldAlert, Flag } from 'lucide-react';

export function LoggingTab() {
  const { t } = useTranslation();
  const { draftConfig, updateDraft, channels } = useGuild();

  if (!draftConfig) return null;

  const loggingEnabled = Boolean(draftConfig.logging?.enabled);

  const setLoggingEnabled = (val) => {
    updateDraft('logging.enabled', val);
  };

  const setAuditChannel = (val) => {
    const currentLogging = draftConfig.logging || {};
    const currentChannels = currentLogging.channels || {};
    updateDraft('logging', {
      ...currentLogging,
      channels: { ...currentChannels, audit: val },
    });
  };

  const setReportsChannel = (val) => {
    const currentLogging = draftConfig.logging || {};
    const currentChannels = currentLogging.channels || {};
    updateDraft('logging', {
      ...currentLogging,
      channels: { ...currentChannels, reports: val },
    });
  };

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

      {/* Channels Configuration Card */}
      <div
        className={`bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 transition-opacity ${
          loggingEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-slate-100">{t('logging.channelsTitle')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChannelSelect
            label={t('logging.auditChannel')}
            helpText={t('logging.auditChannelHelp')}
            channels={channels}
            value={draftConfig.logging?.channels?.audit}
            onChange={setAuditChannel}
            disabled={!loggingEnabled}
          />

          <ChannelSelect
            label={t('logging.reportsChannel')}
            helpText={t('logging.reportsChannelHelp')}
            channels={channels}
            value={draftConfig.logging?.channels?.reports}
            onChange={setReportsChannel}
            disabled={!loggingEnabled}
          />
        </div>
      </div>
    </div>
  );
}
