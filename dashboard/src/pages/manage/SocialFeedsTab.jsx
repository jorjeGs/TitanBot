import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import {
  Radio,
  Plus,
  Trash2,
  Edit2,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Tv,
  Youtube,
  Rss,
  Webhook,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Hash,
  AtSign,
  Instagram,
  Video,
} from 'lucide-react';

const PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    bg: 'bg-red-500/10 border-red-500/30 text-red-400',
    activeBg: 'border-red-500 bg-red-500/20 text-white',
    desc: 'Notifica automáticamente nuevos videos y directos vía RSS oficial (sin cuota de API).',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: Tv,
    color: '#9146FF',
    bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    activeBg: 'border-purple-500 bg-purple-500/20 text-white',
    desc: 'Alertas en vivo cuando un streamer comienza transmisión con título y juego.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    color: '#FE2C55',
    bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    activeBg: 'border-rose-500 bg-rose-500/20 text-white',
    desc: 'Notificaciones de nuevos videos cortos publicados en TikTok.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    bg: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
    activeBg: 'border-pink-500 bg-pink-500/20 text-white',
    desc: 'Alertas de nuevos posts, reels o publicaciones en Instagram.',
  },
  {
    id: 'rss',
    name: 'RSS / Atom',
    icon: Rss,
    color: '#FFA500',
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    activeBg: 'border-amber-500 bg-amber-500/20 text-white',
    desc: 'Soporte universal para blogs de noticias, anuncios oficiales o Reddit.',
  },
  {
    id: 'webhook',
    name: 'Inbound Webhook',
    icon: Webhook,
    color: '#5865F2',
    bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    activeBg: 'border-indigo-500 bg-indigo-500/20 text-white',
    desc: 'Recibe eventos JSON externos de GitHub, Shopify, Zapier o servicios propios.',
  },
];

const VARIABLE_TAGS = [
  { tag: '{author}', label: 'Autor / Creador' },
  { tag: '{title}', label: 'Título' },
  { tag: '{url}', label: 'Enlace Directo' },
  { tag: '{streamer}', label: 'Streamer (Twitch)' },
  { tag: '{game}', label: 'Juego (Twitch)' },
  { tag: '{viewers}', label: 'Espectadores (Twitch)' },
];

export default function SocialFeedsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [notification, setNotification] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    type: 'youtube',
    name: '',
    enabled: true,
    targetChannelId: '',
    customMessage: '{author} ha publicado nuevo contenido: {title}\n{url}',
    mentionRole: null,
    youtubeChannelId: '',
    twitchUsername: '',
    tiktokUsername: '',
    instagramUsername: '',
    rssFeedUrl: '',
    webhookToken: '',
  });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feedsRes, channelsRes, rolesRes] = await Promise.all([
        apiFetch(`/guilds/${guildId}/socialfeeds`).catch(() => ({ data: { feeds: [] } })),
        apiFetch(`/guilds/${guildId}/channels`).catch(() => ({ channels: [] })),
        apiFetch(`/guilds/${guildId}/roles`).catch(() => ({ roles: [] })),
      ]);

      setFeeds(feedsRes.data?.feeds || []);
      setChannels(channelsRes.channels?.filter((c) => c.type === 0 || c.type === 5) || []);
      setRoles(rolesRes.roles || []);
    } catch (err) {
      showNotification('error', err.message || 'Error al cargar las alertas sociales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guildId) {
      fetchData();
    }
  }, [guildId]);

  const handleOpenCreateModal = () => {
    setFormData({
      id: '',
      type: 'youtube',
      name: '',
      enabled: true,
      targetChannelId: channels[0]?.id || '',
      customMessage: '{author} ha publicado nuevo contenido: {title}\n{url}',
      mentionRole: null,
      youtubeChannelId: '',
      twitchUsername: '',
      tiktokUsername: '',
      instagramUsername: '',
      rssFeedUrl: '',
      webhookToken: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (feed) => {
    setFormData({
      ...feed,
    });
    setIsModalOpen(true);
  };

  const handleSaveFeed = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('error', 'El nombre de la fuente es requerido');
      return;
    }
    if (!formData.targetChannelId) {
      showNotification('error', 'Debes seleccionar un canal de Discord de destino');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch(`/guilds/${guildId}/socialfeeds`, {
        method: 'POST',
        body: formData,
      });

      if (res.success) {
        showNotification('success', t('socialFeeds.saveSuccess', 'Alerta social guardada correctamente'));
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showNotification('error', err.message || 'Error al guardar la fuente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFeed = async (feedId) => {
    if (!window.confirm(t('socialFeeds.deleteConfirm', '¿Estás seguro de eliminar esta alerta social?'))) {
      return;
    }

    try {
      await apiFetch(`/guilds/${guildId}/socialfeeds/${feedId}`, {
        method: 'DELETE',
      });
      showNotification('success', t('socialFeeds.deleteSuccess', 'Alerta social eliminada con éxito'));
      setFeeds(feeds.filter((f) => f.id !== feedId));
    } catch (err) {
      showNotification('error', err.message || 'Error al eliminar la fuente');
    }
  };

  const handleTestAlert = async (feedId) => {
    setTestingId(feedId);
    try {
      const res = await apiFetch(`/guilds/${guildId}/socialfeeds/${feedId}/test`, {
        method: 'POST',
      });
      if (res.success) {
        showNotification('success', t('socialFeeds.testSuccess', '¡Alerta de prueba enviada exitosamente al canal!'));
      }
    } catch (err) {
      showNotification('error', err.message || 'Error al enviar alerta de prueba');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleFeed = async (feed) => {
    try {
      const updated = { ...feed, enabled: !feed.enabled };
      await apiFetch(`/guilds/${guildId}/socialfeeds`, {
        method: 'POST',
        body: updated,
      });
      setFeeds(feeds.map((f) => (f.id === feed.id ? updated : f)));
    } catch (err) {
      showNotification('error', err.message || 'Error al actualizar el estado de la alerta');
    }
  };

  const copyWebhookUrl = (feedId, token) => {
    const origin = window.location.origin;
    const url = `${origin}/api/guilds/${guildId}/socialfeeds/webhooks/incoming/${feedId}?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const insertTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      customMessage: (prev.customMessage || '') + ' ' + tag,
    }));
  };

  // Metrics
  const activeCount = feeds.filter((f) => f.enabled).length;
  const youtubeCount = feeds.filter((f) => f.type === 'youtube').length;
  const twitchCount = feeds.filter((f) => f.type === 'twitch').length;
  const rssWebhookCount = feeds.filter((f) => f.type === 'rss' || f.type === 'webhook').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-discord-darker via-discord-dark to-slate-900 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-discord-blurple/20 rounded-xl text-discord-blurple ring-1 ring-discord-blurple/40 shadow-inner">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                {t('socialFeeds.title', 'Notificaciones Externas & Social Feeds')}
              </h1>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              {t(
                'socialFeeds.subtitle',
                'Monitorea canales de YouTube, streams de Twitch, feeds RSS y endpoints Webhook para publicar alertas automáticas con embeds enriquecidos en tu comunidad.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors border border-slate-700/60 flex items-center gap-2"
              title="Refrescar fuentes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-discord-blurple/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('socialFeeds.addFeed', 'Añadir Nueva Alerta')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-discord-darker/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Feeds Activos</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">
            {activeCount} <span className="text-xs font-normal text-slate-400">/ {feeds.length}</span>
          </p>
        </div>

        <div className="bg-discord-darker/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">YouTube</span>
            <Youtube className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{youtubeCount}</p>
        </div>

        <div className="bg-discord-darker/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Twitch Live</span>
            <Tv className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{twitchCount}</p>
        </div>

        <div className="bg-discord-darker/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">RSS & Webhooks</span>
            <Rss className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{rssWebhookCount}</p>
        </div>
      </div>

      {/* Feeds List Container */}
      <div className="bg-discord-darker border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              {t('socialFeeds.listTitle', 'Fuentes y Alertas Configuradas')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('socialFeeds.listSubtitle', 'TitanBot comprueba las fuentes activas periódicamente cada 5 minutos.')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
            <p className="text-sm text-slate-400">{t('common.loading', 'Cargando alertas...')}</p>
          </div>
        ) : feeds.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-14 h-14 bg-slate-800/60 rounded-2xl mx-auto flex items-center justify-center text-slate-400 border border-slate-700/50">
              <Radio className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-slate-200">
                {t('socialFeeds.noFeeds', 'No hay alertas configuradas todavía')}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {t('socialFeeds.noFeedsDesc', 'Añade tu canal de YouTube, tu canal de Twitch o una fuente RSS para notificar a tu servidor.')}
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('socialFeeds.createFirst', 'Configurar primera alerta')}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {feeds.map((feed) => {
              const platform = PLATFORMS.find((p) => p.id === feed.type) || PLATFORMS[0];
              const Icon = platform.icon;
              const targetChannel = channels.find((c) => c.id === feed.targetChannelId);

              return (
                <div
                  key={feed.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${platform.bg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white truncate">{feed.name}</h3>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${platform.bg}`}
                        >
                          {platform.name}
                        </span>
                        {feed.type === 'twitch' && feed.isLive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Hash className="w-3.5 h-3.5 text-slate-500" />
                          {targetChannel ? targetChannel.name : feed.targetChannelId}
                        </span>

                        {feed.mentionRole && (
                          <span className="flex items-center gap-1 text-discord-blurple">
                            <AtSign className="w-3 h-3" />
                            {feed.mentionRole}
                          </span>
                        )}

                        {feed.lastPublished && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" />
                            {new Date(feed.lastPublished).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {feed.type === 'webhook' && feed.webhookToken && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => copyWebhookUrl(feed.id, feed.webhookToken)}
                            className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60"
                          >
                            {copiedToken ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">¡URL copiada!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar URL del Webhook</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleToggleFeed(feed)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                        feed.enabled
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {feed.enabled ? 'Activo' : 'Pausado'}
                    </button>

                    <button
                      onClick={() => handleTestAlert(feed.id)}
                      disabled={testingId === feed.id}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
                      title="Enviar alerta de prueba al canal"
                    >
                      {testingId === feed.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-discord-blurple" />
                      )}
                      <span>Probar</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(feed)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Feed Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-discord-blurple" />
                <h3 className="text-base font-bold text-white">
                  {formData.id ? 'Editar Alerta Social' : 'Añadir Nueva Alerta Social'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeed} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Platform Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Plataforma
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PLATFORMS.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = formData.type === platform.id;
                    return (
                      <button
                        type="button"
                        key={platform.id}
                        onClick={() => setFormData({ ...formData, type: platform.id })}
                        className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-2 transition-all ${
                          isSelected
                            ? platform.activeBg + ' shadow-md'
                            : 'bg-discord-dark/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-semibold">{platform.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feed Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Nombre de la Fuente
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej. Touchpoint Support YouTube"
                  className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                />
              </div>

              {/* Platform Specific Inputs */}
              {formData.type === 'youtube' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    ID del Canal de YouTube
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.youtubeChannelId}
                    onChange={(e) => setFormData({ ...formData, youtubeChannelId: e.target.value })}
                    placeholder="ej. UC_x5XG1OV2P6uZZ5FSM9Ttw"
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Encuentra el Channel ID en la URL de configuración avanzada del canal de YouTube.
                  </p>
                </div>
              )}

              {formData.type === 'twitch' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Nombre de Usuario en Twitch
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.twitchUsername}
                    onChange={(e) => setFormData({ ...formData, twitchUsername: e.target.value })}
                    placeholder="ej. jorge"
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                </div>
              )}

              {formData.type === 'tiktok' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Usuario de TikTok (@usuario)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tiktokUsername}
                    onChange={(e) => setFormData({ ...formData, tiktokUsername: e.target.value })}
                    placeholder="ej. @touchpointsupport o touchpointsupport"
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Notificará de nuevos videos y reels publicados en la cuenta de TikTok.
                  </p>
                </div>
              )}

              {formData.type === 'instagram' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Usuario de Instagram (@usuario)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.instagramUsername}
                    onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value })}
                    placeholder="ej. @touchpointsupport o touchpointsupport"
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Alertará de nuevas publicaciones en la cuenta de Instagram.
                  </p>
                </div>
              )}

              {formData.type === 'rss' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    URL del Feed RSS / Atom
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.rssFeedUrl}
                    onChange={(e) => setFormData({ ...formData, rssFeedUrl: e.target.value })}
                    placeholder="https://ejemplo.com/rss.xml"
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                </div>
              )}

              {formData.type === 'webhook' && (
                <div className="space-y-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    Información de Ingesta Webhook
                  </span>
                  <p className="text-xs text-slate-400">
                    Envía peticiones <code>POST</code> con payload JSON para publicar alertas instantáneas en tu servidor.
                  </p>
                </div>
              )}

              {/* Discord Target Channel & Role Ping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Canal de Destino
                  </label>
                  <select
                    value={formData.targetChannelId}
                    onChange={(e) => setFormData({ ...formData, targetChannelId: e.target.value })}
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                  >
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Mención de Rol (Opcional)
                  </label>
                  <select
                    value={formData.mentionRole || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, mentionRole: e.target.value || null })
                    }
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                  >
                    <option value="">Sin mención</option>
                    <option value="@everyone">@everyone</option>
                    <option value="@here">@here</option>
                    {roles
                      .filter((r) => r.name !== '@everyone')
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          @{role.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Custom Message Template */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Mensaje Personalizado
                </label>
                <textarea
                  rows={3}
                  value={formData.customMessage}
                  onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                  placeholder="{author} ha publicado contenido nuevo: {title}\n{url}"
                  className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors font-mono text-xs"
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">Variables:</span>
                  {VARIABLE_TAGS.map(({ tag, label }) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => insertTag(tag)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700/60 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-discord-blurple/20"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Alerta</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
