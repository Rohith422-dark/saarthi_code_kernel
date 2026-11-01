import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import hi from './hi';
import te from './te';

// English strings are their own keys, so any screen that has not been translated yet simply stays readable.
const DICT = { en: {}, hi, te };
export const LANGS = [
  { code: 'en', native: 'English' },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'te', native: 'తెలుగు' },
];

const Ctx = createContext(null);
export const useT = () => useContext(Ctx);

const read = () => {
  try { const l = localStorage.getItem('saarthi.lang'); return DICT[l] ? l : 'en'; } catch { return 'en'; }
};

export function LangProvider({ children }) {
  const [lang, setLang] = useState(read);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('saarthi.lang', lang); } catch { /* storage unavailable */ }
  }, [lang]);

  const t = useCallback((key, vars) => {
    const text = DICT[lang][key] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text;
  }, [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Compact language picker used on the login page and in the top bar. */
export function LangSwitch({ className = '' }) {
  const { lang, setLang, t } = useT();
  return (
    <select
      value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('Language')}
      className={`h-10 cursor-pointer rounded-field border border-line bg-surface px-2.5 text-[13.5px] font-medium text-ink hover:bg-neutral focus:outline-none focus:ring-2 focus:ring-primary/25 ${className}`}
    >
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
    </select>
  );
}
