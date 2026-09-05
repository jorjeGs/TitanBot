import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Zap,
  Pin,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Play,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Hash,
  Shield,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import AutomationPreview from '../../components/preview/AutomationPreview';

const DISCORD_SWATCHES = [
  { name: 'Blurple', value: '#5865F2' },
  { name: 'Green', value: '#57F287' },
  { name: 'Yellow', value: '#FEE75C' },
  { name: 'Fuchsia', value: '#EB459E' },
  { name: 'Red', value: '#ED4245' },
  { name: 'Dark', value: '#2B2D31' },
];

const VARIABLE_PILLS = [
  { tag: '{server}', label: 'Servidor' },
  { tag: '{channel}', label: 'Canal' },
  { tag: '{user}', label: 'Usuario (@)' },
  { tag: '{username}', label: 'Nombre' },
  { tag: '{memberCount}', label: 'Miembros' },
];

export default function AutomationsTab() {
  const { guildId } = useParams();
  const { t } = useTranslation();

  // Active Sub-tab
  const [subTab, setSubTab] = useState('sticky'); // 'sticky' | 'scheduled' | 'autoresponder'

  // Data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stickyList, setStickyList] = useState([]);
  const [scheduledList, setScheduledList] = useState([]);
  const [autoResponders, setAutoResponders] = useState([]);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // Modals & Form states
  const [stickyModalOpen, setStickyModalOpen] = useState(false);
  const [editingSticky, setEditingSticky] = useState({
    id: '',
    channelId: '',
    enabled: true,
    type: 'text',
    content: '',
    embed: { title: '', description: '', color: '#5865F2', footer: '', image: '', thumbnail: '' },
    messageCountThreshold: 3,
    cooldownSeconds: 5,
  });

  const [scheduledModalOpen, setScheduledModalOpen] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState({
    id: '',
    name: '',
    channelId: '',
    enabled: true,
    type: 'text',
    content: '',
    embed: { title: '', description: '', color: '#5865F2', footer: '', image: '', thumbnail: '' },
    scheduleType: 'daily',
    intervalHours: 24,
    timeOfDay: '12:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    cronExpression: '0 12 * * *',
  });

  const [arModalOpen, setArModalOpen] = useState(false);
  const [editingAr, setEditingAr] = useState({
    id: '',
    trigger: '',
    matchType: 'contains',
    caseSensitive: false,
    replyType: 'channel',
    type: 'text',
    content: '',
    embed: { title: '', description: '', color: '#5865F2', footer: '', image: '', thumbnail: '' },
    enabled: true,
    allowedChannels: [],
    ignoredRoles: [],
    cooldownSeconds: 5,
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [autoRes, chRes, rlRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/automations`, { credentials: 'include' }).then((r) => r.json()),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }).then((r) => r.json()),
          fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }).then((r) => r.json()),
        ]);

        if (autoRes.success) {
          setStickyList(autoRes.data.stickyMessages || []);
          setScheduledList(autoRes.data.scheduledMessages || []);
          setAutoResponders(autoRes.data.autoResponders || []);
        }

        const validChannels = (chRes.data || []).filter((c) => c.type === 0 || c.type === 'GUILD_TEXT');
        setChannels(validChannels);
        setRoles(rlRes.data || []);

        if (validChannels.length > 0) {
          setEditingSticky((prev) => ({ ...prev, channelId: validChannels[0].id }));
          setEditingScheduled((prev) => ({ ...prev, channelId: validChannels[0].id }));
        }
      } catch (err) {
        showToast(t('automations.errors.loadFailed', 'Error al cargar datos de automatizaciones'), 'error');
      } finally {
        setLoading(false);
      }
    }

    if (guildId) {
      loadData();
    }
  }, [guildId]);

  // Handler to toggle Sticky message on/off
  const toggleStickyEnabled = async (item) => {
    const updated = { ...item, enabled: !item.enabled };
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/sticky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated),
      }).then((r) => r.json());

      if (res.success) {
        setStickyList((prev) => prev.map((s) => (s.id === item.id ? updated : s)));
        showToast(t('automations.success.saved', 'Configuración guardada'));
      }
    } catch {
      showToast(t('automations.errors.saveFailed', 'Error al guardar'), 'error');
    }
  };

  // Handler to delete Sticky message
  const deleteSticky = async (id) => {
    if (!window.confirm(t('automations.confirmDelete', '¿Deseas eliminar esta automatización?'))) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/sticky/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((r) => r.json());

      if (res.success) {
        setStickyList((prev) => prev.filter((s) => s.id !== id));
        showToast(t('automations.success.deleted', 'Sticky message eliminado'));
      }
    } catch {
      showToast(t('automations.errors.deleteFailed', 'Error al eliminar'), 'error');
    }
  };

  // Save Sticky Modal
  const saveStickyModal = async () => {
    if (!editingSticky.channelId) {
      showToast(t('automations.errors.channelRequired', 'Selecciona un canal válido'), 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/guilds/${guildId}/automations/sticky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingSticky),
      }).then((r) => r.json());

      if (res.success) {
        setStickyList((prev) => {
          const idx = prev.findIndex((s) => s.id === res.data.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = res.data;
            return copy;
          }
          return [...prev, res.data];
        });
        setStickyModalOpen(false);
        showToast(t('automations.success.saved', 'Sticky message guardado con éxito'));
      } else {
        showToast(res.error || t('automations.errors.saveFailed', 'Error al guardar'), 'error');
      }
    } catch {
      showToast(t('automations.errors.saveFailed', 'Error al guardar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handler to toggle Scheduled message
  const toggleScheduledEnabled = async (item) => {
    const updated = { ...item, enabled: !item.enabled };
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated),
      }).then((r) => r.json());

      if (res.success) {
        setScheduledList((prev) => prev.map((s) => (s.id === item.id ? updated : s)));
        showToast(t('automations.success.saved', 'Configuración guardada'));
      }
    } catch {
      showToast(t('automations.errors.saveFailed', 'Error al guardar'), 'error');
    }
  };

  // Delete Scheduled message
  const deleteScheduled = async (id) => {
    if (!window.confirm(t('automations.confirmDelete', '¿Deseas eliminar este aviso?'))) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/scheduled/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((r) => r.json());

      if (res.success) {
        setScheduledList((prev) => prev.filter((s) => s.id !== id));
        showToast(t('automations.success.deleted', 'Aviso eliminado'));
      }
    } catch {
      showToast(t('automations.errors.deleteFailed', 'Error al eliminar'), 'error');
    }
  };

  // Test trigger Scheduled message now
  const triggerScheduledNow = async (id) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/scheduled/${id}/trigger`, {
        method: 'POST',
        credentials: 'include',
      }).then((r) => r.json());

      if (res.success) {
        showToast(t('automations.success.dispatched', '¡Aviso enviado a Discord con éxito!'));
      } else {
        showToast(res.error || t('automations.errors.dispatchFailed', 'Error al enviar aviso'), 'error');
      }
    } catch {
      showToast(t('automations.errors.dispatchFailed', 'Error al enviar aviso'), 'error');
    }
  };

  // Save Scheduled Modal
  const saveScheduledModal = async () => {
    if (!editingScheduled.name || !editingScheduled.channelId) {
      showToast(t('automations.errors.fieldsRequired', 'Completa el nombre y canal'), 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/guilds/${guildId}/automations/scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingScheduled),
      }).then((r) => r.json());

      if (res.success) {
        setScheduledList((prev) => {
          const idx = prev.findIndex((s) => s.id === res.data.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = res.data;
            return copy;
          }
          return [...prev, res.data];
        });
        setScheduledModalOpen(false);
        showToast(t('automations.success.saved', 'Aviso programado guardado'));
      } else {
        showToast(res.error || t('automations.errors.saveFailed', 'Error al guardar'), 'error');
      }
    } catch {
      showToast(t('automations.errors.saveFailed', 'Error al guardar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle AutoResponder
  const toggleArEnabled = async (item) => {
    const updated = { ...item, enabled: !item.enabled };
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/auto-responders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated),
      }).then((r) => r.json());

      if (res.success) {
        setAutoResponders((prev) => prev.map((s) => (s.id === item.id ? updated : s)));
        showToast(t('automations.success.saved', 'Configuración guardada'));
      }
    } catch {
      showToast(t('automations.errors.saveFailed', 'Error al guardar'), 'error');
    }
  };

  // Delete AutoResponder
  const deleteAr = async (id) => {
    if (!window.confirm(t('automations.confirmDelete', '¿Deseas eliminar este disparador?'))) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/auto-responders/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((r) => r.json());

      if (res.success) {
        setAutoResponders((prev) => prev.filter((s) => s.id !== id));
        showToast(t('automations.success.deleted', 'Auto-responder eliminado'));
      }
    } catch {
      showToast(t('automations.errors.deleteFailed', 'Error al eliminar'), 'error');
    }
  };

  // Save AutoResponder Modal
  const saveArModal = async () => {
    if (!editingAr.trigger) {
      showToast(t('automations.errors.triggerRequired', 'Ingresa una palabra o frase disparadora'), 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/guilds/${guildId}/automations/auto-responders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingAr),
      }).then((r) => r.json());

      if (res.success) {
        setAutoResponders((prev) => {
          const idx = prev.findIndex((s) => s.id === res.data.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = res.data;
            return copy;
          }
          return [...prev, res.data];
        });
        setArModalOpen(false);
        showToast(t('automations.success.saved', 'Auto-responder guardado'));
      } else {
        showToast(res.error || t('automations.errors.saveFailed', 'Error al guardar'), 'error');
      }
    } catch {
      showToast(t('automations.errors.saveFailed', 'Error al guardar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const getChannelName = (id) => {
    const ch = channels.find((c) => c.id === id);
    return ch ? ch.name : 'canal';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white text-sm animate-fade-in ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {t('automations.title', 'Automatizaciones & Mensajería Dinámica')}
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO 1.1
              </span>
            </h1>
            <p className="text-sm text-zinc-400">
              {t('automations.subtitle', 'Configura mensajes fijados, avisos programados y respuestas automáticas inteligentes')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setSubTab('sticky')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all border-b-2 ${
            subTab === 'sticky'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Pin className="w-4 h-4" />
          <span>{t('automations.tabs.sticky', 'Sticky Messages')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 ml-1">
            {stickyList.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('scheduled')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all border-b-2 ${
            subTab === 'scheduled'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('automations.tabs.scheduled', 'Avisos Programados')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 ml-1">
            {scheduledList.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('autoresponder')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all border-b-2 ${
            subTab === 'autoresponder'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t('automations.tabs.autoresponder', 'Auto-Responders')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 ml-1">
            {autoResponders.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. STICKY MESSAGES SUB-TAB                                                */}
      {/* ========================================================================= */}
      {subTab === 'sticky' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                {t('automations.sticky.heading', 'Mensajes Fijados Dinámicos')}
              </h2>
              <p className="text-xs text-zinc-400">
                {t(
                  'automations.sticky.description',
                  'Permanece siempre al final del canal. Cuando los miembros conversan, el bot elimina el mensaje anterior y re-publica el nuevo automáticamente.'
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSticky({
                  id: '',
                  channelId: channels[0]?.id || '',
                  enabled: true,
                  type: 'text',
                  content: '📌 **Reglas del Canal**\nPor favor mantén el respeto y no hagas spam.',
                  embed: { title: '📌 Normas del Canal', description: 'Reglas y enlaces útiles para este canal.', color: '#5865F2', footer: '', image: '', thumbnail: '' },
                  messageCountThreshold: 3,
                  cooldownSeconds: 5,
                });
                setStickyModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('automations.sticky.btnNew', 'Nuevo Sticky Message')}
            </button>
          </div>

          {stickyList.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
              <Pin className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">
                {t('automations.sticky.empty', 'No tienes mensajes fijados configurados')}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {t('automations.sticky.emptyHint', 'Crea uno para mantener avisos y normas visibles en tus canales más activos.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stickyList.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-indigo-400" />
                        <span className="font-semibold text-white">#{getChannelName(item.channelId)}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {item.type === 'embed' ? 'Rich Embed' : 'Texto'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {t('automations.sticky.thresholdLabel', 'Re-fijar cada')} {item.messageCountThreshold || 3} {t('automations.sticky.messages', 'mensajes')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStickyEnabled(item)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          item.enabled ? 'bg-indigo-600' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            item.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-lg text-xs text-zinc-300 line-clamp-2 border border-white/5">
                    {item.type === 'embed' ? item.embed?.description || item.embed?.title : item.content}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <span className="text-[11px] text-zinc-500">
                      ID: <code className="text-zinc-400">{item.id.slice(0, 10)}...</code>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSticky(item);
                          setStickyModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSticky(item.id)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SCHEDULED MESSAGES SUB-TAB                                             */}
      {/* ========================================================================= */}
      {subTab === 'scheduled' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                {t('automations.scheduled.heading', 'Avisos y Anuncios Programados')}
              </h2>
              <p className="text-xs text-zinc-400">
                {t(
                  'automations.scheduled.description',
                  'Difunde recordatorios periódicos (diarios, cada X horas o en días específicos) automáticamente sin tocar el bot.'
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingScheduled({
                  id: '',
                  name: 'Aviso de Evento',
                  channelId: channels[0]?.id || '',
                  enabled: true,
                  type: 'text',
                  content: '⏰ **¡Recordatorio de Comunidad!**\nNo olvides reclamar tu recompensa diaria con `/daily`.',
                  embed: { title: '⏰ Recordatorio', description: '¡Reclama tu `/daily` diario!', color: '#5865F2', footer: '', image: '', thumbnail: '' },
                  scheduleType: 'daily',
                  intervalHours: 24,
                  timeOfDay: '18:00',
                  daysOfWeek: [1, 3, 5],
                  cronExpression: '0 18 * * *',
                });
                setScheduledModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('automations.scheduled.btnNew', 'Programar Nuevo Aviso')}
            </button>
          </div>

          {scheduledList.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
              <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">
                {t('automations.scheduled.empty', 'No tienes avisos programados')}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {t('automations.scheduled.emptyHint', 'Crea anuncios recurrentes para mantener activa a tu comunidad.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledList.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{item.name}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.scheduleType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <Hash className="w-3.5 h-3.5 text-zinc-500" />
                        <span>#{getChannelName(item.channelId)}</span>
                        <span>•</span>
                        <span>
                          {item.scheduleType === 'interval'
                            ? `Cada ${item.intervalHours}h`
                            : `${item.timeOfDay || '12:00'} UTC`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleScheduledEnabled(item)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          item.enabled ? 'bg-indigo-600' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            item.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-lg text-xs text-zinc-300 line-clamp-2 border border-white/5">
                    {item.type === 'embed' ? item.embed?.description || item.embed?.title : item.content}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <button
                      onClick={() => triggerScheduledNow(item.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-indigo-400 font-medium transition"
                      title={t('automations.scheduled.btnTest', 'Probar envío a Discord')}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {t('automations.scheduled.btnTestShort', 'Probar ahora')}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingScheduled(item);
                          setScheduledModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteScheduled(item.id)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUTO-RESPONDERS SUB-TAB                                                */}
      {/* ========================================================================= */}
      {subTab === 'autoresponder' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                {t('automations.ar.heading', 'Respuestas Automáticas & Triggers')}
              </h2>
              <p className="text-xs text-zinc-400">
                {t(
                  'automations.ar.description',
                  'Cuando un usuario escriba una frase clave en el chat, TitanBot responderá instantáneamente en el canal o por mensaje directo (DM).'
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAr({
                  id: '',
                  trigger: 'como entro al servidor',
                  matchType: 'contains',
                  caseSensitive: false,
                  replyType: 'channel',
                  type: 'text',
                  content: '👋 ¡Hola {user}! Para entrar y verificarte, por favor visita el canal de bienvenida.',
                  embed: { title: 'Ayuda de Acceso', description: 'Visita el canal de verificación para obtener tu rol.', color: '#5865F2', footer: '', image: '', thumbnail: '' },
                  enabled: true,
                  allowedChannels: [],
                  ignoredRoles: [],
                  cooldownSeconds: 5,
                });
                setArModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('automations.ar.btnNew', 'Nueva Regla de Auto-Respuesta')}
            </button>
          </div>

          {autoResponders.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
              <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">
                {t('automations.ar.empty', 'No tienes respuestas automáticas configuradas')}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {t('automations.ar.emptyHint', 'Automatiza dudas frecuentes de tu comunidad con respuestas en canal o por DM.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {autoResponders.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded border border-white/5 font-bold">
                          "{item.trigger}"
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {item.matchType}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {item.replyType === 'dm' ? 'DM' : 'Canal'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {t('automations.ar.cooldown', 'Enfriamiento:')} {item.cooldownSeconds}s • {item.allowedChannels?.length ? `${item.allowedChannels.length} canales` : 'Todos los canales'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleArEnabled(item)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          item.enabled ? 'bg-indigo-600' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            item.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 p-3 rounded-lg text-xs text-zinc-300 line-clamp-2 border border-white/5">
                    {item.type === 'embed' ? item.embed?.description || item.embed?.title : item.content}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <span className="text-[11px] text-zinc-500">
                      ID: <code className="text-zinc-400">{item.id.slice(0, 10)}...</code>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingAr(item);
                          setArModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAr(item.id)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT / CREATE STICKY MESSAGE                                     */}
      {/* ========================================================================= */}
      {stickyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Pin className="w-5 h-5 text-indigo-400" />
                {editingSticky.id ? t('automations.sticky.editTitle', 'Editar Sticky Message') : t('automations.sticky.newTitle', 'Nuevo Sticky Message')}
              </h3>
              <button
                onClick={() => setStickyModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Side */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {t('automations.form.channel', 'Canal de Discord')}
                  </label>
                  <select
                    value={editingSticky.channelId}
                    onChange={(e) => setEditingSticky({ ...editingSticky, channelId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.sticky.thresholdInput', 'Umbral de Mensajes')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingSticky.messageCountThreshold}
                      onChange={(e) =>
                        setEditingSticky({ ...editingSticky, messageCountThreshold: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      {t('automations.sticky.thresholdHint', 'Re-fijar cada N mensajes')}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.form.cooldown', 'Cooldown (segundos)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={editingSticky.cooldownSeconds}
                      onChange={(e) =>
                        setEditingSticky({ ...editingSticky, cooldownSeconds: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      {t('automations.form.cooldownHint', 'Anti-ráfagas de chat')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {t('automations.form.formatType', 'Formato del Mensaje')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSticky({ ...editingSticky, type: 'text' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        editingSticky.type === 'text'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('automations.form.typeText', 'Texto Plano')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSticky({ ...editingSticky, type: 'embed' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        editingSticky.type === 'embed'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('automations.form.typeEmbed', 'Rich Embed')}
                    </button>
                  </div>
                </div>

                {/* Variable Pills */}
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1.5 font-medium">
                    {t('automations.form.variables', 'Variables disponibles (haz clic para insertar):')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLE_PILLS.map((p) => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => {
                          if (editingSticky.type === 'embed') {
                            setEditingSticky({
                              ...editingSticky,
                              embed: {
                                ...editingSticky.embed,
                                description: (editingSticky.embed?.description || '') + ' ' + p.tag,
                              },
                            });
                          } else {
                            setEditingSticky({
                              ...editingSticky,
                              content: (editingSticky.content || '') + ' ' + p.tag,
                            });
                          }
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-[11px] px-2 py-0.5 rounded border border-white/5 transition"
                      >
                        {p.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content or Embed Inputs */}
                {editingSticky.type === 'text' ? (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.form.content', 'Contenido del Mensaje')}
                    </label>
                    <textarea
                      rows={5}
                      value={editingSticky.content}
                      onChange={(e) => setEditingSticky({ ...editingSticky, content: e.target.value })}
                      placeholder="Escribe el mensaje fijado..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {t('automations.form.embedTitle', 'Título del Embed')}
                      </label>
                      <input
                        type="text"
                        value={editingSticky.embed?.title || ''}
                        onChange={(e) =>
                          setEditingSticky({
                            ...editingSticky,
                            embed: { ...editingSticky.embed, title: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {t('automations.form.embedDesc', 'Descripción del Embed')}
                      </label>
                      <textarea
                        rows={3}
                        value={editingSticky.embed?.description || ''}
                        onChange={(e) =>
                          setEditingSticky({
                            ...editingSticky,
                            embed: { ...editingSticky.embed, description: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {t('automations.form.color', 'Color de Borde')}
                      </label>
                      <div className="flex items-center gap-2">
                        {DISCORD_SWATCHES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() =>
                              setEditingSticky({
                                ...editingSticky,
                                embed: { ...editingSticky.embed, color: s.value },
                              })
                            }
                            style={{ backgroundColor: s.value }}
                            className={`w-6 h-6 rounded-full border-2 transition ${
                              editingSticky.embed?.color === s.value ? 'border-white scale-110' : 'border-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Side */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t('automations.preview.title', 'Previsualización en Vivo de Discord')}
                </label>
                <AutomationPreview
                  channelName={getChannelName(editingSticky.channelId)}
                  type={editingSticky.type}
                  content={editingSticky.content}
                  embed={editingSticky.embed}
                  previewMode="sticky"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
              <button
                onClick={() => setStickyModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={saveStickyModal}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT / CREATE SCHEDULED MESSAGE                                  */}
      {/* ========================================================================= */}
      {scheduledModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                {editingScheduled.id ? t('automations.scheduled.editTitle', 'Editar Aviso') : t('automations.scheduled.newTitle', 'Programar Nuevo Aviso')}
              </h3>
              <button
                onClick={() => setScheduledModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Side */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {t('automations.scheduled.nameLabel', 'Nombre del Aviso')}
                  </label>
                  <input
                    type="text"
                    value={editingScheduled.name}
                    onChange={(e) => setEditingScheduled({ ...editingScheduled, name: e.target.value })}
                    placeholder="Ej. Recordatorio /daily"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {t('automations.form.channel', 'Canal de Destino')}
                  </label>
                  <select
                    value={editingScheduled.channelId}
                    onChange={(e) => setEditingScheduled({ ...editingScheduled, channelId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.scheduled.frequency', 'Frecuencia')}
                    </label>
                    <select
                      value={editingScheduled.scheduleType}
                      onChange={(e) => setEditingScheduled({ ...editingScheduled, scheduleType: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="daily">{t('automations.scheduled.freqDaily', 'Diario')}</option>
                      <option value="weekly">{t('automations.scheduled.freqWeekly', 'Días Específicos')}</option>
                      <option value="interval">{t('automations.scheduled.freqInterval', 'Cada X Horas')}</option>
                    </select>
                  </div>

                  {editingScheduled.scheduleType === 'interval' ? (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                        {t('automations.scheduled.hours', 'Horas')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={editingScheduled.intervalHours}
                        onChange={(e) =>
                          setEditingScheduled({
                            ...editingScheduled,
                            intervalHours: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                        {t('automations.scheduled.timeOfDay', 'Hora (UTC)')}
                      </label>
                      <input
                        type="time"
                        value={editingScheduled.timeOfDay}
                        onChange={(e) => setEditingScheduled({ ...editingScheduled, timeOfDay: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {t('automations.form.formatType', 'Formato del Mensaje')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingScheduled({ ...editingScheduled, type: 'text' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        editingScheduled.type === 'text'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('automations.form.typeText', 'Texto Plano')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingScheduled({ ...editingScheduled, type: 'embed' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        editingScheduled.type === 'embed'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('automations.form.typeEmbed', 'Rich Embed')}
                    </button>
                  </div>
                </div>

                {editingScheduled.type === 'text' ? (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.form.content', 'Contenido')}
                    </label>
                    <textarea
                      rows={5}
                      value={editingScheduled.content}
                      onChange={(e) => setEditingScheduled({ ...editingScheduled, content: e.target.value })}
                      placeholder="Texto del aviso programado..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {t('automations.form.embedTitle', 'Título del Embed')}
                      </label>
                      <input
                        type="text"
                        value={editingScheduled.embed?.title || ''}
                        onChange={(e) =>
                          setEditingScheduled({
                            ...editingScheduled,
                            embed: { ...editingScheduled.embed, title: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {t('automations.form.embedDesc', 'Descripción del Embed')}
                      </label>
                      <textarea
                        rows={3}
                        value={editingScheduled.embed?.description || ''}
                        onChange={(e) =>
                          setEditingScheduled({
                            ...editingScheduled,
                            embed: { ...editingScheduled.embed, description: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Side */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t('automations.preview.title', 'Previsualización en Vivo')}
                </label>
                <AutomationPreview
                  channelName={getChannelName(editingScheduled.channelId)}
                  type={editingScheduled.type}
                  content={editingScheduled.content}
                  embed={editingScheduled.embed}
                  previewMode="scheduled"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
              <button
                onClick={() => setScheduledModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={saveScheduledModal}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT / CREATE AUTO-RESPONDER                                     */}
      {/* ========================================================================= */}
      {arModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                {editingAr.id ? t('automations.ar.editTitle', 'Editar Auto-Responder') : t('automations.ar.newTitle', 'Nueva Regla de Auto-Respuesta')}
              </h3>
              <button
                onClick={() => setArModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Side */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {t('automations.ar.triggerInput', 'Palabra o Frase Disparadora')}
                  </label>
                  <input
                    type="text"
                    value={editingAr.trigger}
                    onChange={(e) => setEditingAr({ ...editingAr, trigger: e.target.value })}
                    placeholder="Ej. como verificarse"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.ar.matchType', 'Tipo de Coincidencia')}
                    </label>
                    <select
                      value={editingAr.matchType}
                      onChange={(e) => setEditingAr({ ...editingAr, matchType: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="contains">{t('automations.ar.matchContains', 'Contiene palabra/frase')}</option>
                      <option value="exact">{t('automations.ar.matchExact', 'Coincidencia Exacta')}</option>
                      <option value="regex">{t('automations.ar.matchRegex', 'Expresión Regular (Regex)')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.ar.replyType', 'Dónde Responder')}
                    </label>
                    <select
                      value={editingAr.replyType}
                      onChange={(e) => setEditingAr({ ...editingAr, replyType: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="channel">{t('automations.ar.replyChannel', 'Mismo Canal')}</option>
                      <option value="dm">{t('automations.ar.replyDm', 'Mensaje Privado (DM)')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    {t('automations.form.formatType', 'Formato de Respuesta')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingAr({ ...editingAr, type: 'text' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        editingAr.type === 'text'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('automations.form.typeText', 'Texto Plano')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAr({ ...editingAr, type: 'embed' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        editingAr.type === 'embed'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t('automations.form.typeEmbed', 'Rich Embed')}
                    </button>
                  </div>
                </div>

                {editingAr.type === 'text' ? (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      {t('automations.ar.replyContent', 'Mensaje de Respuesta')}
                    </label>
                    <textarea
                      rows={4}
                      value={editingAr.content}
                      onChange={(e) => setEditingAr({ ...editingAr, content: e.target.value })}
                      placeholder="Respuesta automática que enviará el bot..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {t('automations.form.embedTitle', 'Título')}
                      </label>
                      <input
                        type="text"
                        value={editingAr.embed?.title || ''}
                        onChange={(e) =>
                          setEditingAr({
                            ...editingAr,
                            embed: { ...editingAr.embed, title: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                        {t('automations.form.embedDesc', 'Descripción')}
                      </label>
                      <textarea
                        rows={3}
                        value={editingAr.embed?.description || ''}
                        onChange={(e) =>
                          setEditingAr({
                            ...editingAr,
                            embed: { ...editingAr.embed, description: e.target.value },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Side */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t('automations.preview.title', 'Previsualización en Vivo')}
                </label>
                <AutomationPreview
                  channelName="general"
                  type={editingAr.type}
                  content={editingAr.content}
                  embed={editingAr.embed}
                  previewMode="autoresponder"
                  triggerWord={editingAr.trigger}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
              <button
                onClick={() => setArModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={saveArModal}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
