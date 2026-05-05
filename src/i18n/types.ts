export const LANGS = [
  'zh-CN',
  'zh-TW',
  'en',
  'ja',
  'ko',
  'es',
  'pt',
  'it',
  'fr',
] as const

export type Lang = (typeof LANGS)[number]

export const LANG_LABELS: Record<Lang, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  fr: 'Français',
}

export const LANG_SHORT: Record<Lang, string> = {
  'zh-CN': '简',
  'zh-TW': '繁',
  en: 'EN',
  ja: '日',
  ko: '한',
  es: 'ES',
  pt: 'PT',
  it: 'IT',
  fr: 'FR',
}

export type Dict = Record<string, string>
