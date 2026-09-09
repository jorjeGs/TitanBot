import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Server,
  Plus,
  Settings,
  ExternalLink,
  Crown,
  ShieldCheck,
  Sliders,
  X,
  Radio,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { EnvWarningsBanner } from '../components/common/EnvWarningsBanner';

export function GuildSelector() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'pending'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      window.location.href = `${base}/api/auth/login`;
      return;
    }

    if (user) {
      apiFetch('/guilds')
        .then((data) => {
          if (data.guilds) {
            setGuilds(data.guilds);
          }
        })
        .catch((err) => {
          setError(err.message || 'Error al cargar los servidores');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, authLoading]);

  // Counts for tabs & KPIs
  const totalManageable = guilds.length;
  const activeGuildsCount = useMemo(() => guilds.filter((g) => g.botInGuild).length, [guilds]);
  const pendingGuildsCount = useMemo(() => guilds.filter((g) => !g.botInGuild).length, [guilds]);

  // Filtered guilds
  const filteredGuilds = useMemo(() => {
    return guilds.filter((g) => {
      const matchesSearch = !search.trim() || g.name.toLowerCase().includes(search.toLowerCase());
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'active' && g.botInGuild) ||
        (activeTab === 'pending' && !g.botInGuild);

      return matchesSearch && matchesTab;
    });
  }, [guilds, search, activeTab]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-discord-blurple/20 rounded-xl text-discord-blurple border border-discord-blurple/30 shadow-inner">
              <Server className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('servers.title', 'Selecciona un Servidor para Administrar')}
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            {t(
              'servers.subtitle',
              'Solo se muestran los servidores donde eres propietario o tienes permisos de Administrador / Gestionar Servidor.'
            )}
          </p>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('servers.search', 'Buscar por nombre de servidor...')}
            className="w-full pl-10 pr-9 py-2.5 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title={t('servers.clearSearch', 'Limpiar búsqueda')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <X className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* System Environment & Keys Warning Banner */}
      <EnvWarningsBanner />

      {/* Top Metric Cards (KPIs) */}
      {!loading && guilds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-discord-darker/80 border border-slate-800/90 rounded-2xl p-4.5 shadow-sm hover:border-slate-700 transition-all flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('servers.kpi.total', 'Servidores Administrados')}
              </span>
              <p className="text-2xl font-black text-white mt-1">{totalManageable}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Server className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-discord-darker/80 border border-slate-800/90 rounded-2xl p-4.5 shadow-sm hover:border-emerald-500/30 transition-all flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('servers.kpi.active', 'TitanBot Conectado')}
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{activeGuildsCount}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-discord-darker/80 border border-slate-800/90 rounded-2xl p-4.5 shadow-sm hover:border-indigo-500/30 transition-all flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('servers.kpi.pending', 'Listos para Invitar')}
              </span>
              <p className="text-2xl font-black text-indigo-400 mt-1">{pendingGuildsCount}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <PlusCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {!loading && guilds.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-discord-blurple text-white shadow-md shadow-discord-blurple/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>{t('servers.tabs.all', 'Todos los Servidores')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[11px]">
              {totalManageable}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>{t('servers.tabs.active', 'Con TitanBot Activo')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[11px]">
              {activeGuildsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>{t('servers.tabs.pending', 'Por Invitar')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[11px]">
              {pendingGuildsCount}
            </span>
          </button>
        </div>
      )}

      {/* Grid of Servers */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-48 rounded-2xl bg-discord-darker/60 border border-slate-800 animate-pulse p-5 flex flex-col justify-between"
            />
          ))}
        </div>
      ) : filteredGuilds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGuilds.map((guild) => {
            const isOwner = guild.owner;
            const hasAdmin = guild.hasAdmin;
            const hasManageGuild = guild.hasManageGuild;

            return (
              <div
                key={guild.id}
                className="bg-discord-darker/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-lg group relative overflow-hidden"
              >
                {/* Subtle top brand bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    guild.botInGuild ? 'bg-discord-blurple' : 'bg-slate-700/60'
                  }`}
                />

                <div>
                  <div className="flex items-start gap-3.5 mb-4">
                    {guild.icon ? (
                      <img
                        src={guild.icon}
                        alt={guild.name}
                        className="w-13 h-13 rounded-2xl object-cover ring-2 ring-slate-700/60 shadow-md group-hover:ring-discord-blurple/50 transition-all shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-lg text-slate-200 ring-2 ring-slate-700/60 shadow-md shrink-0">
                        {guild.name?.charAt(0) || 'G'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h3
                        className="font-bold text-base text-slate-100 truncate group-hover:text-white transition-colors"
                        title={guild.name}
                      >
                        {guild.name}
                      </h3>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Role Permission Badge */}
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>{t('servers.badges.owner', 'Propietario')}</span>
                          </span>
                        ) : hasAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            <ShieldCheck className="w-3 h-3 text-purple-400" />
                            <span>{t('servers.badges.admin', 'Administrador')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                            <Sliders className="w-3 h-3 text-blue-400" />
                            <span>{t('servers.badges.manager', 'Gestionar Servidor')}</span>
                          </span>
                        )}

                        {/* Bot Presence Badge */}
                        {guild.botInGuild ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{t('servers.botActive', 'Bot Activo')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                            <span>{t('servers.botNotInvited', 'Por Invitar')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-3 border-t border-slate-800/80">
                  {guild.botInGuild ? (
                    <Link
                      to={`/manage/${guild.id}/general`}
                      className="w-full py-2.5 px-4 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-discord-blurple/20 group-hover:shadow-discord-blurple/30"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t('servers.manageCta', 'Administrar Servidor')}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : (
                    <a
                      href={guild.inviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all border border-slate-700/80 hover:border-slate-600 shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-discord-blurple" />
                      <span>{t('servers.inviteCta', 'Invitar Bot al Servidor')}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : search ? (
        <div className="text-center py-16 bg-discord-darker/50 border border-slate-800 rounded-3xl space-y-3">
          <Search className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">
            {t('servers.noMatchSearch', 'No se encontraron servidores que coincidan con la búsqueda.')}
          </h3>
          <p className="text-xs text-slate-400">
            "{search}"
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t('servers.clearSearch', 'Limpiar búsqueda')}</span>
          </button>
        </div>
      ) : (
        <div className="text-center py-20 bg-discord-darker/40 border border-slate-800 rounded-3xl space-y-3 px-4">
          <div className="w-14 h-14 bg-slate-800/60 rounded-2xl mx-auto flex items-center justify-center text-slate-500 border border-slate-700/50">
            <Server className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-300">
            {t('servers.noServers', 'No se encontraron servidores administrables')}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {t(
              'servers.noServersHelp',
              'Debes ser propietario o tener permisos de Administrador / Gestionar Servidor en Discord para administrar un servidor aquí.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
