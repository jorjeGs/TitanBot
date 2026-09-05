import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Bot, Shield, Globe2, Sparkles, MessageSquare, Terminal, ArrowRight, CheckCircle2 } from 'lucide-react';

export function LandingPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [stats, setStats] = useState({ guildCount: 0, commandCount: 100, isOnline: true });

  useEffect(() => {
    fetch('/ready')
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) {
          setStats({
            guildCount: data.metrics.guildCount || 0,
            commandCount: data.metrics.commandCount || 100,
            isOnline: true,
          });
        }
      })
      .catch(() => {
        setStats((prev) => ({ ...prev, isOnline: true }));
      });
  }, []);

  const features = [
    {
      icon: Globe2,
      title: '100% Multilingual (i18n)',
      desc: 'Seamless support for English, Latin American Spanish, and German across all 100 slash commands and the web dashboard.',
    },
    {
      icon: Sparkles,
      title: 'Welcome & Auto-Role',
      desc: 'Automated welcome cards with live Discord preview and instant starter role assignment for newcomers.',
    },
    {
      icon: Shield,
      title: 'Audit & Moderation',
      desc: 'Centralized server audit channels, user reports, verification gates, and permission management.',
    },
    {
      icon: Terminal,
      title: 'Granular Command Toggles',
      desc: 'Enable or disable entire command categories or individual slash commands per server with a single click.',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-discord-blurple/10 border border-discord-blurple/30 text-discord-blurple text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>v2.1.0 • Web Dashboard Ready</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15] mb-6">
          {t('landing.heroTitle')}
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('landing.heroSubtitle')}
        </p>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {user ? (
            <Link
              to="/servers"
              className="px-8 py-3.5 rounded-xl bg-discord-blurple hover:bg-discord-blurpleHover text-white font-semibold text-base transition-all shadow-xl shadow-discord-blurple/30 flex items-center gap-2.5 group"
            >
              <span>{t('servers.title')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={login}
              className="px-8 py-3.5 rounded-xl bg-discord-blurple hover:bg-discord-blurpleHover text-white font-semibold text-base transition-all shadow-xl shadow-discord-blurple/30 flex items-center gap-2.5 group cursor-pointer"
            >
              <Bot className="w-5 h-5" />
              <span>{t('landing.getStarted')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl w-full mt-16 pt-12 border-t border-slate-800/80">
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{stats.guildCount}</span>
            <span className="text-xs text-slate-400 font-medium mt-1">{t('landing.activeServers')}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400">{stats.commandCount}</span>
            <span className="text-xs text-slate-400 font-medium mt-1">{t('landing.loadedCommands')}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100%</span>
            </div>
            <span className="text-xs text-slate-400 font-medium mt-1">{t('landing.statusOnline')}</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-discord-darker/60 border-t border-slate-800/80 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-discord-dark/50 border border-slate-800 hover:border-slate-700 p-6 rounded-2xl transition-all hover:-translate-y-1 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-discord-blurple/10 border border-discord-blurple/30 text-discord-blurple flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-base mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>TitanBot • Built with Discord.js, Express & React • Licensed under MIT</p>
      </footer>
    </div>
  );
}
