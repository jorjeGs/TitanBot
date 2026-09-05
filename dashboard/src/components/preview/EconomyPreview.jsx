import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Coins, Wallet, Landmark, TrendingUp } from 'lucide-react';

export function EconomyPreview({
  currencyName = 'coins',
  currencySymbol = '🪙',
  sampleBalance = 1000,
  serverName,
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('economy.previewTitle') || 'Vista Previa de Economía (/balance)'}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded">
          <Coins className="w-3.5 h-3.5" />
          <span>{currencyName}</span>
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
            <span className="text-[11px] text-slate-400">
              {t('previews.todayAt', { time: '16:20' })}
            </span>
          </div>

          {/* Embed Container */}
          <div className="border-l-4 border-amber-400 bg-[#2b2d31] p-3.5 rounded-r-md space-y-3 shadow-sm">
            <div className="font-bold text-white text-sm leading-snug flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>{t('previews.balanceOf', { user: 'GamerPro' })}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#1e1f22] p-2 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {t('previews.wallet', 'Monedero')}
                </span>
                <span className="text-white font-bold text-sm">
                  {sampleBalance.toLocaleString()} {currencySymbol}
                </span>
              </div>

              <div className="bg-[#1e1f22] p-2 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {t('previews.bank', 'Banco')}
                </span>
                <span className="text-white font-bold text-sm">
                  5,000 / 10,000 {currencySymbol}
                </span>
              </div>
            </div>

            <div className="bg-[#1e1f22] p-2 rounded border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('previews.netWorth', 'Patrimonio Total')}</span>
              </div>
              <span className="text-amber-300 font-bold text-sm">
                {(sampleBalance + 5000).toLocaleString()} {currencySymbol}
              </span>
            </div>

            {/* Embed Footer */}
            <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>TitanBot Economy • {currencyName}</span>
              <span>•</span>
              <span>{serverName || 'TitanBot'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
