import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Server, Plus, Settings, ExternalLink } from 'lucide-react';
import { EnvWarningsBanner } from '../components/common/EnvWarningsBanner';

export function GuildSelector() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/api/auth/login';
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
          setError(err.message || 'Failed to load servers');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, authLoading]);

  const filteredGuilds = guilds.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t('servers.title')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{t('servers.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('servers.search')}
            className="w-full pl-9 pr-4 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* System Environment & Keys Warning Banner */}
      <EnvWarningsBanner className="mb-8" />

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-44 rounded-2xl bg-discord-darker/60 border border-slate-800 animate-pulse p-5 flex flex-col justify-between"
            />
          ))}
        </div>
      ) : filteredGuilds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGuilds.map((guild) => (
            <div
              key={guild.id}
              className="bg-discord-darker/70 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-lg group"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  {guild.icon ? (
                    <img
                      src={guild.icon}
                      alt={guild.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700/60 shadow-md group-hover:ring-discord-blurple/50 transition-all"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-700/60 flex items-center justify-center font-bold text-lg text-slate-300 ring-2 ring-slate-700/60 shadow-md">
                      {guild.name?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-slate-100 truncate" title={guild.name}>
                      {guild.name}
                    </h3>
                    <div className="mt-1">
                      {guild.botInGuild ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {t('servers.botActive')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700/40 text-slate-400 border border-slate-700/60">
                          {t('servers.botNotInvited')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                {guild.botInGuild ? (
                  <Link
                    to={`/manage/${guild.id}/general`}
                    className="w-full py-2.5 px-4 rounded-xl bg-discord-blurple hover:bg-discord-blurpleHover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-discord-blurple/20 group-hover:shadow-discord-blurple/30"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{t('common.manage')}</span>
                  </Link>
                ) : (
                  <a
                    href={guild.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('common.inviteBot')}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-discord-darker/40 border border-slate-800 rounded-3xl">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-300">{t('servers.noServers')}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {t('servers.noServersHelp')}
          </p>
        </div>
      )}
    </div>
  );
}
