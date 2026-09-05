import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, Ticket, Mail, Shield, Folder } from 'lucide-react';

export function TicketPreview({
  panelMessage,
  buttonLabel,
  channelName,
  categoryName,
  staffRoleName,
  serverName,
}) {
  const { t } = useTranslation();

  const displayMessage =
    panelMessage?.trim() ||
    t('tickets.defaultPanelMessage') ||
    'Para abrir un ticket de soporte, haz clic en el botón de abajo. Nuestro equipo te responderá lo antes posible.';

  const displayButtonLabel =
    buttonLabel?.trim() || t('tickets.defaultButtonLabel') || 'Crear Ticket';

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('tickets.previewTitle') || 'Vista Previa del Panel de Tickets'}
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
            <span className="text-[11px] text-slate-400">Hoy a las 12:00</span>
          </div>

          {/* Embed Container */}
          <div className="border-l-4 border-[#5865f2] bg-[#2b2d31] p-3.5 rounded-r-md space-y-2.5 shadow-sm">
            <div className="font-bold text-white text-sm leading-snug flex items-center gap-1.5">
              <span>🎫</span>
              <span>{t('tickets.embedTitle') || 'Sistema de Tickets de Soporte'}</span>
            </div>

            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {displayMessage}
            </div>

            {/* Optional Staff / Category Info Tags */}
            {(staffRoleName || categoryName) && (
              <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-2 text-[11px] text-slate-400">
                {staffRoleName && (
                  <div className="flex items-center gap-1 bg-[#1e1f22] px-2 py-0.5 rounded">
                    <Shield className="w-3 h-3 text-amber-400" />
                    <span>Staff: @{staffRoleName}</span>
                  </div>
                )}
                {categoryName && (
                  <div className="flex items-center gap-1 bg-[#1e1f22] px-2 py-0.5 rounded">
                    <Folder className="w-3 h-3 text-blue-400" />
                    <span>Categoría: {categoryName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Embed Footer */}
            <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>TitanBot Tickets</span>
              <span>•</span>
              <span>{serverName || 'TitanBot Server'}</span>
            </div>
          </div>

          {/* Simulated Discord Button */}
          <div className="pt-0.5">
            <button
              type="button"
              className="bg-discord-blurple hover:bg-discord-blurple/80 transition-colors text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 shadow-sm cursor-pointer select-none"
            >
              <Mail className="w-4 h-4" />
              <span>{displayButtonLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
