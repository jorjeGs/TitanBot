import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, Check } from 'lucide-react';

export function VerificationPreview({ message, buttonText, serverName, channelName, roleName }) {
  const { t } = useTranslation();

  const displayMessage =
    message?.trim() ||
    t('verification.panelMessagePlaceholder') ||
    'Haz clic en el botón de abajo para verificarte y obtener acceso al servidor.';

  const displayButtonText =
    buttonText?.trim() || t('verification.buttonTextPlaceholder') || 'Verificarme';

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('verification.previewTitle')}
        </span>
        {channelName && (
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
            <Hash className="w-3 h-3" />
            <span>{channelName}</span>
          </div>
        )}
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 font-sans">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Bot info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">{t('welcome.previewTime') || 'Hoy a las 12:00'}</span>
          </div>

          {/* Embed Container */}
          <div className="border-l-4 border-emerald-500 bg-[#2b2d31] p-3.5 rounded-r-md space-y-2.5 shadow-sm">
            <div className="font-bold text-white text-sm leading-snug">
              {t('verification.panelEmbedTitle') || 'Verificación del Servidor'}
            </div>

            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {displayMessage}
            </div>

            {roleName && (
              <div className="pt-2 border-t border-slate-700/50 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>{t('verification.verifiedRole')}:</span>
                <span className="px-1.5 py-0.2 rounded bg-[#1e1f22] text-slate-200 font-medium">
                  @{roleName}
                </span>
              </div>
            )}

            {/* Embed Footer */}
            <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>TitanBot Verification</span>
              <span>•</span>
              <span>{serverName || 'TitanBot'}</span>
            </div>
          </div>

          {/* Simulated Discord Button */}
          <div className="pt-0.5">
            <button
              type="button"
              className="bg-[#248046] hover:bg-[#1a6334] transition-colors text-white text-xs font-semibold px-3.5 py-2 rounded flex items-center gap-1.5 shadow-sm cursor-pointer select-none"
            >
              <Check className="w-4 h-4" />
              <span>{displayButtonText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
