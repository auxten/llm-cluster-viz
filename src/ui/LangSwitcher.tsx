import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { LANGS, LANG_LABELS, LANG_SHORT, type Lang } from '../i18n/types'

interface LangSwitcherProps {
  compact?: boolean
}

/**
 * 语言切换器：右上角下拉。
 * compact = true 时只显示当前语言短码（适合移动端紧凑布局）。
 */
export function LangSwitcher({ compact }: LangSwitcherProps) {
  const lang = useLang((s) => s.lang)
  const setLang = useLang((s) => s.setLang)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-[color:var(--color-stroke)] bg-white/5 px-2.5 py-1 text-[11px] text-fg-soft transition-colors hover:border-stroke-hi hover:text-fg"
        title={LANG_LABELS[lang]}
      >
        <span aria-hidden className="text-[10px]">
          🌐
        </span>
        <span className="font-mono">
          {compact ? LANG_SHORT[lang] : LANG_LABELS[lang]}
        </span>
        <span aria-hidden className="text-[8px] opacity-70">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="panel absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-md py-1 text-xs shadow-xl"
        >
          {LANGS.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === lang}
                onClick={() => {
                  setLang(l as Lang)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                  l === lang
                    ? 'bg-white/8 text-accent'
                    : 'text-fg-soft hover:bg-white/5 hover:text-fg'
                }`}
              >
                <span>{LANG_LABELS[l]}</span>
                <span className="font-mono text-[9px] text-fg-mute">
                  {LANG_SHORT[l]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
