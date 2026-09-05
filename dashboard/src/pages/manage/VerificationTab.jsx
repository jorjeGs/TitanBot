import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { VerificationPreview } from '../../components/preview/VerificationPreview';
import {
  ShieldCheck,
  Send,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  X,
  Lock,
  Sparkles,
  Loader2,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export function VerificationTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { draftConfig, updateDraft, channels, roles, currentGuild } = useGuild();

  const [publishing, setPublishing] = useState(false);
  const [notification, setNotification] = useState(null);

  if (!draftConfig) return null;

  const verification = draftConfig.verification || {};
  const isEnabled = Boolean(verification.enabled);
  const autoVerify = verification.autoVerify || {};

  const updateVerificationField = (field, value) => {
    updateDraft('verification', {
      ...verification,
      [field]: value,
    });
  };

  const updateAutoVerifyField = (field, value) => {
    updateDraft('verification', {
      ...verification,
      autoVerify: {
        ...autoVerify,
        [field]: value,
      },
    });
  };

  // Check role hierarchy
  const verifiedRole = roles.find((r) => r.id === verification.roleId);
  const isRoleUnmanageable = Boolean(verifiedRole && verifiedRole.canManage === false);

  // Check onboarding concurrency warning
  const hasAutoRoleActive = Boolean(
    draftConfig.autoRole || (Array.isArray(draftConfig.autoRoles) && draftConfig.autoRoles.length > 0)
  );

  const selectedChannel = channels.find((c) => c.id === verification.channelId);

  const handlePublishPanel = async () => {
    setNotification(null);

    if (!verification.channelId) {
      setNotification({ type: 'error', text: t('verification.channelHelp') });
      return;
    }
    if (!verification.roleId) {
      setNotification({ type: 'error', text: t('verification.verifiedRoleHelp') });
      return;
    }
    if (isRoleUnmanageable) {
      setNotification({ type: 'error', text: t('common.hierarchyWarning') });
      return;
    }

    try {
      setPublishing(true);
      const res = await apiFetch(`/guilds/${guildId}/verification/publish`, {
        method: 'POST',
        body: JSON.stringify({
          channelId: verification.channelId,
          roleId: verification.roleId,
          unverifiedRoleId: verification.unverifiedRoleId || null,
          message: verification.message || '',
          buttonText: verification.buttonText || '',
        }),
      });

      if (res.success) {
        updateDraft('verification', {
          ...verification,
          enabled: true,
          messageId: res.panel?.messageId,
        });

        setNotification({
          type: 'success',
          text: t('verification.publishedSuccess'),
          url: res.panel?.messageUrl,
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to publish verification panel to Discord.',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          {t('verification.title')}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{t('verification.subtitle')}</p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 shadow-md border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{notification.text}</span>
            {notification.url && (
              <a
                href={notification.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white inline-flex items-center gap-1 font-medium ml-2"
              >
                <span>{t('verification.openInDiscord')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Concurrency Warning Banner if AutoRole is also active */}
      {hasAutoRoleActive && isEnabled && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3 text-amber-300 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">{t('verification.conflictWarning')}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Form Left / Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Master Gate */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('verification.gateTitle')}
              </h2>
            </div>

            <Toggle
              enabled={isEnabled}
              onChange={(val) => updateVerificationField('enabled', val)}
              label={t('verification.enableVerification')}
              description={t('verification.verificationHelp')}
            />
          </div>

          {/* Card 2: Roles Assignment */}
          <div
            className={`bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5 transition-opacity ${
              isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <ShieldCheck className="w-5 h-5 text-discord-blurple" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('verification.rolesCardTitle')}
              </h2>
            </div>

            {/* Verified Role */}
            <RoleSelect
              label={t('verification.verifiedRole')}
              helpText={t('verification.verifiedRoleHelp')}
              roles={roles}
              value={verification.roleId}
              onChange={(val) => updateVerificationField('roleId', val)}
              warnHierarchy={true}
              disabled={!isEnabled}
            />

            {/* Unverified Role (Optional) */}
            <RoleSelect
              label={t('verification.unverifiedRole')}
              helpText={t('verification.unverifiedRoleHelp')}
              roles={roles}
              value={verification.unverifiedRoleId}
              onChange={(val) => updateVerificationField('unverifiedRoleId', val)}
              warnHierarchy={true}
              disabled={!isEnabled}
            />
          </div>

          {/* Card 3: Channel, Message & Publishing */}
          <div
            className={`bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5 transition-opacity ${
              isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Send className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('verification.channelCardTitle')}
              </h2>
            </div>

            {/* Channel Select */}
            <ChannelSelect
              label={t('verification.channel')}
              helpText={t('verification.channelHelp')}
              channels={channels}
              value={verification.channelId}
              onChange={(val) => updateVerificationField('channelId', val)}
              disabled={!isEnabled}
            />

            {/* Panel Message */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('verification.panelMessage')}
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={
                  verification.message ||
                  t('verification.panelMessagePlaceholder') ||
                  'Haz clic en el botón de abajo para verificarte y obtener acceso al servidor.'
                }
                onChange={(e) => updateVerificationField('message', e.target.value)}
                disabled={!isEnabled}
                placeholder={t('verification.panelMessagePlaceholder')}
                className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors resize-y leading-relaxed font-sans disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-400">
                {t('verification.panelMessageHelp')}
              </p>
            </div>

            {/* Button Text */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('verification.buttonText')}
              </label>
              <input
                type="text"
                maxLength={80}
                value={verification.buttonText || 'Verificarme'}
                onChange={(e) => updateVerificationField('buttonText', e.target.value)}
                disabled={!isEnabled}
                placeholder={t('verification.buttonTextPlaceholder')}
                className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors disabled:opacity-50"
              />
            </div>

            {/* Publish Button */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handlePublishPanel}
                disabled={
                  publishing ||
                  !isEnabled ||
                  !verification.channelId ||
                  !verification.roleId ||
                  isRoleUnmanageable
                }
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-medium text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('verification.publishing')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('verification.publishPanel')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 4: Smart AutoVerify */}
          <div
            className={`bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5 transition-opacity ${
              isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('verification.autoVerifyCardTitle')}
              </h2>
            </div>

            <Toggle
              enabled={Boolean(autoVerify.enabled)}
              onChange={(val) => updateAutoVerifyField('enabled', val)}
              label={t('verification.enableAutoVerify')}
              description={t('verification.autoVerifyHelp')}
              disabled={!isEnabled}
            />

            {autoVerify.enabled && (
              <div className="pt-2 space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  {t('verification.minAccountAge')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={autoVerify.accountAgeDays || 7}
                    onChange={(e) =>
                      updateAutoVerifyField('accountAgeDays', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-28 px-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  />
                  <span className="text-xs text-slate-400">
                    {t('verification.minAccountAgeHelp')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Discord Preview */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <VerificationPreview
            message={verification.message}
            buttonText={verification.buttonText}
            serverName={currentGuild?.name}
            channelName={selectedChannel?.name}
            roleName={verifiedRole?.name}
          />
        </div>
      </div>
    </div>
  );
}
