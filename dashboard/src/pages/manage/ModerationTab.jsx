import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { Toggle } from '../../components/common/Toggle';
import {
  ShieldAlert,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Save,
  X,
  Loader2,
  Clock,
  UserX,
  UserMinus,
  Shield,
  FileText,
  Ban,
  User,
  AlertOctagon,
  RefreshCw,
  Info,
} from 'lucide-react';

export function ModerationTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();

  const [activeTab, setActiveTab] = useState('lookup'); // 'lookup' | 'cases' | 'autoPunish'
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Member search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [targetMember, setTargetMember] = useState(null);
  const [userWarnings, setUserWarnings] = useState([]);
  const [userNotes, setUserNotes] = useState([]);
  const [revokingWarnId, setRevokingWarnId] = useState(null);
  const [isClearingWarns, setIsClearingWarns] = useState(false);

  // Server cases state
  const [serverCases, setServerCases] = useState([]);
  const [caseFilter, setCaseFilter] = useState('all');

  // Auto-Punish configuration state
  const [moderationConfig, setModerationConfig] = useState({
    autoPunish: [],
    dmOnWarn: true,
  });
  const [newThreshold, setNewThreshold] = useState(3);
  const [newAction, setNewAction] = useState('timeout');
  const [newDuration, setNewDuration] = useState(60);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Initial load
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [casesRes, configRes] = await Promise.all([
        apiFetch(`/guilds/${guildId}/moderation/cases?limit=100`),
        apiFetch(`/guilds/${guildId}/moderation/config`),
      ]);

      if (casesRes.success) {
        setServerCases(casesRes.cases || []);
      }
      if (configRes.success && configRes.moderation) {
        setModerationConfig({
          autoPunish: Array.isArray(configRes.moderation.autoPunish) ? configRes.moderation.autoPunish : [],
          dmOnWarn: configRes.moderation.dmOnWarn !== false,
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('moderation.autoPunish.saveError'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [guildId]);

  // Search member history
  const handleSearchMember = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    try {
      setIsSearching(true);
      setNotification(null);
      const res = await apiFetch(`/guilds/${guildId}/moderation/users/${encodeURIComponent(query)}`);
      if (res.success) {
        setTargetMember(res.member);
        setUserWarnings(res.warnings || []);
        setUserNotes(res.notes || []);
      }
    } catch (err) {
      setTargetMember(null);
      setUserWarnings([]);
      setUserNotes([]);
      setNotification({
        type: 'error',
        message: err.message || t('moderation.memberLookup.notFound'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Revoke individual warning
  const handleRevokeWarning = async (warningId) => {
    if (!targetMember) return;
    const confirm = window.confirm(t('moderation.warnings.confirmRevoke'));
    if (!confirm) return;

    try {
      setRevokingWarnId(warningId);
      const res = await apiFetch(`/guilds/${guildId}/moderation/warnings/${targetMember.id}/${warningId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setUserWarnings((prev) => prev.filter((w) => w.id !== warningId));
        setNotification({
          type: 'success',
          message: t('moderation.warnings.revokeSuccess'),
        });
        // Refresh server cases
        loadInitialData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Error revoking warning.',
      });
    } finally {
      setRevokingWarnId(null);
    }
  };

  // Clear all warnings for member
  const handleClearAllWarnings = async () => {
    if (!targetMember) return;
    const confirm = window.confirm(t('moderation.memberProfile.confirmClearAll'));
    if (!confirm) return;

    try {
      setIsClearingWarns(true);
      const res = await apiFetch(`/guilds/${guildId}/moderation/warnings/${targetMember.id}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setUserWarnings([]);
        setNotification({
          type: 'success',
          message: t('moderation.memberProfile.clearedSuccess'),
        });
        loadInitialData();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Error clearing warnings.',
      });
    } finally {
      setIsClearingWarns(false);
    }
  };

  // Add auto-punish rule
  const handleAddRule = () => {
    const threshold = parseInt(newThreshold, 10);
    if (!threshold || threshold < 1 || threshold > 50) {
      setNotification({
        type: 'error',
        message: t('moderation.autoPunish.thresholdRequired'),
      });
      return;
    }

    const duration = newAction === 'timeout' ? parseInt(newDuration, 10) || 60 : null;

    const newRule = {
      warnThreshold: threshold,
      action: newAction,
      durationMinutes: duration,
    };

    // Filter out existing rule with same threshold
    const filtered = (moderationConfig.autoPunish || []).filter((r) => r.warnThreshold !== threshold);
    const updated = [...filtered, newRule].sort((a, b) => a.warnThreshold - b.warnThreshold);

    setModerationConfig((prev) => ({
      ...prev,
      autoPunish: updated,
    }));

    setNotification({
      type: 'success',
      message: `Regla añadida para ${threshold} advertencias (haz clic en Guardar para persistir).`,
    });
  };

  // Remove auto-punish rule
  const handleRemoveRule = (threshold) => {
    setModerationConfig((prev) => ({
      ...prev,
      autoPunish: prev.autoPunish.filter((r) => r.warnThreshold !== threshold),
    }));
  };

  // Save moderation settings
  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      setNotification(null);
      const res = await apiFetch(`/guilds/${guildId}/moderation/config`, {
        method: 'PATCH',
        body: moderationConfig,
      });

      if (res.success) {
        setModerationConfig({
          autoPunish: res.moderation.autoPunish || [],
          dmOnWarn: res.moderation.dmOnWarn !== false,
        });
        setNotification({
          type: 'success',
          message: t('moderation.autoPunish.saveSuccess'),
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('moderation.autoPunish.saveError'),
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Filtered cases list
  const filteredCases = serverCases.filter((c) => {
    if (caseFilter === 'all') return true;
    return c.action === caseFilter;
  });

  const getActionBadge = (action) => {
    switch (action) {
      case 'Member Banned':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30"><Ban className="w-3 h-3" /> {action}</span>;
      case 'Member Kicked':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"><UserMinus className="w-3 h-3" /> {action}</span>;
      case 'Member Timed Out':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30"><Clock className="w-3 h-3" /> {action}</span>;
      case 'User Warned':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"><AlertOctagon className="w-3 h-3" /> {action}</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300"><Shield className="w-3 h-3" /> {action || 'Acción'}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-discord-blurple">
            <ShieldAlert className="w-6 h-6" />
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {t('moderation.title')}
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-3xl">
            {t('moderation.subtitle')}
          </p>
        </div>
        <button
          onClick={loadInitialData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-discord-darker hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors"
          title={t('moderation.refreshData', 'Actualizar datos')}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('common.refresh', 'Refrescar')}</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/20 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('lookup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'lookup'
              ? 'bg-discord-blurple text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-discord-darker'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('moderation.tabs.lookup')}</span>
        </button>
        <button
          onClick={() => setActiveTab('cases')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'cases'
              ? 'bg-discord-blurple text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-discord-darker'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{t('moderation.tabs.cases')}</span>
          {serverCases.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {serverCases.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('autoPunish')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'autoPunish'
              ? 'bg-discord-blurple text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-discord-darker'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t('moderation.tabs.autoPunish')}</span>
          {moderationConfig.autoPunish.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {moderationConfig.autoPunish.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Member Disciplinary Lookup */}
      {activeTab === 'lookup' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-discord-blurple" />
              {t('moderation.memberLookup.title')}
            </h2>
            <form onSubmit={handleSearchMember} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('moderation.memberLookup.placeholder')}
                  className="w-full bg-discord-darker border border-slate-700/80 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{isSearching ? t('moderation.memberLookup.searching') : t('moderation.memberLookup.searchBtn')}</span>
              </button>
            </form>
          </div>

          {/* Member Profile Display */}
          {targetMember ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                    {targetMember.avatar ? (
                      <img
                        src={targetMember.avatar}
                        alt={targetMember.username || 'User'}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-700 shadow"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg">
                        {targetMember.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {targetMember.displayName || targetMember.username || targetMember.id}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400 border border-slate-700">
                          {targetMember.tag || targetMember.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {targetMember.id}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {userWarnings.length > 0 && (
                    <button
                      onClick={handleClearAllWarnings}
                      disabled={isClearingWarns}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {isClearingWarns ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>{t('moderation.memberProfile.clearAllWarnsBtn')}</span>
                    </button>
                  )}
                </div>

                {/* Status Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-discord-darker border border-slate-800/80 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{t('moderation.memberProfile.activeWarns')}</span>
                      <span className="text-base font-bold text-white">{userWarnings.length}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-discord-darker border border-slate-800/80 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${targetMember.isTimedOut ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{t('moderation.memberProfile.isTimedOut')}</span>
                      <span className={`text-sm font-semibold ${targetMember.isTimedOut ? 'text-blue-400' : 'text-slate-400'}`}>
                        {targetMember.isTimedOut ? `${new Date(targetMember.timeoutUntil).toLocaleString()}` : 'No activo'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-discord-darker border border-slate-800/80 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${targetMember.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                      <Ban className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{t('moderation.memberProfile.isBanned')}</span>
                      <span className={`text-sm font-semibold ${targetMember.isBanned ? 'text-red-400' : 'text-slate-400'}`}>
                        {targetMember.isBanned ? (targetMember.banReason || 'Baneado') : 'No baneado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Roles */}
                {targetMember.roles && targetMember.roles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium mr-1">{t('moderation.rolesLabel', 'Roles:')}</span>
                    {targetMember.roles.map((r) => (
                      <span
                        key={r.id}
                        style={{ borderColor: r.color || '#475569' }}
                        className="text-xs px-2.5 py-0.5 rounded-md font-medium bg-slate-800/80 text-slate-200 border"
                      >
                        {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Warnings Table */}
              <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    {t('moderation.warnings.title')} ({userWarnings.length})
                  </h3>
                </div>

                {userWarnings.length === 0 ? (
                  <div className="p-8 text-center bg-discord-darker rounded-lg border border-dashed border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{t('moderation.warnings.noWarnings')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 px-3">{t('moderation.warnings.colId')}</th>
                          <th className="pb-3 px-3">{t('moderation.warnings.colReason')}</th>
                          <th className="pb-3 px-3">{t('moderation.warnings.colMod')}</th>
                          <th className="pb-3 px-3">{t('moderation.warnings.colDate')}</th>
                          <th className="pb-3 px-3 text-right">{t('moderation.warnings.colActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {userWarnings.map((warn) => (
                          <tr key={warn.id} className="hover:bg-discord-darker/50 transition-colors">
                            <td className="py-3 px-3 font-mono text-xs text-slate-400">#{warn.id}</td>
                            <td className="py-3 px-3 font-medium text-white">{warn.reason || 'Sin motivo'}</td>
                            <td className="py-3 px-3 font-mono text-xs text-slate-400">{warn.moderatorId}</td>
                            <td className="py-3 px-3 text-xs text-slate-400">
                              {warn.timestamp ? new Date(warn.timestamp).toLocaleString() : 'N/A'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleRevokeWarning(warn.id)}
                                disabled={revokingWarnId === warn.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/20 rounded-md transition-colors"
                                title={t('moderation.warnings.revokeBtn')}
                              >
                                {revokingWarnId === warn.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                <span>{t('moderation.warnings.revokeBtn')}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* User Notes Table */}
              <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  {t('moderation.notes.title')} ({userNotes.length})
                </h3>

                {userNotes.length === 0 ? (
                  <div className="p-6 text-center bg-discord-darker rounded-lg border border-dashed border-slate-800">
                    <p className="text-xs text-slate-500">{t('moderation.notes.noNotes')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 px-3">{t('moderation.notes.colType')}</th>
                          <th className="pb-3 px-3">{t('moderation.notes.colContent')}</th>
                          <th className="pb-3 px-3">{t('moderation.notes.colMod')}</th>
                          <th className="pb-3 px-3">{t('moderation.notes.colDate')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {userNotes.map((note, idx) => (
                          <tr key={note.id || idx} className="hover:bg-discord-darker/50 transition-colors">
                            <td className="py-3 px-3">
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                {note.type || 'note'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-200">{note.content}</td>
                            <td className="py-3 px-3 text-xs text-slate-400 font-mono">
                              {note.moderatorTag || note.moderatorId}
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-400">
                              {note.timestamp ? new Date(note.timestamp).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-discord-dark rounded-xl border border-slate-800">
              <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {t('moderation.memberLookup.noMemberSelected')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Server Cases & Audit Log */}
      {activeTab === 'cases' && (
        <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-discord-blurple" />
                {t('moderation.serverCases.title')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('moderation.serverCases.subtitle')}
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: t('moderation.serverCases.filterAll') },
                { id: 'User Warned', label: t('moderation.serverCases.filterWarns') },
                { id: 'Member Timed Out', label: t('moderation.serverCases.filterTimeouts') },
                { id: 'Member Kicked', label: t('moderation.serverCases.filterKicks') },
                { id: 'Member Banned', label: t('moderation.serverCases.filterBans') },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCaseFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    caseFilter === f.id
                      ? 'bg-discord-blurple text-white shadow'
                      : 'bg-discord-darker text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="p-12 text-center bg-discord-darker rounded-lg border border-dashed border-slate-800">
              <Shield className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{t('moderation.serverCases.noCases')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">{t('moderation.serverCases.colCaseId')}</th>
                    <th className="pb-3 px-3">{t('moderation.serverCases.colAction')}</th>
                    <th className="pb-3 px-3">{t('moderation.serverCases.colTarget')}</th>
                    <th className="pb-3 px-3">{t('moderation.serverCases.colMod')}</th>
                    <th className="pb-3 px-3">{t('moderation.serverCases.colReason')}</th>
                    <th className="pb-3 px-3">{t('moderation.serverCases.colDate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredCases.map((caseItem) => (
                    <tr key={caseItem.caseId || caseItem.id} className="hover:bg-discord-darker/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs text-slate-400">
                        #{caseItem.caseId || caseItem.id}
                      </td>
                      <td className="py-3 px-3">{getActionBadge(caseItem.action)}</td>
                      <td className="py-3 px-3 font-medium text-white">{caseItem.target}</td>
                      <td className="py-3 px-3 text-xs text-slate-400 font-mono">{caseItem.executor}</td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={caseItem.reason}>
                        {caseItem.reason || 'Sin motivo'}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-400">
                        {caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Auto-Punishment Rules */}
      {activeTab === 'autoPunish' && (
        <div className="space-y-6">
          {/* DM notification setting */}
          <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm">
            <Toggle
              enabled={moderationConfig.dmOnWarn}
              onChange={(val) => setModerationConfig((prev) => ({ ...prev, dmOnWarn: val }))}
              label={t('moderation.autoPunish.dmOnWarn')}
              description={t('moderation.autoPunish.dmOnWarnHelp')}
            />
          </div>

          {/* Rule Creator */}
          <div className="bg-discord-dark rounded-xl p-6 border border-slate-800 shadow-sm space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-discord-blurple" />
                {t('moderation.autoPunish.title')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('moderation.autoPunish.subtitle')}
              </p>
            </div>

            <div className="p-4 bg-discord-darker rounded-xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-end gap-4">
              {/* Threshold */}
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  {t('moderation.autoPunish.whenUserReaches')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-24 bg-discord-dark border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                  />
                  <span className="text-sm text-slate-400">{t('moderation.autoPunish.warns')}</span>
                </div>
              </div>

              {/* Action */}
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  {t('moderation.autoPunish.applyAction')}
                </label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full bg-discord-dark border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                >
                  <option value="timeout">{t('moderation.autoPunish.actionTimeout')}</option>
                  <option value="kick">{t('moderation.autoPunish.actionKick')}</option>
                  <option value="ban">{t('moderation.autoPunish.actionBan')}</option>
                </select>
              </div>

              {/* Duration (if timeout) */}
              {newAction === 'timeout' && (
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    {t('moderation.autoPunish.duration')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="40320"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="w-28 bg-discord-dark border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                    />
                    <span className="text-sm text-slate-400">{t('moderation.autoPunish.minutes')}</span>
                  </div>
                </div>
              )}

              {/* Add Rule Button */}
              <button
                type="button"
                onClick={handleAddRule}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
              >
                {t('moderation.autoPunish.addRuleBtn')}
              </button>
            </div>

            {/* List of Configured Rules */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                {t('moderation.autoPunish.ruleListTitle')} ({moderationConfig.autoPunish.length})
              </h3>

              {moderationConfig.autoPunish.length === 0 ? (
                <div className="p-8 text-center bg-discord-darker rounded-xl border border-dashed border-slate-800">
                  <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">{t('moderation.autoPunish.noRules')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {moderationConfig.autoPunish.map((rule) => {
                    const actionLabel =
                      rule.action === 'timeout'
                        ? `${t('moderation.autoPunish.actionTimeout')} (${rule.durationMinutes || 60} ${t('moderation.autoPunish.minutes')})`
                        : rule.action === 'kick'
                        ? t('moderation.autoPunish.actionKick')
                        : t('moderation.autoPunish.actionBan');

                    return (
                      <div
                        key={rule.warnThreshold}
                        className="p-4 rounded-xl bg-discord-darker border border-slate-800 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-discord-blurple/20 text-discord-blurple flex items-center justify-center font-bold text-base font-mono">
                            {rule.warnThreshold}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white block">
                              {rule.warnThreshold} {t('moderation.autoPunish.warns')}
                            </span>
                            <span className="text-xs text-slate-400 block">{actionLabel}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRule(rule.warnThreshold)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title={t('moderation.autoPunish.deleteRuleBtn')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow transition-colors"
              >
                {isSavingConfig ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSavingConfig ? t('common.saving') : t('moderation.autoPunish.saveBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
