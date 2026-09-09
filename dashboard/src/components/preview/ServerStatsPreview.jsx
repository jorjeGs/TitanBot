import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Volume2,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Bot,
  Lock,
  Hash,
  Sparkles,
  Shield,
  Zap,
  FolderTree,
  PieChart,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export function ServerStatsPreview({
  stats = { totalCount: 1420, humanCount: 1385, botCount: 35 },
  enabledTypes,
  counters,
  categoryName = '📊 Estadísticas',
  serverName,
  channelStyle = 'classic', // 'classic' | 'modern' | 'minimal' | 'gamer'
}) {
  const { t } = useTranslation();
  const [previewMode, setPreviewMode] = useState('tree'); // 'tree' | 'serverinfo' | 'distribution'
  const [categoryOpen, setCategoryOpen] = useState(true);

  // Harmonize props: support both enabledTypes and counters
  const activeTypes = enabledTypes || counters || ['members', 'members_only', 'bots'];

  const baseTotal = stats.totalCount || 1420;
  const [simulatedTotal, setSimulatedTotal] = useState(baseTotal);

  React.useEffect(() => {
    if (stats.totalCount && simulatedTotal === 1420) {
      setSimulatedTotal(stats.totalCount);
    }
  }, [stats.totalCount]);

  // Compute proportional humans and bots
  const botRatio = stats.totalCount > 0 ? (stats.botCount || 0) / stats.totalCount : 0.03;
  const simulatedBots = Math.max(1, Math.round(simulatedTotal * (botRatio || 0.03)));
  const simulatedHumans = Math.max(0, simulatedTotal - simulatedBots);
  const humanPercent = Math.round((simulatedHumans / simulatedTotal) * 100) || 97;
  const botPercent = 100 - humanPercent;

  // Format channel name based on style preset
  const formatName = (type) => {
    let count = simulatedTotal;
    if (type === 'members_only') count = simulatedHumans;
    if (type === 'bots') count = simulatedBots;

    const formattedCount = count >= 10000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();

    switch (channelStyle) {
      case 'modern':
        if (type === 'members') return `[👥] Total・${formattedCount}`;
        if (type === 'members_only') return `[👤] Usuarios・${formattedCount}`;
        return `[🤖] Bots・${formattedCount}`;
      case 'minimal':
        if (type === 'members') return `👥 ${formattedCount}`;
        if (type === 'members_only') return `👤 ${formattedCount}`;
        return `🤖 ${formattedCount}`;
      case 'gamer':
        if (type === 'members') return `⚡ Comunidad: ${formattedCount}`;
        if (type === 'members_only') return `🎮 Jugadores: ${formattedCount}`;
        return `👾 Androides: ${formattedCount}`;
      case 'classic':
      default:
        if (type === 'members') return `👥 Miembros: ${formattedCount}`;
        if (type === 'members_only') return `👤 Humanos: ${formattedCount}`;
        return `🤖 Bots: ${formattedCount}`;
    }
  };

  const memberPresets = [150, 1500, 10000, 50000, 100000];

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-2xl p-4 shadow-xl space-y-4 font-sans">
      {/* Top Header & Mode Switcher */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t('serverstats.previewTitle') || 'Vista Previa en Tiempo Real'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              {activeTypes.length} contadores
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
            {serverName || 'TitanBot'}
          </span>
        </div>

        {/* 3 Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPreviewMode('tree')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              previewMode === 'tree'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span className="truncate">{t('serverstats.previewModes.tree') || 'Canales'}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('serverinfo')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              previewMode === 'serverinfo'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="truncate">{t('serverstats.previewModes.serverinfo') || '/serverinfo'}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('distribution')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              previewMode === 'distribution'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span className="truncate">{t('serverstats.previewModes.distribution') || 'Composición'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulator Slider */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('serverstats.previewTestMembers') || 'Simular Miembros:'}</span>
          </span>
          <span className="font-mono font-bold text-emerald-400">
            {simulatedTotal.toLocaleString()} miembros
          </span>
        </div>

        <input
          type="range"
          min={10}
          max={100000}
          step={50}
          value={simulatedTotal}
          onChange={(e) => setSimulatedTotal(parseInt(e.target.value, 10) || 10)}
          className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />

        {/* Quick member pills */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {memberPresets.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setSimulatedTotal(amt)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                simulatedTotal === amt
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
            >
              {amt >= 1000 ? `${amt / 1000}k` : amt}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: Discord Channels Sidebar Mock */}
      {previewMode === 'tree' && (
        <div className="bg-[#1e1f22] p-3 rounded-xl border border-slate-800/80 font-sans space-y-2 shadow-inner animate-in fade-in duration-200">
          {/* Category Header */}
          <button
            type="button"
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider px-1 py-1 rounded transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-1">
              {categoryOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform" />
              )}
              <span className="truncate">{categoryName || '📊 Estadísticas'}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono lowercase">locked</span>
          </button>

          {/* Collapsible channels list */}
          {categoryOpen && (
            <div className="space-y-1 pl-2 animate-in fade-in duration-150">
              {activeTypes.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 italic bg-slate-900/40 rounded border border-dashed border-slate-800">
                  Ningún contador seleccionado. Elige al menos uno a la izquierda.
                </div>
              ) : (
                activeTypes.map((type) => (
                  <div
                    key={type}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs bg-[#2b2d31]/90 text-slate-200 border border-slate-700/40 hover:bg-[#35373c] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate font-medium">{formatName(type)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                      <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>
                ))
              )}

              {/* Decorative normal text channels below */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1 opacity-60">
                <div className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-400">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>anuncios</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-400">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>general</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-500 px-1 pt-1 italic">
            * Los contadores son canales de voz bloqueados que no permiten conectarse para hablar.
          </p>
        </div>
      )}

      {/* MODE 2: /serverinfo Discord Card Mock */}
      {previewMode === 'serverinfo' && (
        <div className="bg-[#2b2d31] p-3.5 rounded-xl border border-slate-700/60 font-sans space-y-3 shadow-inner animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-md">
              {(serverName || 'TB').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{serverName || 'TitanBot Server'}</h3>
              <span className="text-[11px] text-emerald-400 font-mono">ID: 8879462310549210</span>
            </div>
          </div>

          {/* Embed Fields */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#1e1f22] p-2.5 rounded-lg border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-medium">👥 Miembros Totales</span>
              <span className="font-bold text-white font-mono text-sm">
                {simulatedTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {simulatedHumans.toLocaleString()} humanos • {simulatedBots} bots
              </span>
            </div>

            <div className="bg-[#1e1f22] p-2.5 rounded-lg border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-medium">🚀 Nivel de Boost</span>
              <span className="font-bold text-pink-400 font-mono text-sm">Nivel 2</span>
              <span className="text-[10px] text-slate-500 block">8 mejoras activas</span>
            </div>

            <div className="bg-[#1e1f22] p-2.5 rounded-lg border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-medium">💬 Canales</span>
              <span className="font-bold text-white font-mono text-sm">
                {activeTypes.length + 8} en total
              </span>
              <span className="text-[10px] text-slate-500 block">
                {activeTypes.length} contadores activos
              </span>
            </div>

            <div className="bg-[#1e1f22] p-2.5 rounded-lg border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-medium">🛡️ Roles</span>
              <span className="font-bold text-white font-mono text-sm">18 roles</span>
              <span className="text-[10px] text-emerald-400 block">TitanBot en línea</span>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: Community Composition & Proportions */}
      {previewMode === 'distribution' && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3.5 font-sans animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Composición de la Comunidad</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {simulatedTotal.toLocaleString()} total
            </span>
          </div>

          {/* Distribution Stacked Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/50">
              <div
                style={{ width: `${humanPercent}%` }}
                className="h-full bg-emerald-500 transition-all duration-300"
                title={`Humanos: ${humanPercent}%`}
              />
              <div
                style={{ width: `${botPercent}%` }}
                className="h-full bg-purple-500 transition-all duration-300"
                title={`Bots: ${botPercent}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Humanos: <strong>{humanPercent}%</strong> ({simulatedHumans.toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                <span>Bots: <strong>{botPercent}%</strong> ({simulatedBots})</span>
              </div>
            </div>
          </div>

          {/* Health Badge */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Salud de la Comunidad</span>
              <span className="text-[11px] text-slate-400">
                {botPercent <= 10
                  ? 'Excelente proporción: La comunidad está compuesta casi en su totalidad por usuarios reales.'
                  : 'Presencia moderada de automatizaciones y bots utilitarios.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

