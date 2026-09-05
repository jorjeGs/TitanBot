import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUS from './locales/en-US.json';
import es419 from './locales/es-419.json';
import de from './locales/de.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'es-419': { translation: es419 },
      'de': { translation: de },
    },
    fallbackLng: 'es-419',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'titanbot_dashboard_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
  });

export default i18n;
