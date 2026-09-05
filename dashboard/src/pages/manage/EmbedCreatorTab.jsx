import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { EmbedPreview } from '../../components/preview/EmbedPreview';
import {
  Send,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Palette,
  LayoutTemplate,
  FileCode,
  FolderOpen,
  Save,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  Bookmark,
} from 'lucide-react';

const COLOR_SWATCHES = [
  { name: 'Blurple', value: '#5865F2' },
  { name: 'Primary Blue', value: '#336699' },
  { name: 'Success Green', value: '#57F287' },
  { name: 'Danger Red', value: '#ED4245' },
  { name: 'Warning Gold', value: '#FEE75C' },
  { name: 'Fuchsia', value: '#EB459E' },
  { name: 'Dark Theme', value: '#202225' },
  { name: 'Pure White', value: '#FFFFFF' },
];

export function EmbedCreatorTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, currentGuild } = useGuild();

  // Channel & Sending
  const [targetChannelId, setTargetChannelId] = useState('');
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState(null);

  // Embed State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5865F2');
  const [authorName, setAuthorName] = useState('');
  const [authorIconUrl, setAuthorIconUrl] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [footerIconUrl, setFooterIconUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [image, setImage] = useState('');
  const [timestamp, setTimestamp] = useState(true);
  const [fields, setFields] = useState([]);

  // Modals & Extras
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonCopied, setJsonCopied] = useState(false);
  const [jsonError, setJsonError] = useState('');

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Set default target channel to first available text channel
  useEffect(() => {
    if (!targetChannelId && channels && channels.length > 0) {
      const firstTextChannel = channels.find((c) => c.type === 0 || c.type === 5);
      if (firstTextChannel) {
        setTargetChannelId(firstTextChannel.id);
      }
    }
  }, [channels, targetChannelId]);

  // Load custom saved templates
  const loadSavedTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await apiFetch(`/guilds/${guildId}/embeds/templates`);
      if (res.success && Array.isArray(res.templates)) {
        setSavedTemplates(res.templates);
      }
    } catch {
      // ignore non-critical load error
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadSavedTemplates();
  }, [guildId]);

  // Calculate total character count (Discord max is 6000)
  const totalCharacters =
    (title?.length || 0) +
    (description?.length || 0) +
    (authorName?.length || 0) +
    (footerText?.length || 0) +
    fields.reduce((acc, f) => acc + (f.name?.length || 0) + (f.value?.length || 0), 0);

  const hasContent = Boolean(
    title ||
    description ||
    authorName ||
    footerText ||
    thumbnail ||
    image ||
    fields.length > 0
  );

  // Reset form
  const handleReset = () => {
    setTitle('');
    setDescription('');
    setColor('#5865F2');
    setAuthorName('');
    setAuthorIconUrl('');
    setAuthorUrl('');
    setFooterText('');
    setFooterIconUrl('');
    setThumbnail('');
    setImage('');
    setTimestamp(true);
    setFields([]);
    setNotification(null);
  };

  // Field helpers
  const handleAddField = () => {
    if (fields.length >= 25) return;
    setFields([
      ...fields,
      {
        name: `${t('embeds.fieldPlaceholder', 'Campo')} ${fields.length + 1}`,
        value: t('embeds.fieldValuePlaceholder', 'Valor del campo'),
        inline: false,
      },
    ]);
  };

  const handleUpdateField = (index, key, val) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: val };
    setFields(updated);
  };

  const handleRemoveField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleMoveField = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFields(updated);
  };

  // Built-in presets
  const applyPreset = (presetKey) => {
    const serverName = currentGuild?.name || 'Comunidad';
    if (presetKey === 'announcement') {
      setTitle(`📢 Anuncio Oficial - ${serverName}`);
      setDescription('¡Saludos a todos los miembros!\n\nNos complace anunciar importantes novedades en nuestra comunidad.\n\nPor favor lee los detalles a continuación y comparte tus comentarios con el equipo de staff.');
      setColor('#5865F2');
      setAuthorName(serverName);
      setAuthorIconUrl(currentGuild?.icon || '');
      setAuthorUrl('');
      setFooterText(`TitanBot Oficial • ${serverName}`);
      setFooterIconUrl(currentGuild?.icon || '');
      setThumbnail(currentGuild?.icon || '');
      setImage('');
      setTimestamp(true);
      setFields([
        { name: '📌 Novedad Principal', value: 'Se han implementado nuevas dinámicas y roles exclusivos.', inline: false },
        { name: '🗓️ Fecha de Efecto', value: 'A partir de hoy.', inline: true },
        { name: '👥 Audiencia', value: '@everyone', inline: true },
      ]);
    } else if (presetKey === 'rules') {
      setTitle(`📜 Reglamento General de ${serverName}`);
      setDescription('Para mantener un ambiente sano, amigable y respetuoso para todos, solicitamos cumplir las siguientes directrices básicas.');
      setColor('#ED4245');
      setAuthorName(serverName);
      setAuthorIconUrl(currentGuild?.icon || '');
      setAuthorUrl('');
      setFooterText('El desconocimiento de las normas no exime de su cumplimiento.');
      setFooterIconUrl('');
      setThumbnail('');
      setImage('');
      setTimestamp(false);
      setFields([
        { name: '1. Respeto Mutuo', value: 'No se toleran insultos, acoso, discursos de odio ni discriminación.', inline: false },
        { name: '2. Cero Spam', value: 'Prohibido el flood, cadenas de mensajes y publicidad no solicitada por DM o canales.', inline: false },
        { name: '3. Canales Temáticos', value: 'Utiliza cada canal según su propósito específico.', inline: false },
      ]);
    } else if (presetKey === 'changelog') {
      setTitle(`🚀 Notas de la Versión & Actualizaciones`);
      setDescription('Resumen de cambios, mejoras y correcciones aplicadas recientemente.');
      setColor('#57F287');
      setAuthorName('Equipo de Desarrollo');
      setAuthorIconUrl('');
      setAuthorUrl('');
      setFooterText('TitanBot System Update');
      setFooterIconUrl('');
      setThumbnail('');
      setImage('');
      setTimestamp(true);
      setFields([
        { name: '✨ Nuevas Funcionalidades', value: '• Creador de Embeds WYSIWYG en Dashboard\n• Gestión de sorteos y roles automáticos', inline: false },
        { name: '⚡ Optimizaciones', value: '• Rendimiento de respuesta mejorado en 45%\n• Caché distribuida en memoria y base de datos', inline: false },
      ]);
    } else if (presetKey === 'event') {
      setTitle(`🏆 Gran Torneo de la Comunidad`);
      setDescription('¡Llegó la hora de demostrar tus habilidades! Inscríbete en nuestro próximo evento y compite por premios exclusivos.');
      setColor('#F1C40F');
      setAuthorName(serverName);
      setAuthorIconUrl(currentGuild?.icon || '');
      setAuthorUrl('');
      setFooterText('Inscripciones abiertas • ¡Buena suerte a todos!');
      setFooterIconUrl('');
      setThumbnail('');
      setImage('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80');
      setTimestamp(true);
      setFields([
        { name: '🎁 Premios', value: '🥇 1er Lugar: Rol Campeón + $50\n🥈 2do Lugar: Rol Élite + $25', inline: true },
        { name: '📅 Fecha y Hora', value: 'Próximo Sábado 20:00 UTC', inline: true },
        { name: '📝 Requisitos', value: 'Nivel 5 en el servidor o verificación completada.', inline: false },
      ]);
    }
  };

  // Export JSON
  const handleOpenJsonModal = () => {
    const jsonPayload = {
      title: title || undefined,
      description: description || undefined,
      color: color || undefined,
      author: authorName ? { name: authorName, iconUrl: authorIconUrl || undefined, url: authorUrl || undefined } : undefined,
      footer: footerText ? { text: footerText, iconUrl: footerIconUrl || undefined } : undefined,
      thumbnail: thumbnail || undefined,
      image: image || undefined,
      timestamp: timestamp,
      fields: fields.length > 0 ? fields : undefined,
    };
    setJsonInput(JSON.stringify(jsonPayload, null, 2));
    setJsonError('');
    setShowJsonModal(true);
  };

  // Import JSON
  const handleApplyJson = () => {
    try {
      setJsonError('');
      const data = JSON.parse(jsonInput);
      if (typeof data !== 'object' || data === null) {
        throw new Error('El JSON debe ser un objeto.');
      }
      if (data.title !== undefined) setTitle(String(data.title || ''));
      if (data.description !== undefined) setDescription(String(data.description || ''));
      if (data.color !== undefined) setColor(String(data.color || '#5865F2'));
      if (data.author && typeof data.author === 'object') {
        setAuthorName(data.author.name || '');
        setAuthorIconUrl(data.author.iconUrl || data.author.icon_url || '');
        setAuthorUrl(data.author.url || '');
      }
      if (data.footer && typeof data.footer === 'object') {
        setFooterText(data.footer.text || '');
        setFooterIconUrl(data.footer.iconUrl || data.footer.icon_url || '');
      }
      if (data.thumbnail !== undefined) setThumbnail(String(data.thumbnail || ''));
      if (data.image !== undefined) setImage(String(data.image || ''));
      if (data.timestamp !== undefined) setTimestamp(Boolean(data.timestamp));
      if (Array.isArray(data.fields)) {
        setFields(
          data.fields.slice(0, 25).map((f) => ({
            name: String(f.name || ''),
            value: String(f.value || ''),
            inline: Boolean(f.inline),
          }))
        );
      }
      setShowJsonModal(false);
    } catch (err) {
      setJsonError(err.message || 'Formato JSON inválido.');
    }
  };

  // Save as Custom Template
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    setSavingTemplate(true);
    try {
      const embedPayload = {
        title: title || null,
        description: description || null,
        color: color || null,
        author: authorName ? { name: authorName, iconUrl: authorIconUrl || null, url: authorUrl || null } : null,
        footer: footerText ? { text: footerText, iconUrl: footerIconUrl || null } : null,
        thumbnail: thumbnail || null,
        image: image || null,
        timestamp,
        fields,
      };

      const res = await apiFetch(`/guilds/${guildId}/embeds/templates`, {
        method: 'POST',
        body: JSON.stringify({
          name: newTemplateName.trim(),
          embed: embedPayload,
        }),
      });

      if (res.success && res.template) {
        setSavedTemplates((prev) => [...prev, res.template]);
        setNewTemplateName('');
        setNotification({
          type: 'success',
          message: t('embeds.templateSavedSuccess', 'Plantilla guardada exitosamente.'),
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('embeds.templateSaveError', 'Error al guardar la plantilla.'),
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Load a Saved Template into form
  const handleApplySavedTemplate = (template) => {
    if (!template?.embed) return;
    const emb = template.embed;
    setTitle(emb.title || '');
    setDescription(emb.description || '');
    setColor(emb.color || '#5865F2');
    setAuthorName(emb.author?.name || '');
    setAuthorIconUrl(emb.author?.iconUrl || '');
    setAuthorUrl(emb.author?.url || '');
    setFooterText(emb.footer?.text || '');
    setFooterIconUrl(emb.footer?.iconUrl || '');
    setThumbnail(emb.thumbnail || '');
    setImage(emb.image || '');
    setTimestamp(Boolean(emb.timestamp));
    setFields(Array.isArray(emb.fields) ? emb.fields : []);
    setShowTemplatesModal(false);
    setNotification({
      type: 'success',
      message: t('embeds.templateLoaded', `Plantilla "${template.name}" cargada.`),
    });
  };

  // Delete a Saved Template
  const handleDeleteTemplate = async (templateId) => {
    try {
      const res = await apiFetch(`/guilds/${guildId}/embeds/templates/${templateId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Error al eliminar la plantilla.',
      });
    }
  };

  // Send Embed to Discord
  const handleSendEmbed = async () => {
    if (!targetChannelId) {
      setNotification({
        type: 'error',
        message: t('embeds.errorSelectChannel', 'Debes seleccionar un canal de destino.'),
      });
      return;
    }

    if (!hasContent) {
      setNotification({
        type: 'error',
        message: t('embeds.errorNoContent', 'El embed debe contener al menos un título, descripción, autor, campo o imagen.'),
      });
      return;
    }

    if (totalCharacters > 6000) {
      setNotification({
        type: 'error',
        message: t('embeds.errorLimitExceeded', 'El límite total de caracteres de un embed en Discord es 6,000.'),
      });
      return;
    }

    setSending(true);
    setNotification(null);

    try {
      const payload = {
        channelId: targetChannelId,
        title: title.trim() || null,
        description: description.trim() || null,
        color: color || null,
        author: authorName.trim()
          ? {
              name: authorName.trim(),
              iconUrl: authorIconUrl.trim() || null,
              url: authorUrl.trim() || null,
            }
          : null,
        footer: footerText.trim()
          ? {
              text: footerText.trim(),
              iconUrl: footerIconUrl.trim() || null,
            }
          : null,
        thumbnail: thumbnail.trim() || null,
        image: image.trim() || null,
        timestamp,
        fields: fields.map((f) => ({
          name: f.name.trim(),
          value: f.value.trim(),
          inline: Boolean(f.inline),
        })),
      };

      const res = await apiFetch(`/guilds/${guildId}/embeds/send`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('embeds.sendSuccess', '¡Embed publicado exitosamente en Discord!'),
          messageUrl: res.messageUrl,
          channelName: res.channelName,
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('embeds.sendError', 'Error al enviar el embed a Discord.'),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <LayoutTemplate className="w-6 h-6 text-discord-blurple" />
            <span>{t('embeds.title', 'Creador de Embeds (WYSIWYG)')}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {t('embeds.subtitle', 'Diseña comunicados y anuncios ricos para Discord con vista previa en vivo y publicación directa.')}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Presets dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>{t('embeds.presets', 'Plantillas Rápidas')}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-discord-dark border border-slate-700 rounded-lg shadow-xl py-1 z-30 hidden group-hover:block">
              <button
                type="button"
                onClick={() => applyPreset('announcement')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-discord-blurple hover:text-white transition"
              >
                📢 {t('embeds.presetAnnouncement', 'Anuncio Oficial')}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('rules')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-discord-blurple hover:text-white transition"
              >
                📜 {t('embeds.presetRules', 'Reglamento del Servidor')}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('changelog')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-discord-blurple hover:text-white transition"
              >
                🚀 {t('embeds.presetChangelog', 'Novedades / Update')}
              </button>
              <button
                type="button"
                onClick={() => applyPreset('event')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-discord-blurple hover:text-white transition"
              >
                🏆 {t('embeds.presetEvent', 'Evento de Comunidad')}
              </button>
            </div>
          </div>

          {/* Saved Templates Drawer Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('embeds.savedTemplates', 'Mis Plantillas')} ({savedTemplates.length})</span>
          </button>

          {/* JSON Export/Import */}
          <button
            type="button"
            onClick={handleOpenJsonModal}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>JSON</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700/60"
            title={t('embeds.resetTooltip', 'Limpiar todos los campos')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('common.reset', 'Reiniciar')}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between gap-3 border shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold">{notification.message}</p>
              {notification.messageUrl && (
                <a
                  href={notification.messageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline mt-1 font-medium"
                >
                  <span>{t('embeds.viewInDiscord', 'Ver mensaje en')} #{notification.channelName}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Studio Grid: Left Builder (7 cols) + Right Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Channel & Main Publish Trigger */}
          <div className="bg-discord-dark/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Send className="w-4 h-4 text-discord-blurple" />
              <span>{t('embeds.destinationTitle', 'Destino y Publicación')}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-7 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('embeds.channelLabel', 'Canal de Destino')} <span className="text-red-400">*</span>
                </label>
                <ChannelSelect
                  channels={channels || []}
                  value={targetChannelId}
                  onChange={setTargetChannelId}
                  placeholder={t('embeds.selectChannelPlaceholder', 'Seleccionar canal de texto o anuncios...')}
                />
              </div>

              <div className="sm:col-span-5">
                <button
                  type="button"
                  onClick={handleSendEmbed}
                  disabled={sending || !hasContent || !targetChannelId}
                  className="w-full py-2.5 px-4 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-discord-blurple/25 transition active:scale-98"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('embeds.sendingBtn', 'Publicando...')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t('embeds.publishBtn', 'Publicar en Discord')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Basic Information & Color */}
          <div className="bg-discord-dark/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Palette className="w-4 h-4 text-discord-blurple" />
              <span>{t('embeds.basicSectionTitle', 'Contenido Principal')}</span>
            </h2>

            {/* Title */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">
                  {t('embeds.fieldTitle', 'Título del Embed')}
                </label>
                <span className={`text-[11px] ${title.length > 256 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                  {title.length}/256
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={256}
                placeholder={t('embeds.titlePlaceholder', 'Ej. 📢 Novedades de la Semana')}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">
                  {t('embeds.fieldDescription', 'Descripción (Soporta Markdown)')}
                </label>
                <span className={`text-[11px] ${description.length > 4096 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                  {description.length}/4096
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4096}
                rows={4}
                placeholder={t('embeds.descriptionPlaceholder', 'Escribe el cuerpo del anuncio. Puedes usar **negrita**, *cursiva*, `código`, o listas...')}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition resize-y font-sans leading-relaxed"
              />
            </div>

            {/* Color Picker & Swatches */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{t('embeds.colorLabel', 'Color de la Barra Lateral')}</span>
                <span className="font-mono text-[11px] text-slate-400">{color}</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {/* Custom Color Input */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1">
                  <input
                    type="color"
                    value={color.startsWith('#') && color.length === 7 ? color : '#5865F2'}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    maxLength={7}
                    placeholder="#5865F2"
                    className="w-20 bg-transparent text-xs text-white font-mono focus:outline-none uppercase"
                  />
                </div>

                {/* Preset Swatches */}
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    onClick={() => setColor(swatch.value)}
                    className={`w-7 h-7 rounded-lg border transition transform hover:scale-110 shadow-sm ${
                      color.toLowerCase() === swatch.value.toLowerCase()
                        ? 'border-white ring-2 ring-discord-blurple/50'
                        : 'border-slate-700/80'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Author & Footer */}
          <div className="bg-discord-dark/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              {t('embeds.authorFooterTitle', 'Autor, Pie de Página y Fecha')}
            </h2>

            {/* Author */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('embeds.authorName', 'Nombre del Autor')}
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  maxLength={256}
                  placeholder={currentGuild?.name || 'Autor'}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('embeds.authorIcon', 'Icono del Autor (URL)')}
                </label>
                <input
                  type="url"
                  value={authorIconUrl}
                  onChange={(e) => setAuthorIconUrl(e.target.value)}
                  placeholder="https://ejemplo.com/icono.png"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('embeds.authorUrl', 'Enlace del Autor (URL)')}
                </label>
                <input
                  type="url"
                  value={authorUrl}
                  onChange={(e) => setAuthorUrl(e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                />
              </div>
            </div>

            {/* Footer and Timestamp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('embeds.footerText', 'Texto de Pie de Página')}
                </label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  maxLength={2048}
                  placeholder={t('embeds.footerPlaceholder', 'Ej. Servidor Oficial • Soporte 24/7')}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('embeds.footerIcon', 'Icono de Pie de Página (URL)')}
                </label>
                <input
                  type="url"
                  value={footerIconUrl}
                  onChange={(e) => setFooterIconUrl(e.target.value)}
                  placeholder="https://ejemplo.com/footer.png"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                />
              </div>
            </div>

            {/* Timestamp Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-200">
                  {t('embeds.timestampLabel', 'Incluir Marca de Tiempo Actual (Timestamp)')}
                </span>
                <p className="text-[11px] text-slate-500">
                  {t('embeds.timestampDesc', 'Muestra la fecha y hora de emisión al final del embed')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={timestamp}
                  onChange={(e) => setTimestamp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-discord-blurple"></div>
              </label>
            </div>
          </div>

          {/* Section 3: Media (Images) */}
          <div className="bg-discord-dark/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              {t('embeds.mediaTitle', 'Imágenes y Miniaturas')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('embeds.thumbnailLabel', 'Miniatura / Thumbnail (URL)')}
                </label>
                <input
                  type="url"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                />
                <p className="text-[11px] text-slate-500">
                  {t('embeds.thumbnailDesc', 'Se muestra en la esquina superior derecha del embed.')}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('embeds.imageLabel', 'Imagen Grande / Banner (URL)')}
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://ejemplo.com/banner.png"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                />
                <p className="text-[11px] text-slate-500">
                  {t('embeds.imageDesc', 'Se muestra en tamaño completo en la parte inferior.')}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic Fields Builder */}
          <div className="bg-discord-dark/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  {t('embeds.fieldsTitle', 'Campos Dinámicos')} ({fields.length}/25)
                </h2>
                <p className="text-[11px] text-slate-500">
                  {t('embeds.fieldsSubtitle', 'Agrupa información en bloques o columnas paralelas')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddField}
                disabled={fields.length >= 25}
                className="px-3 py-1.5 rounded-lg bg-discord-blurple/20 text-discord-blurple hover:bg-discord-blurple hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('embeds.addFieldBtn', 'Añadir Campo')}</span>
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="py-6 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                {t('embeds.noFieldsMsg', 'No hay campos añadidos. Haz clic en "Añadir Campo" para estructurar tu mensaje.')}
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-900/80 border border-slate-700/70 rounded-xl space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={field.inline}
                            onChange={(e) => handleUpdateField(index, 'inline', e.target.checked)}
                            className="rounded border-slate-700 bg-slate-800 text-discord-blurple focus:ring-0 w-3.5 h-3.5"
                          />
                          <span>{t('embeds.inlineCheckbox', 'En línea (Inline)')}</span>
                        </label>
                      </div>

                      {/* Field Reorder & Delete Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('common.moveUp', 'Subir')}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, 1)}
                          disabled={index === fields.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('common.moveDown', 'Bajar')}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="p-1 text-slate-400 hover:text-red-400 ml-1 transition"
                          title={t('common.delete', 'Eliminar campo')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleUpdateField(index, 'name', e.target.value)}
                          maxLength={256}
                          placeholder={t('embeds.fieldNamePlaceholder', 'Nombre del campo')}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleUpdateField(index, 'value', e.target.value)}
                          maxLength={1024}
                          placeholder={t('embeds.fieldValPlaceholder', 'Valor / Contenido')}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Discord Mockup & Character Stats */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          {/* Character Budget Counter */}
          <div className="bg-discord-dark/90 p-4 rounded-2xl border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                {t('embeds.charBudgetTitle', 'Presupuesto de Caracteres')}
              </span>
              <span
                className={`font-mono font-bold ${
                  totalCharacters > 6000 ? 'text-red-400' : totalCharacters > 5000 ? 'text-yellow-400' : 'text-slate-400'
                }`}
              >
                {totalCharacters.toLocaleString()} / 6,000
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  totalCharacters > 6000 ? 'bg-red-500' : totalCharacters > 5000 ? 'bg-yellow-400' : 'bg-discord-blurple'
                }`}
                style={{ width: `${Math.min(100, (totalCharacters / 6000) * 100)}%` }}
              />
            </div>
          </div>

          {/* Discord Live Preview */}
          <EmbedPreview
            title={title}
            description={description}
            color={color}
            author={authorName ? { name: authorName, iconUrl: authorIconUrl, url: authorUrl } : null}
            footer={footerText ? { text: footerText, iconUrl: footerIconUrl } : null}
            thumbnail={thumbnail}
            image={image}
            timestamp={timestamp}
            fields={fields}
          />
        </div>
      </div>

      {/* JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-discord-dark border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <span>{t('embeds.jsonModalTitle', 'Exportar / Importar JSON')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <p className="text-xs text-slate-400">
                {t('embeds.jsonModalDesc', 'Puedes copiar el JSON actual para usarlo con webhooks o bots, o pegar un JSON existente para cargarlo en el editor.')}
              </p>

              {jsonError && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                  {jsonError}
                </div>
              )}

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-discord-blurple"
              />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonInput);
                  setJsonCopied(true);
                  setTimeout(() => setJsonCopied(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {jsonCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{jsonCopied ? t('common.copied', '¡Copiado!') : t('common.copy', 'Copiar JSON')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md"
                >
                  {t('embeds.applyJsonBtn', 'Cargar en el Editor')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Custom Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-discord-dark border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-400" />
                <span>{t('embeds.templatesModalTitle', 'Plantillas Guardadas del Servidor')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Save current form as template */}
              <form onSubmit={handleSaveTemplate} className="space-y-2 p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl">
                <label className="text-xs font-semibold text-slate-200 block">
                  {t('embeds.saveAsTemplateLabel', 'Guardar diseño actual como nueva plantilla')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    maxLength={100}
                    placeholder={t('embeds.templateNamePlaceholder', 'Nombre de la plantilla (ej. Anuncio de Torneo)')}
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-discord-blurple"
                  />
                  <button
                    type="submit"
                    disabled={savingTemplate || !newTemplateName.trim() || !hasContent}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{t('common.save', 'Guardar')}</span>
                  </button>
                </div>
              </form>

              {/* List of templates */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('embeds.existingTemplates', 'Plantillas Disponibles')} ({savedTemplates.length})
                </h4>

                {templatesLoading ? (
                  <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common.loading', 'Cargando plantillas...')}</span>
                  </div>
                ) : savedTemplates.length === 0 ? (
                  <div className="py-8 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                    {t('embeds.noTemplates', 'No tienes plantillas guardadas aún. Guarda tu diseño actual arriba.')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {savedTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="min-w-0">
                          <h5 className="font-semibold text-sm text-white truncate">{template.name}</h5>
                          <p className="text-[11px] text-slate-400 truncate">
                            {template.embed?.title || template.embed?.description || 'Sin título'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApplySavedTemplate(template)}
                            className="px-3 py-1.5 rounded-lg bg-discord-blurple/20 text-discord-blurple hover:bg-discord-blurple hover:text-white text-xs font-semibold transition"
                          >
                            {t('embeds.loadBtn', 'Cargar')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                            title={t('common.delete', 'Eliminar plantilla')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                {t('common.close', 'Cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
