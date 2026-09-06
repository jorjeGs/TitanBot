import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../api/client';
import {
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Tv,
  Music,
  Info,
} from 'lucide-react';

export function EnvWarningsBanner({ className = '' }) {
  const { t } = useTranslation();
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    let isMounted = true;
    apiFetch('/system/env-warnings')
      .then((data) => {
        if (isMounted && data.warnings) {
          setWarnings(data.warnings);
        }
      })
      .catch(() => {
        // Silently fail if endpoint error, no disruption to dashboard
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  if (loading || !warnings || warnings.length === 0) {
    return null;
  }

  const warningCount = warnings.filter((w) => w.severity === 'warning').length;
  if (warningCount === 0 && warnings.length === 0) return null;

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-4 sm:p-5 shadow-lg transition-all ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-amber-200 tracking-tight">
                {t('envWarnings.title')}
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40">
                {warningCount} {t('envWarnings.pendingBadge', { defaultValue: 'pendientes' })}
              </span>
            </div>
            {!isCollapsed && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {t('envWarnings.subtitle')}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors shrink-0"
          title={isCollapsed ? t('envWarnings.expand', { defaultValue: 'Expandir' }) : t('envWarnings.collapse', { defaultValue: 'Minimizar' })}
        >
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {!isCollapsed && (
        <div className="mt-4 space-y-3 border-t border-amber-500/20 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {warnings.map((w) => {
              const isWarning = w.severity === 'warning';
              const Icon =
                w.category === 'ai' ? Sparkles : w.category === 'social' ? Tv : Music;
              const title = t(`envWarnings.items.${w.feature}.title`, {
                defaultValue: w.key,
              });
              const desc = t(`envWarnings.items.${w.feature}.desc`, {
                defaultValue: '',
              });
              const impact = t(`envWarnings.items.${w.feature}.impact`, {
                defaultValue: '',
              });
              const action = t(`envWarnings.items.${w.feature}.action`, {
                defaultValue: w.linkText,
              });

              return (
                <div
                  key={w.id}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between transition-colors ${
                    isWarning
                      ? 'border-amber-500/30 bg-discord-dark/90 hover:border-amber-500/50'
                      : 'border-slate-800 bg-discord-dark/70 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`w-4 h-4 ${
                            isWarning ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-200">{title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isWarning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isWarning ? 'Warning' : 'Info'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xs font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded">
                        {w.key}
                      </code>
                      <button
                        onClick={() => handleCopy(w.key)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        title={t('envWarnings.copyKey')}
                      >
                        {copiedKey === w.key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 mb-1">{desc}</p>
                    <p className="text-[11px] text-slate-400 italic mb-3">{impact}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <a
                      href={w.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                    >
                      <span>{action}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick instructions snippet */}
          <div className="mt-3 bg-discord-darkest/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span>{t('envWarnings.howToFix')}</span>
              <code className="block mt-1 font-mono text-[11px] text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                # En el servidor (archivo .env):<br />
                GEMINI_API_KEY=tu_clave_de_gemini<br />
                TWITCH_CLIENT_ID=tu_twitch_client_id<br />
                TWITCH_CLIENT_SECRET=tu_twitch_client_secret
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnvWarningsBanner;
