import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Youtube,
  Tv,
  Video,
  Instagram,
  Rss,
  Webhook,
  ExternalLink,
  Sparkles,
  Radio,
  Eye,
  Gamepad2,
  Calendar,
  Hash,
  AtSign,
} from 'lucide-react';

const PLATFORM_CONFIG = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    colorHex: 'border-l-[#FF0000]',
    bgBadge: 'bg-red-500/10 text-red-400 border-red-500/30',
    defaultAuthor: 'Canal Oficial',
    defaultTitle: '¡NUEVO VIDEO! Probando la última actualización de temporada 🔥',
    defaultUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    defaultImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80',
    footerText: 'TitanBot Social Feeds • YouTube',
    footerIcon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
  },
  twitch: {
    name: 'Twitch',
    icon: Tv,
    color: '#9146FF',
    colorHex: 'border-l-[#9146FF]',
    bgBadge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    defaultAuthor: 'StreamerPro',
    defaultTitle: '🔴 ¡EN VIVO! Torneo de la comunidad con subs y premios',
    defaultUrl: 'https://twitch.tv/streamerpro',
    defaultGame: 'Grand Theft Auto V',
    defaultViewers: '1,420',
    defaultImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&q=80',
    footerText: 'TitanBot Social Feeds • Twitch',
    footerIcon: 'https://cdn-icons-png.flaticon.com/512/5968/5968819.png',
  },
  tiktok: {
    name: 'TikTok',
    icon: Video,
    color: '#FE2C55',
    colorHex: 'border-l-[#FE2C55]',
    bgBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    defaultAuthor: '@creador_oficial',
    defaultTitle: 'El mejor truco que no conocías en 2026 👀 #viral #gaming',
    defaultUrl: 'https://tiktok.com/@creador_oficial',
    defaultImage: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=1280&q=80',
    footerText: 'TitanBot Social Feeds • TikTok',
    footerIcon: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    colorHex: 'border-l-[#E1306C]',
    bgBadge: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    defaultAuthor: '@comunidad_oficial',
    defaultTitle: 'Nueva publicación: Momentos destacados del evento presencial 📸',
    defaultUrl: 'https://instagram.com/comunidad_oficial',
    defaultDescription: '¡Gracias a todos por asistir! Desliza para ver la galería completa de fotos.',
    defaultImage: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1280&q=80',
    footerText: 'TitanBot Social Feeds • Instagram',
    footerIcon: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png',
  },
  rss: {
    name: 'RSS / Atom',
    icon: Rss,
    color: '#FFA500',
    colorHex: 'border-l-[#FFA500]',
    bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    defaultAuthor: 'Blog Comunitario',
    defaultTitle: 'Notas del Parche v2.5: Nuevas funciones, balanceos y corrección de errores',
    defaultUrl: 'https://titanbot.dev/blog/patch-notes-v25',
    defaultDescription: 'Descubre todas las novedades y mejoras de rendimiento implementadas en esta versión.',
    footerText: 'TitanBot Social Feeds • RSS Feed',
    footerIcon: null,
  },
  webhook: {
    name: 'Inbound Webhook',
    icon: Webhook,
    color: '#5865F2',
    colorHex: 'border-l-[#5865F2]',
    bgBadge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    defaultAuthor: 'GitHub Integration',
    defaultTitle: 'Deploy exitoso: Release v2.5.0 en producción',
    defaultUrl: 'https://github.com/jorjeGs/TitanBot/releases/tag/v2.5.0',
    defaultDescription: 'El pipeline de CI/CD ha completado los 221 tests unitarios y el build de Docker exitosamente.',
    footerText: 'TitanBot Inbound Webhooks',
    footerIcon: null,
  },
};

export default function SocialFeedPreview({
  feedType = 'youtube',
  feedName = '',
  channelName = '',
  mentionRole = '',
  customMessage = '',
  compact = false,
  showBadge = true,
}) {
  const { t } = useTranslation();
  const config = PLATFORM_CONFIG[feedType] || PLATFORM_CONFIG.youtube;
  const Icon = config.icon;

  const authorText = feedName?.trim() || config.defaultAuthor;
  const streamerText = feedName?.trim() || config.defaultAuthor;
  const titleText = config.defaultTitle;
  const urlText = config.defaultUrl;
  const gameText = config.defaultGame || 'Gaming';
  const viewersText = config.defaultViewers || '1,420';

  // Real-time interpolation of user template variables
  const interpolate = (template) => {
    if (!template || !template.trim()) {
      return `${authorText} ha publicado nuevo contenido: ${titleText}\n${urlText}`;
    }
    return template
      .replace(/\{author\}/gi, authorText)
      .replace(/\{streamer\}/gi, streamerText)
      .replace(/\{title\}/gi, titleText)
      .replace(/\{url\}/gi, urlText)
      .replace(/\{game\}/gi, gameText)
      .replace(/\{viewers\}/gi, viewersText);
  };

  const renderedContent = interpolate(customMessage);

  return (
    <div className="bg-[#313338] border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-2xl text-slate-200 font-sans select-none overflow-hidden transition-all">
      {/* Top Preview Bar */}
      {showBadge && (
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#3f4147] text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-slate-400 font-medium">
              <Eye className="w-3.5 h-3.5 text-discord-blurple" />
              <span>{t('socialFeeds.previewTitle', 'Vista Previa en Tiempo Real')}</span>
            </span>
            {channelName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2b2d31] text-slate-300 font-mono text-[11px] border border-slate-700/60">
                <Hash className="w-3 h-3 text-slate-400" />
                {channelName}
              </span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${config.bgBadge}`}>
            <Icon className="w-3 h-3" />
            {config.name}
          </span>
        </div>
      )}

      {/* Discord Message Layout */}
      <div className="flex items-start gap-3.5">
        {/* Bot Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#313338] rounded-full"></div>
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Bot Name & Metadata */}
          <div className="flex items-center gap-2 flex-wrap leading-none">
            <span className="text-[14px] font-semibold text-white hover:underline cursor-pointer">
              TitanBot
            </span>
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              BOT
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Hoy a las {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Role Ping Mention (if selected) */}
          {mentionRole && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 bg-[#5865F2]/20 text-[#c9cdfb] px-1.5 py-0.5 rounded font-medium text-[13px] border border-[#5865F2]/40 hover:bg-[#5865F2]/30 cursor-pointer transition-colors">
                <AtSign className="w-3 h-3 text-[#5865F2]" />
                <span>{mentionRole}</span>
              </span>
            </div>
          )}

          {/* User Custom Text */}
          <div className="text-[14px] text-slate-200 leading-relaxed break-words whitespace-pre-line font-normal">
            {renderedContent}
          </div>

          {/* Rich Discord Embed */}
          <div className={`mt-2 bg-[#2b2d31] border-l-4 ${config.colorHex} rounded-r-lg p-3.5 space-y-2.5 max-w-lg shadow-lg`}>
            {/* Embed Author */}
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border"
                style={{ backgroundColor: `${config.color}20`, borderColor: `${config.color}50` }}
              >
                <Icon className="w-3 h-3" style={{ color: config.color }} />
              </div>
              <span className="text-xs font-semibold text-white truncate">
                {feedType === 'twitch' ? `¡${streamerText} está en vivo!` : authorText}
              </span>
              {feedType === 'twitch' && (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase animate-pulse">
                  LIVE
                </span>
              )}
            </div>

            {/* Embed Title */}
            <div>
              <a
                href="#preview"
                onClick={(e) => e.preventDefault()}
                className="text-[14px] font-bold text-[#00a8fc] hover:underline flex items-center gap-1.5 leading-snug group"
              >
                <span>{titleText}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
              </a>
            </div>

            {/* Embed Description (Instagram, RSS, Webhook) */}
            {config.defaultDescription && (
              <p className="text-xs text-slate-300 leading-normal">
                {config.defaultDescription}
              </p>
            )}

            {/* Twitch Fields */}
            {feedType === 'twitch' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#1e1f22] p-2 rounded-md border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3 text-purple-400" />
                    Categoría
                  </span>
                  <p className="text-xs font-semibold text-white mt-0.5 truncate">{gameText}</p>
                </div>
                <div className="bg-[#1e1f22] p-2 rounded-md border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    Espectadores
                  </span>
                  <p className="text-xs font-semibold text-white mt-0.5">{viewersText}</p>
                </div>
              </div>
            )}

            {/* Inbound Webhook Fields */}
            {feedType === 'webhook' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#1e1f22] p-2 rounded-md border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Estado</span>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">Operativo (200 OK)</p>
                </div>
                <div className="bg-[#1e1f22] p-2 rounded-md border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ambiente</span>
                  <p className="text-xs font-semibold text-white mt-0.5">Producción</p>
                </div>
              </div>
            )}

            {/* Embed Image / Banner */}
            {config.defaultImage && !compact && (
              <div className="rounded-lg overflow-hidden border border-slate-700/50 aspect-video relative group">
                <img
                  src={config.defaultImage}
                  alt="Thumbnail"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40"></div>
              </div>
            )}

            {/* Embed Footer */}
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 border-t border-[#383a40]">
              {config.footerIcon ? (
                <img src={config.footerIcon} alt="Platform" className="w-3.5 h-3.5 rounded-full shrink-0" />
              ) : (
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: config.color }} />
              )}
              <span className="truncate">{config.footerText}</span>
              <span>•</span>
              <span>Hoy a las {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
