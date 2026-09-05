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
} from 'lucide-react';

export function JoinToCreateTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels } = useGuild();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const [jtcConfig, setJtcConfig] = useState({
    enabled: false,
    triggerChannels: [],
    categoryId: '',
    channelNameTemplate: "{username}'s Room",
    userLimit: 0,
    bitrate: 64000,
  });

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
      }
    } catch (err) {
      console.error('Failed to load Join-to-Create config:', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Mic className="w-7 h-7 text-indigo-400" />
          <span>{t('jointocreate.title') || 'Salas de Voz Temporales (Join-to-Create)'}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('jointocreate.subtitle') ||
            'Permite a los usuarios crear automáticamente sus propios canales de voz privados al entrar a un canal disparador.'}
        </p>
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
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Master Toggle Card */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <Zap className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-slate-100">
            {t('jointocreate.systemStatus') || 'Estado del Sistema Join-to-Create'}
          </h2>
        </div>

        <Toggle
          enabled={jtcConfig.enabled}
          onChange={(val) => updateConfigField('enabled', val)}
          label={t('jointocreate.enableJtc') || 'Activar Creación Dinámica de Salas'}
          description={
            t('jointocreate.enableJtcHelp') ||
            'Crea automáticamente salas privadas temporales cuando los miembros entran al canal disparador.'
          }
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
            {/* Card 1: Trigger and Category */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Volume2 className="w-5 h-5 text-discord-blurple" />
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
                    'Categoría de Discord donde se ubicarán las salas temporales creadas.'
                  }
                  channels={categories}
                  value={jtcConfig.categoryId}
                  onChange={(val) => updateConfigField('categoryId', val)}
                />
              </div>
            </div>

            {/* Card 2: Channel Customization */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('jointocreate.roomSettingsTitle') || 'Personalización de Salas Creadas'}
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('jointocreate.template') || 'Plantilla de Nombre del Canal'}
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={jtcConfig.channelNameTemplate}
                  onChange={(e) => updateConfigField('channelNameTemplate', e.target.value)}
                  placeholder="{username}'s Room"
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition-colors"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('jointocreate.templateHelp') ||
                    'Variables disponibles: {username} (nombre de usuario), {displayName} (apodo en el servidor).'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('jointocreate.userLimit') || 'Límite de Usuarios por Sala'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={jtcConfig.userLimit}
                    onChange={(e) => updateConfigField('userLimit', parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {t('jointocreate.userLimitHelp') || '0 significa sin límite de miembros.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('jointocreate.bitrate') || 'Calidad de Audio (Bitrate)'}
                  </label>
                  <select
                    value={jtcConfig.bitrate}
                    onChange={(e) => updateConfigField('bitrate', parseInt(e.target.value, 10) || 64000)}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                  >
                    <option value={64000}>64 kbps (Estándar)</option>
                    <option value={96000}>96 kbps (Alta fidelidad)</option>
                    <option value={128000}>128 kbps (Calidad música)</option>
                    <option value={256000}>256 kbps (Estudio)</option>
                    <option value={384000}>384 kbps (Máximo Discord)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-discord-blurple/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
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
          />
        </div>
      </div>
    </div>
  );
}
