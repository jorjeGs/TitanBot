import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, Trophy, Award, Sparkles } from 'lucide-react';

export function LevelUpPreview({
  message,
  channelName,
  roleRewardName,
  sampleLevel = 10,
  serverName,
}) {
  const { t } = useTranslation();

  const rawMessage =
    message?.trim() ||
    t('leveling.defaultMessage') ||
    '¡Felicidades {user}, has alcanzado el **nivel {level}**!';

  // Format variables for preview
  const formattedMessage = rawMessage
    .replace(/{user}/g, '@GamerPro')
    .replace(/{level}/g, String(sampleLevel))
    .replace(/{xp}/g, '2,450')
    .replace(/{server}/g, serverName || 'TitanBot Server');

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('leveling.previewTitle') || 'Vista Previa de Anuncio de Nivel'}
        </span>
        <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
          <Hash className="w-3 h-3" />
          <span>{channelName || t('leveling.sameChannel') || 'canal-actual'}</span>
        </div>
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 font-sans">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Bot info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">Hoy a las 15:45</span>
          </div>

          {/* Embed Container */}
          <div className="border-l-4 border-amber-400 bg-[#2b2d31] p-3.5 rounded-r-md space-y-2.5 shadow-sm">
            <div className="font-bold text-white text-sm leading-snug flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{t('leveling.embedTitle') || '¡Subida de Nivel!'}</span>
            </div>

            <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
              {formattedMessage}
            </div>

            {/* Role Reward Badge */}
            {roleRewardName && (
              <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md font-medium">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {t('leveling.rewardUnlocked') || 'Recompensa desbloqueada'}: @{roleRewardName}
                  </span>
                </div>
              </div>
            )}

            {/* Embed Footer */}
            <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>TitanBot Leveling System</span>
              <span>•</span>
              <span>{serverName || 'TitanBot'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
