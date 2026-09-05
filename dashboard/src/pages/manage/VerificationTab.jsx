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
          <h2 className="text-base font-semibold text-slate-100">Verification Gate</h2>
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
          <span>How Verification Works</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          When verification is active, newcomers arriving in your server are greeted with a verification prompt (or button panel). Completing the check verifies the member and grants them full access to the community channels.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-discord-dark/50 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">1. User Joins</span>
            <span className="text-slate-400">User is restricted from interacting until verified.</span>
          </div>
          <div className="bg-discord-dark/50 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">2. Verification Check</span>
            <span className="text-slate-400">User interacts with the verify modal or button.</span>
          </div>
          <div className="bg-discord-dark/50 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">3. Access Granted</span>
            <span className="text-slate-400">Member is verified and member role is assigned.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
