import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import fr from './fr.json';
import sw from './sw.json';

export const UI_LANGS = ['sw', 'en', 'fr'] as const;
export type UiLang = (typeof UI_LANGS)[number];

// Swahili is the source locale: add every string to sw.json first.
// eslint-disable-next-line import/no-named-as-default-member -- i18next's documented API
i18n.use(initReactI18next).init({
  resources: { sw: { translation: sw }, en: { translation: en }, fr: { translation: fr } },
  lng: 'sw',
  fallbackLng: 'sw',
  interpolation: { escapeValue: false },
});

export default i18n;
