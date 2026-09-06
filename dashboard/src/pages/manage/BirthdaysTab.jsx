import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { apiFetch } from '../../api/client';
import { ChannelSelect } from '../../components/common/ChannelSelect';
import { RoleSelect } from '../../components/common/RoleSelect';
import { BirthdayPreview } from '../../components/preview/BirthdayPreview';
import {
  Cake,
  Calendar,
  Save,
  Search,
  Trash2,
  Users,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Gift,
  PartyPopper,
} from 'lucide-react';

const MONTHS = [
  { id: 1, key: 'january' },
  { id: 2, key: 'february' },
  { id: 3, key: 'march' },
  { id: 4, key: 'april' },
  { id: 5, key: 'may' },
  { id: 6, key: 'june' },
  { id: 7, key: 'july' },
  { id: 8, key: 'august' },
  { id: 9, key: 'september' },
  { id: 10, key: 'october' },
  { id: 11, key: 'november' },
  { id: 12, key: 'december' },
];

export function BirthdaysTab() {
  const { t } = useTranslation();
  const { guildId } = useParams();
  const { channels, roles, currentGuild } = useGuild();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Configuration state
  const [channelId, setChannelId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [message, setMessage] = useState('');

  // Birthdays data
  const [birthdays, setBirthdays] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'upcoming'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter text channels
  const textChannels = (channels || []).filter((c) => c.type === 0 || !c.type);

  const fetchBirthdaysData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/guilds/${guildId}/birthdays`);
      if (res.success) {
        setBirthdays(Array.isArray(res.birthdays) ? res.birthdays : []);
        setChannelId(res.config?.birthdayChannelId || '');
        setRoleId(res.config?.birthdayRoleId || '');
        setMessage(
          res.config?.birthdayMessage ||
            '🎉 ¡Feliz Cumpleaños {user}! Te deseamos un gran día en {server}! 🎂'
        );
      }
    } catch (err) {
      console.error('Failed to load birthdays data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdaysData();
  }, [guildId]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/birthdays/config`, {
        method: 'PATCH',
        body: JSON.stringify({
          birthdayChannelId: channelId || null,
          birthdayRoleId: roleId || null,
          birthdayMessage: message?.trim() || null,
        }),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('birthdays.saveSuccess') || '¡Configuración de cumpleaños guardada con éxito!',
        });
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('birthdays.errors.saveFailed') || 'Error al guardar la configuración.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('birthdays.errors.saveFailed') || 'Error de conexión.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBirthday = async (userId) => {
    if (!window.confirm(t('birthdays.confirmDelete') || '¿Deseas eliminar este registro de cumpleaños?')) {
      return;
    }

    try {
      setDeletingId(userId);
      setNotification(null);

      const res = await apiFetch(`/guilds/${guildId}/birthdays/${userId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: t('birthdays.deleteSuccess') || 'Registro de cumpleaños eliminado correctamente.',
        });
        setBirthdays((prev) => prev.filter((b) => b.userId !== userId));
      } else {
        setNotification({
          type: 'error',
          message: res.message || t('birthdays.errors.deleteFailed') || 'Error al eliminar el registro.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || t('birthdays.errors.deleteFailed') || 'Error de conexión.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const selectedChannel = (channels || []).find((c) => c.id === channelId);
  const selectedRole = (roles || []).find((r) => r.id === roleId);

  // Month counts map
  const monthCounts = birthdays.reduce((acc, b) => {
    acc[b.month] = (acc[b.month] || 0) + 1;
    return acc;
  }, {});

  // Filtered birthdays based on activeTab & search
  const filteredBirthdays = birthdays.filter((b) => {
    const matchesSearch =
      !searchTerm ||
      (b.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.userId.includes(searchTerm);

    if (!matchesSearch) return false;

    if (activeTab === 'upcoming') {
      return true;
    }

    return b.month === selectedMonth;
  });

  const upcomingBirthdays = [...birthdays]
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          <p className="text-sm text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Cake className="w-7 h-7 text-pink-400" />
            <span>{t('birthdays.title') || 'Sistema de Cumpleaños'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('birthdays.subtitle') ||
              'Configura felicitaciones automáticas diarias, roles de celebración temporal por 24 horas y visualiza el calendario de cumpleaños de tu comunidad.'}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchBirthdaysData}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-discord-dark hover:bg-slate-700/60 text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-700/60 shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('birthdays.refreshBtn') || 'Actualizar'}</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-md animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{notification.message}</div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: Settings Form + Live Preview */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <PartyPopper className="w-5 h-5 text-pink-400" />
          <div>
            <h2 className="text-base font-bold text-white">
              {t('birthdays.configCardTitle') || 'Ajustes de Anuncios y Celebración'}
            </h2>
            <p className="text-xs text-slate-400">
              {t('birthdays.configCardSubtitle') ||
                'Personaliza el canal donde el bot enviará el mensaje festivo cada mañana a las 09:00 UTC y el rol temporal otorgado.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Settings Fields */}
          <form onSubmit={handleSaveConfig} className="lg:col-span-7 space-y-5">
            {/* Announcement Channel */}
            <ChannelSelect
              label={t('birthdays.fieldChannel') || 'Canal de Felicitaciones'}
              helpText={t('birthdays.fieldChannelHelp') || 'Canal de texto público donde TitanBot publicará el anuncio de cumpleaños.'}
              channels={textChannels}
              value={channelId}
              onChange={(val) => setChannelId(val)}
            />

            {/* Temporary Celebration Role */}
            <RoleSelect
              label={t('birthdays.fieldRole') || 'Rol de Celebración Temporal (Opcional)'}
              helpText={t('birthdays.fieldRoleHelp') || 'Rol otorgado automáticamente al miembro durante 24 horas y removido al día siguiente.'}
              roles={roles || []}
              value={roleId}
              onChange={(val) => setRoleId(val)}
              warnHierarchy={true}
            />

            {/* Custom Greeting Message */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                {t('birthdays.fieldMessage') || 'Mensaje de Felicitación'}
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="🎉 ¡Feliz Cumpleaños {user}! Te deseamos un gran día en {server}! 🎂"
                className="w-full px-3.5 py-2.5 bg-discord-dark border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors resize-y leading-relaxed font-sans"
              />
              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {t('birthdays.messageTokensHelp') || 'Variables disponibles: {user}, {server}'}
                </span>
                <span>{message.length} / 1000</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common.saving')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('common.save')}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live Embed Preview */}
          <div className="lg:col-span-5 sticky top-6">
            <BirthdayPreview
              channelName={selectedChannel?.name}
              roleName={selectedRole?.name}
              customMessage={message}
              serverName={currentGuild?.name}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Visual Calendar & Registered Birthdays */}
      <div className="bg-discord-darker/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-400" />
              <span>{t('birthdays.calendarCardTitle') || 'Calendario de Aniversarios'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('birthdays.calendarCardSubtitle') ||
                'Explora las fechas registradas por mes o revisa los cumpleaños más cercanos.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch */}
            <div className="flex p-1 bg-discord-dark rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('birthdays.tabs.annualCalendar') || 'Calendario Anual'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'upcoming'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t('birthdays.tabs.upcoming') || 'Próximos'}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('birthdays.searchPlaceholder') || 'Buscar usuario...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-discord-dark border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 12 Months Navigation Pills (visible in calendar tab) */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {MONTHS.map((m) => {
              const count = monthCounts[m.id] || 0;
              const isSelected = selectedMonth === m.id;
              const monthLabel = t(`birthdays.months.${m.id}`, { defaultValue: t(`birthday.months.${m.id}`, { defaultValue: m.key }) });

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMonth(m.id)}
                  className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-pink-500/20 border-pink-500 text-white font-bold shadow-md shadow-pink-500/10'
                      : 'bg-discord-dark/70 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider truncate">
                    {monthLabel.slice(0, 3)}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      count > 0
                        ? isSelected
                          ? 'bg-pink-500 text-white'
                          : 'bg-slate-700 text-pink-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Birthdays Grid / Empty State */}
        {filteredBirthdays.length === 0 ? (
          <div className="bg-discord-darker/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
              <Cake className="w-6 h-6 text-pink-400/60" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {t('birthdays.noBirthdaysFound') || 'No hay cumpleaños registrados para esta vista.'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t('birthdays.noBirthdaysHelp') ||
                'Los miembros pueden registrar su fecha de nacimiento en Discord con el comando /birthday set.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBirthdays.map((b) => {
              const isDeleting = deletingId === b.userId;
              const localizedMonth = t(`birthdays.months.${b.month}`, { defaultValue: t(`birthday.months.${b.month}`, { defaultValue: b.monthName }) });

              return (
                <div
                  key={b.userId}
                  className={`bg-discord-darker border rounded-xl p-4 shadow-md transition-all flex flex-col justify-between ${
                    b.isToday
                      ? 'border-pink-500 ring-1 ring-pink-500/40 bg-pink-500/5'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {b.avatar ? (
                          <img
                            src={b.avatar}
                            alt={b.displayName}
                            className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-pink-600/30 border border-pink-500/30 flex items-center justify-center font-bold text-xs text-pink-300 shrink-0">
                            {b.displayName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate" title={b.displayName}>
                            {b.displayName}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">@{b.username}</p>
                        </div>
                      </div>

                      {b.isToday ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500 text-white animate-pulse">
                          🎉 ¡Hoy!
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                          {b.daysUntil === 1
                            ? t('birthdays.tomorrow') || 'Mañana'
                            : `${t('birthdays.inDays') || 'en'} ${b.daysUntil} ${t('birthdays.days') || 'días'}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-200 bg-[#1e1f22] px-2.5 py-1.5 rounded border border-slate-700/40 font-medium">
                      <Cake className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span>
                        {b.day} {t('birthdays.of') || 'de'} {localizedMonth}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {b.userId.slice(-5)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBirthday(b.userId)}
                      disabled={isDeleting}
                      title={t('birthdays.deleteTooltip') || 'Eliminar registro'}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
