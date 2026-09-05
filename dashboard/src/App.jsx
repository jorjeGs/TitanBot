import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { GuildSelector } from './pages/GuildSelector';
import { DashboardLayout } from './pages/manage/DashboardLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy-loaded tab components for code-splitting and rapid page loading
const GeneralTab = React.lazy(() => import('./pages/manage/GeneralTab').then(m => ({ default: m.GeneralTab })));
const WelcomeTab = React.lazy(() => import('./pages/manage/WelcomeTab').then(m => ({ default: m.WelcomeTab })));
const AutomationsTab = React.lazy(() => import('./pages/manage/AutomationsTab'));
const RolesTab = React.lazy(() => import('./pages/manage/RolesTab').then(m => ({ default: m.RolesTab })));
const ModerationTab = React.lazy(() => import('./pages/manage/ModerationTab').then(m => ({ default: m.ModerationTab })));
const GiveawaysTab = React.lazy(() => import('./pages/manage/GiveawaysTab').then(m => ({ default: m.GiveawaysTab })));
const BirthdaysTab = React.lazy(() => import('./pages/manage/BirthdaysTab').then(m => ({ default: m.BirthdaysTab })));
const ApplicationsTab = React.lazy(() => import('./pages/manage/ApplicationsTab').then(m => ({ default: m.ApplicationsTab })));
const EmbedCreatorTab = React.lazy(() => import('./pages/manage/EmbedCreatorTab').then(m => ({ default: m.EmbedCreatorTab })));
const MusicTab = React.lazy(() => import('./pages/manage/MusicTab').then(m => ({ default: m.MusicTab })));
const LevelingTab = React.lazy(() => import('./pages/manage/LevelingTab').then(m => ({ default: m.LevelingTab })));
const EconomyTab = React.lazy(() => import('./pages/manage/EconomyTab').then(m => ({ default: m.EconomyTab })));
const ServerStatsTab = React.lazy(() => import('./pages/manage/ServerStatsTab'));
const JoinToCreateTab = React.lazy(() => import('./pages/manage/JoinToCreateTab').then(m => ({ default: m.JoinToCreateTab })));
const LoggingTab = React.lazy(() => import('./pages/manage/LoggingTab').then(m => ({ default: m.LoggingTab })));
const TicketsTab = React.lazy(() => import('./pages/manage/TicketsTab').then(m => ({ default: m.TicketsTab })));
const CommandsTab = React.lazy(() => import('./pages/manage/CommandsTab').then(m => ({ default: m.CommandsTab })));
const VerificationTab = React.lazy(() => import('./pages/manage/VerificationTab').then(m => ({ default: m.VerificationTab })));
const SnapshotsTab = React.lazy(() => import('./pages/manage/SnapshotsTab'));

function TabLoadingFallback() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto py-6">
      <div className="h-28 bg-discord-darker/60 rounded-2xl border border-slate-800/80 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-discord-blurple animate-spin" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-36 bg-discord-darker/50 rounded-2xl border border-slate-800/80" />
        <div className="h-36 bg-discord-darker/50 rounded-2xl border border-slate-800/80" />
        <div className="h-36 bg-discord-darker/50 rounded-2xl border border-slate-800/80" />
      </div>
      <div className="h-64 bg-discord-darker/40 rounded-2xl border border-slate-800/80" />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-discord-darkest flex flex-col text-slate-100">
          <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/servers" element={<GuildSelector />} />

          {/* Manage Guild Subroutes with Lazy-Loading Suspense */}
          <Route path="/manage/:guildId" element={<DashboardLayout />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<React.Suspense fallback={<TabLoadingFallback />}><GeneralTab /></React.Suspense>} />
            <Route path="welcome" element={<React.Suspense fallback={<TabLoadingFallback />}><WelcomeTab /></React.Suspense>} />
            <Route path="automations" element={<React.Suspense fallback={<TabLoadingFallback />}><AutomationsTab /></React.Suspense>} />
            <Route path="roles" element={<React.Suspense fallback={<TabLoadingFallback />}><RolesTab /></React.Suspense>} />
            <Route path="moderation" element={<React.Suspense fallback={<TabLoadingFallback />}><ModerationTab /></React.Suspense>} />
            <Route path="giveaways" element={<React.Suspense fallback={<TabLoadingFallback />}><GiveawaysTab /></React.Suspense>} />
            <Route path="birthdays" element={<React.Suspense fallback={<TabLoadingFallback />}><BirthdaysTab /></React.Suspense>} />
            <Route path="applications" element={<React.Suspense fallback={<TabLoadingFallback />}><ApplicationsTab /></React.Suspense>} />
            <Route path="embeds" element={<React.Suspense fallback={<TabLoadingFallback />}><EmbedCreatorTab /></React.Suspense>} />
            <Route path="music" element={<React.Suspense fallback={<TabLoadingFallback />}><MusicTab /></React.Suspense>} />
            <Route path="leveling" element={<React.Suspense fallback={<TabLoadingFallback />}><LevelingTab /></React.Suspense>} />
            <Route path="economy" element={<React.Suspense fallback={<TabLoadingFallback />}><EconomyTab /></React.Suspense>} />
            <Route path="serverstats" element={<React.Suspense fallback={<TabLoadingFallback />}><ServerStatsTab /></React.Suspense>} />
            <Route path="jointocreate" element={<React.Suspense fallback={<TabLoadingFallback />}><JoinToCreateTab /></React.Suspense>} />
            <Route path="logging" element={<React.Suspense fallback={<TabLoadingFallback />}><LoggingTab /></React.Suspense>} />
            <Route path="tickets" element={<React.Suspense fallback={<TabLoadingFallback />}><TicketsTab /></React.Suspense>} />
            <Route path="commands" element={<React.Suspense fallback={<TabLoadingFallback />}><CommandsTab /></React.Suspense>} />
            <Route path="verification" element={<React.Suspense fallback={<TabLoadingFallback />}><VerificationTab /></React.Suspense>} />
            <Route path="snapshots" element={<React.Suspense fallback={<TabLoadingFallback />}><SnapshotsTab /></React.Suspense>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
