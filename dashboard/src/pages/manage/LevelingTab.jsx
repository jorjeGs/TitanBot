import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { LevelUpPreview } from '../../components/preview/LevelUpPreview';
import {
  Trophy,
  Save,
  Plus,
  Trash2,
  Award,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  Loader2,
  Sparkles,
  Clock,
  Zap,
  EyeOff,
  Medal,
  Users,
} from 'lucide-react';

export function LevelingTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const [levelingConfig, setLevelingConfig] = useState({
    enabled: true,
    announceLevelUp: true,
    levelUpChannel: '',
    levelUpMessage: '¡Felicidades {user}, has alcanzado el nivel {level}!',
    xpMultiplier: 1.0,
    xpCooldown: 60,
    xpPerMessage: { min: 15, max: 25 },
    roleRewards: {},
    ignoredChannels: [],
    ignoredRoles: [],
  });

  const [leaderboard, setLeaderboard] = useState([]);
  const [newRewardLevel, setNewRewardLevel] = useState('');
  const [newRewardRoleId, setNewRewardRoleId] = useState('');

  // Filter text channels for announcements
  const textChannels = (channels || []).filter((c) => c.type === 0 || c.type === undefined);

  const fetchLevelingData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/leveling`);
      if (res.success && res.leveling) {
        setLevelingConfig({
          ...res.leveling,
          levelUpChannel: res.leveling.levelUpChannel || '',
          levelUpMessage: res.leveling.levelUpMessage || '¡Felicidades {user}, has alcanzado el nivel {level}!',
          xpMultiplier: Number(res.leveling.xpMultiplier) || 1.0,
          xpCooldown: Number(res.leveling.xpCooldown) || 60,
          xpPerMessage: res.leveling.xpPerMessage || { min: 15, max: 25 },
          roleRewards: res.leveling.roleRewards || {},
          ignoredChannels: Array.isArray(res.leveling.ignoredChannels) ? res.leveling.ignoredChannels : [],
          ignoredRoles: Array.isArray(res.leveling.ignoredRoles) ? res.leveling.ignoredRoles : [],
        });
        setLeaderboard(Array.isArray(res.leaderboard) ? res.leaderboard : []);
      }
    } catch (err) {
      console.error('Failed to load leveling data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevelingData();
  }, [guildId]);

  const updateConfigField = (field, val) => {
    setLevelingConfig((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const updateXpRange = (key, val) => {
    setLevelingConfig((prev) => ({
      ...prev,
      xpPerMessage: {
        ...prev.xpPerMessage,
        [key]: parseInt(val, 10) || 1,
      },
    }));
  };

  const handleAddReward = () => {
    const lvl = parseInt(newRewardLevel, 10);
    if (!lvl || lvl < 1) {
      setNotification({
        type: 'error',
        message: t('leveling.errors.invalidLevel') || 'Por favor ingresa un nivel válido (mínimo 1).',
      });
      return;
    }

    if (!newRewardRoleId) {
      setNotification({
        type: 'error',
        message: t('leveling.errors.noRole') || 'Por favor selecciona un rol para la recompensa.',
      });
      return;
    }

    const selectedRole = roles.find((r) => r.id === newRewardRoleId);
    if (selectedRole && selectedRole.canManage === false) {
      setNotification({
        type: 'error',
        message: t('leveling.errors.roleHierarchy') || 'El rol seleccionado está por encima de TitanBot en la jerarquía.',
      });
      return;
    }

    setLevelingConfig((prev) => ({
      ...prev,
      roleRewards: {
        ...prev.roleRewards,
        [String(lvl)]: newRewardRoleId,
      },
    }));

    setNewRewardLevel('');
    setNewRewardRoleId('');
  };

  const handleRemoveReward = (lvl) => {
    setLevelingConfig((prev) => {
      const copy = { ...prev.roleRewards };
      delete copy[lvl];
      return { ...prev, roleRewards: copy };
    });
  };

  const handleAddIgnoredChannel = (chId) => {
    if (!chId || levelingConfig.ignoredChannels.includes(chId)) return;
    setLevelingConfig((prev) => ({
      ...prev,
      ignoredChannels: [...prev.ignoredChannels, chId],
    }));
  };

  const handleRemoveIgnoredChannel = (chId) => {
    setLevelingConfig((prev) => ({
      ...prev,
      ignoredChannels: prev.ignoredChannels.filter((id) => id !== chId),
    }));
  };

  const handleAddIgnoredRole = (roleId) => {
    if (!roleId || levelingConfig.ignoredRoles.includes(roleId)) return;
    setLevelingConfig((prev) => ({
      ...prev,
      ignoredRoles: [...prev.ignoredRoles, roleId],
    }));
  };

  const handleRemoveIgnoredRole = (roleId) => {
    setLevelingConfig((prev) => ({
      ...prev,
      ignoredRoles: prev.ignoredRoles.filter((id) => id !== roleId),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/leveling`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: levelingConfig.enabled,
          announceLevelUp: levelingConfig.announceLevelUp,
          levelUpChannel: levelingConfig.levelUpChannel || null,
          levelUpMessage: levelingConfig.levelUpMessage,
          xpMultiplier: levelingConfig.xpMultiplier,
          xpCooldown: levelingConfig.xpCooldown,
          xpPerMessage: levelingConfig.xpPerMessage,
          roleRewards: levelingConfig.roleRewards,
          ignoredChannels: levelingConfig.ignoredChannels,
          ignoredRoles: levelingConfig.ignoredRoles,
        }),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('leveling.saveSuccess') || '¡Configuración de niveles guardada exitosamente!',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('leveling.errors.saveFailed') || 'Error al guardar.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('leveling.errors.saveFailed') || 'Error de conexión al guardar.',
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
          <span className="text-sm text-slate-400">{t('common.loading') || 'Cargando sistema de niveles...'}</span>
        </div>
      </div>
    );
  }

  const selectedChannelObj = textChannels.find((c) => c.id === levelingConfig.levelUpChannel);
  const rewardEntries = Object.entries(levelingConfig.roleRewards || {}).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  // Pick sample reward for preview
  const previewRewardRole = rewardEntries.length > 0 ? roles.find((r) => r.id === rewardEntries[0][1])?.name : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Trophy className="w-7 h-7 text-amber-400" />
          <span>{t('leveling.title') || 'Niveles y Gamificación'}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('leveling.subtitle') ||
            'Recompensa la actividad en el chat con puntos de experiencia (XP), niveles y roles automáticos.'}
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
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-slate-100">
            {t('leveling.systemStatus') || 'Estado del Sistema de Niveles'}
          </h2>
        </div>

        <Toggle
          enabled={levelingConfig.enabled}
          onChange={(val) => updateConfigField('enabled', val)}
          label={t('leveling.enableLeveling') || 'Activar Sistema de Niveles'}
          description={
            t('leveling.enableLevelingHelp') ||
            'Los miembros ganan experiencia al enviar mensajes y pueden desbloquear recompensas de rol.'
          }
        />
      </div>

      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-opacity ${
          levelingConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        {/* Left Column: Configuration Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Card 1: Announcements & Channel */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Sparkles className="w-5 h-5 text-discord-blurple" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('leveling.announcementsTitle') || 'Anuncios de Subida de Nivel'}
                </h2>
              </div>

              <Toggle
                enabled={levelingConfig.announceLevelUp}
                onChange={(val) => updateConfigField('announceLevelUp', val)}
                label={t('leveling.announceLevelUp') || 'Publicar anuncio al subir de nivel'}
                description={
                  t('leveling.announceLevelUpHelp') ||
                  'Envía un mensaje felicitando al usuario cada vez que alcanza un nuevo nivel.'
                }
              />

              <ChannelSelect
                label={t('leveling.channel') || 'Canal de Anuncios'}
                helpText={
                  t('leveling.channelHelp') ||
                  'Selecciona un canal fijo para los anuncios. Si seleccionas "Ninguno", el anuncio se publicará en el mismo canal donde el usuario esté escribiendo.'
                }
                channels={textChannels}
                value={levelingConfig.levelUpChannel}
                onChange={(val) => updateConfigField('levelUpChannel', val)}
              />

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('leveling.message') || 'Mensaje de Subida de Nivel'}
                </label>
                <textarea
                  rows={2}
                  value={levelingConfig.levelUpMessage}
                  onChange={(e) => updateConfigField('levelUpMessage', e.target.value)}
                  placeholder="¡Felicidades {user}, has alcanzado el nivel {level}!"
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('leveling.messageHelp') ||
                    'Variables disponibles: {user} (mención), {level} (número), {xp} (puntos), {server} (nombre del servidor).'}
                </p>
              </div>
            </div>

            {/* Card 2: XP Rates & Cooldown */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('leveling.ratesTitle') || 'Velocidad de XP y Tiempos'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('leveling.multiplier') || 'Multiplicador de XP'}
                  </label>
                  <select
                    value={levelingConfig.xpMultiplier}
                    onChange={(e) => updateConfigField('xpMultiplier', parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  >
                    <option value={0.5}>0.5x (Lento)</option>
                    <option value={1.0}>1.0x (Estándar)</option>
                    <option value={1.5}>1.5x (Rápido)</option>
                    <option value={2.0}>2.0x (Doble XP)</option>
                    <option value={3.0}>3.0x (Triple XP)</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-400">
                    {t('leveling.multiplierHelp') || 'Escala la velocidad a la que la comunidad progresa.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('leveling.cooldown') || 'Cooldown Anti-Spam (Segundos)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={levelingConfig.xpCooldown}
                    onChange={(e) => updateConfigField('xpCooldown', parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {t('leveling.cooldownHelp') || 'Tiempo mínimo entre mensajes para otorgar puntos de XP.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('leveling.minXp') || 'XP Mínima por mensaje'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={levelingConfig.xpPerMessage?.min || 15}
                    onChange={(e) => updateXpRange('min', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('leveling.maxXp') || 'XP Máxima por mensaje'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={levelingConfig.xpPerMessage?.max || 25}
                    onChange={(e) => updateXpRange('max', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Role Rewards Builder */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Award className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('leveling.roleRewardsTitle') || 'Recompensas de Rol por Nivel'}
                </h2>
              </div>

              <p className="text-xs text-slate-400">
                {t('leveling.roleRewardsHelp') ||
                  'Otorga automáticamente roles de Discord a los miembros al alcanzar un nivel específico.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {t('leveling.levelInput') || 'Nivel'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    placeholder="Ej. 5"
                    value={newRewardLevel}
                    onChange={(e) => setNewRewardLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                </div>

                <div className="sm:col-span-6">
                  <RoleSelect
                    label={t('leveling.rewardRole') || 'Rol a Otorgar'}
                    roles={roles}
                    value={newRewardRoleId}
                    onChange={setNewRewardRoleId}
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddReward}
                    disabled={!newRewardLevel || !newRewardRoleId}
                    className="w-full bg-discord-blurple hover:bg-discord-blurple/80 text-white font-medium text-sm py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('common.add') || 'Añadir'}</span>
                  </button>
                </div>
              </div>

              {/* Active Rewards List */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  {t('leveling.activeRewards') || 'Recompensas configuradas'} ({rewardEntries.length})
                </span>

                {rewardEntries.length === 0 ? (
                  <div className="p-3 bg-slate-900/30 border border-slate-800 rounded-lg text-xs text-slate-500 italic">
                    {t('leveling.noRewards') || 'No hay recompensas de rol configuradas.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rewardEntries.map(([lvl, rId]) => {
                      const rObj = roles.find((r) => r.id === rId);
                      return (
                        <div
                          key={lvl}
                          className="flex items-center justify-between p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold text-xs">
                              Lvl {lvl}
                            </span>
                            <span
                              className="text-xs font-medium truncate"
                              style={{ color: rObj?.color && rObj.color !== '#000000' ? rObj.color : '#e2e8f0' }}
                            >
                              @{rObj?.name || rId}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveReward(lvl)}
                            className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                            title="Eliminar recompensa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Ignored Channels & Roles */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <EyeOff className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('leveling.exclusionsTitle') || 'Canales y Roles Excluidos'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <ChannelSelect
                    label={t('leveling.addIgnoredChannel') || 'Canal sin XP'}
                    helpText={t('leveling.addIgnoredChannelHelp') || 'Los mensajes en este canal no generarán XP.'}
                    channels={textChannels.filter((c) => !levelingConfig.ignoredChannels.includes(c.id))}
                    value=""
                    onChange={handleAddIgnoredChannel}
                  />

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {levelingConfig.ignoredChannels.map((chId) => {
                      const ch = textChannels.find((c) => c.id === chId);
                      return (
                        <span
                          key={chId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300"
                        >
                          <span>#{ch?.name || chId}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIgnoredChannel(chId)}
                            className="hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <RoleSelect
                    label={t('leveling.addIgnoredRole') || 'Rol sin XP'}
                    helpText={t('leveling.addIgnoredRoleHelp') || 'Los miembros con este rol no acumularán XP.'}
                    roles={roles.filter((r) => !levelingConfig.ignoredRoles.includes(r.id))}
                    value=""
                    onChange={handleAddIgnoredRole}
                  />

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {levelingConfig.ignoredRoles.map((rId) => {
                      const r = roles.find((role) => role.id === rId);
                      return (
                        <span
                          key={rId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300"
                        >
                          <span>@{r?.name || rId}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIgnoredRole(rId)}
                            className="hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
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
                <span>{t('leveling.saveButton') || 'Guardar Ajustes de Niveles'}</span>
              </button>
            </div>
          </form>

          {/* Card 5: Live Leaderboard (Top 10) */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Medal className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('leveling.leaderboardTitle') || 'Tabla de Posiciones (Top 10)'}
              </h2>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400 italic text-center">
                {t('leveling.emptyLeaderboard') ||
                  'No hay miembros en la tabla de posiciones todavía. La actividad en el chat generará los primeros rangos.'}
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((user, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <div
                      key={user.userId || idx}
                      className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl hover:border-slate-700/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm w-6 text-center">{medal}</span>
                        <span className="font-semibold text-sm text-slate-200">
                          {user.username}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 font-bold text-xs">
                          Nivel {user.level || 0}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {user.totalXp?.toLocaleString() || 0} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Discord Preview (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <LevelUpPreview
            message={levelingConfig.levelUpMessage}
            channelName={selectedChannelObj?.name}
            roleRewardName={previewRewardRole}
            sampleLevel={rewardEntries.length > 0 ? parseInt(rewardEntries[0][0], 10) : 10}
            serverName={currentGuild?.name}
          />
        </div>
      </div>
    </div>
  );
}
