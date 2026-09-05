import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { Toggle } from '../../components/common/Toggle';
import { ShieldCheck, Lock, UserCheck2, ArrowRight } from 'lucide-react';

export function VerificationTab() {
  const { t } = useTranslation();
  const { draftConfig, updateDraft } = useGuild();

  if (!draftConfig) return null;

  const verificationEnabled = Boolean(draftConfig.verification?.enabled);

  const setVerificationEnabled = (val) => {
    updateDraft('verification', { enabled: val });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('verification.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('verification.subtitle')}</p>
      </div>

      {/* Master Toggle Card */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-100">{t('verification.gateTitle')}</h2>
        </div>

        <Toggle
          enabled={verificationEnabled}
          onChange={setVerificationEnabled}
          label={t('verification.enableVerification')}
          description={t('verification.verificationHelp')}
        />
      </div>

      {/* How it works info card */}
      <div className="bg-discord-darker/50 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Lock className="w-4 h-4 text-discord-blurple" />
          <span>{t('verification.howItWorksTitle')}</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          {t('verification.howItWorksDesc')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-discord-dark/50 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">{t('verification.step1Title')}</span>
            <span className="text-slate-400">{t('verification.step1Desc')}</span>
          </div>
          <div className="bg-discord-dark/50 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">{t('verification.step2Title')}</span>
            <span className="text-slate-400">{t('verification.step2Desc')}</span>
          </div>
          <div className="bg-discord-dark/50 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">{t('verification.step3Title')}</span>
            <span className="text-slate-400">{t('verification.step3Desc')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
