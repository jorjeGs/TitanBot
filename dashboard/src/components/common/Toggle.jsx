import React from 'react';

export function Toggle({ enabled, onChange, label, description, disabled = false }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        {label && <span className="text-sm font-medium text-slate-200 block">{label}</span>}
        {description && <span className="text-xs text-slate-400 block mt-0.5">{description}</span>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:ring-offset-2 focus:ring-offset-discord-darkest ${
          enabled ? 'bg-discord-blurple' : 'bg-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
