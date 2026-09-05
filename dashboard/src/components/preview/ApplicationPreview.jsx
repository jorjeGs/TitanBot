import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Hash, ClipboardList, Shield, HelpCircle, FileText } from 'lucide-react';

export function ApplicationPreview({
  channelName,
  roleName,
  questions = [],
  serverName,
}) {
  const { t } = useTranslation();

  const displayRole = roleName || t('applications.previewRoleDefault') || 'Moderador / Staff';
  const displayQuestions =
    questions.length > 0
      ? questions
      : [
          '¿Por qué deseas unirte al equipo de staff?',
          '¿Qué experiencia previa tienes en moderación?',
          '¿Cuántas horas semanales puedes dedicar?',
        ];

  return (
    <div className="bg-discord-darker border border-slate-700/60 rounded-xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-discord-blurple" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('applications.previewTitle') || 'Vista Previa del Panel de Postulación'}
          </span>
        </div>
        {channelName && (
          <div className="flex items-center gap-1 text-xs text-discord-blurple font-medium bg-discord-blurple/10 px-2 py-0.5 rounded border border-discord-blurple/20">
            <Hash className="w-3 h-3" />
            <span>{channelName}</span>
          </div>
        )}
      </div>

      {/* Discord Message Mock */}
      <div className="flex items-start gap-3 bg-[#313338] p-3.5 rounded-lg border border-slate-700/40 font-sans">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-discord-blurple to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Bot info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">TitanBot</span>
            <span className="bg-discord-blurple text-[10px] uppercase font-bold text-white px-1.5 py-0.5 rounded">
              BOT
            </span>
            <span className="text-[11px] text-slate-400">
              {t('welcome.previewTime') || 'Hoy a las 12:00'}
            </span>
          </div>

          {/* Embed Container */}
          <div className="border-l-4 border-discord-blurple bg-[#2b2d31] p-3.5 rounded-r-md space-y-3 shadow-sm">
            <div className="font-bold text-white text-base leading-snug flex items-center gap-2">
              <span>📋</span>
              <span>
                {t('applications.previewEmbedTitle', { role: displayRole }) ||
                  `Postulaciones Abiertas: @${displayRole}`}
              </span>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              {t('applications.previewEmbedDesc') ||
                '¡Estamos buscando nuevos miembros para unirse a nuestro equipo! Completa el cuestionario a continuación haciendo clic en el botón.'}
            </div>

            {/* Embed Role & Requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-[#1e1f22] p-2.5 rounded border border-slate-700/30 flex items-center gap-2">
                <Shield className="w-4 h-4 text-discord-blurple shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                    {t('applications.fieldTargetRole') || 'Rol Postulado'}
                  </span>
                  <span className="font-bold text-discord-blurple truncate block">
                    @{displayRole}
                  </span>
                </div>
              </div>

              <div className="bg-[#1e1f22] p-2.5 rounded border border-slate-700/30 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                    {t('applications.questionsCount') || 'Preguntas'}
                  </span>
                  <span className="font-bold text-slate-200">
                    {displayQuestions.length} {t('applications.questionsBadge') || 'preguntas'}
                  </span>
                </div>
              </div>
            </div>

            {/* Questions preview */}
            <div className="bg-[#1e1f22]/60 p-2.5 rounded border border-slate-700/30 space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                {t('applications.questionnairePreview') || 'Cuestionario de Evaluación:'}
              </span>
              {displayQuestions.slice(0, 3).map((q, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                  <span className="text-discord-blurple font-bold">{idx + 1}.</span>
                  <span className="truncate">{q}</span>
                </div>
              ))}
              {displayQuestions.length > 3 && (
                <div className="text-[10px] text-slate-500 italic">
                  + {displayQuestions.length - 3} {t('applications.moreQuestions') || 'preguntas adicionales...'}
                </div>
              )}
            </div>

            {/* Embed Footer */}
            <div className="pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span>TitanBot Applications</span>
                <span>•</span>
                <span>{serverName || 'TitanBot'}</span>
              </div>
              <span>{t('applications.previewCooldown') || 'Cooldown: 24h'}</span>
            </div>
          </div>

          {/* Simulated Discord Apply Button */}
          <div className="pt-0.5">
            <button
              type="button"
              className="bg-discord-blurple hover:bg-discord-blurple/90 transition-colors text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-2 shadow-sm cursor-pointer select-none"
            >
              <FileText className="w-4 h-4" />
              <span>{t('applications.applyBtn') || 'Postularse 📝'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
