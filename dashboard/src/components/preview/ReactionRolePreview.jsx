import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, ChevronDown } from 'lucide-react';

export function ReactionRolePreview({ title, description, selectedRoles = [], serverName, channelName }) {
  const { t } = useTranslation();

  const displayTitle = title?.trim() || t('roles.panelTitlePlaceholder');
  const displayDesc = description?.trim() || t('roles.panelDescPlaceholder');

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('roles.preview')}
        </span>
        {channelName && (
          <div className="flex items-center gap-1 text-xs text-discord-blurple font-medium bg-discord-blurple/10 px-2 py-0.5 rounded">
            <Hash className="w-3 h-3" />
            <span>{channelName}</span>
          </div>
        )}
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 font-sans">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-discord-blurple to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Bot info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">{t('welcome.previewTime') || 'Hoy a las 12:00'}</span>
          </div>

          {/* Embed Container */}
          <div className="border-l-4 border-discord-blurple bg-[#2b2d31] p-3.5 rounded-r-md space-y-2.5 shadow-sm">
            <div className="font-bold text-white text-sm leading-snug">
              {displayTitle}
            </div>

            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {displayDesc}
            </div>

            {/* Field: Available Roles */}
            <div className="pt-2 border-t border-slate-700/50">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                {t('roles.availableRoles')}
              </span>
              {selectedRoles.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  {t('roles.atLeastOneRole')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedRoles.map((role) => (
                    <span
                      key={role.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-[#1e1f22] text-slate-200 border border-slate-700/50"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: role.color && role.color !== '#000000' && role.color !== '#99aab5' ? role.color : '#94a3b8' }}
                      />
                      <span className="truncate max-w-[140px]">{role.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Embed Footer */}
            <div className="pt-1.5 text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>{t('roles.footerText')}</span>
              <span>•</span>
              <span>{serverName || 'TitanBot'}</span>
            </div>
          </div>

          {/* Simulated Discord Select Menu */}
          <div className="w-full bg-[#2b2d31] hover:bg-[#35373c] transition-colors border border-slate-700/60 rounded-md p-2.5 flex items-center justify-between cursor-pointer select-none shadow-sm">
            <span className="text-xs text-slate-400">
              {t('roles.selectPlaceholder')}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
