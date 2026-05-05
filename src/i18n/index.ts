import { useEffect } from 'react'
import { create } from 'zustand'
import { LANGS, type Dict, type Lang } from './types'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'
import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import es from './locales/es'
import pt from './locales/pt'
import it from './locales/it'
import fr from './locales/fr'

const DICTS: Record<Lang, Dict> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
  ko,
  es,
  pt,
  it,
  fr,
}

const STORAGE_KEY = 'llm-cluster-viz.lang'

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored && (LANGS as readonly string[]).includes(stored)) {
    return stored as Lang
  }
  const nav = (window.navigator?.language ?? 'en').toLowerCase()
  if (nav.startsWith('zh')) {
    if (nav.includes('tw') || nav.includes('hk') || nav.includes('hant'))
      return 'zh-TW'
    return 'zh-CN'
  }
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('ko')) return 'ko'
  if (nav.startsWith('es')) return 'es'
  if (nav.startsWith('pt')) return 'pt'
  if (nav.startsWith('it')) return 'it'
  if (nav.startsWith('fr')) return 'fr'
  return 'en'
}

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLang = create<LangState>((set) => ({
  lang: detectInitialLang(),
  setLang: (lang) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang)
    }
    set({ lang })
  },
}))

/** Look up a translation key for the current language, falling back to zh-CN then the key itself. */
export function translate(lang: Lang, key: string): string {
  const v = DICTS[lang]?.[key]
  if (v != null) return v
  const fallback = DICTS['zh-CN'][key]
  return fallback ?? key
}

/** Hook returning the `t(key)` function bound to the current language. */
export function useT() {
  const lang = useLang((s) => s.lang)
  return (key: string): string => translate(lang, key)
}

/** Returns the raw current language code. */
export function useCurrentLang(): Lang {
  return useLang((s) => s.lang)
}

/** Sync <html lang="..."> with the current language. */
export function useSyncHtmlLang() {
  const lang = useLang((s) => s.lang)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }, [lang])
}

export { LANGS, type Lang } from './types'
