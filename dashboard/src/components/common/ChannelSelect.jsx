import React from 'react';
import { Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ChannelSelect({ channels, value, onChange, label, helpText, disabled = false }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Hash className="w-4 h-4" />
        </div>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          className="w-full pl-9 pr-8 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors disabled:opacity-50 appearance-none"
        >
          <option value="">-- {t('common.none')} --</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      {helpText && <p className="mt-1 text-xs text-slate-400">{helpText}</p>}
    </div>
  );
}
