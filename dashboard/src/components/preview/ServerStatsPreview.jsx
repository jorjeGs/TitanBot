import React from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, ChevronDown, Users, User, Bot, Lock } from 'lucide-react';

export function ServerStatsPreview({
  stats = { totalCount: 1420, humanCount: 1385, botCount: 35 },
  enabledTypes = ['members', 'members_only', 'bots'],
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('serverstats.previewTitle') || 'Vista Previa en Canales de Discord'}
        </span>
        <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
          Solo Lectura
        </span>
      </div>

      {/* Discord Channel List Mock */}
      <div className="bg-[#1e1f22] p-3 rounded-lg border border-slate-800 font-sans space-y-2">
        {/* Category Header */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <ChevronDown className="w-3 h-3" />
          <span>{t('previews.serverStatsTitle', '📊 ESTADÍSTICAS DEL SERVIDOR')}</span>
        </div>

        {/* Counter Channels */}
        <div className="space-y-1 pl-1">
          {enabledTypes.includes('members') && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-[#2b2d31]/80 text-slate-200 border border-slate-700/40">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">👥 Miembros: {stats.totalCount?.toLocaleString() || 0}</span>
              </div>
              <Lock className="w-3 h-3 text-slate-500 shrink-0" />
            </div>
          )}

          {enabledTypes.includes('members_only') && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-[#2b2d31]/80 text-slate-200 border border-slate-700/40">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">👤 Humanos: {stats.humanCount?.toLocaleString() || 0}</span>
              </div>
              <Lock className="w-3 h-3 text-slate-500 shrink-0" />
            </div>
          )}

          {enabledTypes.includes('bots') && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-[#2b2d31]/80 text-slate-200 border border-slate-700/40">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">🤖 Bots: {stats.botCount?.toLocaleString() || 0}</span>
              </div>
              <Lock className="w-3 h-3 text-slate-500 shrink-0" />
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-500 px-1 pt-1 italic">
          * Los contadores se actualizan automáticamente cada vez que alguien entra o sale del servidor.
        </p>
      </div>
    </div>
  );
}
