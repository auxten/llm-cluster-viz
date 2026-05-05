import { useEffect } from 'react'
import { useStory } from '../state/storyStore'
import { actById } from '../data/storylines'
import { useT } from '../i18n'

/**
 * 幕间过场卡：4 幕之间淡入一张全屏半透明黑卡，显示 Act 标题与副标题。
 * 用户点击 "进入" 或敲空格继续，dismissIntermission 会推进到下一 storyline。
 */
export function IntermissionCard() {
  const intermissionActId = useStory((s) => s.intermissionActId)
  const dismiss = useStory((s) => s.dismissIntermission)
  const t = useT()

  useEffect(() => {
    if (!intermissionActId) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
      )
        return
      if (
        e.key === ' ' ||
        e.key === 'Enter' ||
        e.key === 'ArrowRight' ||
        e.key === 'j'
      ) {
        e.preventDefault()
        dismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intermissionActId, dismiss])

  if (!intermissionActId) return null
  const act = actById(intermissionActId as never)
  const translatedTitle = t(act.title)
  const actLabel =
    act.shortLabel === 'P'
      ? t('intermission.prologue')
      : `${t('intermission.actPrefix')} ${act.shortLabel}`
  const headline = translatedTitle.replace(/^.+?\s·\s/, '')

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(15, 19, 28, 0.78) 0%, rgba(8, 10, 16, 0.96) 70%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'intermission-fadein 0.5s ease-out',
      }}
      onClick={dismiss}
    >
      <div className="pointer-events-none flex flex-col items-center gap-6 px-8 text-center">
        <div
          className="text-[11px] font-mono tracking-[0.4em] uppercase"
          style={{ color: act.accent, opacity: 0.85 }}
        >
          {actLabel}
        </div>
        <div
          className="text-5xl font-semibold tracking-tight"
          style={{
            color: '#f5f7fb',
            textShadow: `0 0 32px ${act.accent}55`,
          }}
        >
          {headline}
        </div>
        <div
          className="max-w-[42ch] text-base"
          style={{ color: '#c5cdd9' }}
        >
          {t(act.subtitle)}
        </div>
        <div
          className="mt-6 rounded-full border px-5 py-2 text-xs"
          style={{
            color: act.accent,
            borderColor: `${act.accent}66`,
            background: `${act.accent}11`,
          }}
        >
          {t('intermission.continue')}
        </div>
      </div>

      <style>{`
        @keyframes intermission-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
