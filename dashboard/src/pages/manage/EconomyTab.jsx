import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { RoleSelect } from '../../components/common/RoleSelect';
import { EconomyPreview } from '../../components/preview/EconomyPreview';
import {
  Coins,
  Save,
  Wallet,
  Landmark,
  Crown,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  TrendingUp,
  Award,
  Medal,
  ShoppingBag,
  Clock,
  Zap,
  DollarSign,
  Shield,
  Briefcase,
  HelpCircle,
  Gem,
  Star,
  Trophy,
} from 'lucide-react';

export function EconomyTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { roles, currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('currency'); // 'currency' | 'rewards' | 'shop' | 'leaderboard'

  const [economyConfig, setEconomyConfig] = useState({
    currencyName: 'coins',
    currencySymbol: '🪙',
    startingBalance: 100,
    dailyAmount: 1000,
    workMin: 50,
    workMax: 250,
    premiumRoleId: '',
  });

  const [initialConfig, setInitialConfig] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [shopItems, setShopItems] = useState([]);

  const fetchEconomyData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/economy`);
      if (res.success && res.economy) {
        const loaded = {
          currencyName: res.economy.currencyName || 'coins',
          currencySymbol: res.economy.currencySymbol || '🪙',
          startingBalance: Number(res.economy.startingBalance) || 100,
          dailyAmount: Number(res.economy.dailyAmount) || 1000,
          workMin: Number(res.economy.workMin) || 50,
          workMax: Number(res.economy.workMax) || 250,
          premiumRoleId: res.economy.premiumRoleId || '',
        };
        setEconomyConfig(loaded);
        setInitialConfig(loaded);
        setLeaderboard(Array.isArray(res.leaderboard) ? res.leaderboard : []);
        if (Array.isArray(res.shopItems)) {
          setShopItems(res.shopItems);
        }
      }
    } catch (err) {
      console.error('Failed to load economy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomyData();
  }, [guildId]);

  const updateConfigField = (field, val) => {
    setEconomyConfig((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const hasChanges = initialConfig
    ? JSON.stringify(initialConfig) !== JSON.stringify(economyConfig)
    : false;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (economyConfig.workMin > economyConfig.workMax) {
      setNotification({
        type: 'error',
        message: t('economy.errors.invalidWorkRange') || 'El pago mínimo de trabajo no puede superar el máximo.',
      });
      return;
    }

    if (economyConfig.premiumRoleId) {
      const selectedRole = roles.find((r) => r.id === economyConfig.premiumRoleId);
      if (selectedRole && selectedRole.canManage === false) {
        setNotification({
          type: 'error',
          message:
            t('economy.errors.roleHierarchy') ||
            'El rol seleccionado para la tienda está por encima de TitanBot en la jerarquía.',
        });
        return;
      }
    }

    try {
      setSaving(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/economy`, {
        method: 'PATCH',
        body: JSON.stringify(economyConfig),
      });

      if (res.success) {
        setInitialConfig(economyConfig);
        setNotification({
          type: 'success',
          message: t('economy.saveSuccess') || '¡Ajustes de economía guardados exitosamente!',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('economy.errors.saveFailed') || 'Error al guardar economía.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('economy.errors.saveFailed') || 'Error de conexión.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Currency Presets
  const currencyPresets = [
    { name: 'Monedas', symbol: '🪙', code: 'coins' },
    { name: 'Gemas', symbol: '💎', code: 'gemas' },
    { name: 'Dólares', symbol: '💵', code: 'dólares' },
    { name: 'Créditos', symbol: '⚡', code: 'créditos' },
    { name: 'Estrellas', symbol: '⭐', code: 'estrellas' },
    { name: 'Puntos', symbol: '🏆', code: 'puntos' },
  ];

  // Starting balance presets
  const startingBalancePresets = [0, 100, 500, 1000, 5000];

  // Daily presets
  const dailyPresets = [500, 1000, 2500, 5000, 10000];

  // Work presets
  const workPresets = [
    { label: 'Casual', min: 25, max: 100, desc: 'Economía controlada y pausada' },
    { label: 'Equilibrado', min: 50, max: 250, desc: 'Balance estándar recomendado' },
    { label: 'Generoso', min: 100, max: 500, desc: 'Progreso ágil para comunidades activas' },
    { label: 'Magnate', min: 250, max: 1000, desc: 'Recompensas altas y juego dinámico' },
  ];

  // Cooldowns info
  const cooldownsInfo = [
    { name: 'Recompensa Diaria (/daily)', time: '24 horas', icon: Clock, color: 'text-amber-400' },
    { name: 'Trabajo Regular (/work)', time: '30 minutos', icon: Briefcase, color: 'text-emerald-400' },
    { name: 'Apuestas (/gamble)', time: '5 minutos', icon: Zap, color: 'text-purple-400' },
    { name: 'Crimen / Riesgo (/crime)', time: '1 hora', icon: AlertTriangle, color: 'text-red-400' },
    { name: 'Robo entre Usuarios (/rob)', time: '4 horas', icon: Shield, color: 'text-orange-400' },
    { name: 'Pesca & Minería (/fish, /mine)', time: '45-60 minutos', icon: Sparkles, color: 'text-blue-400' },
  ];

  const selectedRole = roles.find((r) => r.id === economyConfig.premiumRoleId);
  const premiumRoleName = selectedRole?.name || '';
  const premiumRoleColor = selectedRole?.color && selectedRole.color !== 0
    ? `#${selectedRole.color.toString(16).padStart(6, '0')}`
    : '#a855f7';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
          <span className="text-sm text-slate-400">{t('common.loading') || 'Cargando economía...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header with Title, Status & Save Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <span>{t('economy.title') || 'Sistema de Economía y Tienda'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('economy.subtitle') ||
              'Configura la divisa personalizada, recompensas de comandos diarios, pagos de trabajo y catálogo de tienda.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
              {t('economy.hasChanges') || 'Cambios sin guardar'}
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-discord-blurple/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? (t('economy.saving') || 'Guardando...') : (t('economy.saveButton') || 'Guardar Ajustes')}</span>
          </button>
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

      {/* 4 Segmented Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('currency')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'currency'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{t('economy.tabs.currency') || 'Moneda & Divisa'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rewards'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('economy.tabs.rewards') || 'Recompensas & Trabajo'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'shop'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t('economy.tabs.shop') || 'Tienda & Artículos'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Medal className="w-4 h-4" />
          <span>{t('economy.tabs.leaderboard') || 'Fortunas (Top 10)'}</span>
        </button>
      </div>

      {/* Main Grid: Form Content + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Sub-tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: CURRENCY */}
          {activeTab === 'currency' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Currency Identity Card */}
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-semibold text-slate-100">
                    {t('economy.currencySectionTitle') || 'Configuración de Moneda y Divisa'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('economy.currencyName') || 'Nombre de la Moneda'}
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={economyConfig.currencyName}
                      onChange={(e) => updateConfigField('currencyName', e.target.value)}
                      placeholder="coins, gemas, créditos..."
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {t('economy.currencyNameHelp') || 'El nombre con el que se identificará la divisa en los embeds.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('economy.currencySymbol') || 'Símbolo / Emoji'}
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={economyConfig.currencySymbol}
                      onChange={(e) => updateConfigField('currencySymbol', e.target.value)}
                      placeholder="🪙, 💎, 💵..."
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {t('economy.currencySymbolHelp') || 'Emoji o símbolo que acompañará a las cifras monetarias.'}
                    </p>
                  </div>
                </div>

                {/* Quick Currency Presets */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('economy.quickCurrency') || 'Monedas Predefinidas (1 Clic)'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {currencyPresets.map((preset) => {
                      const isSelected =
                        economyConfig.currencyName === preset.code &&
                        economyConfig.currencySymbol === preset.symbol;
                      return (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() => {
                            updateConfigField('currencyName', preset.code);
                            updateConfigField('currencySymbol', preset.symbol);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/50 text-white font-bold shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="text-xl">{preset.symbol}</span>
                          <div>
                            <span className="text-xs font-semibold block">{preset.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{preset.code}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Starting Balance Card */}
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-semibold text-slate-100">
                    {t('economy.startingBalance') || 'Balance Inicial para Nuevos Miembros'}
                  </h2>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      value={economyConfig.startingBalance}
                      onChange={(e) => updateConfigField('startingBalance', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-amber-400 transition-colors pr-12"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold">
                      {economyConfig.currencySymbol}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {t('economy.startingBalanceHelp') ||
                      'Cantidad con la que empezarán los usuarios al usar su primer comando económico.'}
                  </p>
                </div>

                {/* Starting Balance Pills */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium">Valores sugeridos:</span>
                  {startingBalancePresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => updateConfigField('startingBalance', amt)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        economyConfig.startingBalance === amt
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {amt.toLocaleString()} {economyConfig.currencySymbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REWARDS & WORK */}
          {activeTab === 'rewards' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Daily Reward Card */}
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-semibold text-slate-100">
                    {t('economy.dailyAmount') || 'Recompensa Diaria (/daily)'}
                  </h2>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      value={economyConfig.dailyAmount}
                      onChange={(e) => updateConfigField('dailyAmount', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-amber-400 transition-colors pr-12"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold">
                      {economyConfig.currencySymbol}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {t('economy.dailyAmountHelp') || 'Cantidad otorgada a los usuarios cada 24 horas al reclamar su premio diario.'}
                  </p>
                </div>

                {/* Daily presets */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium">Presets:</span>
                  {dailyPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => updateConfigField('dailyAmount', amt)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        economyConfig.dailyAmount === amt
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {amt.toLocaleString()} {economyConfig.currencySymbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Payout Range Card */}
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('economy.workSection') || 'Pagos por Trabajo (/work)'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {t('economy.workHelp') || 'Al usar /work, los usuarios ganan una cantidad aleatoria dentro de este rango.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('economy.workMin') || 'Pago Mínimo'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={economyConfig.workMin}
                      onChange={(e) => updateConfigField('workMin', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('economy.workMax') || 'Pago Máximo'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={economyConfig.workMax}
                      onChange={(e) => updateConfigField('workMax', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Work presets */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('economy.workPresets') || 'Estilos de Recompensa de Trabajo'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {workPresets.map((preset) => {
                      const isSelected =
                        economyConfig.workMin === preset.min && economyConfig.workMax === preset.max;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            updateConfigField('workMin', preset.min);
                            updateConfigField('workMax', preset.max);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-white font-bold shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">{preset.label}</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {preset.min} - {preset.max} {economyConfig.currencySymbol}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bot Cooldowns Reference Card */}
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('economy.cooldownsTitle') || 'Tiempos de Enfriamiento del Bot'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {t('economy.cooldownsHelp') ||
                        'Límites de tiempo configurados internamente en TitanBot para evitar spam de comandos.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {cooldownsInfo.map((cd) => {
                    const Icon = cd.icon;
                    return (
                      <div
                        key={cd.name}
                        className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cd.color}`} />
                          <span className="text-xs text-slate-300 font-medium">{cd.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-200 font-mono">{cd.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHOP & ITEMS */}
          {activeTab === 'shop' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Premium Role Card */}
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <Crown className="w-5 h-5 text-purple-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('economy.shopSectionTitle') || 'Rol Premium de la Tienda'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {t('economy.premiumRoleHelp') ||
                        'Rol que se otorgará automáticamente cuando un miembro adquiera el artículo Premium en /shop.'}
                    </p>
                  </div>
                </div>

                <RoleSelect
                  label={t('economy.premiumRole') || 'Rol Otorgado en Tienda'}
                  roles={roles}
                  value={economyConfig.premiumRoleId}
                  onChange={(val) => updateConfigField('premiumRoleId', val)}
                />

                {premiumRoleName && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium">Rol vinculado para venta:</span>
                    <span
                      className="px-2.5 py-0.5 rounded-full font-bold border"
                      style={{
                        backgroundColor: `${premiumRoleColor}20`,
                        borderColor: `${premiumRoleColor}40`,
                        color: premiumRoleColor,
                      }}
                    >
                      {premiumRoleName}
                    </span>
                  </div>
                )}
              </div>

              {/* Shop Items Catalog */}
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h2 className="text-base font-semibold text-slate-100">
                        {t('economy.catalogTitle') || 'Catálogo de Artículos de la Tienda (/shop)'}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {t('economy.catalogHelp') ||
                          'Artículos, herramientas y consumibles disponibles para que los usuarios compren.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {(shopItems && shopItems.length) || 11} artículos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(shopItems && shopItems.length > 0
                    ? shopItems
                    : [
                        {
                          id: 'extra_work',
                          name: 'Extra Work Shift',
                          price: 5000,
                          type: 'consumable',
                          description: 'Permite 1 uso adicional del comando /work sin esperar.',
                        },
                        {
                          id: 'bank_upgrade_1',
                          name: 'Bank Upgrade I',
                          price: 15000,
                          type: 'upgrade',
                          description: 'Aumenta 50% la capacidad del banco.',
                        },
                        {
                          id: 'diamond_pickaxe',
                          name: 'Diamond Pickaxe',
                          price: 50000,
                          type: 'tool',
                          description: 'Duplica el mineral obtenido en /mine.',
                        },
                        {
                          id: 'premium_role',
                          name: premiumRoleName || 'Premium Server Role',
                          price: 15000,
                          type: 'role',
                          description: 'Rol especial con color distinguido y 10% extra en /daily.',
                        },
                        {
                          id: 'lucky_clover',
                          name: 'Lucky Clover',
                          price: 10000,
                          type: 'consumable',
                          description: 'Aumenta 50% las probabilidades de ganar en /gamble.',
                        },
                        {
                          id: 'personal_safe',
                          name: 'Personal Safe',
                          price: 30000,
                          type: 'tool',
                          description: 'Protección permanente contra robos (/rob).',
                        },
                      ]
                  ).map((item) => {
                    const badgeColor =
                      item.type === 'role'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : item.type === 'tool'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : item.type === 'upgrade'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-xs text-slate-100 block">{item.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">ID: {item.id}</span>
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {item.type}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>

                        <div className="pt-1 flex items-center justify-between border-t border-slate-800/80 text-xs">
                          <span className="text-slate-400 text-[10px]">Precio en Tienda:</span>
                          <span className="font-mono font-bold text-amber-300">
                            {item.price?.toLocaleString()} {economyConfig.currencySymbol}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                  <Medal className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('economy.leaderboardTitle') || 'Mayores Fortunas del Servidor (Top 10)'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {t('economy.emptyLeaderboard') ||
                        'Los miembros que utilicen comandos de economía aparecerán clasificados por su patrimonio total.'}
                    </p>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-xs text-slate-400 italic text-center space-y-2">
                    <Coins className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No hay registros de economía aún en este servidor.</p>
                    <p className="text-[11px] text-slate-500">
                      Cuando los usuarios ejecuten comandos como <code className="text-amber-400">/daily</code> o{' '}
                      <code className="text-amber-400">/work</code>, se listarán aquí automáticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Top 3 Podium Cards */}
                    {leaderboard.length >= 1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {leaderboard.slice(0, 3).map((user, idx) => {
                          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                          const cardBorder =
                            idx === 0
                              ? 'border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-transparent'
                              : idx === 1
                              ? 'border-slate-300/30 bg-gradient-to-b from-slate-400/10 to-transparent'
                              : 'border-amber-700/30 bg-gradient-to-b from-amber-800/10 to-transparent';

                          return (
                            <div
                              key={user.userId || idx}
                              className={`p-4 rounded-2xl border ${cardBorder} text-center space-y-2 relative`}
                            >
                              <span className="text-2xl block">{medal}</span>
                              <div>
                                <span className="font-bold text-sm text-slate-100 block truncate">
                                  {user.displayName || user.username}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {user.userId?.slice(-6)}
                                </span>
                              </div>

                              <div className="pt-1 text-amber-300 font-black font-mono text-sm">
                                {user.netWorth?.toLocaleString()} {economyConfig.currencySymbol}
                              </div>

                              <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-1.5 font-mono">
                                <span>Mano: {user.wallet?.toLocaleString()}</span>
                                <span>Banco: {user.bank?.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Positions 4 to 10 */}
                    {leaderboard.length > 3 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block pb-1">
                          Siguientes Puestos
                        </span>
                        {leaderboard.slice(3).map((user, idx) => {
                          const pos = idx + 4;
                          const highestWorth = leaderboard[0]?.netWorth || 1;
                          const percent = Math.min(100, Math.round((user.netWorth / highestWorth) * 100));

                          return (
                            <div
                              key={user.userId || pos}
                              className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-xs font-mono w-6 text-slate-400">
                                    #{pos}
                                  </span>
                                  <div>
                                    <span className="font-semibold text-xs text-slate-200 block">
                                      {user.displayName || user.username}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Cartera: {user.wallet?.toLocaleString()} | Banco: {user.bank?.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-bold text-amber-300 font-mono">
                                    {user.netWorth?.toLocaleString()} {economyConfig.currencySymbol}
                                  </span>
                                </div>
                              </div>

                              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500/70 rounded-full transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Live Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <EconomyPreview
            currencyName={economyConfig.currencyName}
            currencySymbol={economyConfig.currencySymbol}
            sampleBalance={economyConfig.startingBalance}
            serverName={currentGuild?.name}
            shopItems={shopItems}
            premiumRoleName={premiumRoleName}
            premiumRoleColor={premiumRoleColor}
          />
        </div>
      </div>
    </div>
  );
}

