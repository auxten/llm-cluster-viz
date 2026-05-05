import { useMemo } from 'react'
import katex from 'katex'

interface MathProps {
  tex: string
  display?: boolean
  className?: string
}

export function Math({ tex, display = false, className }: MathProps) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        output: 'html',
      }),
    [tex, display],
  )
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      aria-label={tex}
    />
  )
}
