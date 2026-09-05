import React from 'react';
import { NavLink, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import {
  Sliders,
  Sparkles,
  KeyRound,
  ScrollText,
  Terminal,
  ShieldCheck,
  Ticket,
  Trophy,
  Coins,
  BarChart2,
  Mic,
  ChevronLeft,
  Users,
} from 'lucide-react';

export function Sidebar() {
  const { t } = useTranslation();
  const { currentGuild } = useGuild();
  const { guildId } = useParams();

  const navItems = [
    { to: `/manage/${guildId}/general`, label: t('nav.general'), icon: Sliders },
    { to: `/manage/${guildId}/welcome`, label: t('nav.welcome'), icon: Sparkles },
    { to: `/manage/${guildId}/roles`, label: t('nav.roles'), icon: KeyRound },
    { to: `/manage/${guildId}/leveling`, label: t('nav.leveling') || 'Niveles y XP', icon: Trophy },
    { to: `/manage/${guildId}/economy`, label: t('nav.economy') || 'Economía y Tienda', icon: Coins },
    { to: `/manage/${guildId}/serverstats`, label: t('nav.serverstats') || 'Estadísticas del Servidor', icon: BarChart2 },
    { to: `/manage/${guildId}/jointocreate`, label: t('nav.jointocreate') || 'Salas de Voz Temporales', icon: Mic },
    { to: `/manage/${guildId}/logging`, label: t('nav.logging'), icon: ScrollText },
    { to: `/manage/${guildId}/tickets`, label: t('nav.tickets') || 'Tickets', icon: Ticket },
    { to: `/manage/${guildId}/commands`, label: t('nav.commands'), icon: Terminal },
    { to: `/manage/${guildId}/verification`, label: t('nav.verification'), icon: ShieldCheck },
  ];

  return (
    <aside className="w-full md:w-64 bg-discord-darker border-r border-slate-800/80 flex flex-col shrink-0">
      {/* Current Guild Header */}
      <div className="p-4 border-b border-slate-800/80">
        <Link
          to="/servers"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-3 group"
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t('common.switchServer')}</span>
        </Link>

        {currentGuild ? (
          <div className="flex items-center gap-3">
            {currentGuild.icon ? (
              <img
                src={currentGuild.icon}
                alt={currentGuild.name}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-700 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-700 flex items-center justify-center font-bold text-base text-slate-200 shadow-md">
                {currentGuild.name?.charAt(0) || 'G'}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <h2 className="font-semibold text-sm text-white truncate" title={currentGuild.name}>
                {currentGuild.name}
              </h2>
              <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                <Users className="w-3 h-3" />
                <span>{currentGuild.memberCount || 0}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-11 animate-pulse bg-slate-800 rounded-xl" />
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-discord-blurple text-white shadow-md shadow-discord-blurple/20'
                    : 'text-slate-400 hover:bg-discord-dark hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
