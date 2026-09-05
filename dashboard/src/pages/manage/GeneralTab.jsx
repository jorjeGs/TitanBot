import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { RoleSelect } from '../../components/common/RoleSelect';
import { Globe, Terminal, Shield, Wrench } from 'lucide-react';

export function GeneralTab() {
  const { t } = useTranslation();
  const { draftConfig, updateDraft, roles } = useGuild();

  if (!draftConfig) return null;

  const localeOptions = [
    { value: 'auto', label: t('general.localeAuto') },
    { value: 'es-419', label: 'Español (Latinoamérica) [es-419]' },
    { value: 'en-US', label: 'English (US) [en-US]' },
    { value: 'de', label: 'Deutsch [de]' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('general.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('general.subtitle')}</p>
      </div>

      {/* Card: Bot Language & Prefix */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <Globe className="w-5 h-5 text-discord-blurple" />
          <h2 className="text-base font-semibold text-slate-100">{t('general.locAndCommands')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t('general.botLanguage')}
            </label>
            <select
              value={draftConfig.locale || 'auto'}
              onChange={(e) => updateDraft('locale', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
            >
              {localeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">{t('general.botLanguageHelp')}</p>
          </div>

          {/* Prefix */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t('general.botPrefix')}
            </label>
            <input
              type="text"
              maxLength={5}
              value={draftConfig.prefix || '!'}
              onChange={(e) => updateDraft('prefix', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
            />
            <p className="mt-1.5 text-xs text-slate-400">{t('general.botPrefixHelp')}</p>
          </div>
        </div>
      </div>

      {/* Card: Management Roles */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-100">{t('general.permissionRoles')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RoleSelect
            label={t('general.adminRole')}
            helpText={t('general.adminRoleHelp')}
            roles={roles}
            value={draftConfig.adminRole}
            onChange={(val) => updateDraft('adminRole', val)}
          />

          <RoleSelect
            label={t('general.modRole')}
            helpText={t('general.modRoleHelp')}
            roles={roles}
            value={draftConfig.modRole}
            onChange={(val) => updateDraft('modRole', val)}
          />
        </div>
      </div>
    </div>
  );
}
