import { SceneRoot } from './scenes/SceneRoot'
import { LayerNav } from './ui/LayerNav'
import { StoryPanel } from './ui/StoryPanel'
import { Legend } from './ui/Legend'
import { IntermissionCard } from './ui/IntermissionCard'
import { LangSwitcher } from './ui/LangSwitcher'
import { AutoplayDriver } from './state/AutoplayDriver'
import { useEffect } from 'react'
import { useStory } from './state/storyStore'
import { useDeviceCaps } from './state/deviceCaps'
import { KvCacheHud } from './storylines/s5_kv_cache_memory'
import { I3Hud } from './storylines/i3_decode_continuous_batching'
import { InferenceArchMap } from './ui/InferenceArchMap'
import { TrainingArchMap } from './ui/TrainingArchMap'
import { useT, useSyncHtmlLang } from './i18n'

const INFERENCE_STORY_IDS = new Set([
  'i1_inference_lifecycle',
  'i2_prefill_internals',
  'i3_decode_continuous_batching',
  'i4_kv_cache_budget',
])

const TRAINING_STORY_IDS = new Set([
  't1_training_iter',
  't2_pipeline_bubble',
  't3_moe_all_to_all',
])

function useKeyboard() {
  const next = useStory((s) => s.nextStep)
  const prev = useStory((s) => s.prevStep)
  const togglePaused = useStory((s) => s.togglePaused)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
      )
        return
      if (e.key === 'ArrowRight' || e.key === 'j') next()
      else if (e.key === 'ArrowLeft' || e.key === 'k') prev()
      else if (e.key === ' ') {
        e.preventDefault()
        togglePaused()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, togglePaused])
}

export default function App() {
  useKeyboard()
  useSyncHtmlLang()
  const t = useT()
  const { isMobile, isNarrow } = useDeviceCaps()
  const storyId = useStory((s) => s.storyId)
  const isInferenceStory = storyId ? INFERENCE_STORY_IDS.has(storyId) : false
  const isTrainingStory = storyId ? TRAINING_STORY_IDS.has(storyId) : false

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AutoplayDriver />
      <SceneRoot />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-3 md:p-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <BrandMark />
        </div>
        {isNarrow ? null : <LayerNav />}
        <div className="pointer-events-auto flex items-center gap-2 text-xs text-fg-mute">
          <a
            href="https://www.dwarkesh.com/p/reiner-pope"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden hover:text-accent md:inline"
          >
            {t('app.inspiration')} ↗
          </a>
          <span className="hidden text-fg-mute md:inline">·</span>
          <a
            href="https://github.com/auxten/llm-cluster-viz"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden hover:text-accent md:inline"
          >
            GitHub
          </a>
          <span className="hidden text-fg-mute md:inline">·</span>
          <LangSwitcher compact={isNarrow} />
        </div>
      </header>

      {isNarrow ? (
        <div className="pointer-events-none absolute inset-x-0 top-12 z-10 flex justify-center p-2">
          <LayerNav />
        </div>
      ) : null}

      {isMobile ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 z-10 flex items-stretch justify-center p-2">
          <StoryPanel mobile />
        </div>
      ) : (
        <div className="pointer-events-none absolute right-4 top-20 bottom-20 z-10 flex items-stretch">
          <StoryPanel />
        </div>
      )}

      {!isMobile ? (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
          {isInferenceStory ? (
            <InferenceArchMap />
          ) : isTrainingStory ? (
            <TrainingArchMap />
          ) : (
            <Legend />
          )}
        </footer>
      ) : null}

      <KvCacheHud />
      <I3Hud />
      <IntermissionCard />
    </div>
  )
}

function BrandMark() {
  const t = useT()
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{
          background:
            'linear-gradient(135deg, var(--color-accent) 0%, var(--color-ib) 100%)',
          boxShadow: '0 0 14px rgba(118,185,0,0.6)',
        }}
      />
      <span className="text-sm font-medium tracking-wide text-fg">
        {t('app.title')}
      </span>
      <span className="text-[10px] text-fg-mute">— {t('app.tagline')}</span>
    </div>
  )
}
