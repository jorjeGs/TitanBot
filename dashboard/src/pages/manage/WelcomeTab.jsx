import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { WelcomePreview } from '../../components/preview/WelcomePreview';
import {
  Sparkles,
  MessageSquare,
  UserCheck,
  Plus,
  X,
  AlertTriangle,
  LayoutTemplate,
  LogOut,
  Palette,
  Clock,
} from 'lucide-react';

const COLOR_SWATCHES = [
  { name: 'Blurple', value: '#5865F2' },
  { name: 'Emerald', value: '#57F287' },
  { name: 'Gold', value: '#FEE75C' },
  { name: 'Fuchsia', value: '#EB459E' },
  { name: 'Coral Red', value: '#ED4245' },
  { name: 'Dark Slate', value: '#2b2d31' },
];

export function WelcomeTab() {
  const { t } = useTranslation();
  const { currentGuild, draftConfig, updateDraft, channels, roles } = useGuild();

  const [activeSubTab, setActiveSubTab] = useState('welcome'); // 'welcome' | 'goodbye' | 'autoroles'
  const [selectedToAdd, setSelectedToAdd] = useState('');

  if (!draftConfig) return null;

  // Selected Channels
  const selectedWelcomeChannel = channels.find((c) => c.id === draftConfig.welcomeChannel);
  const selectedGoodbyeChannel = channels.find((c) => c.id === draftConfig.goodbyeChannelId);

  // Welcome settings
  const welcomeEnabled = draftConfig.welcomeEnabled !== false;
  const welcomeType = draftConfig.welcomeType || 'text'; // 'text' | 'embed'
  const welcomeEmbed = draftConfig.welcomeEmbed || {
    title: '🎉 Welcome to the Server!',
    description: draftConfig.welcomeMessage || 'Welcome {user} to {server}!',
    color: '#5865F2',
    footer: `Welcome to ${currentGuild?.name || 'Server'}`,
    image: '',
    thumbnail: true,
  };

  // Goodbye settings
  const goodbyeEnabled = Boolean(draftConfig.goodbyeEnabled);
  const leaveType = draftConfig.leaveType || 'text'; // 'text' | 'embed'
  const leaveEmbed = draftConfig.leaveEmbed || {
    title: '👋 Farewell!',
    description: draftConfig.leaveMessage || '{user} has left the server.',
    color: '#ED4245',
    footer: `Goodbye from ${currentGuild?.name || 'Server'}`,
    image: '',
    thumbnail: true,
  };

  // Auto Roles
  const currentAutoRoles = Array.isArray(draftConfig.autoRoles)
    ? draftConfig.autoRoles
    : draftConfig.autoRole
    ? [draftConfig.autoRole]
    : [];

  const handleAddRole = () => {
    if (!selectedToAdd) return;
    if (currentAutoRoles.includes(selectedToAdd)) return;
    if (currentAutoRoles.length >= 10) return;

    const nextRoles = [...currentAutoRoles, selectedToAdd];
    updateDraft('autoRoles', nextRoles);
    updateDraft('autoRole', nextRoles[0] || null);
    setSelectedToAdd('');
  };

  const handleRemoveRole = (roleId) => {
    const nextRoles = currentAutoRoles.filter((id) => id !== roleId);
    updateDraft('autoRoles', nextRoles);
    updateDraft('autoRole', nextRoles[0] || null);
  };

  const availableToAdd = roles.filter((r) => !currentAutoRoles.includes(r.id));
  const selectedRoleObjects = currentAutoRoles
    .map((id) => roles.find((r) => r.id === id))
    .filter(Boolean);

  const hasUnmanageableRole = selectedRoleObjects.some((r) => r.canManage === false);

  // Helper to insert placeholders into active input
  const handleInsertPlaceholder = (token, targetKey, subObject = null) => {
    if (subObject) {
      const currentVal = draftConfig[subObject]?.[targetKey] || '';
      updateDraft(subObject, {
        ...draftConfig[subObject],
        [targetKey]: currentVal ? `${currentVal} ${token}` : token,
      });
    } else {
      const currentVal = draftConfig[targetKey] || '';
      updateDraft(targetKey, currentVal ? `${currentVal} ${token}` : token);
    }
  };

  const updateWelcomeEmbedField = (field, val) => {
    updateDraft('welcomeEmbed', {
      ...welcomeEmbed,
      [field]: val,
    });
  };

  const updateLeaveEmbedField = (field, val) => {
    updateDraft('leaveEmbed', {
      ...leaveEmbed,
      [field]: val,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('welcome.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('welcome.subtitle')}</p>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('welcome')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors ${
            activeSubTab === 'welcome'
              ? 'border-discord-blurple text-discord-blurple bg-discord-blurple/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('welcome.tabWelcome', 'Bienvenidas')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('goodbye')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors ${
            activeSubTab === 'goodbye'
              ? 'border-discord-blurple text-discord-blurple bg-discord-blurple/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LogOut className="w-4 h-4" />
          <span>{t('welcome.tabGoodbye', 'Despedidas')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('autoroles')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors ${
            activeSubTab === 'autoroles'
              ? 'border-discord-blurple text-discord-blurple bg-discord-blurple/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{t('welcome.tabAutoRoles', 'Roles Automáticos')}</span>
          {currentAutoRoles.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {currentAutoRoles.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: WELCOMES */}
          {activeSubTab === 'welcome' && (
            <div className="space-y-6">
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-5 h-5 text-discord-blurple" />
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('welcome.cardMessageTitle', 'Configuración de Bienvenida')}
                    </h2>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={welcomeEnabled}
                      onChange={(e) => updateDraft('welcomeEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-blurple"></div>
                  </label>
                </div>

                <ChannelSelect
                  label={t('welcome.channel')}
                  helpText={t('welcome.channelHelp')}
                  channels={channels}
                  value={draftConfig.welcomeChannel}
                  onChange={(val) => updateDraft('welcomeChannel', val)}
                />

                {/* Format Toggle: Plain Text vs Discord Embed */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('welcome.formatType', 'Formato del Mensaje')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateDraft('welcomeType', 'text')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        welcomeType === 'text'
                          ? 'bg-discord-blurple/20 border-discord-blurple text-white shadow-sm'
                          : 'bg-discord-dark border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{t('welcome.formatText', 'Texto Plano')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateDraft('welcomeType', 'embed')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        welcomeType === 'embed'
                          ? 'bg-discord-blurple/20 border-discord-blurple text-white shadow-sm'
                          : 'bg-discord-dark border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      <span>{t('welcome.formatEmbed', 'Embed Elegante')}</span>
                    </button>
                  </div>
                </div>

                {/* Plain Text Mode */}
                {welcomeType === 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('welcome.message')}
                    </label>
                    <textarea
                      rows={4}
                      maxLength={2000}
                      value={draftConfig.welcomeMessage || 'Welcome {user} to {server}!'}
                      onChange={(e) => updateDraft('welcomeMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors resize-y leading-relaxed font-sans"
                    />
                  </div>
                )}

                {/* Embed Mode */}
                {welcomeType === 'embed' && (
                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        {t('welcome.embedTitle', 'Título del Embed')}
                      </label>
                      <input
                        type="text"
                        maxLength={256}
                        value={welcomeEmbed.title}
                        onChange={(e) => updateWelcomeEmbedField('title', e.target.value)}
                        className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        {t('welcome.embedDescription', 'Descripción / Contenido')}
                      </label>
                      <textarea
                        rows={3}
                        maxLength={4096}
                        value={welcomeEmbed.description}
                        onChange={(e) => updateWelcomeEmbedField('description', e.target.value)}
                        className="w-full px-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple transition-colors resize-y"
                      />
                    </div>

                    {/* Color Picker & Swatches */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t('welcome.embedColor', 'Color del Embed')}</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.value}
                            type="button"
                            onClick={() => updateWelcomeEmbedField('color', swatch.value)}
                            className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                              welcomeEmbed.color === swatch.value
                                ? 'scale-110 border-white ring-2 ring-discord-blurple/50'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: swatch.value }}
                            title={swatch.name}
                          />
                        ))}
                        <input
                          type="color"
                          value={welcomeEmbed.color || '#5865F2'}
                          onChange={(e) => updateWelcomeEmbedField('color', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          {t('welcome.embedImage', 'Banner Grande (URL)')}
                        </label>
                        <input
                          type="url"
                          placeholder="https://ejemplo.com/banner.png"
                          value={welcomeEmbed.image || ''}
                          onChange={(e) => updateWelcomeEmbedField('image', e.target.value)}
                          className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-discord-blurple"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          {t('welcome.embedFooter', 'Pie de Página (Footer)')}
                        </label>
                        <input
                          type="text"
                          maxLength={2048}
                          value={welcomeEmbed.footer || ''}
                          onChange={(e) => updateWelcomeEmbedField('footer', e.target.value)}
                          className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-discord-blurple"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Variable Pills */}
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400 block mb-2 font-medium">
                    {t('welcome.variablesTitle', 'Variables dinámicas (haz clic para insertar):')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['{user}', '{username}', '{server}', '{memberCount}', '{user.id}'].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => {
                          if (welcomeType === 'embed') {
                            handleInsertPlaceholder(token, 'description', 'welcomeEmbed');
                          } else {
                            handleInsertPlaceholder(token, 'welcomeMessage');
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-discord-blurple/20 hover:text-discord-blurple text-xs font-mono text-slate-300 rounded-md border border-slate-700/60 transition-colors"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Ping Toggle */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-200 block">
                      {t('welcome.pingUser', 'Mencionar al usuario fuera del embed')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {t('welcome.pingUserHelp', 'Si está activo, enviará una mención directa para notificar al usuario.')}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(draftConfig.welcomePing)}
                      onChange={(e) => updateDraft('welcomePing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-discord-blurple"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOODBYE */}
          {activeSubTab === 'goodbye' && (
            <div className="space-y-6">
              <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <LogOut className="w-5 h-5 text-rose-400" />
                    <h2 className="text-base font-semibold text-slate-100">
                      {t('welcome.goodbyeEnable', 'Habilitar mensajes de despedida')}
                    </h2>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={goodbyeEnabled}
                      onChange={(e) => updateDraft('goodbyeEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                <ChannelSelect
                  label={t('welcome.goodbyeChannel', 'Canal de despedidas')}
                  helpText={t('welcome.goodbyeChannelHelp', 'Canal donde se publicará cuando un miembro salga.')}
                  channels={channels}
                  value={draftConfig.goodbyeChannelId}
                  onChange={(val) => updateDraft('goodbyeChannelId', val)}
                />

                {/* Format Toggle */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('welcome.formatType', 'Formato del Mensaje')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateDraft('leaveType', 'text')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        leaveType === 'text'
                          ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                          : 'bg-discord-dark border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{t('welcome.formatText', 'Texto Plano')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateDraft('leaveType', 'embed')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        leaveType === 'embed'
                          ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                          : 'bg-discord-dark border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      <span>{t('welcome.formatEmbed', 'Embed Elegante')}</span>
                    </button>
                  </div>
                </div>

                {/* Plain Text Mode */}
                {leaveType === 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('welcome.goodbyeMessage', 'Mensaje de despedida')}
                    </label>
                    <textarea
                      rows={4}
                      maxLength={2000}
                      value={draftConfig.leaveMessage || '{user} has left the server.'}
                      onChange={(e) => updateDraft('leaveMessage', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-colors resize-y leading-relaxed font-sans"
                    />
                  </div>
                )}

                {/* Embed Mode */}
                {leaveType === 'embed' && (
                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        {t('welcome.embedTitle', 'Título del Embed')}
                      </label>
                      <input
                        type="text"
                        maxLength={256}
                        value={leaveEmbed.title}
                        onChange={(e) => updateLeaveEmbedField('title', e.target.value)}
                        className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        {t('welcome.embedDescription', 'Descripción / Contenido')}
                      </label>
                      <textarea
                        rows={3}
                        maxLength={4096}
                        value={leaveEmbed.description}
                        onChange={(e) => updateLeaveEmbedField('description', e.target.value)}
                        className="w-full px-3.5 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-colors resize-y"
                      />
                    </div>

                    {/* Color Swatches */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t('welcome.embedColor', 'Color del Embed')}</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.value}
                            type="button"
                            onClick={() => updateLeaveEmbedField('color', swatch.value)}
                            className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                              leaveEmbed.color === swatch.value
                                ? 'scale-110 border-white ring-2 ring-rose-500/50'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: swatch.value }}
                            title={swatch.name}
                          />
                        ))}
                        <input
                          type="color"
                          value={leaveEmbed.color || '#ED4245'}
                          onChange={(e) => updateLeaveEmbedField('color', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Variable Pills */}
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400 block mb-2 font-medium">
                    {t('welcome.variablesTitle', 'Variables dinámicas (haz clic para insertar):')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['{user}', '{username}', '{server}', '{memberCount}'].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => {
                          if (leaveType === 'embed') {
                            handleInsertPlaceholder(token, 'description', 'leaveEmbed');
                          } else {
                            handleInsertPlaceholder(token, 'leaveMessage');
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-xs font-mono text-slate-300 rounded-md border border-slate-700/60 transition-colors"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTO ROLES */}
          {activeSubTab === 'autoroles' && (
            <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-semibold text-slate-100">{t('welcome.autoRolesTitle')}</h2>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                  {currentAutoRoles.length} / 10
                </span>
              </div>

              <p className="text-xs text-slate-400">{t('welcome.autoRolesHelp')}</p>

              {/* Add Role Selector */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedToAdd}
                    onChange={(e) => setSelectedToAdd(e.target.value)}
                    disabled={currentAutoRoles.length >= 10}
                    className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors disabled:opacity-50 appearance-none"
                  >
                    <option value="">-- {t('welcome.addRole')} --</option>
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
                  disabled={!selectedToAdd || currentAutoRoles.length >= 10}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('welcome.addRole')}</span>
                </button>
              </div>

              {/* Selected Roles List */}
              {selectedRoleObjects.length > 0 ? (
                <div className="space-y-2 mt-2 bg-discord-dark/50 border border-slate-800/80 rounded-xl p-3 max-h-56 overflow-y-auto">
                  {selectedRoleObjects.map((role) => {
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
                          <span className="text-sm font-medium truncate">{role.name}</span>
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
                          title={t('welcome.removeRole')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic pt-1">{t('welcome.noRoles')}</p>
              )}

              {/* Delay Selector */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('welcome.delay', 'Retraso de asignación')}</span>
                </label>
                <select
                  value={draftConfig.autoRoleDelay ?? 0}
                  onChange={(e) => updateDraft('autoRoleDelay', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple"
                >
                  <option value={0}>{t('welcome.delayImmediate', 'Inmediato (0 segundos)')}</option>
                  <option value={5}>{t('welcome.delay5s', '5 segundos')}</option>
                  <option value={15}>{t('welcome.delay15s', '15 segundos')}</option>
                  <option value={30}>{t('welcome.delay30s', '30 segundos')}</option>
                  <option value={60}>{t('welcome.delay60s', '60 segundos')}</option>
                </select>
              </div>

              {/* Hierarchy Warning Banner */}
              {hasUnmanageableRole && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t('common.hierarchyWarning')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Preview Right Column */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <WelcomePreview
            mode={activeSubTab === 'goodbye' ? leaveType : welcomeType}
            message={activeSubTab === 'goodbye' ? draftConfig.leaveMessage : draftConfig.welcomeMessage}
            embed={activeSubTab === 'goodbye' ? leaveEmbed : welcomeEmbed}
            serverName={currentGuild?.name}
            channelName={activeSubTab === 'goodbye' ? selectedGoodbyeChannel?.name : selectedWelcomeChannel?.name}
            isGoodbye={activeSubTab === 'goodbye'}
            pingUser={activeSubTab === 'goodbye' ? Boolean(draftConfig.goodbyePing) : Boolean(draftConfig.welcomePing)}
          />
        </div>
      </div>
    </div>
  );
}
