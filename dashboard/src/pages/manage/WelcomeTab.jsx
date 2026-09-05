import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { WelcomePreview } from '../../components/preview/WelcomePreview';
import { Sparkles, MessageSquare, UserCheck, Plus, X, AlertTriangle } from 'lucide-react';

export function WelcomeTab() {
  const { t } = useTranslation();
  const { currentGuild, draftConfig, updateDraft, channels, roles } = useGuild();
  const [selectedToAdd, setSelectedToAdd] = useState('');

  if (!draftConfig) return null;

  const selectedChannel = channels.find((c) => c.id === draftConfig.welcomeChannel);

  // Unified autoRoles array (support both autoRoles and legacy autoRole)
  const currentAutoRoles = Array.isArray(draftConfig.autoRoles)
    ? draftConfig.autoRoles
    : draftConfig.autoRole
    ? [draftConfig.autoRole]
    : [];

  const handleAddRole = () => {
    if (!selectedToAdd) return;
    if (currentAutoRoles.includes(selectedToAdd)) return;
    if (currentAutoRoles.length >= 10) return;

    const nextRoles = [...currentAutoRoles, selectedToAdd];
    updateDraft('autoRoles', nextRoles);
    updateDraft('autoRole', nextRoles[0] || null);
    setSelectedToAdd('');
  };

  const handleRemoveRole = (roleId) => {
    const nextRoles = currentAutoRoles.filter((id) => id !== roleId);
    updateDraft('autoRoles', nextRoles);
    updateDraft('autoRole', nextRoles[0] || null);
  };

  const availableToAdd = roles.filter((r) => !currentAutoRoles.includes(r.id));
  const selectedRoleObjects = currentAutoRoles
    .map((id) => roles.find((r) => r.id === id))
    .filter(Boolean);

  const hasUnmanageableRole = selectedRoleObjects.some((r) => r.canManage === false);

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

          {/* Card: Multiple Auto Roles */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-100">{t('welcome.autoRolesTitle')}</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                {currentAutoRoles.length} / 10
              </span>
            </div>

            <p className="text-xs text-slate-400">{t('welcome.autoRolesHelp')}</p>

            {/* Add Role Selector */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedToAdd}
                  onChange={(e) => setSelectedToAdd(e.target.value)}
                  disabled={currentAutoRoles.length >= 10}
                  className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors disabled:opacity-50 appearance-none"
                >
                  <option value="">-- {t('welcome.addRole')} --</option>
                  {availableToAdd.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.canManage === false ? ` (${t('common.unmanageableRole')})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddRole}
                disabled={!selectedToAdd || currentAutoRoles.length >= 10}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('welcome.addRole')}</span>
              </button>
            </div>

            {/* Selected Roles List */}
            {selectedRoleObjects.length > 0 ? (
              <div className="space-y-2 mt-2 bg-discord-dark/50 border border-slate-800/80 rounded-xl p-3 max-h-56 overflow-y-auto">
                {selectedRoleObjects.map((role) => {
                  const isUnmanageable = role.canManage === false;
                  return (
                    <div
                      key={role.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                        isUnmanageable
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-discord-dark border-slate-700/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{
                            backgroundColor:
                              role.color && role.color !== '#000000' && role.color !== '#99aab5'
                                ? role.color
                                : '#94a3b8',
                          }}
                        />
                        <span className="text-sm font-medium truncate">{role.name}</span>
                        {isUnmanageable && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            {t('common.unmanageableRole')}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                        title={t('welcome.removeRole')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic pt-1">{t('welcome.noRoles')}</p>
            )}

            {/* Hierarchy Warning Banner */}
            {hasUnmanageableRole && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('common.hierarchyWarning')}</span>
              </div>
            )}
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
