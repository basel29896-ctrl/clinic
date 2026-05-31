import { useTranslation } from 'react-i18next';

// Toggle between English and Arabic (RTL handled in i18n init).
export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
      aria-label="Toggle language"
    >
      {i18n.language === 'ar' ? 'EN' : 'ع'}
    </button>
  );
}
