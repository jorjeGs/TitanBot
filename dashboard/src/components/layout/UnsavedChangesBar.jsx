import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGuild } from '../../contexts/GuildContext';
import { AlertCircle, Save, RotateCcw } from 'lucide-react';

export function UnsavedChangesBar() {
  const { t } = useTranslation();
  const { hasChanges, saving, saveChanges, discardChanges } = useGuild();

  if (!hasChanges) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-discord-dark border border-amber-500/40 rounded-xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{t('common.unsavedChanges')}</h4>
          <p className="text-xs text-slate-400 hidden sm:block">
            {t('common.unsavedChangesHelp')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={discardChanges}
          className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('common.discard')}</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={saveChanges}
          className="flex-1 sm:flex-none px-5 py-2 text-xs font-semibold text-white bg-discord-blurple hover:bg-discord-blurpleHover disabled:opacity-50 rounded-lg transition-all shadow-md shadow-discord-blurple/25 flex items-center justify-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? t('common.saving') : t('common.save')}</span>
        </button>
      </div>
    </div>
  );
}
