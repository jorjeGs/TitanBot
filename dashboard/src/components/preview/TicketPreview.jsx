import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Hash,
  Ticket,
  Mail,
  Shield,
  Folder,
  Lock,
  Star,
  Pin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  MessageSquare,
  FileText,
} from 'lucide-react';

const PRESETS = [
  {
    id: 'general',
    name: 'Soporte General',
    emoji: '🎫',
    buttonLabel: 'Abrir Ticket',
    message: '¿Tienes alguna duda o necesitas ayuda de la administración? Haz clic en el botón de abajo para abrir un ticket privado con nuestro equipo.',
  },
  {
    id: 'billing',
    name: 'Tienda & Rango VIP',
    emoji: '💎',
    buttonLabel: 'Ticket de Compras',
    message: 'Atención exclusiva para compras de rangos, monedas o problemas de facturación. Ten a mano tu comprobante de pago.',
  },
  {
    id: 'reports',
    name: 'Reporte de Usuarios',
    emoji: '🚨',
    buttonLabel: 'Reportar Infracción',
    message: 'Reporta jugadores tóxicos, spam o infracciones a las reglas comunitarias. Adjunta capturas de pantalla o IDs para agilizar la revisión.',
  },
  {
    id: 'tech',
    name: 'Asistencia Técnica',
    emoji: '⚙️',
    buttonLabel: 'Soporte Técnico',
    message: '¿Problemas de conexión, desincronización de roles o fallos de comandos? Describe tu caso y un técnico te atenderá.',
  },
];

export function TicketPreview({
  panelMessage,
  buttonLabel,
  channelName,
  categoryName,
  staffRoleName,
  serverName,
  onSelectPreset,
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('panel'); // 'panel' | 'ticketChannel' | 'flow'

  const displayMessage =
    panelMessage?.trim() ||
    t('tickets.defaultPanelMessage', {
      defaultValue: 'Para abrir un ticket de soporte, haz clic en el botón de abajo. Nuestro equipo te responderá lo antes posible.',
    });

  const displayButtonLabel =
    buttonLabel?.trim() || t('tickets.defaultButtonLabel', { defaultValue: 'Crear Ticket' });

  return (
    <div className="bg-discord-darker/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-discord-blurple/10 border border-discord-blurple/30 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-discord-blurple" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {t('tickets.previewTitle', { defaultValue: 'Vista Previa en Tiempo Real' })}
              {channelName && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  <Hash className="w-3 h-3" />
                  <span>{channelName}</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {t('tickets.contentSectionHelp', { defaultValue: 'Comprueba cómo verán tus miembros el sistema de soporte.' })}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex rounded-xl bg-discord-dark p-1 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('panel')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'panel'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tickets.previewModes.panel', { defaultValue: 'Panel en Discord' })}
          </button>
          <button
            type="button"
            onClick={() => setMode('ticketChannel')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'ticketChannel'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tickets.previewModes.ticketChannel', { defaultValue: 'Canal Privado' })}
          </button>
          <button
            type="button"
            onClick={() => setMode('flow')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'flow'
                ? 'bg-discord-blurple text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tickets.previewModes.flow', { defaultValue: 'Ciclo de Vida' })}
          </button>
        </div>
      </div>

      {/* Quick Presets Bar (when in panel mode) */}
      {mode === 'panel' && onSelectPreset && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            {t('tickets.presetsTitle', { defaultValue: 'Plantillas Rápidas (1 Clic)' })}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset({ message: p.message, buttonLabel: p.buttonLabel })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-discord-dark border border-slate-800 hover:border-discord-blurple/50 text-slate-300 hover:text-white transition-all"
              >
                <span>{p.emoji}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode 1: Panel in Discord */}
      {mode === 'panel' && (
        <div className="flex items-start gap-3 bg-[#313338] p-4 rounded-xl border border-[#232428] font-sans shadow-inner">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-discord-blurple to-indigo-600 flex items-center justify-center shrink-0 shadow-md ring-2 ring-discord-blurple/30">
            <Bot className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {/* Bot info */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 hover:underline cursor-pointer">TitanBot</span>
              <span className="bg-[#5865F2] text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded leading-none">
                BOT
              </span>
              <span className="text-[11px] text-slate-400">Hoy a las 12:00</span>
            </div>

            {/* Embed Container */}
            <div className="border-l-4 border-[#5865f2] bg-[#2b2d31] p-3.5 rounded-r-lg space-y-2.5 shadow-sm max-w-xl">
              <div className="font-bold text-white text-sm leading-snug flex items-center gap-1.5">
                <span>🎫</span>
                <span>Sistema de Tickets de Soporte</span>
              </div>

              <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {displayMessage}
              </div>

              {/* Badges footer info */}
              <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-2 text-[11px] text-slate-400">
                {staffRoleName && (
                  <div className="flex items-center gap-1 bg-[#1e1f22] px-2 py-0.5 rounded border border-slate-800">
                    <Shield className="w-3 h-3 text-amber-400" />
                    <span>Staff: @{staffRoleName}</span>
                  </div>
                )}
                {categoryName && (
                  <div className="flex items-center gap-1 bg-[#1e1f22] px-2 py-0.5 rounded border border-slate-800">
                    <Folder className="w-3 h-3 text-blue-400" />
                    <span>Categoría: {categoryName}</span>
                  </div>
                )}
              </div>

              <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>TitanBot Tickets</span>
                <span>•</span>
                <span>{serverName || 'TitanBot Server'}</span>
              </div>
            </div>

            {/* Simulated Discord Button */}
            <div className="pt-0.5">
              <button
                type="button"
                className="bg-[#5865f2] hover:bg-[#4752c4] transition-colors text-white text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 shadow-md select-none"
              >
                <Mail className="w-4 h-4" />
                <span>{displayButtonLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Created Ticket Channel Simulation */}
      {mode === 'ticketChannel' && (
        <div className="bg-[#313338] p-4 rounded-xl border border-[#232428] font-sans shadow-inner space-y-3">
          {/* Simulated Channel Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-sm text-white">ticket-0042</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold uppercase">
                Abierto
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">ID: 10987654321</span>
          </div>

          {/* Simulated Staff Action Row */}
          <div className="p-3 bg-[#2b2d31] border-l-4 border-emerald-500 rounded-r-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-white text-xs">
                🎫 Ticket #0042 • Asistencia al Miembro
              </div>
              <span className="text-[10px] text-slate-400">Creado por @Alex_99</span>
            </div>
            <p className="text-xs text-slate-300">
              Gracias por abrir un ticket. Un miembro del equipo de staff te atenderá en breve.
            </p>

            {/* Simulated Staff Control Buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                className="px-2.5 py-1.5 bg-[#da373c] hover:bg-[#a1282c] text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
              >
                <Lock className="w-3 h-3" />
                <span>Cerrar Ticket</span>
              </button>

              <button
                type="button"
                className="px-2.5 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
              >
                <Star className="w-3 h-3 text-amber-400" />
                <span>Reclamar Ticket</span>
              </button>

              <button
                type="button"
                className="px-2.5 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
              >
                <Pin className="w-3 h-3 text-blue-400" />
                <span>Fijar</span>
              </button>
            </div>
          </div>

          {/* User chat message */}
          <div className="flex items-start gap-2.5 pt-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-white">Alex_99</span>
                <span className="text-[10px] text-slate-400">Hoy a las 12:01</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Hola, acabo de adquirir el rango VIP en la tienda y no se me ha asignado el rol en el servidor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Lifecycle Flow */}
      {mode === 'flow' && (
        <div className="bg-discord-dark/70 p-4 rounded-xl border border-slate-800 space-y-3 font-sans">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-discord-blurple" />
            <span>Ciclo de Vida Automático del Ticket</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-discord-darker rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-discord-blurple font-bold">
                <span>1. Creación con 1 Clic</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                El usuario pulsa el botón del panel y TitanBot crea al instante un canal de texto privado.
              </p>
            </div>

            <div className="p-3 bg-discord-darker rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span>2. Notificación al Staff</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                El rol de staff configurado recibe acceso inmediato con botones de control rápido.
              </p>
            </div>

            <div className="p-3 bg-discord-darker rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <span>3. Reclamación y Atención</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Un moderador puede reclamar el ticket con el botón ⭐ Reclamar para coordinar el caso.
              </p>
            </div>

            <div className="p-3 bg-discord-darker rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span>4. Transcripción y Cierre</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Al cerrar, se genera una transcripción HTML completa disponible en el panel web.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
