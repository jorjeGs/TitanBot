import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Coins,
  Wallet,
  Landmark,
  TrendingUp,
  ShoppingBag,
  User,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Crown,
  Flame,
  Briefcase,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';

export function EconomyPreview({
  currencyName = 'coins',
  currencySymbol = '🪙',
  sampleBalance = 1000,
  serverName,
  shopItems = [],
  premiumRoleName = '',
  premiumRoleColor = '#a855f7',
}) {
  const { t } = useTranslation();
  const [previewMode, setPreviewMode] = useState('wallet'); // 'wallet' | 'shop' | 'card'
  const [testBalance, setTestBalance] = useState(sampleBalance || 1000);
  const [shopPage, setShopPage] = useState(1);

  // Sync testBalance if sampleBalance changes and testBalance was at default
  React.useEffect(() => {
    if (sampleBalance && testBalance === 1000) {
      setTestBalance(sampleBalance);
    }
  }, [sampleBalance]);

  const bankCapacity = 10000;
  const simulatedBank = Math.min(bankCapacity, Math.floor(testBalance * 1.5));
  const simulatedNetWorth = testBalance + simulatedBank;
  const bankPercent = Math.min(100, Math.round((simulatedBank / bankCapacity) * 100));

  // Default shop items fallback if backend hasn't provided them yet
  const defaultItems = [
    {
      id: 'premium_role',
      name: premiumRoleName || 'Rol VIP Servidor',
      price: 15000,
      type: 'role',
      description: 'Rol especial con color distinguido y 10% extra en /daily.',
    },
    {
      id: 'lucky_clover',
      name: 'Trébol de la Suerte',
      price: 10000,
      type: 'consumable',
      description: 'Aumenta un 50% las probabilidades de ganar en /gamble.',
    },
    {
      id: 'diamond_pickaxe',
      name: 'Pico de Diamante',
      price: 50000,
      type: 'tool',
      description: 'Duplica el mineral obtenido al usar /mine.',
    },
    {
      id: 'personal_safe',
      name: 'Caja Fuerte Personal',
      price: 30000,
      type: 'tool',
      description: 'Protege permanentemente tus fondos contra robos con /rob.',
    },
    {
      id: 'laptop',
      name: 'Laptop Gamer',
      price: 15000,
      type: 'tool',
      description: 'Aumenta un 50% las ganancias en /work.',
    },
  ];

  const itemsToDisplay = shopItems && shopItems.length > 0 ? shopItems : defaultItems;
  const itemsPerPage = 3;
  const totalPages = Math.ceil(itemsToDisplay.length / itemsPerPage) || 1;
  const currentShopItems = itemsToDisplay.slice((shopPage - 1) * itemsPerPage, shopPage * itemsPerPage);

  const balancePresets = [100, 1000, 5000, 25000, 100000];

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Top Header & Mode Switcher */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t('economy.previewTitle') || 'Vista Previa en Vivo'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              {currencySymbol} {currencyName}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
            {serverName || 'TitanBot Server'}
          </span>
        </div>

        {/* 3 View Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPreviewMode('wallet')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              previewMode === 'wallet'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="truncate">{t('economy.previewModeWallet') || 'Cartera'}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('shop')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              previewMode === 'shop'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="truncate">{t('economy.previewModeShop') || 'Tienda'}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('card')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              previewMode === 'card'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{t('economy.previewModeCard') || 'Perfil'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Test Balance Control */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('economy.previewTestBalance') || 'Simular Saldo:'}</span>
          </span>
          <span className="font-mono font-bold text-amber-300">
            {testBalance.toLocaleString()} {currencySymbol}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100000}
          step={500}
          value={testBalance}
          onChange={(e) => setTestBalance(parseInt(e.target.value, 10) || 0)}
          className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />

        {/* Quick balance pills */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {balancePresets.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setTestBalance(amt)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                testBalance === amt
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
            >
              {amt >= 1000 ? `${amt / 1000}k` : amt}
            </button>
          ))}
        </div>
      </div>

      {/* View 1: Wallet / Balance Discord Embed Mock */}
      {previewMode === 'wallet' && (
        <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-xl border border-slate-700/40 font-sans shadow-inner animate-in fade-in duration-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shrink-0 shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-slate-100">TitanBot</span>
              <span className="bg-discord-blurple text-[9px] uppercase font-bold text-white px-1 py-0.2 rounded">
                BOT
              </span>
              <span className="text-[10px] text-slate-400">Hoy a las 16:20</span>
            </div>

            {/* Embed */}
            <div className="border-l-4 border-amber-400 bg-[#2b2d31] p-3 rounded-r-lg space-y-2.5 shadow-sm text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>Balance económico de GamerPro</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#1e1f22] p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">En Mano (Cartera)</span>
                  <span className="text-white font-bold text-sm font-mono">
                    {testBalance.toLocaleString()} {currencySymbol}
                  </span>
                </div>

                <div className="bg-[#1e1f22] p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Banco / Seguro</span>
                  <span className="text-white font-bold text-sm font-mono">
                    {simulatedBank.toLocaleString()} / {bankCapacity.toLocaleString()} {currencySymbol}
                  </span>
                </div>
              </div>

              <div className="bg-[#1e1f22] p-2 rounded border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-medium">Patrimonio Total:</span>
                </div>
                <span className="text-amber-300 font-bold text-sm font-mono">
                  {simulatedNetWorth.toLocaleString()} {currencySymbol}
                </span>
              </div>

              {/* Simulated buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex-1 text-center py-1 rounded bg-[#4e5058] hover:bg-[#6d6f78] text-[10px] font-medium text-white transition-colors cursor-default">
                  Depositar
                </div>
                <div className="flex-1 text-center py-1 rounded bg-[#4e5058] hover:bg-[#6d6f78] text-[10px] font-medium text-white transition-colors cursor-default">
                  Retirar
                </div>
                <div className="flex-1 text-center py-1 rounded bg-[#248046] hover:bg-[#1a6334] text-[10px] font-medium text-white transition-colors cursor-default flex items-center justify-center gap-1">
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Transferir</span>
                </div>
              </div>

              {/* Embed Footer */}
              <div className="pt-1 text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
                <span>TitanBot Economy • {currencyName}</span>
                <span>•</span>
                <span>{serverName || 'TitanBot'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Shop Discord Embed Mock */}
      {previewMode === 'shop' && (
        <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-xl border border-slate-700/40 font-sans shadow-inner animate-in fade-in duration-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shrink-0 shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-slate-100">TitanBot</span>
              <span className="bg-discord-blurple text-[9px] uppercase font-bold text-white px-1 py-0.2 rounded">
                BOT
              </span>
              <span className="text-[10px] text-slate-400">Hoy a las 16:20</span>
            </div>

            {/* Shop Embed */}
            <div className="border-l-4 border-emerald-500 bg-[#2b2d31] p-3 rounded-r-lg space-y-2.5 shadow-sm text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Tienda de {serverName || 'TitanBot'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Página {shopPage} de {totalPages}
                </span>
              </div>

              <p className="text-[11px] text-slate-300">
                Usa <code className="bg-[#1e1f22] px-1 py-0.5 rounded text-amber-300">/buy &lt;item&gt;</code> para adquirir cualquier artículo.
              </p>

              {/* Items List */}
              <div className="space-y-2">
                {currentShopItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-[#1e1f22] rounded border border-slate-800 space-y-1 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {item.type === 'role' ? (
                          <Crown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : item.type === 'tool' ? (
                          <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span
                          className="font-bold text-xs"
                          style={{ color: item.type === 'role' && premiumRoleColor ? premiumRoleColor : '#f1f5f9' }}
                        >
                          {item.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">({item.id})</span>
                      </div>
                      <span className="font-mono font-bold text-amber-300 text-[11px]">
                        {currencySymbol} {item.price?.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{item.description}</p>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={shopPage === 1}
                  onClick={() => setShopPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded bg-[#4e5058] hover:bg-[#6d6f78] disabled:opacity-40 text-[10px] font-medium text-white flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Anterior</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  {shopPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={shopPage === totalPages}
                  onClick={() => setShopPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded bg-[#4e5058] hover:bg-[#6d6f78] disabled:opacity-40 text-[10px] font-medium text-white flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Embed Footer */}
              <div className="pt-1 text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
                <span>{itemsToDisplay.length} artículos en venta</span>
                <span>•</span>
                <span>{serverName || 'TitanBot'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Gamer Economy Profile Card Mock */}
      {previewMode === 'card' && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3.5 relative overflow-hidden font-sans animate-in fade-in duration-200">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* User Header */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 p-0.5 shadow-lg">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-bold text-amber-300 text-base">
                  GP
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-slate-900 shadow">
                #1
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm truncate">GamerPro</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.2 rounded-full border truncate max-w-[110px]"
                  style={{
                    backgroundColor: `${premiumRoleColor}20`,
                    borderColor: `${premiumRoleColor}40`,
                    color: premiumRoleColor || '#c084fc',
                  }}
                >
                  {premiumRoleName || 'VIP Member'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Magnate del Servidor</span>
            </div>
          </div>

          {/* Main Net Worth Banner */}
          <div className="p-3 bg-slate-900/80 rounded-xl border border-amber-500/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Patrimonio Neto
              </span>
              <div className="text-xl font-black text-amber-300 font-mono tracking-tight">
                {simulatedNetWorth.toLocaleString()} <span className="text-sm">{currencySymbol}</span>
              </div>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          {/* Wallet & Bank Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>En Mano</span>
              </div>
              <div className="font-mono font-bold text-white text-sm">
                {testBalance.toLocaleString()} {currencySymbol}
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Landmark className="w-3.5 h-3.5 text-blue-400" />
                <span>En Banco ({bankPercent}%)</span>
              </div>
              <div className="font-mono font-bold text-white text-sm">
                {simulatedBank.toLocaleString()} {currencySymbol}
              </div>
            </div>
          </div>

          {/* Bank progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Capacidad Bancaria</span>
              <span className="font-mono">{simulatedBank.toLocaleString()} / {bankCapacity.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${bankPercent}%` }}
              />
            </div>
          </div>

          {/* Chips */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Racha: <strong className="text-white">7 días</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trabajos: <strong className="text-white">18 hechos</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

