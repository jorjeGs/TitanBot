import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash } from 'lucide-react';

export default function AutomationPreview({
  channelName = 'general',
  type = 'text',
  content = '',
  embed = {},
  previewMode = 'sticky', // 'sticky' | 'scheduled' | 'autoresponder'
  triggerWord = '',
}) {
  const { t } = useTranslation();

  // Helper to simulate variables in text
  const renderText = (rawText) => {
    if (!rawText) return '';
    return rawText
      .replace(/\{user\}/gi, '@TitanUser')
      .replace(/\{username\}/gi, 'TitanUser')
      .replace(/\{server\}/gi, 'TitanBot Community')
      .replace(/\{guild\}/gi, 'TitanBot Community')
      .replace(/\{channel\}/gi, `#${channelName}`)
      .replace(/\{memberCount\}/gi, '1,420');
  };

  const formattedContent = renderText(content);
  const formattedTitle = renderText(embed?.title);
  const formattedDescription = renderText(embed?.description);
  const formattedFooter = renderText(embed?.footer);
  const embedColor = embed?.color || '#5865F2';

  return (
    <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-xl overflow-hidden shadow-2xl">
      {/* Discord Fake Header */}
      <div className="bg-[#2b2d31] px-4 py-2.5 flex items-center justify-between border-b border-[#1e1f22]">
        <div className="flex items-center gap-2 text-zinc-300 font-semibold text-sm">
          <Hash className="w-4 h-4 text-zinc-400" />
          <span>{channelName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#35373c] text-indigo-400 border border-indigo-500/20">
            {previewMode === 'sticky' && t('automations.preview.badgeSticky', '📌 Sticky Pin')}
            {previewMode === 'scheduled' && t('automations.preview.badgeScheduled', '⏰ Aviso Programado')}
            {previewMode === 'autoresponder' && t('automations.preview.badgeAutoresponder', '⚡ Auto-Respuesta')}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 font-sans text-sm">
        {/* If Auto-responder mode, show fake user trigger message first */}
        {previewMode === 'autoresponder' && triggerWord && (
          <div className="flex gap-3 items-start opacity-75 border-b border-white/5 pb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
              TU
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-zinc-200 text-sm">TitanUser</span>
                <span className="text-xs text-zinc-400">{t('previews.todayAt', { time: '12:34' })}</span>
              </div>
              <div className="text-zinc-300 text-sm break-words bg-[#2b2d31]/50 px-2.5 py-1.5 rounded-lg inline-block border border-white/5">
                {triggerWord}
              </div>
            </div>
          </div>
        )}

        {/* Bot Message */}
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white text-sm">TitanBot</span>
              <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                BOT
              </span>
              <span className="text-xs text-zinc-400">{t('previews.todayAt', { time: '12:35' })}</span>
            </div>

            {/* Optional plain content above embed or primary content in text mode */}
            {formattedContent && (
              <p className="text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed mb-2 break-words">
                {formattedContent}
              </p>
            )}

            {/* Rich Embed Mode */}
            {type === 'embed' && (
              <div
                className="rounded-lg bg-[#2b2d31] p-3.5 border-l-4 shadow-md max-w-lg space-y-2 mt-1.5"
                style={{ borderLeftColor: embedColor }}
              >
                {/* Embed Title */}
                {formattedTitle && (
                  <h4 className="font-bold text-white text-sm leading-snug break-words">
                    {formattedTitle}
                  </h4>
                )}

                {/* Embed Description */}
                {formattedDescription && (
                  <p className="text-zinc-300 text-xs whitespace-pre-wrap leading-relaxed break-words">
                    {formattedDescription}
                  </p>
                )}

                {/* Embed Thumbnail if exists */}
                {embed?.thumbnail && (
                  <div className="float-right ml-2 mb-2 w-16 h-16 rounded overflow-hidden bg-black/20">
                    <img src={embed.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Embed Image Banner if exists */}
                {embed?.image && (
                  <div className="mt-2 rounded overflow-hidden max-h-48 bg-black/20">
                    <img src={embed.image} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Embed Footer */}
                {formattedFooter && (
                  <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <span>{formattedFooter}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
