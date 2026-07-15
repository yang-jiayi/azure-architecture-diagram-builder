import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="language-switch" role="group" aria-label={t('language.label')}>
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        EN
        <span className="sr-only"> {t('language.english')}</span>
      </button>
      <button
        type="button"
        className={language === 'ja' ? 'active' : ''}
        aria-pressed={language === 'ja'}
        onClick={() => setLanguage('ja')}
      >
        日本語
      </button>
    </div>
  );
}
