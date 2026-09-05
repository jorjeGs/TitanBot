import React from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, ChevronDown, PlusCircle, Users, Lock } from 'lucide-react';

export function JoinToCreatePreview({
  channelNameTemplate = "{username}'s Room",
  userLimit = 0,
}) {
  const { t } = useTranslation();

  const formattedName = channelNameTemplate
    .replace(/{username}/g, 'GamerPro')
    .replace(/{user_tag}/g, 'GamerPro#0001')
    .replace(/{displayName}/g, 'GamerPro')
    .replace(/{display_name}/g, 'GamerPro');

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('jointocreate.previewTitle') || 'Vista Previa de Salas Temporales'}
        </span>
        <span className="text-[11px] text-discord-blurple font-medium bg-discord-blurple/10 px-2 py-0.5 rounded">
          Dinámico
        </span>
      </div>

      {/* Discord Channel List Mock */}
      <div className="bg-[#1e1f22] p-3 rounded-lg border border-slate-800 font-sans space-y-2">
        {/* Category Header */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <ChevronDown className="w-3 h-3" />
          <span>{t('previews.voiceCategory', '🔊 SALAS DE VOZ PRIVADAS')}</span>
        </div>

        {/* Trigger Voice Channel */}
        <div className="space-y-1 pl-1">
          <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-discord-blurple/15 text-discord-blurple border border-discord-blurple/30 font-medium">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <PlusCircle className="w-3.5 h-3.5 shrink-0 text-discord-blurple" />
              <span className="truncate">{t('previews.voiceJoinPrompt', '➕ Entra para Crear Sala')}</span>
            </div>
            <span className="text-[10px] bg-discord-blurple/20 px-1.5 py-0.5 rounded uppercase font-bold">
              Disparador
            </span>
          </div>

          {/* Spawned Room */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs bg-[#2b2d31]/80 text-slate-200 border border-slate-700/40 ml-2">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-medium">{formattedName}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-[11px] shrink-0 font-mono">
              <Users className="w-3 h-3" />
              <span>1/{userLimit > 0 ? userLimit : '∞'}</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 px-1 pt-1 italic">
          * El usuario que entra al canal disparador se mueve automáticamente a su sala privada. Cuando todos salen, la sala se borra sola.
        </p>
      </div>
    </div>
  );
}
