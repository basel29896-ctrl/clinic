import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

const saved = localStorage.getItem('lang') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Keep <html dir/lang> in sync for RTL support.
function applyDir(lng) {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
}
applyDir(saved);
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng);
  applyDir(lng);
});

export default i18n;
