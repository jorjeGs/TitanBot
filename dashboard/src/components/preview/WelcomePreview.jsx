import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, User, Users, Image as ImageIcon } from 'lucide-react';

export function WelcomePreview({
  mode = 'text',
  message = '',
  embed = {},
  serverName = '',
  channelName = '',
  isGoodbye = false,
  pingUser = false,
}) {
  const { t } = useTranslation();

  const previewUser = t('welcome.previewUser') || '@NuevoMiembro';
  const server = serverName || 'Mi Servidor';

  const replacePlaceholders = (str) => {
    if (!str) return '';
    return str
      .replace(/\{user\}/g, previewUser)
      .replace(/\{user\.mention\}/g, previewUser)
      .replace(/\{username\}/g, 'NuevoMiembro')
      .replace(/\{user\.username\}/g, 'NuevoMiembro')
      .replace(/\{user\.tag\}/g, 'NuevoMiembro#0001')
      .replace(/\{server\}/g, server)
      .replace(/\{server\.name\}/g, server)
      .replace(/\{guild\.name\}/g, server)
      .replace(/\{memberCount\}/g, '42')
      .replace(/\{membercount\}/g, '42')
      .replace(/\{user\.id\}/g, '123456789012345678');
  };

  const formattedTextMessage = replacePlaceholders(
    message || (isGoodbye ? '{user} has left {server}.' : 'Welcome {user} to {server}!')
  );

  const embedTitle = replacePlaceholders(
    embed?.title || (isGoodbye ? '👋 Farewell!' : '🎉 Welcome to the Server!')
  );
  const embedDesc = replacePlaceholders(
    embed?.description || message || (isGoodbye ? '{user} has left the server.' : 'Welcome {user} to {server}! We are glad to have you.')
  );
  const embedFooter = replacePlaceholders(
    embed?.footer || (isGoodbye ? `Goodbye from ${server}` : `Welcome to ${server}`)
  );
  const embedColor = embed?.color || (isGoodbye ? '#ED4245' : '#5865F2');
  const showThumbnail = embed?.thumbnail !== false;

  const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {isGoodbye ? t('welcome.previewGoodbyeTitle', 'Vista Previa de Despedida') : t('welcome.previewTitle', 'Vista Previa en Discord')}
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

        <div className="flex-1 min-w-0 space-y-2">
          {/* Bot header info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">
              {t('previews.todayAt', { time: nowFormatted })}
            </span>
          </div>

          {/* User Ping outside embed */}
          {pingUser && (
            <div className="text-xs text-discord-blurple font-medium">
              <span className="bg-discord-blurple/20 px-1 py-0.5 rounded cursor-pointer hover:bg-discord-blurple hover:text-white transition-colors">
                {previewUser}
              </span>
            </div>
          )}

          {/* Mode 1: Plain Text */}
          {mode === 'text' && (
            <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {formattedTextMessage.split(new RegExp(`(${previewUser})`, 'g')).map((part, index) =>
                part === previewUser ? (
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
          )}

          {/* Mode 2: Rich Embed */}
          {mode === 'embed' && (
            <div
              className="rounded-r-md bg-[#2b2d31] p-3.5 border-l-4 space-y-3 shadow-md overflow-hidden"
              style={{ borderLeftColor: embedColor }}
            >
              {/* Header: Title and Avatar Thumbnail */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {embedTitle && (
                    <h4 className="font-bold text-white text-base leading-snug">
                      {embedTitle}
                    </h4>
                  )}
                  {embedDesc && (
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed mt-1.5">
                      {embedDesc.split(new RegExp(`(${previewUser})`, 'g')).map((part, index) =>
                        part === previewUser ? (
                          <span
                            key={index}
                            className="bg-discord-blurple/30 text-discord-blurple font-medium px-1 rounded"
                          >
                            {part}
                          </span>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  )}
                </div>

                {/* Avatar thumbnail */}
                {showThumbnail && (
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700 shrink-0 bg-slate-800 flex items-center justify-center shadow">
                    <User className="w-7 h-7 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Dynamic Info Fields */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/40 text-xs">
                <div className="bg-[#1e1f22] p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    {t('applications.roleColon', 'Usuario')}
                  </span>
                  <span className="font-semibold text-slate-200 truncate block mt-0.5">
                    {previewUser}
                  </span>
                </div>

                <div className="bg-[#1e1f22] p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    {t('welcome.tabWelcome', 'Miembro')}
                  </span>
                  <span className="font-semibold text-slate-200 block mt-0.5">
                    #42
                  </span>
                </div>
              </div>

              {/* Optional Banner Image */}
              {embed?.image && (
                <div className="rounded-lg overflow-hidden border border-slate-700/40 max-h-48 bg-slate-800">
                  <img
                    src={embed.image}
                    alt="Welcome Banner"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Embed Footer */}
              {embedFooter && (
                <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{embedFooter}</span>
                  <span>{t('previews.todayAt', { time: nowFormatted })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
