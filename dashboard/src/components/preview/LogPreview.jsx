import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Hash,
  Shield,
  MessageSquare,
  UserCheck,
  Users,
  Trophy,
  Gift,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';

const SAMPLES = {
  moderation: {
    color: '#ED4245',
    title: '🔨 Usuario Sancionado | Ban',
    description: 'El usuario ha sido expulsado permanentemente del servidor por infracción reiterada de las reglas comunitarias.',
    fields: [
      { name: 'Usuario', value: 'SpammerUser#1234 (ID: 109876543210123456)' },
      { name: 'Moderador', value: 'ServerAdmin#0001' },
      { name: 'Razón', value: 'Spam masivo de enlaces no autorizados' },
      { name: 'Duración', value: 'Permanente' },
    ],
    destination: 'audit',
  },
  message: {
    color: '#FEE75C',
    title: '✏️ Mensaje Editado | #charla-general',
    description: 'Se ha registrado una modificación en el contenido del mensaje enviado por el usuario.',
    fields: [
      { name: 'Autor', value: 'FriendlyUser#5678 (ID: 445566778899001122)' },
      { name: 'Canal', value: '#charla-general' },
      { name: 'Contenido previo', value: 'Hola amigos, vendo cosas ilegales por privado' },
      { name: 'Contenido nuevo', value: 'Hola amigos, ¿cómo están todos hoy?' },
    ],
    destination: 'audit',
  },
  role: {
    color: '#5865F2',
    title: '➕ Rol Actualizado | @Moderador',
    description: 'Se modificaron los permisos y la jerarquía del rol en los ajustes del servidor.',
    fields: [
      { name: 'Rol', value: '@Moderador (ID: 554433221100998877)' },
      { name: 'Modificado por', value: 'ServerOwner#0001' },
      { name: 'Permisos añadidos', value: '+ Gestionar Mensajes, + Silenciar Miembros' },
      { name: 'Color hexadecimal', value: '#3498DB' },
    ],
    destination: 'audit',
  },
  member: {
    color: '#57F287',
    title: '👋 Nuevo Miembro Unido al Servidor',
    description: 'Un nuevo usuario acaba de aterrizar en la comunidad.',
    fields: [
      { name: 'Usuario', value: 'Newbie#4321 (ID: 887766554433221100)' },
      { name: 'Antigüedad de cuenta', value: 'Hace 6 meses (15/03/2026)' },
      { name: 'Total de miembros', value: '1,420 miembros' },
    ],
    destination: 'audit',
  },
  leveling: {
    color: '#9B59B6',
    title: '📈 Subida de Nivel | @TopChatter',
    description: '¡El usuario ha ganado suficiente experiencia en el chat y ha alcanzado un nuevo hito!',
    fields: [
      { name: 'Usuario', value: 'TopChatter#9999 (ID: 223344556677889900)' },
      { name: 'Nuevo nivel', value: 'Nivel 25 (12,450 XP)' },
      { name: 'Recompensa desbloqueada', value: '@Élite de la Comunidad' },
    ],
    destination: 'audit',
  },
  giveaway: {
    color: '#F1C40F',
    title: '🎉 Ganador Seleccionado | Discord Nitro',
    description: 'El sorteo ha concluido exitosamente y el sistema ha elegido un ganador aleatorio.',
    fields: [
      { name: 'Premio', value: 'Discord Nitro (1 Mes)' },
      { name: 'Ganador', value: '@LuckyWinner#7777' },
      { name: 'Participantes', value: '84 miembros' },
    ],
    destination: 'reports',
  },
};

const TIMELINE_STREAM = [
  {
    cat: 'moderation',
    icon: Shield,
    color: '#ED4245',
    title: '🔨 Ban: SpammerUser#1234',
    time: 'Hace 2 min',
    desc: 'Baneado por ServerAdmin#0001 (Razón: Spam no autorizado)',
  },
  {
    cat: 'message',
    icon: MessageSquare,
    color: '#FEE75C',
    title: '✏️ Mensaje editado en #general',
    time: 'Hace 5 min',
    desc: 'FriendlyUser#5678 modificó su mensaje de texto.',
  },
  {
    cat: 'member',
    icon: Users,
    color: '#57F287',
    title: '👋 Entrada: Newbie#4321',
    time: 'Hace 12 min',
    desc: 'Se unió al servidor. Ahora somos 1,420 miembros.',
  },
];

export function LogPreview({
  auditChannelName,
  reportsChannelName,
  applicationsChannelName,
  onTriggerTest,
  isTesting = false,
}) {
  const { t } = useTranslation();
  const [selectedCat, setSelectedCat] = useState('moderation');
  const [mode, setMode] = useState('embed'); // 'embed' | 'timeline' | 'permissions'

  const currentSample = SAMPLES[selectedCat] || SAMPLES.moderation;

  const targetChannelName =
    currentSample.destination === 'reports'
      ? reportsChannelName || 'reportes-sorteos'
      : currentSample.destination === 'applications'
      ? applicationsChannelName || 'postulaciones'
      : auditChannelName || 'auditoria-logs';

  const categoryButtons = [
    { id: 'moderation', label: t('logging.categories.moderation', { defaultValue: 'Moderación' }), icon: Shield, color: 'text-red-400' },
    { id: 'message', label: t('logging.categories.message', { defaultValue: 'Mensajes' }), icon: MessageSquare, color: 'text-yellow-400' },
    { id: 'role', label: t('logging.categories.role', { defaultValue: 'Roles' }), icon: UserCheck, color: 'text-blue-400' },
    { id: 'member', label: t('logging.categories.member', { defaultValue: 'Miembros' }), icon: Users, color: 'text-emerald-400' },
    { id: 'leveling', label: t('logging.categories.leveling', { defaultValue: 'Niveles' }), icon: Trophy, color: 'text-purple-400' },
    { id: 'giveaway', label: t('logging.categories.giveaway', { defaultValue: 'Sorteos' }), icon: Gift, color: 'text-amber-400' },
  ];

  return (
    <div className="bg-discord-darker/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-discord-blurple/10 border border-discord-blurple/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-discord-blurple" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {t('logging.previewTitle', { defaultValue: 'Vista Previa de Registros' })}
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                <Hash className="w-3 h-3" />
                <span>{targetChannelName}</span>
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {t('logging.previewSubtitle', { defaultValue: 'Comprueba el formato visual del mensaje antes de que se publique en Discord.' })}
            </p>
          </div>
        </div>

        {/* Mode selector & Test Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="inline-flex rounded-xl bg-discord-dark p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('embed')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'embed'
                  ? 'bg-discord-blurple text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('logging.previewModes.embed', { defaultValue: 'Embed Discord' })}
            </button>
            <button
              type="button"
              onClick={() => setMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'timeline'
                  ? 'bg-discord-blurple text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('logging.previewModes.timeline', { defaultValue: 'Línea de Tiempo' })}
            </button>
            <button
              type="button"
              onClick={() => setMode('permissions')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'permissions'
                  ? 'bg-discord-blurple text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('logging.previewModes.permissions', { defaultValue: 'Permisos del Bot' })}
            </button>
          </div>

          {onTriggerTest && (
            <button
              type="button"
              onClick={() => onTriggerTest({ category: selectedCat, destination: currentSample.destination })}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all disabled:opacity-50"
              title="Disparar registro real de prueba a Discord"
            >
              <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{t('logging.testButton', { defaultValue: 'Probar en Discord' })}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (Visible when in Embed mode) */}
      {mode === 'embed' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {categoryButtons.map((btn) => {
            const Icon = btn.icon;
            const isActive = selectedCat === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedCat(btn.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-discord-dark border border-slate-700 text-white shadow-sm ring-1 ring-discord-blurple/50'
                    : 'bg-discord-dark/50 hover:bg-discord-dark text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${btn.color}`} />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content Mode 1: Embed */}
      {mode === 'embed' && (
        <div className="flex items-start gap-3 bg-[#313338] p-4 rounded-xl border border-[#232428] font-sans shadow-inner">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center shrink-0 shadow-md ring-2 ring-indigo-500/30">
            <Bot className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Header info */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 hover:underline cursor-pointer">TitanBot</span>
              <span className="bg-[#5865F2] text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded leading-none">
                BOT
              </span>
              <span className="text-[11px] text-slate-400">Hoy a las 14:30</span>
            </div>

            {/* Embed Container */}
            <div
              className="border-l-4 bg-[#2b2d31] p-3.5 rounded-r-lg space-y-2.5 shadow-sm max-w-xl"
              style={{ borderColor: currentSample.color }}
            >
              <div className="font-bold text-white text-sm leading-snug">
                {currentSample.title}
              </div>

              {currentSample.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentSample.description}
                </p>
              )}

              {/* Embed Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {currentSample.fields.map((f, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {f.name}
                    </div>
                    <div className="text-slate-200 font-mono text-[11px] bg-[#1e1f22] p-1.5 rounded border border-slate-700/40">
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Embed Footer */}
              <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex items-center justify-between">
                <span>TitanBot Logging System • Verificado</span>
                <span>Hoy a las 14:30:12</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Mode 2: Timeline Stream */}
      {mode === 'timeline' && (
        <div className="bg-[#313338] p-4 rounded-xl border border-[#232428] space-y-3 font-sans">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Simulación de Flujo Reciente en #{targetChannelName}</span>
          </div>

          <div className="space-y-2.5">
            {TIMELINE_STREAM.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[#2b2d31] border-l-4 hover:bg-[#35373c] transition-colors"
                  style={{ borderColor: item.color }}
                >
                  <div className="p-1.5 rounded bg-black/20 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Mode 3: Permissions Diagnostics */}
      {mode === 'permissions' && (
        <div className="bg-discord-dark/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              {t('logging.permissionsGuide.title', { defaultValue: 'Permisos de Discord Requeridos' })}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-discord-darker border border-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">
                  {t('logging.permissionsGuide.viewChannel', { defaultValue: 'Ver Canal (ViewChannel)' })}
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  {t('logging.permissionsGuide.viewChannelDesc', { defaultValue: 'Requerido para leer el canal de registros.' })}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-discord-darker border border-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">
                  {t('logging.permissionsGuide.sendMessages', { defaultValue: 'Enviar Mensajes (SendMessages)' })}
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  {t('logging.permissionsGuide.sendMessagesDesc', { defaultValue: 'Permite al bot despachar los registros de auditoría.' })}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-discord-darker border border-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">
                  {t('logging.permissionsGuide.embedLinks', { defaultValue: 'Insertar Enlaces (EmbedLinks)' })}
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  {t('logging.permissionsGuide.embedLinksDesc', { defaultValue: 'Obligatorio para que los embeds coloreados se vean en Discord.' })}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-discord-darker border border-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">
                  {t('logging.permissionsGuide.viewAuditLog', { defaultValue: 'Ver Registro de Auditoría (ViewAuditLog)' })}
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  {t('logging.permissionsGuide.viewAuditLogDesc', { defaultValue: 'Permite a TitanBot identificar qué moderador ejecutó la sanción.' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
