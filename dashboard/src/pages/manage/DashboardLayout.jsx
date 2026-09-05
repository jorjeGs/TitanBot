import React, { useEffect } from 'react';
import { useParams, Outlet, Navigate } from 'react-router-dom';
import { GuildProvider, useGuild } from '../../contexts/GuildContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { UnsavedChangesBar } from '../../components/layout/UnsavedChangesBar';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function DashboardLayoutContent() {
  const { guildId } = useParams();
  const { loadGuild, loading, toast } = useGuild();

  useEffect(() => {
    if (guildId) {
      loadGuild(guildId);
    }
  }, [guildId, loadGuild]);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border animate-in fade-in slide-in-from-top-3 duration-200 bg-discord-dark border-slate-700">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span className="text-xs font-semibold text-slate-100">{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <main className="flex-1 bg-discord-darkest p-4 md:p-8 overflow-y-auto pb-28">
        {loading ? (
          <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-slate-800 rounded-lg" />
            <div className="h-4 w-96 bg-slate-800/60 rounded" />
            <div className="h-64 bg-slate-800/40 rounded-2xl" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
            <Outlet />
          </div>
        )}
      </main>

      {/* Unsaved Changes Banner */}
      <UnsavedChangesBar />
    </div>
  );
}

export function DashboardLayout() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen bg-discord-darkest" />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <GuildProvider>
      <DashboardLayoutContent />
    </GuildProvider>
  );
}
