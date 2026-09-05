import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Globe, LogOut, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const languages = [
    { code: 'es-419', label: 'Español', flag: '🇪🇸' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setLangMenuOpen(false);
  };

  const getAvatarUrl = (user) => {
    if (!user) return null;
    return user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
  };

  return (
    <header className="h-16 bg-discord-darker border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-discord-blurple to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight text-white group-hover:text-discord-blurple transition-colors">
            TitanBot
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">
            Dashboard
          </span>
        </div>
      </Link>

      {/* Right Controls */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Language Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-discord-dark hover:bg-slate-700/60 border border-slate-700/50 text-xs font-medium text-slate-200 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentLang.flag}</span>
            <span className="hidden sm:inline">{currentLang.label}</span>
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-discord-dark border border-slate-700 rounded-lg shadow-xl py-1 z-50">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-discord-blurple/20 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-discord-dark/70 border border-slate-700/40 rounded-full pl-1.5 pr-3 py-1">
              <img
                src={getAvatarUrl(user)}
                alt={user.username}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-discord-blurple/50"
              />
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                {user.username}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              title={t('common.logout')}
              className="p-2 rounded-lg bg-discord-dark hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <a
            href="/api/auth/login"
            className="px-4 py-2 rounded-lg bg-discord-blurple hover:bg-discord-blurpleHover text-white text-xs font-semibold transition-all shadow-md shadow-discord-blurple/25"
          >
            {t('common.loginWithDiscord')}
          </a>
        )}
      </div>
    </header>
  );
}
