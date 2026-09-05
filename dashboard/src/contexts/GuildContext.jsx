import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiFetch } from '../api/client';

const GuildContext = createContext(null);

export function GuildProvider({ children }) {
  const [currentGuild, setCurrentGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState(null);
  const [draftConfig, setDraftConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const loadGuild = useCallback(async (guildId) => {
    try {
      setLoading(true);
      const [guildRes, channelsRes, rolesRes, configRes] = await Promise.all([
        apiFetch(`/guilds/${guildId}`),
        apiFetch(`/guilds/${guildId}/channels`),
        apiFetch(`/guilds/${guildId}/roles`),
        apiFetch(`/guilds/${guildId}/config`),
      ]);

      setCurrentGuild(guildRes.guild);
      setChannels(channelsRes.channels || []);
      setRoles(rolesRes.roles || []);
      setConfig(configRes.config);
      setDraftConfig(JSON.parse(JSON.stringify(configRes.config)));
    } catch (error) {
      showToast(error.message || 'Failed to load guild data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const updateDraft = useCallback((key, value) => {
    setDraftConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        next[parent] = { ...next[parent], [child]: value };
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const hasChanges = draftConfig && config ? JSON.stringify(draftConfig) !== JSON.stringify(config) : false;

  const saveChanges = useCallback(async () => {
    if (!currentGuild || !draftConfig) return;
    try {
      setSaving(true);
      const res = await apiFetch(`/guilds/${currentGuild.id}/config`, {
        method: 'PATCH',
        body: draftConfig,
      });

      if (res.success && res.config) {
        setConfig(res.config);
        setDraftConfig(JSON.parse(JSON.stringify(res.config)));
        showToast('Settings saved successfully!', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [currentGuild, draftConfig, showToast]);

  const discardChanges = useCallback(() => {
    if (config) {
      setDraftConfig(JSON.parse(JSON.stringify(config)));
    }
  }, [config]);

  return (
    <GuildContext.Provider
      value={{
        currentGuild,
        channels,
        roles,
        config,
        draftConfig,
        loading,
        saving,
        hasChanges,
        toast,
        loadGuild,
        updateDraft,
        saveChanges,
        discardChanges,
        showToast,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild() {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within a GuildProvider');
  }
  return context;
}
