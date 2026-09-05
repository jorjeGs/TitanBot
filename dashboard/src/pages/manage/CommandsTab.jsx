import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import { Terminal, ChevronDown, ChevronRight, Search, Sliders } from 'lucide-react';

export function CommandsTab() {
  const { t } = useTranslation();
  const { draftConfig, updateDraft } = useGuild();
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/commands')
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!draftConfig) return null;

  const disabledCategories = draftConfig.disabledCategories || {};
  const disabledCommands = draftConfig.disabledCommands || {};

  const toggleCategoryExpand = (catName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const toggleCategoryEnabled = (catName, isEnabled) => {
    updateDraft('disabledCategories', {
      ...disabledCategories,
      [catName]: !isEnabled, // if enabled=false, disabled=true
    });
  };

  const toggleCommandEnabled = (cmdName, isEnabled) => {
    updateDraft('disabledCommands', {
      ...disabledCommands,
      [cmdName]: !isEnabled, // if enabled=false, disabled=true
    });
  };

  const filteredCategories = categories
    .map((cat) => {
      const filteredCmds = cat.commands.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase())
      );
      return { ...cat, commands: filteredCmds };
    })
    .filter((cat) => cat.commands.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('commands.title')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('commands.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('commands.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 bg-discord-dark border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-all"
          />
        </div>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-discord-darker/60 rounded-2xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredCategories.length > 0 ? (
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const isCatDisabled = Boolean(disabledCategories[cat.name]);
            const isExpanded = Boolean(expandedCategories[cat.name]) || Boolean(search);

            return (
              <div
                key={cat.name}
                className="bg-discord-darker/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
              >
                {/* Category Bar */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-discord-darker">
                  <button
                    type="button"
                    onClick={() => toggleCategoryExpand(cat.name)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-discord-dark flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-base">{cat.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                          {cat.commands.length} {t('commands.commandsCount', { count: cat.commands.length })}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-4">
                    <Toggle
                      enabled={!isCatDisabled}
                      onChange={(enabled) => toggleCategoryEnabled(cat.name, enabled)}
                    />
                  </div>
                </div>

                {/* Subcommands List */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-discord-dark/30 p-4 divide-y divide-slate-800/60">
                    {cat.commands.map((cmd) => {
                      const isCmdDisabled = isCatDisabled || Boolean(disabledCommands[cmd.name]);
                      return (
                        <div
                          key={cmd.name}
                          className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-slate-800/30 rounded-lg transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-xs text-discord-blurple">
                                /{cmd.name}
                              </span>
                            </div>
                            {cmd.description && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{cmd.description}</p>
                            )}
                          </div>

                          <Toggle
                            enabled={!isCmdDisabled}
                            disabled={isCatDisabled}
                            onChange={(enabled) => toggleCommandEnabled(cmd.name, enabled)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-discord-darker/40 border border-slate-800 rounded-2xl text-slate-400 text-sm">
          No commands matched your search.
        </div>
      )}
    </div>
  );
}
