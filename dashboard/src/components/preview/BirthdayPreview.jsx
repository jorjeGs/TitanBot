import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, Cake, Shield, Sparkles } from 'lucide-react';

export function BirthdayPreview({
  channelName,
  roleName,
  customMessage,
  serverName,
}) {
  const { t } = useTranslation();

  const defaultMsg =
    t('birthdays.previewDefaultMsg') ||
    '¡Hoy felicitamos a {user}! ¡Te deseamos un maravilloso día de parte de toda la comunidad de {server}! 🎈🎉';

  const rawText = customMessage?.trim() || defaultMsg;
  const formattedText = rawText
    .replace(/{user}/g, '@Cumpleañero')
    .replace(/{server}/g, serverName || 'TitanBot Server');

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Cake className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('birthdays.previewTitle') || 'Vista Previa del Anuncio'}
          </span>
        </div>
        {channelName && (
          <div className="flex items-center gap-1 text-xs text-pink-400 font-medium bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
            <Hash className="w-3 h-3" />
            <span>{channelName}</span>
          </div>
        )}
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 font-sans">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Bot info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">
              {t('welcome.previewTime') || 'Hoy a las 09:00'}
            </span>
          </div>

          {/* Embed Container with Pink Border */}
          <div className="border-l-4 border-pink-500 bg-[#2b2d31] p-3.5 rounded-r-md space-y-3 shadow-sm">
            <div className="font-bold text-white text-base leading-snug flex items-center gap-2">
              <span>🎂</span>
              <span>{t('birthdays.embedTitle') || '¡Feliz Cumpleaños! 🎉'}</span>
            </div>

            <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
              {formattedText}
            </div>

            {/* Temporary celebration role indicator */}
            {roleName && (
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-700/50 text-[11px] text-slate-300">
                <Shield className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>{t('birthdays.temporaryRoleLabel') || 'Rol temporal otorgado'}:</span>
                <span className="font-semibold px-2 py-0.5 rounded bg-pink-500/15 text-pink-300 border border-pink-500/30">
                  @{roleName}
                </span>
                <span className="text-[10px] text-slate-400">({t('birthdays.roleDuration24h') || '24 horas'})</span>
              </div>
            )}

            {/* Embed Footer */}
            <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>TitanBot Birthdays</span>
                <span>•</span>
                <span>{serverName || 'TitanBot'}</span>
              </div>
              <span>{t('birthdays.previewDailyCheck') || '09:00 AM UTC'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
