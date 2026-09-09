import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { safeFormatDateTime } from '../../utils/formatters';
import SocialFeedPreview from '../../components/preview/SocialFeedPreview';
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
  Search,
  SlidersHorizontal,
  Layers,
  Terminal,
  Code2,
  Sparkles,
  Eye,
  Info,
  ShieldCheck,
  ChevronRight,
  Flame,
  FileText,
  HelpCircle,
} from 'lucide-react';

const PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    badge: 'bg-red-500/10 border-red-500/30 text-red-400',
    activeBg: 'border-red-500 bg-red-500/20 text-white shadow-lg shadow-red-500/10',
    desc: 'Notifica automáticamente videos y directos vía RSS oficial.',
    hint: 'Introduce el Channel ID (ej. UC_x5XG1OV2P6uZZ5FSM9Ttw) o ID de canal de YouTube.',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: Tv,
    color: '#9146FF',
    badge: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    activeBg: 'border-purple-500 bg-purple-500/20 text-white shadow-lg shadow-purple-500/10',
    desc: 'Alertas en directo cuando un streamer empieza a transmitir.',
    hint: 'Nombre de usuario exacto en Twitch (ej. jorge, ibai, rubius).',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    color: '#FE2C55',
    badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    activeBg: 'border-rose-500 bg-rose-500/20 text-white shadow-lg shadow-rose-500/10',
    desc: 'Notificaciones de nuevos videos cortos y reels en TikTok.',
    hint: 'Usuario de TikTok con o sin @ (ej. @touchpointsupport).',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    badge: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
    activeBg: 'border-pink-500 bg-pink-500/20 text-white shadow-lg shadow-pink-500/10',
    desc: 'Alertas de nuevos posts y publicaciones en Instagram.',
    hint: 'Usuario público de Instagram (ej. touchpointsupport).',
  },
  {
    id: 'rss',
    name: 'RSS / Atom',
    icon: Rss,
    color: '#FFA500',
    badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    activeBg: 'border-amber-500 bg-amber-500/20 text-white shadow-lg shadow-amber-500/10',
    desc: 'Soporte universal para blogs, noticias, Reddit y parches.',
    hint: 'URL completa válida del feed XML (ej. https://sitio.com/feed.xml).',
  },
  {
    id: 'webhook',
    name: 'Inbound Webhook',
    icon: Webhook,
    color: '#5865F2',
    badge: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    activeBg: 'border-indigo-500 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/10',
    desc: 'Recibe eventos JSON externos de GitHub, Zapier, Make o APIs.',
    hint: 'Genera un endpoint seguro con token para recibir peticiones POST.',
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

const PRESET_TEMPLATES = {
  youtube: [
    {
      name: 'Estándar',
      text: '{author} ha publicado nuevo contenido: {title}\n{url}',
    },
    {
      name: 'Hype 🔥',
      text: '🔥 ¡NUEVO VIDEO IMPERDIBLE! **{title}** subido por **{author}**. ¡Míralo ahora mismo!\n{url}',
    },
    {
      name: 'Minimalista',
      text: '🎥 {title} - {url}',
    },
  ],
  twitch: [
    {
      name: 'Estándar',
      text: '🔴 ¡{streamer} está transmitiendo en vivo jugando a {game}!\n{url}',
    },
    {
      name: 'Alerta Máxima 🚨',
      text: '🚨 ¡ESTAMOS EN VIVO! Acompáñanos en el stream de **{streamer}** jugando a **{game}** con **{viewers}** personas.\n{url}',
    },
    {
      name: 'Directo',
      text: '🔴 {streamer} en directo ahora: {url}',
    },
  ],
  tiktok: [
    {
      name: 'Estándar',
      text: '✨ Nuevo video corto en TikTok de {author}: {title}\n{url}',
    },
    {
      name: 'Viral 🔥',
      text: '🔥 ¡Nuevo TikTok viral de **{author}**! No te lo pierdas:\n{url}',
    },
  ],
  instagram: [
    {
      name: 'Estándar',
      text: '📸 ¡Nueva publicación en Instagram de {author}! Dale like y comenta:\n{url}',
    },
    {
      name: 'Galería',
      text: '✨ Echa un vistazo a la nueva publicación de **{author}**:\n{url}',
    },
  ],
  rss: [
    {
      name: 'Estándar',
      text: '📰 Nueva publicación en el blog: {title}\n{url}',
    },
    {
      name: 'Noticia Oficial',
      text: '📢 **Comunicado Oficial**: {title}\nLee el artículo completo aquí:\n{url}',
    },
  ],
  webhook: [
    {
      name: 'Estándar',
      text: '🚀 Notificación del sistema: {title}\n{url}',
    },
    {
      name: 'Alerta Operativa',
      text: '🚨 **Alerta de Infraestructura**: {title}\n{url}',
    },
  ],
};

export default function SocialFeedsTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { currentGuild, channels: contextChannels = [], roles: contextRoles = [] } = useGuild() || {};

  // Data state
  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [notification, setNotification] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [copiedTokenFeedId, setCopiedTokenFeedId] = useState(null);

  // Subtabs and Filtering
  const [activeSubtab, setActiveSubtab] = useState('feeds'); // 'feeds' | 'webhooks' | 'templates'
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'paused'
  const [selectedSnippetTab, setSelectedSnippetTab] = useState('curl'); // 'curl' | 'js' | 'python'
  const [selectedWebhookFeedId, setSelectedWebhookFeedId] = useState('');

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

      const fetchedFeeds = feedsRes.data?.feeds || [];
      setFeeds(fetchedFeeds);

      const validChannels = channelsRes.channels?.length
        ? channelsRes.channels.filter((c) => c.type === 0 || c.type === 5 || !c.type)
        : contextChannels.filter((c) => c.type === 0 || c.type === 5 || !c.type);
      setChannels(validChannels);

      setRoles(rolesRes.roles?.length ? rolesRes.roles : contextRoles);

      // Select first webhook feed for webhooks studio if available
      const firstWebhook = fetchedFeeds.find((f) => f.type === 'webhook');
      if (firstWebhook && !selectedWebhookFeedId) {
        setSelectedWebhookFeedId(firstWebhook.id);
      }
    } catch (err) {
      showNotification('error', err.message || t('socialFeeds.alerts.loadError', 'Error al cargar las alertas sociales'));
    } finally {
      setLoading(false);
    }
  };

  // Sync with context if already loaded by layout
  useEffect(() => {
    if (contextChannels && contextChannels.length > 0 && channels.length === 0) {
      setChannels(contextChannels.filter((c) => c.type === 0 || c.type === 5 || !c.type));
    }
    if (contextRoles && contextRoles.length > 0 && roles.length === 0) {
      setRoles(contextRoles);
    }
  }, [contextChannels, contextRoles, channels.length, roles.length]);

  useEffect(() => {
    if (guildId) {
      fetchData();
    }
  }, [guildId]);

  const handleOpenCreateModal = (preselectedType = 'youtube') => {
    const defaultTemplate = PRESET_TEMPLATES[preselectedType]?.[0]?.text || '{author} ha publicado nuevo contenido: {title}\n{url}';
    setFormData({
      id: '',
      type: preselectedType,
      name: '',
      enabled: true,
      targetChannelId: channels[0]?.id || '',
      customMessage: defaultTemplate,
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
      showNotification('error', t('socialFeeds.alerts.nameRequired', 'El nombre de la fuente es requerido'));
      return;
    }
    if (!formData.targetChannelId) {
      showNotification('error', t('socialFeeds.alerts.channelRequired', 'Debes seleccionar un canal de Discord de destino'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch(`/guilds/${guildId}/socialfeeds`, {
        method: 'POST',
        body: formData,
      });

      if (res.success) {
        showNotification('success', t('socialFeeds.alerts.saveSuccess', 'Alerta social guardada correctamente'));
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showNotification('error', err.message || t('socialFeeds.alerts.saveError', 'Error al guardar la fuente'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFeed = async (feedId) => {
    if (!window.confirm(t('socialFeeds.alerts.deleteConfirm', '¿Estás seguro de que deseas eliminar esta alerta social?'))) {
      return;
    }

    try {
      await apiFetch(`/guilds/${guildId}/socialfeeds/${feedId}`, {
        method: 'DELETE',
      });
      showNotification('success', t('socialFeeds.alerts.deleteSuccess', 'Alerta social eliminada con éxito'));
      setFeeds(feeds.filter((f) => f.id !== feedId));
    } catch (err) {
      showNotification('error', err.message || t('socialFeeds.alerts.deleteError', 'Error al eliminar la fuente'));
    }
  };

  const handleTestAlert = async (feedId) => {
    setTestingId(feedId);
    try {
      const res = await apiFetch(`/guilds/${guildId}/socialfeeds/${feedId}/test`, {
        method: 'POST',
      });
      if (res.success) {
        showNotification('success', t('socialFeeds.alerts.testSuccess', '¡Alerta de prueba enviada exitosamente al canal de Discord!'));
      }
    } catch (err) {
      showNotification('error', err.message || t('socialFeeds.alerts.testError', 'Error al enviar alerta de prueba'));
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
      showNotification('success', t('socialFeeds.alerts.statusUpdated', 'Estado de alerta actualizado.'));
    } catch (err) {
      showNotification('error', err.message || t('socialFeeds.alerts.statusError', 'Error al actualizar el estado de la alerta'));
    }
  };

  const copyToClipboard = async (text, feedId = null) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (feedId) {
        setCopiedTokenFeedId(feedId);
        setTimeout(() => setCopiedTokenFeedId(null), 2500);
      } else {
        showNotification('success', t('socialFeeds.alerts.copiedToClipboard', '¡Copiado al portapapeles!'));
      }
    } catch {
      showNotification('error', 'No se pudo copiar automáticamente');
    }
  };

  const getWebhookUrl = (feed) => {
    if (!feed) return '';
    const origin = window.location.origin;
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    return `${origin}${base}/api/guilds/${guildId}/socialfeeds/webhooks/incoming/${feed.id}?token=${feed.webhookToken || ''}`;
  };

  const insertTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      customMessage: (prev.customMessage || '') + ' ' + tag,
    }));
  };

  const applyPreset = (presetText) => {
    setFormData((prev) => ({
      ...prev,
      customMessage: presetText,
    }));
  };

  // Metrics
  const activeCount = feeds.filter((f) => f.enabled).length;
  const youtubeCount = feeds.filter((f) => f.type === 'youtube').length;
  const twitchCount = feeds.filter((f) => f.type === 'twitch').length;
  const socialCount = feeds.filter((f) => f.type === 'tiktok' || f.type === 'instagram').length;
  const rssWebhookCount = feeds.filter((f) => f.type === 'rss' || f.type === 'webhook').length;
  const webhookFeeds = feeds.filter((f) => f.type === 'webhook');

  // Filtered feeds list
  const filteredFeeds = useMemo(() => {
    return feeds.filter((feed) => {
      const matchesSearch =
        !searchQuery.trim() ||
        feed.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.targetChannelId?.includes(searchQuery) ||
        feed.youtubeChannelId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.twitchUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.tiktokUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.instagramUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feed.rssFeedUrl?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlatform = platformFilter === 'all' || feed.type === platformFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && feed.enabled) ||
        (statusFilter === 'paused' && !feed.enabled);

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [feeds, searchQuery, platformFilter, statusFilter]);

  // Selected webhook feed for the studio
  const activeWebhookFeed = webhookFeeds.find((f) => f.id === selectedWebhookFeedId) || webhookFeeds[0];

  // Target channel name for the modal preview
  const modalTargetChannel = channels.find((c) => c.id === formData.targetChannelId)?.name || 'anuncios';
  const modalMentionRole = formData.mentionRole
    ? formData.mentionRole.startsWith('@')
      ? formData.mentionRole
      : roles.find((r) => r.id === formData.mentionRole)?.name
      ? `@${roles.find((r) => r.id === formData.mentionRole).name}`
      : formData.mentionRole
    : '';

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
                {t('socialFeeds.title', 'Notificaciones Externas & Redes Sociales')}
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
              title={t('socialFeeds.refresh', 'Actualizar')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => handleOpenCreateModal('youtube')}
              className="px-4 py-2.5 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-discord-blurple/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('socialFeeds.addFeed', 'Nueva Alerta')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-discord-darker/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">
              {t('socialFeeds.kpi.active', 'Feeds Activos')}
            </span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5">
            {activeCount} <span className="text-xs font-normal text-slate-400">/ {feeds.length}</span>
          </p>
        </div>

        <div className="bg-discord-darker/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">
              {t('socialFeeds.kpi.youtube', 'YouTube')}
            </span>
            <Youtube className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5">{youtubeCount}</p>
        </div>

        <div className="bg-discord-darker/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">
              {t('socialFeeds.kpi.twitch', 'Twitch Live')}
            </span>
            <Tv className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5">{twitchCount}</p>
        </div>

        <div className="bg-discord-darker/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">
              {t('socialFeeds.kpi.social', 'TikTok & Insta')}
            </span>
            <Instagram className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5">{socialCount}</p>
        </div>

        <div className="bg-discord-darker/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/60 transition-all col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">
              {t('socialFeeds.kpi.webhooks', 'RSS & Webhooks')}
            </span>
            <Webhook className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5">{rssWebhookCount}</p>
        </div>
      </div>

      {/* Segmented Subtabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveSubtab('feeds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeSubtab === 'feeds'
              ? 'bg-discord-blurple text-white shadow-md shadow-discord-blurple/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('socialFeeds.subtabs.feeds', 'Feeds & Redes')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/20">{feeds.length}</span>
        </button>

        <button
          onClick={() => setActiveSubtab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeSubtab === 'webhooks'
              ? 'bg-discord-blurple text-white shadow-md shadow-discord-blurple/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>{t('socialFeeds.subtabs.webhooks', 'Webhooks Entrantes')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/20">{webhookFeeds.length}</span>
        </button>

        <button
          onClick={() => setActiveSubtab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeSubtab === 'templates'
              ? 'bg-discord-blurple text-white shadow-md shadow-discord-blurple/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('socialFeeds.subtabs.templates', 'Plantillas & Variables')}</span>
        </button>
      </div>

      {/* SUBTAB 1: Feeds List & Filters */}
      {activeSubtab === 'feeds' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('socialFeeds.searchPlaceholder', 'Buscar por nombre, canal o creador...')}
                className="w-full bg-discord-dark border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Platform & Status Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-discord-dark border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-discord-blurple transition-colors"
              >
                <option value="all">{t('socialFeeds.filters.allPlatforms', 'Todas las Redes')}</option>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-discord-dark border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-discord-blurple transition-colors"
              >
                <option value="all">{t('socialFeeds.filters.allStatuses', 'Todos los Estados')}</option>
                <option value="active">{t('socialFeeds.filters.activeOnly', 'Activos')}</option>
                <option value="paused">{t('socialFeeds.filters.pausedOnly', 'Pausados')}</option>
              </select>
            </div>
          </div>

          {/* Feeds List Container */}
          <div className="bg-discord-darker border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
                <p className="text-sm text-slate-400">{t('common.loading', 'Cargando alertas sociales...')}</p>
              </div>
            ) : filteredFeeds.length === 0 ? (
              <div className="py-20 text-center space-y-4 px-4">
                <div className="w-16 h-16 bg-slate-800/60 rounded-2xl mx-auto flex items-center justify-center text-slate-400 border border-slate-700/50">
                  <Radio className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-200">
                    {t('socialFeeds.empty.title', 'No se encontraron alertas sociales')}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {t(
                      'socialFeeds.empty.desc',
                      'Crea una alerta para que TitanBot notifique automáticamente nuevos videos, streams o publicaciones en tu servidor.'
                    )}
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => handleOpenCreateModal('youtube')}
                    className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 shadow-lg shadow-discord-blurple/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('socialFeeds.empty.cta', 'Configurar primera alerta')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {filteredFeeds.map((feed) => {
                  const platform = PLATFORMS.find((p) => p.id === feed.type) || PLATFORMS[0];
                  const Icon = platform.icon;
                  const targetChannel = channels.find((c) => c.id === feed.targetChannelId);
                  const isWebhook = feed.type === 'webhook';

                  return (
                    <div
                      key={feed.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20 transition-all"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${platform.badge}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-white truncate">{feed.name}</h3>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${platform.badge}`}
                            >
                              {platform.name}
                            </span>
                            {feed.type === 'twitch' && feed.isLive && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                                LIVE
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-300 font-mono">
                              <Hash className="w-3.5 h-3.5 text-slate-500" />
                              {targetChannel ? targetChannel.name : feed.targetChannelId}
                            </span>

                            {feed.mentionRole && (
                              <span className="flex items-center gap-1 text-discord-blurple font-medium bg-discord-blurple/10 px-2 py-0.5 rounded-md border border-discord-blurple/30">
                                <AtSign className="w-3 h-3" />
                                {feed.mentionRole}
                              </span>
                            )}

                            {feed.lastPublished && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{safeFormatDateTime(feed.lastPublished)}</span>
                              </span>
                            )}
                          </div>

                          {/* Platform specific target detail */}
                          <div className="text-[11px] text-slate-400 truncate">
                            {feed.type === 'youtube' && feed.youtubeChannelId && (
                              <span>Canal: <code className="text-slate-300">{feed.youtubeChannelId}</code></span>
                            )}
                            {feed.type === 'twitch' && feed.twitchUsername && (
                              <span>Streamer: <span className="text-purple-300">twitch.tv/{feed.twitchUsername}</span></span>
                            )}
                            {feed.type === 'tiktok' && feed.tiktokUsername && (
                              <span>Usuario: <span className="text-rose-300">@{feed.tiktokUsername.replace('@', '')}</span></span>
                            )}
                            {feed.type === 'instagram' && feed.instagramUsername && (
                              <span>Usuario: <span className="text-pink-300">@{feed.instagramUsername.replace('@', '')}</span></span>
                            )}
                            {feed.type === 'rss' && feed.rssFeedUrl && (
                              <span className="truncate">Feed: <code className="text-amber-300">{feed.rssFeedUrl}</code></span>
                            )}
                            {isWebhook && feed.webhookToken && (
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(getWebhookUrl(feed), feed.id)}
                                  className="text-[11px] text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60"
                                >
                                  {copiedTokenFeedId === feed.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400 font-semibold">{t('socialFeeds.actions.copied', '¡URL Copiada!')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{t('socialFeeds.actions.copyUrl', 'Copiar URL de Ingesta')}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleToggleFeed(feed)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                            feed.enabled
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {feed.enabled ? t('socialFeeds.status.active', 'Activo') : t('socialFeeds.status.paused', 'Pausado')}
                        </button>

                        <button
                          onClick={() => handleTestAlert(feed.id)}
                          disabled={testingId === feed.id}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
                          title="Enviar anuncio de prueba al canal de Discord"
                        >
                          {testingId === feed.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5 text-discord-blurple" />
                          )}
                          <span>{testingId === feed.id ? t('socialFeeds.actions.testing', 'Enviando...') : t('socialFeeds.actions.test', 'Probar')}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(feed)}
                          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                          title={t('socialFeeds.actions.edit', 'Editar')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title={t('socialFeeds.actions.delete', 'Eliminar')}
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
        </div>
      )}

      {/* SUBTAB 2: Inbound Webhooks Studio */}
      {activeSubtab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <span>{t('socialFeeds.webhooksStudio.title', 'Estudio de Webhooks Entrantes')}</span>
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl">
                  {t(
                    'socialFeeds.webhooksStudio.subtitle',
                    'Recibe eventos y alertas personalizadas mediante peticiones HTTP POST desde servicios externos como GitHub, Zapier, Make o tus propios servidores.'
                  )}
                </p>
              </div>

              {webhookFeeds.length > 0 && (
                <button
                  onClick={() => handleOpenCreateModal('webhook')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Nuevo Endpoint</span>
                </button>
              )}
            </div>

            {webhookFeeds.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-2xl mx-auto flex items-center justify-center">
                  <Webhook className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">No tienes webhooks entrantes creados</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Crea un webhook con un token de autorización único para integrar tus sistemas de CI/CD, bots o automatizaciones.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenCreateModal('webhook')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Webhook Entrante</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Select active webhook */}
                {webhookFeeds.length > 1 && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Seleccionar Webhook:</label>
                    <select
                      value={activeWebhookFeed?.id}
                      onChange={(e) => setSelectedWebhookFeedId(e.target.value)}
                      className="bg-discord-dark border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {webhookFeeds.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} (#{channels.find((c) => c.id === w.targetChannelId)?.name || w.targetChannelId})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Endpoint URL Card */}
                {activeWebhookFeed && (
                  <div className="bg-discord-dark/70 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>{t('socialFeeds.webhooksStudio.endpointLabel', 'Endpoint del Webhook:')}</span>
                      </span>
                      <button
                        onClick={() => handleTestAlert(activeWebhookFeed.id)}
                        disabled={testingId === activeWebhookFeed.id}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {testingId === activeWebhookFeed.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{t('socialFeeds.webhooksStudio.quickTest', 'Enviar Payload de Prueba')}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-[#1e1f22] p-2.5 rounded-xl border border-slate-700/60">
                      <code className="text-xs text-indigo-300 font-mono break-all flex-1 select-all">
                        {getWebhookUrl(activeWebhookFeed)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(getWebhookUrl(activeWebhookFeed), activeWebhookFeed.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700/60 shrink-0 flex items-center gap-1.5 transition-colors"
                      >
                        {copiedTokenFeedId === activeWebhookFeed.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        {t(
                          'socialFeeds.webhooksStudio.secretNotice',
                          'Mantén seguro este token. Cualquier servicio con esta URL puede publicar embeds en el canal configurado.'
                        )}
                      </span>
                    </p>
                  </div>
                )}

                {/* Code Snippets Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      <span>{t('socialFeeds.webhooksStudio.integrationGuides', 'Ejemplos de Integración')}</span>
                    </span>

                    <div className="inline-flex rounded-lg bg-discord-dark p-1 border border-slate-800 text-xs font-semibold">
                      <button
                        onClick={() => setSelectedSnippetTab('curl')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          selectedSnippetTab === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        cURL
                      </button>
                      <button
                        onClick={() => setSelectedSnippetTab('js')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          selectedSnippetTab === 'js' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        JavaScript
                      </button>
                      <button
                        onClick={() => setSelectedSnippetTab('python')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          selectedSnippetTab === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Python
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#1e1f22] border border-slate-700/60 rounded-xl p-4 relative font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
                    <button
                      onClick={() => {
                        const url = activeWebhookFeed ? getWebhookUrl(activeWebhookFeed) : 'https://api.titanbot.dev/webhook';
                        let code = '';
                        if (selectedSnippetTab === 'curl') {
                          code = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "title": "Alerta de Despliegue",\n    "content": "La versión v2.5 fue lanzada exitosamente a producción.",\n    "color": "#5865F2",\n    "fields": [\n      { "name": "Servicio", "value": "API Core", "inline": true },\n      { "name": "Estado", "value": "Operativo", "inline": true }\n    ]\n  }'`;
                        } else if (selectedSnippetTab === 'js') {
                          code = `await fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({\n    title: "Alerta de Despliegue",\n    content: "La versión v2.5 fue lanzada exitosamente a producción.",\n    color: "#5865F2"\n  })\n});`;
                        } else {
                          code = `import requests\n\npayload = {\n    "title": "Alerta de Despliegue",\n    "content": "La versión v2.5 fue lanzada exitosamente a producción.",\n    "color": "#5865F2"\n}\n\nresponse = requests.post("${url}", json=payload)`;
                        }
                        copyToClipboard(code);
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                      title="Copiar código"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <pre className="whitespace-pre">
                      {selectedSnippetTab === 'curl' &&
                        `curl -X POST "${activeWebhookFeed ? getWebhookUrl(activeWebhookFeed) : 'https://tu-dominio/api/webhooks/incoming'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Alerta de Despliegue",
    "content": "La versión v2.5 fue lanzada exitosamente a producción.",
    "color": "#5865F2",
    "fields": [
      { "name": "Servicio", "value": "API Core", "inline": true },
      { "name": "Estado", "value": "Operativo", "inline": true }
    ]
  }'`}
                      {selectedSnippetTab === 'js' &&
                        `await fetch("${activeWebhookFeed ? getWebhookUrl(activeWebhookFeed) : 'https://tu-dominio/api/webhooks/incoming'}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Alerta de Despliegue",
    content: "La versión v2.5 fue lanzada exitosamente a producción.",
    color: "#5865F2"
  })
});`}
                      {selectedSnippetTab === 'python' &&
                        `import requests

payload = {
    "title": "Alerta de Despliegue",
    "content": "La versión v2.5 fue lanzada exitosamente a producción.",
    "color": "#5865F2"
}

response = requests.post(
    "${activeWebhookFeed ? getWebhookUrl(activeWebhookFeed) : 'https://tu-dominio/api/webhooks/incoming'}",
    json=payload
)`}
                    </pre>
                  </div>
                </div>

                {/* Supported JSON Fields table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {t('socialFeeds.webhooksStudio.payloadTitle', 'Estructura del Payload JSON Soportado')}
                  </h3>
                  <div className="bg-discord-dark border border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Campo</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        <tr>
                          <td className="p-3 font-mono text-indigo-300">title</td>
                          <td className="p-3 text-slate-400">string</td>
                          <td className="p-3">Título principal del embed de Discord.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-indigo-300">content / description</td>
                          <td className="p-3 text-slate-400">string</td>
                          <td className="p-3">Cuerpo o descripción enriquecida con markdown.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-indigo-300">author</td>
                          <td className="p-3 text-slate-400">string</td>
                          <td className="p-3">Nombre del remitente o servicio que emite la alerta.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-indigo-300">color</td>
                          <td className="p-3 text-slate-400">string (hex)</td>
                          <td className="p-3">Color de la barra lateral del embed (ej. "#5865F2").</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-indigo-300">url</td>
                          <td className="p-3 text-slate-400">string (URL)</td>
                          <td className="p-3">Enlace al hacer clic sobre el título del anuncio.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono text-indigo-300">fields</td>
                          <td className="p-3 text-slate-400">array</td>
                          <td className="p-3">Lista de campos <code>{"[{ name, value, inline }]"}</code> (hasta 10).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Templates & Variables Studio */}
      {activeSubtab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="space-y-1 pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>{t('socialFeeds.templatesStudio.title', 'Variables y Plantillas Recomendadas')}</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl">
                {t(
                  'socialFeeds.templatesStudio.subtitle',
                  'Utiliza estas variables dinámicas en tus mensajes para enriquecer las notificaciones automáticas.'
                )}
              </p>
            </div>

            {/* Variable Tags Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('socialFeeds.templatesStudio.clickToCopy', 'Haz clic en una variable para copiarla:')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {VARIABLE_TAGS.map(({ tag, label }) => (
                  <button
                    key={tag}
                    onClick={() => copyToClipboard(tag)}
                    className="p-3 rounded-xl bg-discord-dark border border-slate-800 hover:border-discord-blurple/50 hover:bg-slate-800/60 text-left transition-all group flex items-center justify-between"
                  >
                    <div>
                      <code className="text-xs font-mono font-bold text-discord-blurple group-hover:underline">
                        {tag}
                      </code>
                      <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                    </div>
                    <Copy className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Presets Catalog */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Plantillas Probadas por Plataforma
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const presets = PRESET_TEMPLATES[platform.id] || [];
                  return (
                    <div
                      key={platform.id}
                      className="bg-discord-dark/70 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${platform.badge}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-white">{platform.name}</h4>
                      </div>

                      <div className="space-y-2">
                        {presets.map((preset) => (
                          <div
                            key={preset.name}
                            className="bg-[#1e1f22] p-3 rounded-lg border border-slate-700/40 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300">{preset.name}</span>
                              <button
                                onClick={() => copyToClipboard(preset.text)}
                                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-words">
                              {preset.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FEED MODAL WITH LIVE PREVIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-discord-blurple" />
                <h3 className="text-base font-bold text-white">
                  {formData.id
                    ? t('socialFeeds.modal.editTitle', 'Editar Alerta Social')
                    : t('socialFeeds.modal.createTitle', 'Configurar Nueva Alerta Social')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-6 overflow-y-auto flex-1">
              {/* Form Controls Column (7 cols) */}
              <form onSubmit={handleSaveFeed} id="feedForm" className="lg:col-span-7 space-y-5">
                {/* Platform Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {t('socialFeeds.modal.platform', 'Plataforma')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = formData.type === platform.id;
                      return (
                        <button
                          type="button"
                          key={platform.id}
                          onClick={() => {
                            const newType = platform.id;
                            const defaultMsg = PRESET_TEMPLATES[newType]?.[0]?.text || formData.customMessage;
                            setFormData({
                              ...formData,
                              type: newType,
                              customMessage: defaultMsg,
                            });
                          }}
                          className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? platform.activeBg
                              : 'bg-discord-dark/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-semibold">{platform.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feed Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {t('socialFeeds.modal.feedName', 'Nombre de la Fuente')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('socialFeeds.modal.feedNamePlaceholder', 'ej. Canal de YouTube Oficial')}
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
                      onChange={(e) => setFormData({ ...formData, youtubeChannelId: e.target.value.trim() })}
                      placeholder="ej. UC_x5XG1OV2P6uZZ5FSM9Ttw"
                      className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors font-mono"
                    />
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Encuéntralo en YouTube Studio &gt; Personalización &gt; Información básica &gt; ID de canal.</span>
                    </p>
                  </div>
                )}

                {formData.type === 'twitch' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Nombre de Usuario en Twitch
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.twitchUsername}
                        onChange={(e) => setFormData({ ...formData, twitchUsername: e.target.value.trim().toLowerCase() })}
                        placeholder="ej. jorge"
                        className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Notificará automáticamente cada vez que el canal comience transmisión en vivo.
                    </p>
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
                      onChange={(e) => setFormData({ ...formData, tiktokUsername: e.target.value.trim() })}
                      placeholder="ej. @touchpointsupport o touchpointsupport"
                      className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                    />
                    <p className="text-[11px] text-slate-400">
                      Notificará de nuevos videos y clips publicados en la cuenta de TikTok.
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
                      onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value.trim() })}
                      placeholder="ej. @touchpointsupport o touchpointsupport"
                      className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                    />
                    <p className="text-[11px] text-slate-400">
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
                      onChange={(e) => setFormData({ ...formData, rssFeedUrl: e.target.value.trim() })}
                      placeholder="https://ejemplo.com/rss.xml"
                      className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                    />
                    <p className="text-[11px] text-slate-400">
                      Compatible con WordPress, Medium, Reddit, Substack y sitios de noticias oficiales.
                    </p>
                  </div>
                )}

                {formData.type === 'webhook' && (
                  <div className="space-y-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Webhook className="w-4 h-4" />
                      <span>Ingesta de Webhooks Entrantes</span>
                    </span>
                    <p className="text-xs text-slate-300">
                      Al guardar, se generará una URL segura con token. Podrás enviarle peticiones POST JSON desde GitHub, Shopify, Zapier o tus propios servidores.
                    </p>
                  </div>
                )}

                {/* Destination Channel & Mention Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t('socialFeeds.modal.channel', 'Canal de Destino')}
                    </label>
                    <select
                      value={formData.targetChannelId}
                      onChange={(e) => setFormData({ ...formData, targetChannelId: e.target.value })}
                      className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                    >
                      {channels.length === 0 ? (
                        <option value="">No hay canales disponibles</option>
                      ) : (
                        channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            #{channel.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t('socialFeeds.modal.role', 'Mención de Rol')}
                    </label>
                    <select
                      value={formData.mentionRole || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, mentionRole: e.target.value || null })
                      }
                      className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                    >
                      <option value="">{t('socialFeeds.modal.noRole', 'Sin mención')}</option>
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

                {/* Custom Message & Preset Template Buttons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t('socialFeeds.modal.customMessage', 'Mensaje Personalizado')}
                    </label>

                    {/* Quick presets buttons */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-slate-500 mr-1">{t('socialFeeds.modal.presetsLabel', 'Plantillas:')}</span>
                      {(PRESET_TEMPLATES[formData.type] || []).map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyPreset(preset.text)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded border border-slate-700/60 transition-colors"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={formData.customMessage}
                    onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                    placeholder={t('socialFeeds.modal.messagePlaceholder', '{author} ha publicado nuevo contenido: {title}\n{url}')}
                    className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors font-mono text-xs"
                  />

                  {/* Variables pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-slate-500 mr-1">{t('socialFeeds.modal.availableVars', 'Variables:')}</span>
                    {VARIABLE_TAGS.map(({ tag }) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => insertTag(tag)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-discord-blurple hover:text-white text-slate-300 rounded text-[11px] border border-slate-700/60 transition-all font-mono"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {/* Real-Time Preview Column (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-discord-blurple" />
                  <span>Previsualización en Vivo</span>
                </div>

                <SocialFeedPreview
                  feedType={formData.type}
                  feedName={formData.name || (formData.type === 'twitch' ? formData.twitchUsername : formData.name)}
                  channelName={modalTargetChannel}
                  mentionRole={modalMentionRole}
                  customMessage={formData.customMessage}
                  compact={false}
                  showBadge={true}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                {t('socialFeeds.modal.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                form="feedForm"
                disabled={isSaving}
                className="px-5 py-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-discord-blurple/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('socialFeeds.modal.saving', 'Guardando...')}</span>
                  </>
                ) : (
                  <span>{t('socialFeeds.modal.save', 'Guardar Alerta')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
