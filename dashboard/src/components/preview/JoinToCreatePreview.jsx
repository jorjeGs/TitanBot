import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Volume2,
  ChevronDown,
  PlusCircle,
  Users,
  Lock,
  Crown,
  Mic,
  Headphones,
  PhoneOff,
  Radio,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Share2,
} from 'lucide-react';

export function JoinToCreatePreview({
  channelNameTemplate = "{username}'s Room",
  userLimit = 0,
  bitrate = 64000,
  categoryName = '🔊 SALAS DE VOZ PRIVADAS',
  triggerChannelName = '➕ Entra para Crear Sala',
  serverName = 'TitanBot Server',
}) {
  const { t } = useTranslation();
  const [previewMode, setPreviewMode] = useState('channels'); // 'channels' | 'voiceUi' | 'flow'
  const [simulatedUser, setSimulatedUser] = useState('GamerPro');

  const formattedName = (channelNameTemplate || "{username}'s Room")
    .replace(/{username}/g, simulatedUser)
    .replace(/{user_tag}/g, `${simulatedUser}#0001`)
    .replace(/{displayName}/g, simulatedUser)
    .replace(/{display_name}/g, simulatedUser)
    .replace(/{guildName}/g, serverName || 'Servidor')
    .replace(/{guild_name}/g, serverName || 'Servidor')
    .replace(/{channelName}/g, triggerChannelName || 'Crear Sala')
    .replace(/{channel_name}/g, triggerChannelName || 'Crear Sala');

  const bitrateKbps = Math.round((bitrate || 64000) / 1000);

  return (
    <div className="bg-discord-darker border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-discord-blurple animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {t('jointocreate.previewTitle') || 'Vista Previa en Tiempo Real'}
          </span>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center bg-discord-dark p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => setPreviewMode('channels')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              previewMode === 'channels'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('jointocreate.previewModes.channels') || 'Canales'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('voiceUi')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              previewMode === 'voiceUi'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('jointocreate.previewModes.voiceUi') || 'Voz'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('flow')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              previewMode === 'flow'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('jointocreate.previewModes.flow') || 'Flujo'}
          </button>
        </div>
      </div>

      {/* Interactive Name Simulator Strip */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-discord-dark/70 border border-slate-800 text-xs">
        <span className="text-slate-400 font-medium shrink-0">
          {t('jointocreate.previewSimulateUser') || 'Probar con usuario:'}
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['GamerPro', 'Alex_99', 'Valeria', 'CyberKnight'].map((uname) => (
            <button
              key={uname}
              type="button"
              onClick={() => setSimulatedUser(uname)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                simulatedUser === uname
                  ? 'bg-discord-blurple text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {uname}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: Discord Channels Sidebar Mock */}
      {previewMode === 'channels' && (
        <div className="bg-[#1e1f22] p-3.5 rounded-xl border border-slate-800 font-sans space-y-2 shadow-inner animate-in fade-in duration-200">
          {/* Category Header */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">{categoryName || '🔊 SALAS DE VOZ PRIVADAS'}</span>
          </div>

          {/* Channels List */}
          <div className="space-y-1 pl-1">
            {/* Trigger Voice Channel */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs bg-discord-blurple/15 text-discord-blurple border border-discord-blurple/30 font-medium">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <PlusCircle className="w-4 h-4 shrink-0 text-discord-blurple" />
                <span className="truncate font-semibold">{triggerChannelName || '➕ Entra para Crear Sala'}</span>
              </div>
              <span className="text-[9px] bg-discord-blurple/25 text-discord-blurple font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                Disparador
              </span>
            </div>

            {/* Generated Temporary Channel */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs bg-[#2b2d31] text-slate-200 border border-emerald-500/30 ml-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate font-semibold text-white">{formattedName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-400 font-mono">
                  {bitrateKbps} kbps
                </span>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>1/{userLimit > 0 ? userLimit : '∞'}</span>
                </div>
              </div>
            </div>

            {/* Connected User Mock */}
            <div className="flex items-center gap-2 px-3 py-1 ml-6 text-xs text-slate-300">
              <div className="relative w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px] text-white ring-2 ring-emerald-400">
                {simulatedUser.slice(0, 1)}
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#1e1f22]" />
              </div>
              <span className="font-medium text-slate-200">{simulatedUser}</span>
              <Crown className="w-3 h-3 text-amber-400 shrink-0" title="Propietario de la sala" />
            </div>

            {/* Decorative text channel */}
            <div className="pt-2 border-t border-slate-800/60 opacity-50 space-y-1">
              <div className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-400">
                <span className="text-slate-500 font-mono">#</span>
                <span>chat-general</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 px-1 pt-1 italic">
            * El usuario es transferido automáticamente en &lt; 1s al entrar al canal disparador.
          </p>
        </div>
      )}

      {/* MODE 2: Voice Room Interior UI */}
      {previewMode === 'voiceUi' && (
        <div className="bg-[#1e1f22] p-4 rounded-xl border border-slate-800 font-sans space-y-4 shadow-inner animate-in fade-in duration-200">
          {/* Room Title & Status Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="font-bold text-sm text-white truncate">{formattedName}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
                {bitrateKbps} kbps HD
              </span>
              <span className="text-xs font-mono text-slate-400">
                1/{userLimit > 0 ? userLimit : '∞'}
              </span>
            </div>
          </div>

          {/* Participant Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#2b2d31] border-2 border-emerald-500/80 flex flex-col items-center justify-center gap-2 relative shadow-lg shadow-emerald-500/10">
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-bold">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Dueño</span>
              </div>

              {/* Avatar with speaking ring */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md ring-4 ring-emerald-400 animate-pulse">
                {simulatedUser.slice(0, 2).toUpperCase()}
              </div>

              <div className="text-center">
                <span className="font-bold text-sm text-white block">{simulatedUser}</span>
                <span className="text-[11px] text-emerald-400 font-medium">Hablando...</span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <div className="p-1.5 rounded-lg bg-[#1e1f22] text-slate-300">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <div className="p-1.5 rounded-lg bg-[#1e1f22] text-slate-300">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Empty Slot Card */}
            <div className="p-4 rounded-xl bg-[#2b2d31]/40 border border-dashed border-slate-700/60 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {userLimit > 0 ? `Espacio disponible (${userLimit - 1} libres)` : 'Espacio ilimitado'}
              </span>
              <span className="text-[10px] text-slate-500">Los miembros pueden unirse libremente</span>
            </div>
          </div>

          {/* Action Simulation Bar */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
              <Mic className="w-4 h-4" />
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
              <PhoneOff className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: Step-by-Step Lifecycle Flow */}
      {previewMode === 'flow' && (
        <div className="space-y-3 font-sans animate-in fade-in duration-200">
          {[
            {
              step: '1',
              title: t('jointocreate.lifecycle1Title') || '1. Entrada al Disparador',
              desc: t('jointocreate.lifecycle1Text') || 'El miembro entra al canal de voz disparador (ej. ➕ Crear Sala).',
              badge: 'Entrada',
              color: 'text-discord-blurple',
              bg: 'bg-discord-blurple/10 border-discord-blurple/30',
            },
            {
              step: '2',
              title: t('jointocreate.lifecycle2Title') || '2. Creación Inmediata',
              desc: t('jointocreate.lifecycle2Text') || 'TitanBot crea la sala privada y mueve al usuario en menos de 1 segundo.',
              badge: '< 1 seg',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/30',
            },
            {
              step: '3',
              title: t('jointocreate.lifecycle3Title') || '3. Control y Propiedad',
              desc: t('jointocreate.lifecycle3Text') || 'El usuario es dueño de su sala. Si sale, la propiedad pasa al siguiente miembro.',
              badge: '👑 Dueño',
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/30',
            },
            {
              step: '4',
              title: t('jointocreate.lifecycle4Title') || '4. Autolimpieza',
              desc: t('jointocreate.lifecycle4Text') || 'Cuando todos abandonan la sala, TitanBot la elimina automáticamente.',
              badge: 'Auto-delete',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 border-purple-500/30',
            },
          ].map((item) => (
            <div
              key={item.step}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${item.bg}`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 font-mono ${item.color} bg-discord-dark`}
              >
                {item.step}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-bold text-xs text-white truncate">{item.title}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-discord-dark ${item.color}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default JoinToCreatePreview;
