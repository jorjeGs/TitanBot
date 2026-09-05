import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, Shield, MessageSquare, UserCheck, Users, Trophy, Gift } from 'lucide-react';

const SAMPLES = {
  moderation: {
    color: '#ED4245',
    title: '🔨 Usuario Sancionado | Ban',
    fields: [
      { name: 'Usuario', value: 'SpammerUser#1234 (ID: 109876543210123456)' },
      { name: 'Moderador', value: 'ServerAdmin#0001' },
      { name: 'Razón', value: 'Spam masivo de enlaces sospechosos' },
    ],
    destination: 'audit',
  },
  message: {
    color: '#FEE75C',
    title: '✏️ Mensaje Editado | #general',
    fields: [
      { name: 'Autor', value: 'FriendlyUser#5678' },
      { name: 'Contenido previo', value: 'Mensaje original con un error de tipeo' },
      { name: 'Contenido nuevo', value: 'Mensaje corregido y limpio' },
    ],
    destination: 'audit',
  },
  role: {
    color: '#5865F2',
    title: '➕ Rol Actualizado | @Moderador',
    fields: [
      { name: 'Rol', value: '@Moderador (ID: 554433221100998877)' },
      { name: 'Modificado por', value: 'ServerOwner#0001' },
      { name: 'Cambios', value: '+ Gestionar Mensajes, + Silenciar Miembros' },
    ],
    destination: 'audit',
  },
  member: {
    color: '#57F287',
    title: '👋 Miembro Unido al Servidor',
    fields: [
      { name: 'Usuario', value: 'Newbie#4321 (ID: 887766554433221100)' },
      { name: 'Cuenta creada', value: 'Hace 6 meses (15/03/2026)' },
      { name: 'Recuento actual', value: '1,420 miembros' },
    ],
    destination: 'audit',
  },
  leveling: {
    color: '#9B59B6',
    title: '📈 Subida de Nivel | @TopChatter',
    fields: [
      { name: 'Usuario', value: 'TopChatter#9999' },
      { name: 'Nuevo nivel', value: 'Nivel 25 (12,450 XP)' },
      { name: 'Rol desbloqueado', value: '@Élite de la Comunidad' },
    ],
    destination: 'audit',
  },
  giveaway: {
    color: '#F1C40F',
    title: '🎉 Ganador Seleccionado | Discord Nitro',
    fields: [
      { name: 'Premio', value: 'Discord Nitro (1 Mes)' },
      { name: 'Ganador', value: '@LuckyWinner#7777' },
      { name: 'Participantes', value: '84 miembros' },
    ],
    destination: 'reports',
  },
};

export function LogPreview({
  auditChannelName,
  reportsChannelName,
  applicationsChannelName,
}) {
  const { t } = useTranslation();
  const [selectedCat, setSelectedCat] = useState('moderation');

  const currentSample = SAMPLES[selectedCat] || SAMPLES.moderation;

  const targetChannelName =
    currentSample.destination === 'reports'
      ? reportsChannelName || 'reportes'
      : currentSample.destination === 'applications'
      ? applicationsChannelName || 'solicitudes'
      : auditChannelName || 'auditoria-logs';

  const categoryButtons = [
    { id: 'moderation', label: t('logging.categories.moderation') || 'Moderación', icon: Shield },
    { id: 'message', label: t('logging.categories.message') || 'Mensajes', icon: MessageSquare },
    { id: 'role', label: t('logging.categories.role') || 'Roles', icon: UserCheck },
    { id: 'member', label: t('logging.categories.member') || 'Miembros', icon: Users },
    { id: 'leveling', label: t('logging.categories.leveling') || 'Niveles', icon: Trophy },
    { id: 'giveaway', label: t('logging.categories.giveaway') || 'Sorteos', icon: Gift },
  ];

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header & Category Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('logging.previewTitle') || 'Vista Previa del Registro'}
          </span>
          <div className="flex items-center gap-1 text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded">
            <Hash className="w-3 h-3" />
            <span>{targetChannelName}</span>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {categoryButtons.map((btn) => {
            const Icon = btn.icon;
            const isActive = selectedCat === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedCat(btn.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-discord-blurple text-white'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 font-sans">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Bot info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">Hoy a las 14:30</span>
          </div>

          {/* Embed Container */}
          <div
            className="border-l-4 bg-[#2b2d31] p-3.5 rounded-r-md space-y-2.5 shadow-sm"
            style={{ borderColor: currentSample.color }}
          >
            <div className="font-bold text-white text-sm leading-snug">
              {currentSample.title}
            </div>

            {/* Embed Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {currentSample.fields.map((f, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {f.name}
                  </div>
                  <div className="text-slate-200 font-mono text-[11px] bg-[#1e1f22] p-1.5 rounded">
                    {f.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Embed Footer */}
            <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex items-center justify-between">
              <span>TitanBot Logging System</span>
              <span>Hoy a las 14:30:12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
