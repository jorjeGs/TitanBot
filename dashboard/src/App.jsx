import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { GuildSelector } from './pages/GuildSelector';
import { DashboardLayout } from './pages/manage/DashboardLayout';
import { GeneralTab } from './pages/manage/GeneralTab';
import { WelcomeTab } from './pages/manage/WelcomeTab';
import { LoggingTab } from './pages/manage/LoggingTab';
import { CommandsTab } from './pages/manage/CommandsTab';
import { VerificationTab } from './pages/manage/VerificationTab';

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-discord-darkest flex flex-col text-slate-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/servers" element={<GuildSelector />} />

          {/* Manage Guild Subroutes */}
          <Route path="/manage/:guildId" element={<DashboardLayout />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralTab />} />
            <Route path="welcome" element={<WelcomeTab />} />
            <Route path="logging" element={<LoggingTab />} />
            <Route path="commands" element={<CommandsTab />} />
            <Route path="verification" element={<VerificationTab />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
