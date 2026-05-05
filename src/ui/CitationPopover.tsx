import { useState, useRef, useEffect } from 'react'
import type { Source, Spec } from '../data/specs'
import { useT } from '../i18n'

interface CiteProps {
  spec: Spec
  format?: (v: number) => string
  children?: React.ReactNode
  className?: string
}

const defaultFmt = (v: number) =>
  Number.isInteger(v) ? v.toLocaleString() : v.toString()

/**
 * 内联展示一个数值，hover/focus 弹出 popover 显示数值含义与所有引用。
 * 如果传 children 则用 children 作为可点击文本，否则用 spec.value。
 *
 * spec.note 字段保存翻译 key，渲染时通过 t() 解析。
 */
export function Cite({ spec, format = defaultFmt, children, className }: CiteProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const t = useT()

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const display = children ?? (
    <>
      {format(spec.value)}
      {spec.unit ? <span className="ml-0.5 text-fg-mute">{spec.unit}</span> : null}
    </>
  )

  return (
    <span ref={ref} className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        className="cursor-help border-b border-dashed border-stroke-hi text-fg hover:text-accent transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault()
          setOpen((v) => !v)
        }}
      >
        {display}
      </button>
      {open ? (
        <span
          role="tooltip"
          className="panel absolute bottom-full right-0 z-50 mb-2 w-72 max-w-[80vw] rounded-md p-3 text-xs leading-relaxed shadow-xl"
        >
          {spec.note ? (
            <span className="block text-fg-soft">{t(spec.note)}</span>
          ) : null}
          <span className="mt-2 block font-semibold text-fg-mute">
            {t('panel.cite.from')}
          </span>
          <span className="block">
            {spec.sources.map((s, i) => (
              <SourceLink key={s.url} src={s} index={i + 1} />
            ))}
          </span>
        </span>
      ) : null}
    </span>
  )
}

export function SourceLink({ src, index }: { src: Source; index?: number }) {
  return (
    <a
      href={src.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-fg-soft hover:text-accent underline-offset-2 hover:underline"
    >
      {index != null ? `[${index}] ` : null}
      {src.label}
    </a>
  )
}
