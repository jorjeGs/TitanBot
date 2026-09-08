import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Loader2,
  Sparkles,
  Clock,
  Zap,
  EyeOff,
  Medal,
  Users,
  RefreshCw,
  Hash,
  Sliders,
  ChevronRight,
  Check,
  Flame,
  MessageSquare,
  Crown,
} from 'lucide-react';

const MESSAGE_TEMPLATES = [
  {
    id: 'classic',
    labelKey: 'leveling.templates.classic',
    defaultLabel: 'Clásico',
    text: '¡Felicidades {user}, has alcanzado el **nivel {level}**!',
  },
  {
    id: 'gamer',
    labelKey: 'leveling.templates.gamer',
    defaultLabel: 'Gamer',
    text: '🎮 ¡GG {user}! Subiste al **nivel {level}** con {xp} XP acumulados. ¡Sigue así!',
  },
  {
    id: 'rpg',
    labelKey: 'leveling.templates.rpg',
    defaultLabel: 'RPG Épico',
    text: '⚔️ ¡Gloria a {user}! Ha conquistado los desafíos y ascendido al **nivel {level}** en {server}.',
  },
  {
    id: 'minimal',
    labelKey: 'leveling.templates.minimal',
    defaultLabel: 'Minimal',
    text: '{user} ha subido al nivel {level}.',
  },
];

const COOLDOWN_PRESETS = [15, 30, 60, 120];

export function LevelingTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' | 'rates' | 'rewards' | 'exclusions' | 'leaderboard'
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

  const [initialConfig, setInitialConfig] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [newRewardLevel, setNewRewardLevel] = useState('');
  const [newRewardRoleId, setNewRewardRoleId] = useState('');

  const messageTextareaRef = useRef(null);

  const textChannels = useMemo(
    () => (channels || []).filter((c) => c.type === 0 || c.type === 5 || c.type === undefined),
    [channels]
  );

  const fetchLevelingData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/leveling`);
      if (res.success && res.leveling) {
        const loadedConfig = {
          ...res.leveling,
          levelUpChannel: res.leveling.levelUpChannel || '',
          levelUpMessage:
            res.leveling.levelUpMessage || '¡Felicidades {user}, has alcanzado el nivel {level}!',
          xpMultiplier: Number(res.leveling.xpMultiplier) || 1.0,
          xpCooldown: Number(res.leveling.xpCooldown) || 60,
          xpPerMessage: res.leveling.xpPerMessage || { min: 15, max: 25 },
          roleRewards: res.leveling.roleRewards || {},
          ignoredChannels: Array.isArray(res.leveling.ignoredChannels) ? res.leveling.ignoredChannels : [],
          ignoredRoles: Array.isArray(res.leveling.ignoredRoles) ? res.leveling.ignoredRoles : [],
        };
        setLevelingConfig(loadedConfig);
        setInitialConfig(JSON.stringify(loadedConfig));
        setLeaderboard(Array.isArray(res.leaderboard) ? res.leaderboard : []);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Error al cargar los datos de niveles.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevelingData();
  }, [guildId]);

  const hasChanges = useMemo(() => {
    if (!initialConfig) return false;
    return initialConfig !== JSON.stringify(levelingConfig);
  }, [initialConfig, levelingConfig]);

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

  const handleInsertVariable = (varTag) => {
    const textarea = messageTextareaRef.current;
    if (!textarea) {
      updateConfigField('levelUpMessage', (levelingConfig.levelUpMessage || '') + ' ' + varTag);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = levelingConfig.levelUpMessage || '';
    const newText = text.substring(0, start) + varTag + text.substring(end);

    updateConfigField('levelUpMessage', newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varTag.length, start + varTag.length);
    }, 0);
  };

  const handleApplyTemplate = (tplText) => {
    updateConfigField('levelUpMessage', tplText);
  };

  const handleAddReward = () => {
    const lvl = parseInt(newRewardLevel, 10);
    if (!lvl || lvl < 1) {
      setNotification({
        type: 'error',
        message: t('leveling.errors.invalidLevel', 'Por favor ingresa un nivel válido (mínimo 1).'),
      });
      return;
    }

    if (!newRewardRoleId) {
      setNotification({
        type: 'error',
        message: t('leveling.errors.noRole', 'Por favor selecciona un rol para la recompensa.'),
      });
      return;
    }

    const selectedRole = roles.find((r) => r.id === newRewardRoleId);
    if (selectedRole && selectedRole.canManage === false) {
      setNotification({
        type: 'error',
        message: t(
          'leveling.errors.roleHierarchy',
          'El rol seleccionado está por encima de TitanBot en la jerarquía del servidor.'
        ),
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
    if (e) e.preventDefault();
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
          message: t('leveling.saveSuccess', '¡Configuración de niveles guardada exitosamente!'),
        });
        setInitialConfig(JSON.stringify(levelingConfig));
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('leveling.errors.saveFailed', 'Error al guardar los ajustes de niveles.'),
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('leveling.errors.saveFailed', 'Error de conexión al guardar.'),
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
          <span className="text-sm text-slate-400">{t('common.loading', 'Cargando sistema de niveles...')}</span>
        </div>
      </div>
    );
  }

  const selectedChannelObj = textChannels.find((c) => c.id === levelingConfig.levelUpChannel);
  const rewardEntries = Object.entries(levelingConfig.roleRewards || {}).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  const avgXpPerMessage = Math.round(
    ((Number(levelingConfig.xpPerMessage?.min || 15) + Number(levelingConfig.xpPerMessage?.max || 25)) / 2) *
      Number(levelingConfig.xpMultiplier || 1.0)
  );

  const totalExclusions =
    (levelingConfig.ignoredChannels?.length || 0) + (levelingConfig.ignoredRoles?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-400" />
            <span>{t('leveling.title', 'Niveles y Gamificación')}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'leveling.subtitle',
              'Recompensa la actividad en el chat con puntos de experiencia (XP), niveles y roles automáticos.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{t('leveling.unsavedChanges', 'Cambios sin guardar')}</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-discord-blurple hover:bg-discord-blurple-hover active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('common.saving', 'Guardando...')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('leveling.saveButton', 'Guardar Ajustes')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border shadow-md animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
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

      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-inner ${
              levelingConfig.enabled
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700/50'
            }`}
          >
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                {t('leveling.enableLeveling', 'Sistema de Niveles y Gamificación')}
              </h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  levelingConfig.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {levelingConfig.enabled
                  ? t('leveling.systemActive', 'Sistema Activo')
                  : t('leveling.systemDisabled', 'Sistema Pausado')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t(
                'leveling.enableLevelingHelp',
                'Los miembros ganan experiencia al enviar mensajes y pueden desbloquear recompensas de rol.'
              )}
            </p>
          </div>
        </div>

        <Toggle
          enabled={levelingConfig.enabled}
          onChange={(val) => updateConfigField('enabled', val)}
          label=""
        />
      </div>

      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-opacity duration-200 ${
          levelingConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-discord-dark/90 rounded-2xl border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">{t('leveling.tabs.announcements', 'Anuncios')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rates')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'rates'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">{t('leveling.tabs.rates', 'Tasas XP')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rewards')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'rewards'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span className="truncate">{t('leveling.tabs.rewards', 'Recompensas')}</span>
              {rewardEntries.length > 0 && (
                <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.2 rounded-full font-bold">
                  {rewardEntries.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('exclusions')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'exclusions'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="truncate">{t('leveling.tabs.exclusions', 'Exclusiones')}</span>
              {totalExclusions > 0 && (
                <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.2 rounded-full font-bold">
                  {totalExclusions}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Medal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{t('leveling.tabs.leaderboard', 'Ranking')}</span>
            </button>
          </div>

          {activeTab === 'announcements' && (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    {t('leveling.announcementsTitle', 'Anuncios de Subida de Nivel')}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('leveling.announceLevelUpHelp', 'Configura el mensaje que TitanBot enviará en Discord cuando un miembro suba de nivel.')}
                  </p>
                </div>
              </div>

              <Toggle
                enabled={levelingConfig.announceLevelUp}
                onChange={(val) => updateConfigField('announceLevelUp', val)}
                label={t('leveling.announceLevelUp', 'Publicar anuncio en Discord al subir de nivel')}
                description="Si está desactivado, el miembro subirá de nivel de forma silenciosa sin enviar mensaje al chat."
              />

              <ChannelSelect
                label={t('leveling.channel', 'Canal de Anuncios')}
                helpText={t(
                  'leveling.channelHelp',
                  'Selecciona un canal fijo para los anuncios. Si seleccionas "Ninguno", el anuncio se publicará en el mismo canal donde el usuario esté escribiendo.'
                )}
                channels={textChannels}
                value={levelingConfig.levelUpChannel}
                onChange={(val) => updateConfigField('levelUpChannel', val)}
              />

              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('leveling.templates.title', 'Plantillas Rápidas de Felicitación:')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MESSAGE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.text)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/60 transition-colors"
                    >
                      {t(tpl.labelKey, tpl.defaultLabel)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">
                    {t('leveling.message', 'Mensaje de Subida de Nivel')}
                  </label>
                  <span className="text-xs text-slate-500">
                    {(levelingConfig.levelUpMessage || '').length} / 2000
                  </span>
                </div>

                <textarea
                  ref={messageTextareaRef}
                  rows={3}
                  maxLength={2000}
                  value={levelingConfig.levelUpMessage}
                  onChange={(e) => updateConfigField('levelUpMessage', e.target.value)}
                  placeholder="¡Felicidades {user}, has alcanzado el nivel {level}!"
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors resize-y font-sans leading-relaxed"
                />

                <div className="space-y-1.5 pt-1 bg-discord-dark/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('leveling.variables.title', 'Variables dinámicas (haz clic para insertar):')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{user}')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-discord-darker hover:bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30 text-xs font-mono font-medium transition-colors"
                    >
                      <span>+ &#123;user&#125;</span>
                      <span className="text-[10px] text-slate-400 font-sans">(@Usuario)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{level}')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-discord-darker hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 text-xs font-mono font-medium transition-colors"
                    >
                      <span>+ &#123;level&#125;</span>
                      <span className="text-[10px] text-slate-400 font-sans">(Nivel)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{xp}')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-discord-darker hover:bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 text-xs font-mono font-medium transition-colors"
                    >
                      <span>+ &#123;xp&#125;</span>
                      <span className="text-[10px] text-slate-400 font-sans">(Puntos)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{server}')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-discord-darker hover:bg-indigo-400/20 text-indigo-400 border border-indigo-400/30 text-xs font-mono font-medium transition-colors"
                    >
                      <span>+ &#123;server&#125;</span>
                      <span className="text-[10px] text-slate-400 font-sans">(Servidor)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rates' && (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Zap className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    {t('leveling.ratesTitle', 'Velocidad de XP y Tiempos')}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('leveling.multiplierHelp', 'Controla cuánta experiencia reciben los miembros y protege el chat contra spam.')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  {t('leveling.multiplier', 'Multiplicador de XP')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { value: 0.5, label: '0.5x', desc: 'Lento' },
                    { value: 1.0, label: '1.0x', desc: 'Estándar' },
                    { value: 1.5, label: '1.5x', desc: 'Dinámico' },
                    { value: 2.0, label: '2.0x', desc: 'Doble XP' },
                    { value: 3.0, label: '3.0x', desc: 'Especial' },
                  ].map((card) => {
                    const isSelected = Number(levelingConfig.xpMultiplier) === card.value;
                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => updateConfigField('xpMultiplier', card.value)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-discord-blurple text-white border-discord-blurple shadow-md shadow-discord-blurple/25'
                            : 'bg-discord-dark hover:bg-slate-800/80 border-slate-700/60 text-slate-300'
                        }`}
                      >
                        <span className="font-extrabold text-sm">{card.label}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {card.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">
                    {t('leveling.cooldown', 'Cooldown Anti-Spam (Segundos)')}
                  </label>
                  <span className="text-xs text-slate-400">
                    {levelingConfig.xpCooldown}s entre mensajes
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={levelingConfig.xpCooldown}
                    onChange={(e) => updateConfigField('xpCooldown', parseInt(e.target.value, 10) || 0)}
                    className="w-32 px-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                  />

                  <div className="flex items-center gap-1.5">
                    {COOLDOWN_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => updateConfigField('xpCooldown', sec)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          levelingConfig.xpCooldown === sec
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700/60'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Rango de XP por Mensaje
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cada mensaje otorga un valor aleatorio entre el mínimo y el máximo configurado.
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-medium">
                    ~{avgXpPerMessage} XP / msg (promedio)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      {t('leveling.minXp', 'XP Mínima')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={levelingConfig.xpPerMessage?.min || 15}
                      onChange={(e) => updateXpRange('min', e.target.value)}
                      className="w-full px-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      {t('leveling.maxXp', 'XP Máxima')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={levelingConfig.xpPerMessage?.max || 25}
                      onChange={(e) => updateXpRange('max', e.target.value)}
                      className="w-full px-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-purple-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('leveling.roleRewardsTitle', 'Recompensas de Rol por Nivel')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t(
                        'leveling.roleRewardsHelp',
                        'Otorga automáticamente roles de Discord a los miembros al alcanzar un nivel específico.'
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full">
                  {rewardEntries.length} activas
                </span>
              </div>

              <div className="bg-discord-dark/60 p-4 border border-slate-800 rounded-xl space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  Añadir Nueva Recompensa
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      {t('leveling.levelInput', 'Nivel Requerido')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      placeholder={t('leveling.levelPlaceholder', 'Ej. 5')}
                      value={newRewardLevel}
                      onChange={(e) => setNewRewardLevel(e.target.value)}
                      className="w-full px-3 py-2 bg-discord-darker border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <RoleSelect
                      label={t('leveling.rewardRole', 'Rol de Discord')}
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
                      className="w-full bg-discord-blurple hover:bg-discord-blurple/80 text-white font-medium text-sm py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('common.add', 'Añadir')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  {t('leveling.activeRewards', 'Recompensas configuradas')} ({rewardEntries.length})
                </span>

                {rewardEntries.length === 0 ? (
                  <div className="p-8 bg-slate-900/30 border border-slate-800 rounded-xl text-center space-y-2">
                    <Award className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 italic">
                      {t('leveling.noRewards', 'No hay recompensas de rol configuradas todavía.')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {rewardEntries.map(([lvl, rId]) => {
                      const rObj = roles.find((r) => r.id === rId);
                      const isUnmanageable = rObj?.canManage === false;
                      return (
                        <div
                          key={lvl}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                            isUnmanageable
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : 'bg-discord-dark/70 border-slate-700/60 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-bold text-xs shrink-0">
                              Lvl {lvl}
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                style={{
                                  backgroundColor:
                                    rObj?.color && rObj.color !== '#000000' && rObj.color !== '#99aab5'
                                      ? rObj.color
                                      : '#94a3b8',
                                }}
                              />
                              <span className="text-xs font-semibold truncate">
                                @{rObj?.name || rId}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveReward(lvl)}
                            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'exclusions' && (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <EyeOff className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    {t('leveling.exclusionsTitle', 'Canales y Roles Excluidos')}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evita que bots, canales de spam o roles específicos acumulen puntos de experiencia.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <ChannelSelect
                    label={t('leveling.addIgnoredChannel', 'Canal sin XP')}
                    helpText={t('leveling.addIgnoredChannelHelp', 'Los mensajes en este canal no generarán XP.')}
                    channels={textChannels.filter((c) => !levelingConfig.ignoredChannels.includes(c.id))}
                    value=""
                    onChange={handleAddIgnoredChannel}
                  />

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {levelingConfig.ignoredChannels.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No hay canales excluidos.</p>
                    ) : (
                      levelingConfig.ignoredChannels.map((chId) => {
                        const ch = textChannels.find((c) => c.id === chId);
                        return (
                          <span
                            key={chId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-discord-dark border border-slate-700/70 text-xs text-slate-200"
                          >
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span>{ch?.name || chId}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIgnoredChannel(chId)}
                              className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <RoleSelect
                    label={t('leveling.addIgnoredRole', 'Rol sin XP')}
                    helpText={t('leveling.addIgnoredRoleHelp', 'Los miembros con este rol no acumularán XP.')}
                    roles={roles.filter((r) => !levelingConfig.ignoredRoles.includes(r.id))}
                    value=""
                    onChange={handleAddIgnoredRole}
                  />

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {levelingConfig.ignoredRoles.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No hay roles excluidos.</p>
                    ) : (
                      levelingConfig.ignoredRoles.map((rId) => {
                        const r = roles.find((role) => role.id === rId);
                        return (
                          <span
                            key={rId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-discord-dark border border-slate-700/70 text-xs text-slate-200"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  r?.color && r.color !== '#000000' && r.color !== '#99aab5'
                                    ? r.color
                                    : '#94a3b8',
                              }}
                            />
                            <span>@{r?.name || rId}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIgnoredRole(rId)}
                              className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Medal className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('leveling.leaderboardTitle', 'Tabla de Posiciones (Top 10)')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Miembros más activos y con mayor experiencia en el servidor.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchLevelingData}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Refrescar clasificación"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <div className="p-8 bg-slate-900/30 border border-slate-800 rounded-xl text-xs text-slate-400 italic text-center space-y-2">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>
                    {t(
                      'leveling.emptyLeaderboard',
                      'No hay miembros en la tabla de posiciones todavía. La actividad en el chat generará los primeros rangos.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.length >= 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {leaderboard.slice(0, 3).map((user, idx) => {
                        const rankConfig = [
                          {
                            badge: '🥇 1º Lugar',
                            border: 'border-amber-400/50',
                            bg: 'bg-gradient-to-b from-amber-500/20 to-amber-500/5',
                            text: 'text-amber-300',
                          },
                          {
                            badge: '🥈 2º Lugar',
                            border: 'border-slate-300/40',
                            bg: 'bg-gradient-to-b from-slate-400/20 to-slate-400/5',
                            text: 'text-slate-200',
                          },
                          {
                            badge: '🥉 3º Lugar',
                            border: 'border-amber-700/50',
                            bg: 'bg-gradient-to-b from-amber-700/20 to-amber-700/5',
                            text: 'text-amber-500',
                          },
                        ][idx];

                        return (
                          <div
                            key={user.userId || idx}
                            className={`p-4 rounded-xl border ${rankConfig.border} ${rankConfig.bg} text-center space-y-1.5 shadow-sm`}
                          >
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${rankConfig.text}`}>
                              {rankConfig.badge}
                            </span>
                            <h3 className="text-sm font-bold text-white truncate px-1">
                              {user.username}
                            </h3>
                            <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                              <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-extrabold">
                                Lvl {user.level || 0}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                {user.totalXp?.toLocaleString() || 0} XP
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {leaderboard.length > 3 && (
                    <div className="space-y-2 pt-2">
                      {leaderboard.slice(3).map((user, idx) => {
                        const rankNumber = idx + 4;
                        return (
                          <div
                            key={user.userId || rankNumber}
                            className="flex items-center justify-between p-3 bg-discord-dark/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-xs w-6 text-center text-slate-500">
                                #{rankNumber}
                              </span>
                              <span className="font-semibold text-sm text-slate-200 truncate max-w-[180px]">
                                {user.username}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold text-xs">
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
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <LevelUpPreview
            message={levelingConfig.levelUpMessage}
            channelName={selectedChannelObj?.name}
            roleRewards={levelingConfig.roleRewards}
            roles={roles}
            sampleLevel={rewardEntries.length > 0 ? parseInt(rewardEntries[0][0], 10) : 10}
            serverName={currentGuild?.name}
            xpMultiplier={levelingConfig.xpMultiplier}
            xpPerMessage={levelingConfig.xpPerMessage}
          />
        </div>
      </div>
    </div>
  );
}
