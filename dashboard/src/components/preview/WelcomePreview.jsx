import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash } from 'lucide-react';

export function WelcomePreview({ message, serverName, channelName }) {
  const { t } = useTranslation();

  const formattedMessage = (message || 'Welcome {user} to {server}!')
    .replace(/\{user\}/g, '@NuevoMiembro')
    .replace(/\{server\}/g, serverName || 'Mi Servidor')
    .replace(/\{memberCount\}/g, '42');

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('welcome.previewTitle')}
        </span>
        {channelName && (
          <div className="flex items-center gap-1 text-xs text-discord-blurple font-medium bg-discord-blurple/10 px-2 py-0.5 rounded">
            <Hash className="w-3 h-3" />
            <span>{channelName}</span>
          </div>
        )}
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3 rounded-lg border border-slate-700/40">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-discord-blurple to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">Hoy a las 12:00</span>
          </div>

          <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed font-sans">
            {formattedMessage.split(/(@NuevoMiembro)/g).map((part, index) =>
              part === '@NuevoMiembro' ? (
                <span
                  key={index}
                  className="bg-discord-blurple/30 text-discord-blurple font-medium px-1 rounded hover:bg-discord-blurple hover:text-white transition-colors cursor-pointer"
                >
                  {part}
                </span>
              ) : (
                part
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
