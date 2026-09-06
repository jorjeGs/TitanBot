import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  Copy,
  Check,
  Printer,
  ExternalLink,
  MessageSquare,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';

export function TranscriptModal({ isOpen, onClose, transcript, guildId }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transcript) return null;

  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const publicUrl = `${window.location.origin}${base}/api/transcripts/${transcript.id}?token=${transcript.viewToken}`;
  const downloadUrl = `${base}/api/guilds/${guildId}/transcripts/${transcript.id}/download`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#313338] border border-[#3f4147] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#2b2d31] px-6 py-4 border-b border-[#3f4147] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 truncate">
              <span className="text-discord-blurple">📜</span>
              {transcript.title || `Ticket #${transcript.ticketNumber}`}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#949ba4]">
              <span>
                <strong className="text-[#dbdee1]">{t('transcripts.creator') || 'Creador'}:</strong> {transcript.ticketCreatorTag}
              </span>
              <span>•</span>
              <span>
                <strong className="text-[#dbdee1]">{t('transcripts.closedBy') || 'Cerrado por'}:</strong> {transcript.closedByTag || 'System'}
              </span>
              <span>•</span>
              <span>
                <strong className="text-[#dbdee1]">{t('transcripts.messages') || 'Mensajes'}:</strong> {transcript.messageCount || transcript.messages?.length || 0}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopyLink}
              title={t('transcripts.copyLink') || 'Copiar enlace público'}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#383a40] hover:bg-[#404249] text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copied ? (t('common.copied') || 'Copiado') : (t('transcripts.share') || 'Compartir')}</span>
            </button>

            <a
              href={downloadUrl}
              download
              title={t('transcripts.downloadHtml') || 'Descargar HTML'}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('transcripts.download') || 'Descargar'}</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#383a40] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-[15px] leading-relaxed">
          {(!transcript.messages || transcript.messages.length === 0) ? (
            <div className="text-center py-16 text-[#949ba4]">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>{t('transcripts.noMessages') || 'No se registraron mensajes en este ticket.'}</p>
            </div>
          ) : (
            transcript.messages.map((msg) => {
              const author = msg.author || {};
              const isBot = Boolean(author.bot);
              const avatar = author.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';

              return (
                <div key={msg.id} className="flex gap-4 p-2 rounded hover:bg-[#2e3035] transition-colors">
                  <img
                    src={avatar}
                    alt={author.username}
                    onError={(e) => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                    className="w-10 h-10 rounded-full flex-shrink-0 object-cover bg-[#1e1f22]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-white text-[15px]">{author.username || 'Unknown'}</span>
                      {isBot && (
                        <span className="bg-[#5865f2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                          BOT
                        </span>
                      )}
                      <span className="text-[11px] text-[#949ba4]">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Content */}
                    {msg.content && (
                      <div className="text-[#dbdee1] break-words whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    )}

                    {/* Embeds */}
                    {msg.embeds && msg.embeds.map((emb, idx) => (
                      <div
                        key={idx}
                        className="mt-2 p-3 rounded bg-[#2b2d31] border-l-4 max-w-lg"
                        style={{ borderLeftColor: emb.color ? `#${Number(emb.color).toString(16).padStart(6, '0')}` : '#5865f2' }}
                      >
                        {emb.title && <div className="font-bold text-white text-sm mb-1">{emb.title}</div>}
                        {emb.description && <div className="text-xs text-[#dbdee1] mb-2">{emb.description}</div>}
                        {emb.fields && emb.fields.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {emb.fields.map((f, fIdx) => (
                              <div key={fIdx} className={f.inline ? 'col-span-1' : 'col-span-2'}>
                                <div className="text-[11px] font-bold text-[#b5bac1]">{f.name}</div>
                                <div className="text-xs text-[#dbdee1]">{f.value}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.map((att) => {
                      const isImg = att.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(att.name || '');
                      if (isImg) {
                        return (
                          <div key={att.id} className="mt-2">
                            <img
                              src={att.url}
                              alt={att.name}
                              className="max-w-xs max-h-60 rounded-lg border border-[#3f4147] object-cover"
                            />
                          </div>
                        );
                      }
                      return (
                        <div key={att.id} className="mt-2 inline-flex items-center gap-2 p-2 rounded bg-[#2b2d31] border border-[#3f4147] text-xs">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                            {att.name}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#2b2d31] px-6 py-3 border-t border-[#3f4147] flex items-center justify-between text-xs text-[#949ba4]">
          <span>
            {t('transcripts.reason') || 'Motivo'}: <span className="text-[#dbdee1]">{transcript.closeReason || 'No especificado'}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#404249] text-white font-medium transition-colors"
          >
            {t('common.close') || 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
