import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import {
  Bot,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Edit2,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sliders,
  BookOpen,
  MessageSquare,
  Zap,
  Tag,
  Clock,
  Shield,
  Hash,
  AtSign,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

const SYSTEM_PROMPT_PRESETS = [
  {
    name: 'Soporte Amigable',
    prompt:
      'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres cordial, paciente, amigable y muy claro al explicar dudas. Utiliza la base de conocimiento para resolver preguntas frecuentes sobre canales, roles y servicios del servidor.',
  },
  {
    name: 'Gamer & Dinámico',
    prompt:
      'Eres el bot oficial de la comunidad gaming. Tu tono es relajado, divertido, enérgico y apasionado por los videojuegos, pero siempre respetuoso y útil. Utiliza emojis y formato markdown de Discord para dar vida al chat.',
  },
  {
    name: 'Moderador Formal',
    prompt:
      'Eres el Asistente Oficial de Normas y Soporte del servidor. Tu tono es formal, conciso, neutral e informativo. Responde preguntas sobre el reglamento, sanciones y canales basándote estrictamente en la base de conocimiento provista.',
  },
];

export default function AiAssistantTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Channels and Roles
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  // Config State
  const [config, setConfig] = useState({
    enabled: false,
    model: 'gemini-2.0-flash',
    systemPrompt:
      'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres amigable, servicial, conciso y respetuoso. Usa la base de conocimiento provista para responder preguntas sobre las reglas, canales y servicios del servidor.',
    allowedChannelIds: [],
    respondToMentions: true,
    ignoredRoleIds: [],
    cooldownSeconds: 10,
    maxOutputTokens: 500,
    temperature: 0.7,
    knowledgeBase: [],
  });

  // Knowledge Base Modal
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [isSavingKb, setIsSavingKb] = useState(false);
  const [kbFormData, setKbFormData] = useState({
    id: '',
    title: '',
    content: '',
    tags: '',
    enabled: true,
  });

  // Playground Simulator State
  const [playgroundPrompt, setPlaygroundPrompt] = useState('');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundChat, setPlaygroundChat] = useState([]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aiRes, channelsRes, rolesRes] = await Promise.all([
        apiFetch(`/guilds/${guildId}/aiassistant`).catch(() => ({ data: {} })),
        apiFetch(`/guilds/${guildId}/channels`).catch(() => ({ channels: [] })),
        apiFetch(`/guilds/${guildId}/roles`).catch(() => ({ roles: [] })),
      ]);

      if (aiRes.data) {
        setConfig((prev) => ({
          ...prev,
          ...aiRes.data,
          allowedChannelIds: aiRes.data.allowedChannelIds || [],
          ignoredRoleIds: aiRes.data.ignoredRoleIds || [],
          knowledgeBase: aiRes.data.knowledgeBase || [],
        }));
      }

      setChannels(channelsRes.channels?.filter((c) => c.type === 0 || c.type === 5) || []);
      setRoles(rolesRes.roles || []);
    } catch (err) {
      showNotification('error', err.message || 'Error al cargar el asistente IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guildId) {
      fetchData();
    }
  }, [guildId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/guilds/${guildId}/aiassistant`, {
        method: 'PATCH',
        body: {
          enabled: config.enabled,
          model: config.model,
          systemPrompt: config.systemPrompt,
          allowedChannelIds: config.allowedChannelIds,
          respondToMentions: config.respondToMentions,
          ignoredRoleIds: config.ignoredRoleIds,
          cooldownSeconds: Number(config.cooldownSeconds),
          maxOutputTokens: Number(config.maxOutputTokens),
          temperature: Number(config.temperature),
        },
      });

      if (res.success) {
        showNotification('success', t('aiAssistant.saveSuccess', 'Configuración de IA guardada con éxito'));
      }
    } catch (err) {
      showNotification('error', err.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChannel = (channelId) => {
    setConfig((prev) => {
      const exists = prev.allowedChannelIds.includes(channelId);
      return {
        ...prev,
        allowedChannelIds: exists
          ? prev.allowedChannelIds.filter((id) => id !== channelId)
          : [...prev.allowedChannelIds, channelId],
      };
    });
  };

  const handleOpenKbModal = (item = null) => {
    if (item) {
      setKbFormData({
        id: item.id,
        title: item.title,
        content: item.content,
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        enabled: item.enabled !== false,
      });
    } else {
      setKbFormData({
        id: '',
        title: '',
        content: '',
        tags: '',
        enabled: true,
      });
    }
    setKbModalOpen(true);
  };

  const handleSaveKbItem = async (e) => {
    e.preventDefault();
    if (!kbFormData.title.trim() || !kbFormData.content.trim()) {
      showNotification('error', 'Título y contenido son obligatorios');
      return;
    }

    setIsSavingKb(true);
    try {
      const payload = {
        id: kbFormData.id || undefined,
        title: kbFormData.title.trim(),
        content: kbFormData.content.trim(),
        tags: kbFormData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        enabled: kbFormData.enabled,
      };

      const res = await apiFetch(`/guilds/${guildId}/aiassistant/knowledge`, {
        method: 'POST',
        body: payload,
      });

      if (res.success) {
        showNotification('success', t('aiAssistant.kbSaved', 'Elemento de conocimiento guardado'));
        setKbModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showNotification('error', err.message || 'Error al guardar elemento');
    } finally {
      setIsSavingKb(false);
    }
  };

  const handleDeleteKbItem = async (id) => {
    if (!window.confirm(t('aiAssistant.kbDeleteConfirm', '¿Eliminar este elemento de la base de conocimiento?'))) {
      return;
    }

    try {
      await apiFetch(`/guilds/${guildId}/aiassistant/knowledge/${id}`, {
        method: 'DELETE',
      });
      showNotification('success', t('aiAssistant.kbDeleted', 'Elemento eliminado con éxito'));
      setConfig((prev) => ({
        ...prev,
        knowledgeBase: prev.knowledgeBase.filter((k) => k.id !== id),
      }));
    } catch (err) {
      showNotification('error', err.message || 'Error al eliminar elemento');
    }
  };

  const handlePlaygroundSubmit = async (e) => {
    e.preventDefault();
    if (!playgroundPrompt.trim() || playgroundLoading) return;

    const userQuery = playgroundPrompt.trim();
    setPlaygroundPrompt('');
    setPlaygroundChat((prev) => [...prev, { role: 'user', content: userQuery }]);
    setPlaygroundLoading(true);

    try {
      const res = await apiFetch(`/guilds/${guildId}/aiassistant/test`, {
        method: 'POST',
        body: {
          prompt: userQuery,
          customPrompt: config.systemPrompt,
        },
      });

      if (res.success && res.data) {
        setPlaygroundChat((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.response,
            latencyMs: res.data.latencyMs,
            model: res.data.model,
          },
        ]);
      }
    } catch (err) {
      setPlaygroundChat((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error al simular respuesta: ${err.message}`,
          isError: true,
        },
      ]);
    } finally {
      setPlaygroundLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Toast */}
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
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                {t('aiAssistant.title', 'Asistente IA para la Comunidad')}
              </h1>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              {t(
                'aiAssistant.subtitle',
                'Potenciado por Google Gemini con inyección contextual de las normas, canales y preguntas frecuentes (FAQ) de tu servidor de Discord.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-5 py-2.5 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-discord-blurple/20 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('common.saveChanges', 'Guardar Ajustes')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Master Enable & Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Activation Card */}
          <div className="bg-discord-darker border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold text-white">
                  {t('aiAssistant.masterStatus', 'Estado del Asistente Virtual')}
                </h2>
                <p className="text-xs text-slate-400">
                  {config.enabled
                    ? 'El asistente responderá en los canales configurados y menciones activas.'
                    : 'El asistente está apagado y no procesará mensajes en Discord.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  config.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ${
                    config.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Modelo de Inteligencia Artificial
                </label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                >
                  <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Recomendado)</option>
                  <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Cooldown por Usuario (Segundos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={config.cooldownSeconds}
                  onChange={(e) => setConfig({ ...config, cooldownSeconds: e.target.value })}
                  className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                />
              </div>
            </div>

            {/* Triggers */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-discord-blurple" />
                <span>Disparadores de Activación</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none bg-discord-dark/50 border border-slate-800/80 rounded-xl p-3.5 hover:bg-discord-dark transition-colors">
                <input
                  type="checkbox"
                  checked={config.respondToMentions}
                  onChange={(e) => setConfig({ ...config, respondToMentions: e.target.checked })}
                  className="w-4 h-4 text-discord-blurple rounded bg-slate-900 border-slate-700"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-slate-200">
                    Responder a menciones directas (@TitanBot)
                  </span>
                  <p className="text-xs text-slate-400">
                    Permite que los miembros mencionen al bot en cualquier canal de texto para hacer una consulta.
                  </p>
                </div>
              </label>

              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-300">
                  Canales Dedicados (El bot responde a todo mensaje sin requerir mención):
                </span>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-discord-dark/30 rounded-xl border border-slate-800/60">
                  {channels.map((channel) => {
                    const isSelected = config.allowedChannelIds.includes(channel.id);
                    return (
                      <button
                        type="button"
                        key={channel.id}
                        onClick={() => handleToggleChannel(channel.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-discord-blurple border-discord-blurple text-white shadow-sm'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Hash className="w-3 h-3" />
                        <span>{channel.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* System Prompt & Personality */}
          <div className="bg-discord-darker border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold text-white">
                  {t('aiAssistant.personalityTitle', 'Personalidad y Directrices (System Prompt)')}
                </h2>
                <p className="text-xs text-slate-400">
                  Define el tono, comportamiento, reglas de lenguaje y límites del bot.
                </p>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500">Plantillas:</span>
                {SYSTEM_PROMPT_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.name}
                    onClick={() => setConfig({ ...config, systemPrompt: preset.prompt })}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700/60 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              className="w-full bg-discord-dark border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-discord-blurple transition-colors leading-relaxed"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Temperatura (Creatividad):</span>
                  <span className="font-mono text-discord-blurple">{config.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-discord-blurple"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Límite de Tokens:</span>
                  <span className="font-mono text-discord-blurple">{config.maxOutputTokens}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={config.maxOutputTokens}
                  onChange={(e) => setConfig({ ...config, maxOutputTokens: parseInt(e.target.value, 10) })}
                  className="w-full accent-discord-blurple"
                />
              </div>
            </div>
          </div>

          {/* Knowledge Base Section */}
          <div className="bg-discord-darker border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-discord-blurple" />
                  <h2 className="text-base font-semibold text-white">
                    {t('aiAssistant.kbTitle', 'Base de Conocimiento del Servidor')}
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Documentos, normas, horarios y respuestas frecuentes que el bot consultará al responder.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenKbModal()}
                className="px-3.5 py-1.5 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir FAQ / Regla</span>
              </button>
            </div>

            {config.knowledgeBase.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No hay documentos de conocimiento agregados.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Agrega preguntas frecuentes o reglas para que la IA responda preguntas específicas de tu comunidad.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                {config.knowledgeBase.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-slate-800/20 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                        {item.enabled === false && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                            Desactivado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.content}</p>
                      {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          {item.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenKbModal(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteKbItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar"
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

        {/* Right Column: Live Simulator Playground */}
        <div className="space-y-4">
          <div className="bg-discord-darker border border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col h-[640px]">
            <div className="pb-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-discord-blurple" />
                <h3 className="text-sm font-semibold text-white">Simulador en Vivo</h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-discord-blurple/20 text-discord-blurple rounded-full">
                Playground
              </span>
            </div>

            {/* Chat Box */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {playgroundChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-500">
                  <Bot className="w-8 h-8 text-slate-600" />
                  <p className="text-xs">
                    Escribe una pregunta para probar cómo responde el asistente con tu configuración y base de conocimiento.
                  </p>
                </div>
              ) : (
                playgroundChat.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-discord-blurple text-white rounded-br-none'
                          : msg.isError
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-bl-none'
                          : 'bg-discord-dark text-slate-200 border border-slate-800/80 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {msg.latencyMs && (
                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {msg.latencyMs}ms • {msg.model}
                      </span>
                    )}
                  </div>
                ))
              )}

              {playgroundLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-discord-dark/50 p-2.5 rounded-xl border border-slate-800/60 w-fit">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-discord-blurple" />
                  <span>TitanBot está pensando...</span>
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handlePlaygroundSubmit} className="pt-3 border-t border-slate-800/80 flex gap-2">
              <input
                type="text"
                value={playgroundPrompt}
                onChange={(e) => setPlaygroundPrompt(e.target.value)}
                placeholder="Haz una pregunta de prueba..."
                className="flex-1 bg-discord-dark border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-discord-blurple transition-colors"
              />
              <button
                type="submit"
                disabled={playgroundLoading || !playgroundPrompt.trim()}
                className="p-2 bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-50 text-white rounded-xl transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add / Edit Knowledge Item Modal */}
      {kbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-discord-darker border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-discord-blurple" />
                <h3 className="text-base font-bold text-white">
                  {kbFormData.id ? 'Editar Elemento' : 'Añadir a la Base de Conocimiento'}
                </h3>
              </div>
              <button
                onClick={() => setKbModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKbItem} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Título / Tema
                </label>
                <input
                  type="text"
                  required
                  value={kbFormData.title}
                  onChange={(e) => setKbFormData({ ...kbFormData, title: e.target.value })}
                  placeholder="ej. Regla 1: Respeto y Convivencia"
                  className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Contenido Detallado
                </label>
                <textarea
                  rows={4}
                  required
                  value={kbFormData.content}
                  onChange={(e) => setKbFormData({ ...kbFormData, content: e.target.value })}
                  placeholder="Describe la información que el bot debe usar como fuente de verdad..."
                  className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Etiquetas (Separadas por comas)
                </label>
                <input
                  type="text"
                  value={kbFormData.tags}
                  onChange={(e) => setKbFormData({ ...kbFormData, tags: e.target.value })}
                  placeholder="reglas, soporte, horarios, vip"
                  className="w-full bg-discord-dark border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setKbModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingKb}
                  className="px-5 py-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-discord-blurple/20"
                >
                  {isSavingKb ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Elemento</span>
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
