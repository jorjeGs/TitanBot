import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

export function EmbedPreview({
  title = '',
  description = '',
  color = '#5865F2',
  author = null,
  footer = null,
  thumbnail = '',
  image = '',
  timestamp = false,
  fields = [],
}) {
  const { t } = useTranslation();

  const hasAnyContent = Boolean(
    title ||
    description ||
    (author && author.name) ||
    (footer && footer.text) ||
    thumbnail ||
    image ||
    (fields && fields.length > 0)
  );

  const formatMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Basic bold formatting **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={idx} className="block min-h-[1.25rem]">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={pIdx} className="px-1 py-0.5 rounded bg-slate-900/60 text-pink-400 font-mono text-xs">
                  {part.slice(1, -1)}
                </code>
              );
            }
            return part;
          })}
        </span>
      );
    });
  };

  const formattedDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full max-w-2xl mx-auto font-sans select-none">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
        <span>{t('embeds.livePreviewTitle', 'Vista Previa en Vivo (Discord)')}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
          {color || '#5865F2'}
        </span>
      </div>

      {/* Outer Discord Message Container */}
      <div className="bg-[#313338] p-4 rounded-lg shadow-xl border border-slate-700/60 text-slate-200">
        {/* Bot Identity Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white shadow">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white">TitanBot</span>
              <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1 rounded uppercase tracking-wider">
                APP
              </span>
              <span className="text-xs text-slate-400 ml-1">{t('embeds.today', 'Hoy a las')} 12:00</span>
            </div>
          </div>
        </div>

        {/* Discord Embed Box */}
        <div
          className="bg-[#2b2d31] rounded-r-md rounded-l-sm p-4 text-left shadow-md border-l-4 transition-all"
          style={{ borderLeftColor: color || '#5865F2' }}
        >
          {!hasAnyContent ? (
            <div className="py-8 text-center text-slate-500 italic text-sm">
              {t('embeds.emptyPreviewPlaceholder', 'Escribe un título, descripción o añade campos para previsualizar el mensaje.')}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Author Row */}
              {author && author.name && (
                <div className="flex items-center gap-2">
                  {author.iconUrl && (
                    <img
                      src={author.iconUrl}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  {author.url ? (
                    <a
                      href={author.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-white hover:underline flex items-center gap-1"
                    >
                      {author.name}
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-white">{author.name}</span>
                  )}
                </div>
              )}

              {/* Title & Thumbnail Grid */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  {title && (
                    <h3 className="font-bold text-white text-base leading-snug break-words">
                      {title}
                    </h3>
                  )}

                  {/* Description */}
                  {description && (
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {formatMarkdown(description)}
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                {thumbnail && (
                  <div className="shrink-0">
                    <img
                      src={thumbnail}
                      alt="Thumbnail"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover border border-slate-700 shadow-sm"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              {/* Fields Grid */}
              {fields && fields.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {fields.map((field, idx) => (
                    <div
                      key={idx}
                      className={`${
                        field.inline ? 'col-span-1' : 'col-span-full'
                      } bg-[#232428]/60 p-2 rounded border border-slate-700/40`}
                    >
                      <div className="text-xs font-semibold text-slate-200 mb-0.5 break-words">
                        {field.name || t('embeds.fieldPlaceholder', 'Campo')}
                      </div>
                      <div className="text-xs text-slate-300 whitespace-pre-wrap break-words">
                        {field.value || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Large Image Banner */}
              {image && (
                <div className="pt-1">
                  <img
                    src={image}
                    alt="Embed Attachment"
                    className="w-full max-h-72 object-cover rounded-md border border-slate-700/80 shadow"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Footer and Timestamp */}
              {(footer?.text || timestamp) && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                  {footer?.iconUrl && (
                    <img
                      src={footer.iconUrl}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  {footer?.text && <span>{footer.text}</span>}
                  {footer?.text && timestamp && <span className="opacity-60">•</span>}
                  {timestamp && <span>{formattedDate}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
