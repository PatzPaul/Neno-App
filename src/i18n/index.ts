import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import fr from './fr.json';
import auth from './modules/auth';
import bible from './modules/bible';
import hymns from './modules/hymns';
import library from './modules/library';
import notes from './modules/notes';
import profile from './modules/profile';
import search from './modules/search';
import sunset from './modules/sunset';
import sw from './sw.json';

export const UI_LANGS = ['sw', 'en', 'fr'] as const;
export type UiLang = (typeof UI_LANGS)[number];

type Module = Record<UiLang, Record<string, unknown>>;
// Each feature owns a module file (src/i18n/modules/*.ts) under its own top-level key.
const modules: Module[] = [auth, bible, hymns, library, notes, profile, search, sunset];

const build = (lang: UiLang, base: Record<string, unknown>) =>
  modules.reduce<Record<string, unknown>>((acc, m) => ({ ...acc, ...m[lang] }), { ...base });

// Swahili is the source locale: add every string in Swahili first.
// eslint-disable-next-line import/no-named-as-default-member -- i18next's documented API
i18n.use(initReactI18next).init({
  resources: {
    sw: { translation: build('sw', sw) },
    en: { translation: build('en', en) },
    fr: { translation: build('fr', fr) },
  },
  lng: 'sw',
  fallbackLng: 'sw',
  interpolation: { escapeValue: false },
});

export default i18n;
