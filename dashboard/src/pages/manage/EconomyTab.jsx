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
} from 'lucide-react';

export function EconomyTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { roles, currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const [economyConfig, setEconomyConfig] = useState({
    currencyName: 'coins',
    currencySymbol: '🪙',
    startingBalance: 100,
    dailyAmount: 1000,
    workMin: 50,
    workMax: 250,
    premiumRoleId: '',
  });

  const [leaderboard, setLeaderboard] = useState([]);

  const fetchEconomyData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/economy`);
      if (res.success && res.economy) {
        setEconomyConfig({
          currencyName: res.economy.currencyName || 'coins',
          currencySymbol: res.economy.currencySymbol || '🪙',
          startingBalance: Number(res.economy.startingBalance) || 100,
          dailyAmount: Number(res.economy.dailyAmount) || 1000,
          workMin: Number(res.economy.workMin) || 50,
          workMax: Number(res.economy.workMax) || 250,
          premiumRoleId: res.economy.premiumRoleId || '',
        });
        setLeaderboard(Array.isArray(res.leaderboard) ? res.leaderboard : []);
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

  const handleSave = async (e) => {
    e.preventDefault();
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Coins className="w-7 h-7 text-amber-400" />
          <span>{t('economy.title') || 'Sistema de Economía y Tienda'}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('economy.subtitle') ||
            'Configura la moneda personalizada de tu servidor, recompensas de comandos diarios y roles de compra.'}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Config Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Card 1: Currency Configuration */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Wallet className="w-5 h-5 text-amber-400" />
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
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition-colors"
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
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {t('economy.currencySymbolHelp') || 'Emoji o símbolo que acompañará a las cifras monetarias.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('economy.startingBalance') || 'Balance Inicial para Nuevos Miembros'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  value={economyConfig.startingBalance}
                  onChange={(e) => updateConfigField('startingBalance', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('economy.startingBalanceHelp') ||
                    'Cantidad con la que empezarán los usuarios al usar su primer comando económico.'}
                </p>
              </div>
            </div>

            {/* Card 2: Rewards and Payouts */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('economy.rewardsSectionTitle') || 'Recompensas y Ganancias'}
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t('economy.dailyAmount') || 'Recompensa Diaria (/daily)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={economyConfig.dailyAmount}
                  onChange={(e) => updateConfigField('dailyAmount', parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('economy.dailyAmountHelp') || 'Cantidad otorgada a los usuarios cada 24 horas.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('economy.workMin') || 'Pago Mínimo de Trabajo (/work)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={economyConfig.workMin}
                    onChange={(e) => updateConfigField('workMin', parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('economy.workMax') || 'Pago Máximo de Trabajo (/work)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={economyConfig.workMax}
                    onChange={(e) => updateConfigField('workMax', parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Shop Role */}
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Crown className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {t('economy.shopSectionTitle') || 'Rol Premium de la Tienda'}
                </h2>
              </div>

              <RoleSelect
                label={t('economy.premiumRole') || 'Rol Otorgado al Comprar en Tienda'}
                helpText={
                  t('economy.premiumRoleHelp') ||
                  'Rol que se entregará automáticamente cuando un miembro adquiera el artículo Premium en /shop.'
                }
                roles={roles}
                value={economyConfig.premiumRoleId}
                onChange={(val) => updateConfigField('premiumRoleId', val)}
              />
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
                <span>{t('economy.saveButton') || 'Guardar Ajustes de Economía'}</span>
              </button>
            </div>
          </form>

          {/* Card 4: Top 10 Richest Members */}
          <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Medal className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('economy.leaderboardTitle') || 'Mayores Fortunas del Servidor (Top 10)'}
              </h2>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400 italic text-center">
                {t('economy.emptyLeaderboard') ||
                  'No hay registros de economía aún. El uso de comandos como /daily o /work llenará la tabla.'}
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
                        <div>
                          <span className="font-semibold text-sm text-slate-200 block">
                            {user.displayName || user.username}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Cartera: {user.wallet?.toLocaleString()} | Banco: {user.bank?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-amber-300 font-mono">
                          {user.netWorth?.toLocaleString()} {economyConfig.currencySymbol}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <EconomyPreview
            currencyName={economyConfig.currencyName}
            currencySymbol={economyConfig.currencySymbol}
            sampleBalance={economyConfig.startingBalance}
            serverName={currentGuild?.name}
          />
        </div>
      </div>
    </div>
  );
}
