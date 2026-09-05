import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { ReactionRolePreview } from '../../components/preview/ReactionRolePreview';
import {
  KeyRound,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Loader2,
  Hash,
} from 'lucide-react';

export function RolesTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { currentGuild, channels, roles } = useGuild();

  // Panels state
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Form state
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [roleSelectValue, setRoleSelectValue] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch panels on mount or guild change
  const fetchPanels = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/guilds/${guildId}/reactroles`);
      if (data && data.panels) {
        setPanels(data.panels);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to load reaction role panels.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanels();
  }, [guildId]);

  // Derive full role objects for selected IDs
  const selectedRoles = selectedRoleIds
    .map((id) => roles.find((r) => r.id === id))
    .filter(Boolean);

  // Available roles that haven't been selected yet
  const availableToAdd = roles.filter(
    (r) => !selectedRoleIds.includes(r.id)
  );

  const handleAddRole = () => {
    if (!roleSelectValue) return;
    if (selectedRoleIds.length >= 25) return;
    if (!selectedRoleIds.includes(roleSelectValue)) {
      setSelectedRoleIds((prev) => [...prev, roleSelectValue]);
    }
    setRoleSelectValue('');
  };

  const handleRemoveRole = (idToRemove) => {
    setSelectedRoleIds((prev) => prev.filter((id) => id !== idToRemove));
  };

  // Check if any selected role is unmanageable by the bot
  const hasUnmanageableRole = selectedRoles.some((r) => r.canManage === false);

  const handlePublish = async (e) => {
    e.preventDefault();
    setNotification(null);

    if (!channelId) {
      setNotification({ type: 'error', text: t('roles.channelHelp') });
      return;
    }
    if (!title.trim()) {
      setNotification({ type: 'error', text: t('roles.panelTitlePlaceholder') });
      return;
    }
    if (selectedRoleIds.length === 0) {
      setNotification({ type: 'error', text: t('roles.atLeastOneRole') });
      return;
    }
    if (hasUnmanageableRole) {
      setNotification({ type: 'error', text: t('common.hierarchyWarning') });
      return;
    }

    try {
      setPublishing(true);
      await apiFetch(`/guilds/${guildId}/reactroles`, {
        method: 'POST',
        body: JSON.stringify({
          channelId,
          title: title.trim(),
          description: description.trim(),
          roleIds: selectedRoleIds,
        }),
      });

      setNotification({ type: 'success', text: t('roles.panelCreated') });
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedRoleIds([]);
      // Refresh panels list
      await fetchPanels();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to publish reaction role panel.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      setDeletingId(messageId);
      setNotification(null);
      await apiFetch(`/guilds/${guildId}/reactroles/${messageId}`, {
        method: 'DELETE',
      });
      setNotification({ type: 'success', text: t('roles.panelDeleted') });
      setPanels((prev) => prev.filter((p) => p.messageId !== messageId));
      setConfirmDeleteId(null);
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to delete reaction role panel.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const selectedChannel = channels.find((c) => c.id === channelId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <KeyRound className="w-7 h-7 text-discord-blurple" />
          {t('roles.title')}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{t('roles.subtitle')}</p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 shadow-md border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Grid: Form (Left) & Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Builder & Active Panels */}
        <div className="lg:col-span-7 space-y-8">
          {/* Card: Create New Panel Form */}
          <form
            onSubmit={handlePublish}
            className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Sparkles className="w-5 h-5 text-discord-blurple" />
              <h2 className="text-base font-semibold text-slate-100">
                {t('roles.createPanel')}
              </h2>
            </div>

            {/* Target Channel */}
            <ChannelSelect
              label={t('roles.channel')}
              helpText={t('roles.channelHelp')}
              channels={channels}
              value={channelId}
              onChange={(val) => setChannelId(val)}
            />

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('roles.panelTitle')}
              </label>
              <input
                type="text"
                maxLength={256}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('roles.panelTitlePlaceholder')}
                className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('roles.panelDesc')}
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('roles.panelDescPlaceholder')}
                className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors resize-y leading-relaxed font-sans"
              />
            </div>

            {/* Roles Selection */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    {t('roles.selectRoles')}
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('roles.selectRolesHelp')}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                  {selectedRoleIds.length} / 25
                </span>
              </div>

              {/* Add Role Selector */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={roleSelectValue}
                    onChange={(e) => setRoleSelectValue(e.target.value)}
                    disabled={selectedRoleIds.length >= 25}
                    className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors disabled:opacity-50 appearance-none"
                  >
                    <option value="">-- {t('roles.addRole')} --</option>
                    {availableToAdd.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                        {role.canManage === false ? ` (${t('common.unmanageableRole')})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddRole}
                  disabled={!roleSelectValue || selectedRoleIds.length >= 25}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('roles.addRole')}</span>
                </button>
              </div>

              {/* Selected Roles List */}
              {selectedRoles.length > 0 && (
                <div className="space-y-2 mt-3 bg-discord-dark/50 border border-slate-800/80 rounded-xl p-3 max-h-60 overflow-y-auto">
                  {selectedRoles.map((role) => {
                    const isUnmanageable = role.canManage === false;
                    return (
                      <div
                        key={role.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                          isUnmanageable
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-discord-dark border-slate-700/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor:
                                role.color && role.color !== '#000000' && role.color !== '#99aab5'
                                  ? role.color
                                  : '#94a3b8',
                            }}
                          />
                          <span className="text-sm font-medium truncate">
                            {role.name}
                          </span>
                          {isUnmanageable && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              {t('common.unmanageableRole')}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRole(role.id)}
                          className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                          title={t('roles.removeRole')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hierarchy Warning Banner */}
              {hasUnmanageableRole && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t('common.hierarchyWarning')}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={
                  publishing ||
                  !channelId ||
                  !title.trim() ||
                  selectedRoleIds.length === 0 ||
                  hasUnmanageableRole
                }
                className="w-full py-2.5 px-4 bg-discord-blurple hover:bg-discord-blurple-hover active:scale-[0.99] text-white font-medium text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('roles.publishing')}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{t('roles.publish')}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Active Panels Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-400" />
                <span>{t('roles.activePanels')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  {panels.length}
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{t('roles.loadingPanels', 'Loading panels...')}</span>
              </div>
            ) : panels.length === 0 ? (
              <div className="bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
                <KeyRound className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-300">
                  {t('roles.noPanels')}
                </h3>
              </div>
            ) : (
              <div className="space-y-3">
                {panels.map((panel) => {
                  const discordUrl = `https://discord.com/channels/${guildId}/${panel.channelId}/${panel.messageId}`;
                  const isConfirming = confirmDeleteId === panel.messageId;
                  const isDeleting = deletingId === panel.messageId;

                  return (
                    <div
                      key={panel.messageId}
                      className="bg-discord-darker/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700/80 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">
                              {panel.title || 'Reaction Roles'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-discord-blurple bg-discord-blurple/10 px-2 py-0.5 rounded">
                              <Hash className="w-3 h-3" />
                              {panel.channelName || panel.channelId}
                            </span>
                          </div>
                          {panel.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {panel.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={discordUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-discord-blurple hover:bg-slate-800 rounded-lg transition-colors"
                            title={t('roles.openInDiscord')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {isConfirming ? (
                            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 p-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => handleDelete(panel.messageId)}
                                disabled={isDeleting}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Confirm'
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-0.5 text-slate-400 hover:text-white rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(panel.messageId)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title={t('roles.removeRole')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Role Pills */}
                      {panel.roles && panel.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {panel.roles.map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-discord-dark text-slate-200 border border-slate-700/50"
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    r.color && r.color !== '#000000' && r.color !== '#99aab5'
                                      ? r.color
                                      : '#94a3b8',
                                }}
                              />
                              <span className="truncate max-w-[150px]">{r.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Discord Preview */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <ReactionRolePreview
            title={title}
            description={description}
            selectedRoles={selectedRoles}
            serverName={currentGuild?.name}
            channelName={selectedChannel?.name}
          />
        </div>
      </div>
    </div>
  );
}
