import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, Gift, Clock, Award, Users, Shield } from 'lucide-react';

export function GiveawayPreview({
  prize,
  channelName,
  durationMinutes,
  winnerCount,
  requiredRoleName,
  hostName,
}) {
  const { t } = useTranslation();

  const displayPrize = prize?.trim() || t('giveaways.previewPrizePlaceholder') || 'Nitro Boost 1 Mes 🎉';
  const displayWinners = winnerCount || 1;
  const displayHost = hostName || t('giveaways.previewYou') || 'Tú';

  // Format duration representation
  const formatDurationText = (mins) => {
    const m = Number(mins) || 60;
    if (m < 60) return `${m} ${t('giveaways.units.minutes') || 'minutos'}`;
    if (m < 1440) {
      const hours = Math.round((m / 60) * 10) / 10;
      return `${hours} ${t('giveaways.units.hours') || 'horas'}`;
    }
    const days = Math.round((m / 1440) * 10) / 10;
    return `${days} ${t('giveaways.units.days') || 'días'}`;
  };

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-discord-blurple" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('giveaways.previewTitle') || 'Vista Previa en Discord'}
          </span>
        </div>
        {channelName && (
          <div className="flex items-center gap-1 text-xs text-discord-blurple font-medium bg-discord-blurple/10 px-2 py-0.5 rounded border border-discord-blurple/20">
            <Hash className="w-3 h-3" />
            <span>{channelName}</span>
          </div>
        )}
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 font-sans">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-discord-blurple to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
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
              {t('welcome.previewTime') || 'Hoy a las 12:00'}
            </span>
          </div>

          {/* Embed Container */}
          <div className="border-l-4 border-discord-blurple bg-[#2b2d31] p-3.5 rounded-r-md space-y-3 shadow-sm">
            <div className="font-bold text-white text-base leading-snug flex items-center gap-2">
              <span>🎉</span>
              <span className="truncate">{displayPrize}</span>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              {t('giveaways.embedPrompt') || '¡Haz clic en el botón de abajo para participar en el sorteo!'}
            </div>

            {/* Embed Grid Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="bg-[#1e1f22]/60 p-2 rounded border border-slate-700/30">
                <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 mb-0.5">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>{t('giveaways.hostedBy') || 'Organizado por'}</span>
                </div>
                <div className="text-slate-200 font-medium truncate">@{displayHost}</div>
              </div>

              <div className="bg-[#1e1f22]/60 p-2 rounded border border-slate-700/30">
                <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 mb-0.5">
                  <Award className="w-3 h-3 text-amber-400" />
                  <span>{t('giveaways.winners') || 'Ganadores'}</span>
                </div>
                <div className="text-slate-200 font-medium">
                  {displayWinners} {displayWinners === 1 ? (t('giveaways.winnerSingle') || 'ganador') : (t('giveaways.winnerPlural') || 'ganadores')}
                </div>
              </div>

              <div className="bg-[#1e1f22]/60 p-2 rounded border border-slate-700/30 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>{t('giveaways.endsIn') || 'Finaliza en'}</span>
                </div>
                <div className="text-emerald-300 font-medium">
                  {formatDurationText(durationMinutes)}
                </div>
              </div>
            </div>

            {/* Optional Required Role badge */}
            {requiredRoleName && (
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded">
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('giveaways.requiredRoleLabel') || 'Rol requerido'}:</span>
                <span className="font-semibold text-amber-300">@{requiredRoleName}</span>
              </div>
            )}

            {/* Embed Footer */}
            <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span>TitanBot Sorteos</span>
                <span>•</span>
                <span>0 {t('giveaways.participantsCount') || 'participantes'}</span>
              </div>
              <span>{t('giveaways.endsTimestampPreview') || 'Hoy a las 18:00'}</span>
            </div>
          </div>

          {/* Simulated Discord Buttons Row */}
          <div className="pt-0.5 flex items-center gap-2">
            <button
              type="button"
              className="bg-discord-blurple hover:bg-discord-blurple/90 transition-colors text-white text-xs font-semibold px-3.5 py-2 rounded flex items-center gap-1.5 shadow-sm cursor-pointer select-none"
            >
              <span>🎉</span>
              <span>{t('giveaways.joinBtn') || 'Participar'} (0)</span>
            </button>
            <button
              type="button"
              className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold px-2.5 py-2 rounded flex items-center gap-1 opacity-70 cursor-not-allowed"
              disabled
            >
              <span>{t('giveaways.adminEndBtn') || 'Finalizar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
