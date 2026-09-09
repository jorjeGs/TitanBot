import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { JoinToCreatePreview } from '../../components/preview/JoinToCreatePreview';
import {
  Mic,
  Save,
  Volume2,
  FolderTree,
  Sliders,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Zap,
  Radio,
  Sparkles,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Crown,
  Activity,
} from 'lucide-react';

export function JoinToCreateTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, currentGuild } = useGuild();

  const [activeSubTab, setActiveSubTab] = useState('settings'); // 'settings' | 'activeRooms' | 'guide'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingRooms, setRefreshingRooms] = useState(false);
  const [closingRoomId, setClosingRoomId] = useState(null);
  const [notification, setNotification] = useState(null);

  const [jtcConfig, setJtcConfig] = useState({
    enabled: false,
    triggerChannels: [],
    categoryId: '',
    channelNameTemplate: "{username}'s Room",
    userLimit: 0,
    bitrate: 64000,
  });

  const [activeRooms, setActiveRooms] = useState([]);

  // Filter voice and category channels
  const voiceChannels = (channels || []).filter((c) => c.type === 2);
  const categories = (channels || []).filter((c) => c.type === 4);

  const fetchJtcData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/jointocreate`);
      if (res.success && res.joinToCreate) {
        setJtcConfig({
          enabled: Boolean(res.joinToCreate.enabled),
          triggerChannels: Array.isArray(res.joinToCreate.triggerChannels) ? res.joinToCreate.triggerChannels : [],
          categoryId: res.joinToCreate.categoryId || '',
          channelNameTemplate: res.joinToCreate.channelNameTemplate || "{username}'s Room",
          userLimit: Number(res.joinToCreate.userLimit) || 0,
          bitrate: Number(res.joinToCreate.bitrate) || 64000,
        });
        setActiveRooms(Array.isArray(res.joinToCreate.activeRooms) ? res.joinToCreate.activeRooms : []);
      }
    } catch (err) {
      console.error('Failed to load Join-to-Create config:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveRooms = async () => {
    try {
      setRefreshingRooms(true);
      const res = await apiFetch(`/guilds/${guildId}/jointocreate`);
      if (res.success && res.joinToCreate) {
        setActiveRooms(Array.isArray(res.joinToCreate.activeRooms) ? res.joinToCreate.activeRooms : []);
      }
    } catch (err) {
      console.error('Failed to refresh active rooms:', err);
    } finally {
      setRefreshingRooms(false);
    }
  };

  useEffect(() => {
    fetchJtcData();
  }, [guildId]);

  const updateConfigField = (field, val) => {
    setJtcConfig((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const insertPlaceholder = (placeholder) => {
    setJtcConfig((prev) => {
      const current = prev.channelNameTemplate || '';
      if (current.includes(placeholder)) return prev;
      return {
        ...prev,
        channelNameTemplate: current ? `${current} ${placeholder}` : placeholder,
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/jointocreate`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: jtcConfig.enabled,
          triggerChannels: jtcConfig.triggerChannels,
          categoryId: jtcConfig.categoryId || null,
          channelNameTemplate: jtcConfig.channelNameTemplate,
          userLimit: jtcConfig.userLimit,
          bitrate: jtcConfig.bitrate,
        }),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('jointocreate.saveSuccess') || '¡Configuración de Join-to-Create guardada exitosamente!',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('jointocreate.errors.saveFailed') || 'Error al guardar.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('jointocreate.errors.saveFailed') || 'Error de conexión.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseRoom = async (channelId) => {
    if (
      !window.confirm(
        t('jointocreate.confirmCloseRoom') ||
          '¿Estás seguro de que deseas cerrar y eliminar esta sala de voz temporal?'
      )
    ) {
      return;
    }
    try {
      setClosingRoomId(channelId);
      const res = await apiFetch(`/guilds/${guildId}/jointocreate/rooms/${channelId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setActiveRooms((prev) => prev.filter((r) => r.channelId !== channelId));
        setNotification({
          type: 'success',
          message: t('jointocreate.roomClosedSuccess') || 'Sala temporal cerrada y eliminada de Discord.',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Error al cerrar la sala.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Error de conexión.',
      });
    } finally {
      setClosingRoomId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
          <span className="text-sm text-slate-400">{t('common.loading') || 'Cargando Join-to-Create...'}</span>
        </div>
      </div>
    );
  }

  const primaryTrigger = jtcConfig.triggerChannels[0] || '';
  const triggerChannelObj = voiceChannels.find((c) => c.id === primaryTrigger);
  const selectedCategoryObj = categories.find((c) => c.id === jtcConfig.categoryId);

  const PRESETS = [
    { id: 'gamer', label: t('jointocreate.presets.gamer') || 'Gamer Lounge', template: "🎮・{username}'s Lounge" },
    { id: 'classic', label: t('jointocreate.presets.classic') || 'Clásico', template: '🔊 Sala de {displayName}' },
    { id: 'minimal', label: t('jointocreate.presets.minimal') || 'Minimalista', template: '⚡ {username}' },
    { id: 'chill', label: t('jointocreate.presets.chill') || 'Charla / Chill', template: '💬 Charla de {username}' },
    { id: 'vip', label: t('jointocreate.presets.vip') || 'Zona VIP', template: '👑 Zona VIP de {displayName}' },
  ];

  const PLACEHOLDERS = [
    { key: '{username}', label: '{username}', desc: t('jointocreate.variables.username') || 'Usuario' },
    { key: '{displayName}', label: '{displayName}', desc: t('jointocreate.variables.displayName') || 'Apodo' },
    { key: '{channelName}', label: '{channelName}', desc: t('jointocreate.variables.channelName') || 'Canal' },
    { key: '{guildName}', label: '{guildName}', desc: t('jointocreate.variables.guildName') || 'Servidor' },
  ];

  const USER_LIMIT_SHORTCUTS = [
    { val: 0, label: t('jointocreate.userLimitUnlimited') || '∞ Ilimitado' },
    { val: 2, label: '2 (Dúo)' },
    { val: 3, label: '3 (Trío)' },
    { val: 4, label: '4 (Squad)' },
    { val: 8, label: '8 (Grupo)' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-500/15 via-slate-800/40 to-discord-blurple/15 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Mic className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {t('jointocreate.title') || 'Salas de Voz Temporales (Join-to-Create)'}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                {t('jointocreate.subtitle') ||
                  'Permite a los usuarios crear automáticamente sus propios canales de voz privados al entrar a un canal disparador.'}
              </p>
            </div>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex items-center bg-discord-dark p-1 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveSubTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'settings'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('jointocreate.subtabs.settings') || 'Configuración'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('activeRooms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'activeRooms'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t('jointocreate.subtabs.activeRooms') || 'Salas en Vivo'}</span>
              {activeRooms.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {activeRooms.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'guide'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t('jointocreate.subtabs.guide') || 'Guía y Permisos'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{notification.message}</div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUBTAB 1: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Master Toggle Hero Card */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  jtcConfig.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white">
                    {t('jointocreate.systemStatus') || 'Estado del Sistema Join-to-Create'}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      jtcConfig.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {jtcConfig.enabled ? t('common.active', 'Activo') : t('common.disabled', 'Desactivado')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('jointocreate.enableJtcHelp') ||
                    'Crea automáticamente salas privadas temporales cuando los miembros entran al canal disparador.'}
                </p>
              </div>
            </div>

            <Toggle
              enabled={jtcConfig.enabled}
              onChange={(val) => updateConfigField('enabled', val)}
            />
          </div>

          <div
            className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-opacity ${
              jtcConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            {/* Left Column: Configuration Forms (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Card 1: Trigger Channel & Category */}
                <div className="bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-5">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                    <Volume2 className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('jointocreate.channelsTitle') || 'Canales y Ubicación'}
                    </h2>
                  </div>

                  <div>
                    <ChannelSelect
                      label={t('jointocreate.triggerChannel') || 'Canal de Voz Disparador *'}
                      helpText={
                        t('jointocreate.triggerChannelHelp') ||
                        'El canal de voz al que los usuarios deben unirse para crear su propia sala.'
                      }
                      channels={voiceChannels}
                      value={primaryTrigger}
                      onChange={(val) => updateConfigField('triggerChannels', val ? [val] : [])}
                    />
                  </div>

                  <div>
                    <ChannelSelect
                      label={t('jointocreate.category') || 'Categoría Contenedora (Opcional)'}
                      helpText={
                        t('jointocreate.categoryHelp') ||
                        'Categoría de Discord donde se ubicarán las salas temporales creadas. Si se deja vacía, se usará la misma categoría del canal disparador.'
                      }
                      channels={categories}
                      value={jtcConfig.categoryId}
                      onChange={(val) => updateConfigField('categoryId', val)}
                    />
                  </div>
                </div>

                {/* Card 2: Channel Customization & Presets */}
                <div className="bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-5">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('jointocreate.roomSettingsTitle') || 'Personalización de Salas Creadas'}
                    </h2>
                  </div>

                  {/* 1-Click Name Presets */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t('jointocreate.presetsTitle') || 'Estilos de Nombre Rápidos (1 Clic):'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PRESETS.map((p) => {
                        const isSelected = jtcConfig.channelNameTemplate === p.template;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => updateConfigField('channelNameTemplate', p.template)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-500/15 border-indigo-500/50 text-white ring-1 ring-indigo-500/40 shadow-sm'
                                : 'bg-discord-dark border-slate-700/60 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span className="font-semibold text-xs block text-slate-200">{p.label}</span>
                            <span className="font-mono text-[10px] text-slate-400 truncate block mt-0.5">
                              {p.template}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Template input with variable badges */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t('jointocreate.template') || 'Plantilla de Nombre del Canal'}
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={jtcConfig.channelNameTemplate}
                      onChange={(e) => updateConfigField('channelNameTemplate', e.target.value)}
                      placeholder="{username}'s Room"
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                    />

                    {/* Clickable variable chips */}
                    <div className="pt-1">
                      <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                        {t('jointocreate.templateHelp') || 'Haz clic en una variable para insertarla:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {PLACEHOLDERS.map((chip) => (
                          <button
                            key={chip.key}
                            type="button"
                            onClick={() => insertPlaceholder(chip.key)}
                            className="px-2.5 py-1 rounded-lg bg-discord-dark hover:bg-slate-800 border border-slate-700/60 text-xs text-indigo-300 hover:text-white font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{chip.label}</span>
                            <span className="text-[10px] text-slate-500">({chip.desc})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* User Limit with Quick Shortcuts */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t('jointocreate.userLimit') || 'Límite de Usuarios por Sala'}
                    </label>

                    {/* Quick Limit Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {USER_LIMIT_SHORTCUTS.map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => updateConfigField('userLimit', item.val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            jtcConfig.userLimit === item.val
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-discord-dark text-slate-400 hover:text-white border border-slate-700/60'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={jtcConfig.userLimit}
                        onChange={(e) => updateConfigField('userLimit', parseInt(e.target.value, 10) || 0)}
                        className="w-32 px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <span className="text-xs text-slate-400">
                        {jtcConfig.userLimit === 0
                          ? '0 = Sin límite de miembros.'
                          : `Máximo ${jtcConfig.userLimit} usuarios por sala.`}
                      </span>
                    </div>
                  </div>

                  {/* Bitrate Selector */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t('jointocreate.bitrate') || 'Calidad de Audio (Bitrate)'}
                    </label>
                    <select
                      value={jtcConfig.bitrate}
                      onChange={(e) => updateConfigField('bitrate', parseInt(e.target.value, 10) || 64000)}
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value={64000}>{t('jointocreate.bitrates.standard') || '64 kbps (Estándar Discord)'}</option>
                      <option value={96000}>{t('jointocreate.bitrates.highFidelity') || '96 kbps (Alta fidelidad HQ)'}</option>
                      <option value={128000}>{t('jointocreate.bitrates.musicQuality') || '128 kbps (Calidad música)'}</option>
                      <option value={256000}>{t('jointocreate.bitrates.studio') || '256 kbps (Estudio - Nivel 2 Boost)'}</option>
                      <option value={384000}>{t('jointocreate.bitrates.maxDiscord') || '384 kbps (Máximo - Nivel 3 Boost)'}</option>
                    </select>
                    <p className="text-xs text-slate-500">
                      {t('jointocreate.bitrateHelp') ||
                        'Un bitrate más alto mejora la nitidez de la voz pero requiere mejor conexión.'}
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{t('jointocreate.saveButton') || 'Guardar Ajustes de Join-to-Create'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Preview (5 cols, sticky) */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <JoinToCreatePreview
                channelNameTemplate={jtcConfig.channelNameTemplate}
                userLimit={jtcConfig.userLimit}
                bitrate={jtcConfig.bitrate}
                categoryName={selectedCategoryObj?.name || '🔊 SALAS DE VOZ PRIVADAS'}
                triggerChannelName={triggerChannelObj?.name || '➕ Entra para Crear Sala'}
                serverName={currentGuild?.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: LIVE ACTIVE ROOMS */}
      {activeSubTab === 'activeRooms' && (
        <div className="space-y-6">
          <div className="bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span>{t('jointocreate.activeRoomsTitle') || 'Monitoreo de Salas Temporales en Vivo'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('jointocreate.activeRoomsSubtitle') ||
                    'Salas de voz creadas dinámicamente que están activas en este momento en tu servidor.'}
                </p>
              </div>

              <button
                type="button"
                onClick={refreshActiveRooms}
                disabled={refreshingRooms}
                className="px-4 py-2 rounded-xl bg-discord-dark hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingRooms ? 'animate-spin' : ''}`} />
                <span>{t('common.refresh') || 'Actualizar'}</span>
              </button>
            </div>

            {activeRooms.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3 bg-discord-dark/40 rounded-2xl border border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <Mic className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {t('jointocreate.noActiveRooms') || 'No hay salas temporales activas en este momento.'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {t('jointocreate.noActiveRoomsHelp') ||
                    'Cuando un miembro entre al canal disparador, su sala privada aparecerá aquí en tiempo real con sus estadísticas y opciones de gestión.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRooms.map((room) => (
                  <div
                    key={room.channelId}
                    className="p-5 rounded-2xl bg-discord-dark border border-slate-800 space-y-3.5 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-bold text-sm text-white truncate font-mono">
                            {room.channelName}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          {t('common.active') || 'En línea'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{t('jointocreate.roomOwner') || 'Dueño'}: </span>
                          <strong className="text-slate-200">{room.ownerName}</strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{t('jointocreate.roomMembers') || 'Miembros'}: </span>
                          <strong className="text-slate-200 font-mono">
                            {room.membersCount} / {room.userLimit > 0 ? room.userLimit : '∞'}
                          </strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <Radio className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{t('jointocreate.bitrate') || 'Bitrate'}: </span>
                          <strong className="text-slate-200 font-mono">
                            {Math.round((room.bitrate || 64000) / 1000)} kbps
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {room.channelId.slice(0, 8)}...
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCloseRoom(room.channelId)}
                        disabled={closingRoomId === room.channelId}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {closingRoomId === room.channelId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>{t('jointocreate.closeRoom') || 'Cerrar Sala'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: GUIDE & PERMISSIONS */}
      {activeSubTab === 'guide' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="bg-discord-darker/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {t('jointocreate.guideTitle') || 'Guía de Permisos y Ciclo de Vida'}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('jointocreate.guideSubtitle') ||
                    'Aprende cómo TitanBot gestiona y mantiene las salas de voz efímeras sin dejar basura en tu servidor.'}
                </p>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>{t('jointocreate.permissionsTitle') || 'Permisos Requeridos en Discord'}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-discord-dark border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Gestionar Canales</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('jointocreate.permManageChannels') ||
                      'Permite a TitanBot crear la sala temporal instantáneamente y eliminarla cuando quede vacía.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-discord-dark border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Mover Miembros</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('jointocreate.permMoveMembers') ||
                      'Necesario para transferir al usuario en menos de 1 segundo desde el canal disparador a su sala privada.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-discord-dark border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Conectar</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('jointocreate.permConnect') ||
                      'Para que el bot detecte los eventos de entrada y salida de participantes sin retraso.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>{t('jointocreate.lifecycleTitle') || 'Ciclo de Vida Automático de una Sala'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-discord-dark border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-discord-blurple block">
                    {t('jointocreate.lifecycle1Title') || '1. Entrada al Disparador'}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('jointocreate.lifecycle1Text') ||
                      'El miembro entra al canal disparador configurado (por ejemplo, "➕ Crear Sala").'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-discord-dark border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-emerald-400 block">
                    {t('jointocreate.lifecycle2Title') || '2. Creación Inmediata'}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('jointocreate.lifecycle2Text') ||
                      'TitanBot crea un nuevo canal de voz privado con la plantilla y bitrate elegidos y mueve al usuario en menos de 1 segundo.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-discord-dark border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-amber-400 block">
                    {t('jointocreate.lifecycle3Title') || '3. Control y Propiedad'}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('jointocreate.lifecycle3Text') ||
                      'El creador es el dueño de la sala. Si el dueño se desconecta, TitanBot transfiere la propiedad automáticamente al siguiente miembro.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-discord-dark border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-purple-400 block">
                    {t('jointocreate.lifecycle4Title') || '4. Autolimpieza'}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('jointocreate.lifecycle4Text') ||
                      'Cuando todos los miembros salen de la sala, TitanBot la elimina inmediatamente para mantener el servidor limpio.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JoinToCreateTab;
