import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Hash,
  Trophy,
  Award,
  Sparkles,
  MessageSquare,
  MapPin,
  CreditCard,
  Sliders,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';

export function LevelUpPreview({
  message,
  channelName,
  roleRewards = {},
  roles = [],
  sampleLevel: initialSampleLevel = 10,
  serverName,
  xpMultiplier = 1.0,
  xpPerMessage = { min: 15, max: 25 },
}) {
  const { t } = useTranslation();
  const [previewTab, setPreviewTab] = useState('announcement'); // 'announcement' | 'roadmap' | 'rankCard'
  const [testLevel, setTestLevel] = useState(initialSampleLevel);

  const rawMessage =
    message?.trim() ||
    t('leveling.defaultMessage') ||
    '¡Felicidades {user}, has alcanzado el **nivel {level}**!';

  // Calculate approximate XP for test level: level^2 * 100
  const approxXp = Math.floor(testLevel * testLevel * 100);
  const nextLevelXp = Math.floor((testLevel + 1) * (testLevel + 1) * 100);
  const currentLevelBaseXp = Math.floor(testLevel * testLevel * 100);
  const progressPercent = 68; // illustrative realistic progress

  // Format variables for preview
  const formattedMessage = rawMessage
    .replace(/{user}/g, '@GamerPro')
    .replace(/{level}/g, String(testLevel))
    .replace(/{xp}/g, approxXp.toLocaleString())
    .replace(/{server}/g, serverName || 'TitanBot Server');

  // Check if testLevel or lower unlocks any role reward
  const sortedRewards = Object.entries(roleRewards || {})
    .map(([lvl, rId]) => ({
      level: Number(lvl),
      roleId: rId,
      role: roles.find((r) => r.id === rId),
    }))
    .filter((entry) => !Number.isNaN(entry.level))
    .sort((a, b) => a.level - b.level);

  // Active reward for current test level
  const activeRewardForLevel = sortedRewards.find((r) => r.level === testLevel);
  // Next reward ahead
  const nextRewardAhead = sortedRewards.find((r) => r.level > testLevel);

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg space-y-3.5">
      {/* Top Header with Mode Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-2 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('leveling.previewTitle')}
        </span>

        {/* Preview Mode Switcher */}
        <div className="flex items-center p-0.5 bg-discord-dark rounded-lg border border-slate-700/60 text-[11px]">
          <button
            type="button"
            onClick={() => setPreviewTab('announcement')}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition-all ${
              previewTab === 'announcement'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={t('leveling.previewTabs.announcement')}
          >
            <MessageSquare className="w-3 h-3" />
            <span className="hidden sm:inline">{t('leveling.previewTabs.announcement')}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab('roadmap')}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition-all ${
              previewTab === 'roadmap'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={t('leveling.previewTabs.roadmap')}
          >
            <MapPin className="w-3 h-3" />
            <span className="hidden sm:inline">{t('leveling.previewTabs.roadmap')}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab('rankCard')}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition-all ${
              previewTab === 'rankCard'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={t('leveling.previewTabs.rankCard')}
          >
            <CreditCard className="w-3 h-3" />
            <span className="hidden sm:inline">{t('leveling.previewTabs.rankCard')}</span>
          </button>
        </div>
      </div>

      {/* Interactive Level Slider / Stepper */}
      <div className="bg-discord-dark/70 border border-slate-700/40 rounded-lg p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>{t('leveling.interactiveLevel')}</span>
          </span>
          <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            Nivel {testLevel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={100}
            value={testLevel}
            onChange={(e) => setTestLevel(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Quick Level Pills */}
        <div className="flex items-center justify-between gap-1 pt-0.5 text-[10px] text-slate-400">
          {[5, 10, 20, 50, 100].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setTestLevel(lvl)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                testLevel === lvl
                  ? 'bg-amber-400/20 text-amber-300 font-bold'
                  : 'hover:bg-slate-700 text-slate-400'
              }`}
            >
              Lvl {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: Discord Message Announcement Mock */}
      {previewTab === 'announcement' && (
        <div className="space-y-2 font-sans">
          {/* Channel Tag Indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Canal de envío:</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Hash className="w-3 h-3" />
              <span>{channelName || t('leveling.sameChannel') || 'canal-actual'}</span>
            </span>
          </div>

          <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 shadow-inner">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shrink-0 shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
              {/* Bot info */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-100">TitanBot</span>
                <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
                  BOT
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('previews.todayAt', { time: '15:45' })}
                </span>
              </div>

              {/* Embed Container */}
              <div className="border-l-4 border-amber-400 bg-[#2b2d31] p-3.5 rounded-r-md space-y-2.5 shadow-sm">
                <div className="font-bold text-white text-sm leading-snug flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t('leveling.embedTitle')}</span>
                </div>

                <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {formattedMessage}
                </div>

                {/* Role Reward Badge if unlocked at this level */}
                {activeRewardForLevel && (
                  <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md font-medium">
                      <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {t('leveling.rewardUnlocked')}:{' '}
                        <span
                          className="font-bold"
                          style={{
                            color:
                              activeRewardForLevel.role?.color &&
                              activeRewardForLevel.role?.color !== '#000000'
                                ? activeRewardForLevel.role?.color
                                : '#34d399',
                          }}
                        >
                          @{activeRewardForLevel.role?.name || `Rol-${activeRewardForLevel.roleId}`}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Embed Footer */}
                <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-700/30">
                  <span>TitanBot Leveling</span>
                  <span>•</span>
                  <span>{serverName || 'TitanBot'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: Role Progression Roadmap */}
      {previewTab === 'roadmap' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('leveling.tabs.rewards')}</span>
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
              {sortedRewards.length} configuradas
            </span>
          </div>

          {sortedRewards.length === 0 ? (
            <div className="p-6 bg-discord-dark/50 border border-slate-700/50 rounded-xl text-center space-y-2">
              <Award className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('leveling.noRoadmapRewards')}
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700/80">
              {sortedRewards.map((entry) => {
                const isReached = testLevel >= entry.level;
                return (
                  <div key={entry.level} className="relative flex items-center justify-between">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                        isReached
                          ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-md shadow-amber-400/25'
                          : 'bg-discord-dark border-slate-600 text-slate-400'
                      }`}
                    >
                      {entry.level}
                    </div>

                    <div
                      className={`flex-1 ml-2 p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                        isReached
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-discord-dark/70 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{
                            backgroundColor:
                              entry.role?.color && entry.role?.color !== '#000000'
                                ? entry.role?.color
                                : '#94a3b8',
                          }}
                        />
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          @{entry.role?.name || `Rol ${entry.roleId}`}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isReached
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isReached ? 'Desbloqueado' : `Lvl ${entry.level}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: Simulated Discord Rank Card */}
      {previewTab === 'rankCard' && (
        <div className="bg-[#232428] border border-slate-700/60 rounded-xl p-4 space-y-3 font-sans shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('leveling.previewTabs.rankCard')}
            </span>
            <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              #1 EN EL SERVIDOR
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-lg">
                GP
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#232428]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-sm text-white truncate">GamerPro</span>
                <span className="text-xs font-extrabold text-amber-400">
                  NIVEL {testLevel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">GamerPro#0001</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{t('leveling.rankProgress')}</span>
              <span className="font-mono text-slate-200">
                {approxXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#1e1f22] rounded-full overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Next reward footer */}
          {nextRewardAhead && (
            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
              <span>{t('leveling.nextReward')}:</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <span>@{nextRewardAhead.role?.name || `Lvl ${nextRewardAhead.level}`}</span>
                <span className="text-[10px] text-slate-500">(Nivel {nextRewardAhead.level})</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
