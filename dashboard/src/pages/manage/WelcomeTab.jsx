import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { WelcomePreview } from '../../components/preview/WelcomePreview';
import { Sparkles, MessageSquare, UserCheck } from 'lucide-react';

export function WelcomeTab() {
  const { t } = useTranslation();
  const { currentGuild, draftConfig, updateDraft, channels, roles } = useGuild();

  if (!draftConfig) return null;

  const selectedChannel = channels.find((c) => c.id === draftConfig.welcomeChannel);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('welcome.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('welcome.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Welcome Channel & Message */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <MessageSquare className="w-5 h-5 text-discord-blurple" />
              <h2 className="text-base font-semibold text-slate-100">{t('welcome.cardMessageTitle')}</h2>
            </div>

            <ChannelSelect
              label={t('welcome.channel')}
              helpText={t('welcome.channelHelp')}
              channels={channels}
              value={draftConfig.welcomeChannel}
              onChange={(val) => updateDraft('welcomeChannel', val)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('welcome.message')}
              </label>
              <textarea
                rows={4}
                maxLength={2000}
                value={draftConfig.welcomeMessage || 'Welcome {user} to {server}!'}
                onChange={(e) => updateDraft('welcomeMessage', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors resize-y leading-relaxed font-sans"
              />
              <p className="mt-1.5 text-xs text-slate-400">{t('welcome.messageHelp')}</p>
            </div>
          </div>

          {/* Card: Auto Role */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">{t('welcome.cardRoleTitle')}</h2>
            </div>

            <RoleSelect
              label={t('welcome.autoRole')}
              helpText={t('welcome.autoRoleHelp')}
              roles={roles}
              value={draftConfig.autoRole}
              onChange={(val) => updateDraft('autoRole', val)}
              warnHierarchy={true}
            />
          </div>
        </div>

        {/* Live Preview Right Column */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <WelcomePreview
            message={draftConfig.welcomeMessage}
            serverName={currentGuild?.name}
            channelName={selectedChannel?.name}
          />
        </div>
      </div>
    </div>
  );
}
