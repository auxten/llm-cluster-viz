import { useStory } from '../state/storyStore'
import {
  storylines,
  storylineById,
  acts,
  actById,
} from '../data/storylines'
import { Math as Mat } from './Math'
import { useMemo, useState } from 'react'
import { Cite, SourceLink } from './CitationPopover'
import {
  BlackwellB200,
  NVL72,
  DeepSeekV3,
  Roofline,
  Llama3Failures,
  RecoveryMechanisms,
} from '../data/specs'
import { useT } from '../i18n'

interface StoryPanelProps {
  /** 移动/窄屏布局：更紧凑、字号略小 */
  mobile?: boolean
}

export function StoryPanel({ mobile = false }: StoryPanelProps) {
  const storyId = useStory((s) => s.storyId)
  const stepIndex = useStory((s) => s.stepIndex)
  const setStory = useStory((s) => s.setStory)
  const nextStep = useStory((s) => s.nextStep)
  const prevStep = useStory((s) => s.prevStep)
  const setStep = useStory((s) => s.setStep)
  const mode = useStory((s) => s.mode)
  const setMode = useStory((s) => s.setMode)
  const autoplay = useStory((s) => s.autoplay)
  const toggleAutoplay = useStory((s) => s.toggleAutoplay)
  const paused = useStory((s) => s.paused)
  const togglePaused = useStory((s) => s.togglePaused)
  const stepElapsedSec = useStory((s) => s.stepElapsedSec)
  const t = useT()

  const [chapterListOpen, setChapterListOpen] = useState(false)

  const story = useMemo(
    () => (storyId ? storylineById(storyId) : undefined),
    [storyId],
  )
  const step = story?.steps[stepIndex]
  const act = story ? actById(story.act) : undefined
  const stepDur =
    step?.durationSec ?? story?.defaultStepSec ?? 6
  const stepProgress = Math.min(1, stepElapsedSec / stepDur)

  return (
    <aside
      className={`panel pointer-events-auto flex flex-col gap-3 overflow-hidden rounded-xl shadow-2xl ${
        mobile ? 'w-full max-w-[96vw]' : 'w-[380px] max-w-[92vw]'
      }`}
    >
      <header className="border-b border-[color:var(--color-stroke)] px-5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setChapterListOpen((v) => !v)}
            aria-expanded={chapterListOpen}
            className="group flex min-w-0 items-center gap-1.5 rounded-md text-left transition-colors hover:opacity-100"
            style={{ color: act?.accent ?? 'var(--color-fg-mute)' }}
          >
            <span className="truncate text-[10px] font-mono tracking-[0.22em] uppercase">
              {act ? t(act.title) : ''}
            </span>
            <span
              className={`shrink-0 text-[9px] leading-none transition-transform duration-150 ${
                chapterListOpen ? 'rotate-180 opacity-90' : 'opacity-55'
              }`}
              aria-hidden
            >
              ▾
            </span>
          </button>
          <button
            type="button"
            className="shrink-0 text-[10px] text-fg-mute hover:text-accent"
            onClick={() => setMode(mode === 'guided' ? 'sandbox' : 'guided')}
          >
            {mode === 'guided'
              ? t('panel.enterSandbox')
              : t('panel.exitSandbox')}
          </button>
        </div>
        {mode === 'guided' && story && act ? (
          <button
            type="button"
            onClick={() => setChapterListOpen((v) => !v)}
            aria-expanded={chapterListOpen}
            className="mt-2 flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-medium text-fg">
              <span
                className="font-mono"
                style={{ color: act.accent, opacity: 0.85 }}
              >{`${act.shortLabel}${story.actOrder}`}</span>{' '}
              {t(story.title)}
            </h2>
            <span
              className={`text-fg-mute transition-transform ${
                chapterListOpen ? 'rotate-180' : ''
              }`}
              aria-hidden
            >
              ▾
            </span>
          </button>
        ) : (
          <h2 className="mt-2 text-lg font-medium text-fg">
            {t('panel.sandboxTitle')}
          </h2>
        )}
        {mode === 'guided' && story ? (
          <p className="mt-1 text-xs text-fg-soft">{t(story.oneLiner)}</p>
        ) : (
          <p className="mt-1 text-xs text-fg-soft">{t('panel.sandboxIntro')}</p>
        )}
      </header>

      {chapterListOpen ? (
        <nav className="max-h-[60vh] overflow-y-auto border-b border-[color:var(--color-stroke)] px-2 pb-3">
          <ul className="flex flex-col gap-1.5 text-sm">
            {acts.map((a) => {
              const stories = storylines.filter((x) => x.act === a.id)
              const isCurrentAct = act?.id === a.id
              return (
                <li key={a.id}>
                  <div
                    className="flex items-center gap-2 px-3 pt-2 pb-1"
                    style={{ color: a.accent }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{
                        background: a.accent,
                        opacity: isCurrentAct ? 1 : 0.4,
                        boxShadow: isCurrentAct
                          ? `0 0 6px ${a.accent}aa`
                          : 'none',
                      }}
                      aria-hidden
                    />
                    <span
                      className="text-[9px] font-mono tracking-[0.22em] uppercase"
                      style={{ opacity: isCurrentAct ? 0.95 : 0.65 }}
                    >
                      {t(a.title)}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {stories.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className={`flex w-full items-start gap-2 rounded-md px-3 py-1.5 text-left transition-colors ${
                            s.id === storyId
                              ? 'text-accent'
                              : 'text-fg-soft hover:bg-white/5 hover:text-fg'
                          }`}
                          style={
                            s.id === storyId
                              ? {
                                  background: `${a.accent}1f`,
                                  color: a.accent,
                                }
                              : undefined
                          }
                          onClick={() => {
                            setStory(s.id)
                            setChapterListOpen(false)
                          }}
                        >
                          <span
                            className="text-fg-mute font-mono"
                            style={{
                              color:
                                s.id === storyId ? a.accent : undefined,
                              opacity: 0.85,
                            }}
                          >
                            {a.shortLabel}
                            {s.actOrder}
                          </span>
                          <span className="flex-1">{t(s.title)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2 text-sm leading-relaxed">
        {mode === 'guided' && story && step ? (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] tracking-wider text-fg-mute uppercase">
                {t('panel.stepCounter')
                  .replace('{a}', String(stepIndex + 1))
                  .replace('{b}', String(story.steps.length))}
              </div>
              <div className="mt-0.5 text-base font-medium text-fg">
                {t(step.title)}
              </div>
              <p className="mt-1 text-fg-soft">{t(step.caption)}</p>
            </div>
            <StoryStepDetail storyId={story.id} stepId={step.id} />
          </div>
        ) : (
          <div className="space-y-3 text-fg-soft">
            <p>{t('panel.sandboxSubIntro')}</p>
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>{t('panel.sandboxBullet.layers')}</li>
              <li>{t('panel.sandboxBullet.flows')}</li>
              <li>{t('panel.sandboxBullet.cite')}</li>
            </ul>
            <SandboxSpecPanel />
          </div>
        )}
      </div>

      {mode === 'guided' && story && act ? (
        <footer className="border-t border-[color:var(--color-stroke)] px-5 py-3">
          {/* 可点击的 step 进度条 */}
          <div
            className="mb-2 flex h-1.5 cursor-pointer overflow-hidden rounded-full bg-white/8"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const ratio = Math.max(0, Math.min(1, x / rect.width))
              const targetStep = Math.floor(ratio * story.steps.length)
              setStep(Math.min(targetStep, story.steps.length - 1))
            }}
          >
            {story.steps.map((_, i) => {
              const isPast = i < stepIndex
              const isCurrent = i === stepIndex
              return (
                <span
                  key={i}
                  className="relative flex-1 transition-colors"
                  style={{
                    background: isPast
                      ? act.accent
                      : 'rgba(255,255,255,0.06)',
                    marginLeft: i > 0 ? 1 : 0,
                  }}
                >
                  {isCurrent && autoplay ? (
                    <span
                      className="absolute inset-y-0 left-0"
                      style={{
                        background: act.accent,
                        width: `${stepProgress * 100}%`,
                        transition: paused
                          ? 'none'
                          : 'width 0.16s linear',
                      }}
                    />
                  ) : null}
                </span>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevStep}
                title={t('panel.btn.prev.title')}
                className="rounded-md border border-[color:var(--color-stroke)] px-2.5 py-1.5 text-fg-soft hover:border-stroke-hi hover:text-fg"
              >
                ←
              </button>
              <button
                type="button"
                onClick={togglePaused}
                title={
                  paused
                    ? t('panel.btn.resume.title')
                    : t('panel.btn.pause.title')
                }
                className="rounded-md border border-[color:var(--color-stroke)] px-2.5 py-1.5 text-fg-soft hover:border-stroke-hi hover:text-fg"
              >
                {paused ? '▶' : '⏸'}
              </button>
              <button
                type="button"
                onClick={toggleAutoplay}
                title={
                  autoplay
                    ? t('panel.btn.autoplay.on.title')
                    : t('panel.btn.autoplay.off.title')
                }
                className={`rounded-md border px-2.5 py-1.5 transition-colors ${
                  autoplay
                    ? 'border-transparent text-fg'
                    : 'border-[color:var(--color-stroke)] text-fg-soft hover:border-stroke-hi hover:text-fg'
                }`}
                style={
                  autoplay
                    ? {
                        background: `${act.accent}25`,
                        color: act.accent,
                        borderColor: `${act.accent}55`,
                      }
                    : undefined
                }
              >
                ↻ Auto
              </button>
            </div>
            <button
              type="button"
              onClick={nextStep}
              className="rounded-md px-3 py-1.5 transition-colors"
              style={{
                background: `${act.accent}22`,
                border: `1px solid ${act.accent}55`,
                color: act.accent,
              }}
            >
              {t('panel.btn.next')}
            </button>
          </div>
        </footer>
      ) : null}
    </aside>
  )
}

/**
 * 章节专属说明：放置具体公式 / 引用。
 * 多数章节都附上了基于真实文献的 Cite 链接，hover 可看出处。
 */
function StoryStepDetail({
  storyId,
  stepId,
}: {
  storyId: string
  stepId: string
}) {
  const t = useT()
  if (storyId === 't1_training_iter' && stepId === 'allreduce_grads') {
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        {t('panel.detail.t1.allreduce')}
      </div>
    )
  }
  if (storyId === 'i3_decode_continuous_batching' && stepId === 'sweet_spot') {
    return (
      <div className="rounded-md bg-white/5 p-3">
        <div className="mb-1 text-[10px] tracking-wider text-fg-mute uppercase">
          {t('panel.detail.i3.sweet.title')}
        </div>
        <Mat
          tex={String.raw`B^* \approx \frac{\text{FLOPs}}{\text{HBM BW}} \cdot \text{sparsity} \approx 300 \cdot s`}
          display
        />
        <p className="mt-2 text-xs text-fg-soft">
          <Cite spec={Roofline.computeMemoryRatio}>~300</Cite>{' '}
          {t('panel.detail.i3.sweet.body')}
        </p>
      </div>
    )
  }
  if (storyId === 'i3_decode_continuous_batching' && stepId === 'twenty_ms') {
    return (
      <div className="rounded-md bg-white/5 p-3">
        <div className="mb-1 text-[10px] tracking-wider text-fg-mute uppercase">
          {t('panel.detail.i3.twenty.title')}
        </div>
        <Mat
          tex={String.raw`T_{\text{iter}} = \frac{\text{HBM capacity}}{\text{HBM bandwidth}} \approx 20\,\text{ms}`}
          display
        />
        <p className="mt-2 text-xs text-fg-soft">
          <Cite spec={BlackwellB200.hbmCapacityGB} /> /{' '}
          <Cite spec={BlackwellB200.hbmBandwidthTBs} /> ≈{' '}
          <Cite spec={Roofline.hbmDrainTimeMS} />
          {' · '}
          {t('panel.detail.i3.twenty.body')}
        </p>
      </div>
    )
  }
  if (storyId === 't3_moe_all_to_all' && stepId === 'cross_rack_penalty') {
    const ibTotalGbs =
      NVL72.cx7NicsPerTray.value *
      NVL72.computeTrays.value *
      NVL72.ibBandwidthPerNic.value
    const ibTBs = ibTotalGbs / 8 / 1000
    const nvTBs = NVL72.scaleUpTotalBandwidth.value
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        {t('panel.detail.t3.crossRack')}
        {' · '}
        <Cite spec={NVL72.scaleUpTotalBandwidth} /> ↔{' '}
        {NVL72.computeTrays.value}×
        <Cite spec={NVL72.cx7NicsPerTray}>4</Cite>×
        <Cite spec={NVL72.ibBandwidthPerNic}>400 Gb/s</Cite> ≈{' '}
        {ibTBs.toFixed(1)} TB/s ({Math.round(nvTBs / ibTBs)}×)
      </div>
    )
  }
  if (storyId === 't3_moe_all_to_all' && stepId === 'shard') {
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        <Cite spec={DeepSeekV3.totalExperts}>256</Cite>{' / '}
        <Cite spec={DeepSeekV3.activeExperts}>8</Cite>
        {' · '}
        {t('panel.detail.t3.shard')}
      </div>
    )
  }
  if (storyId === 'i1_inference_lifecycle' && stepId === 'kv_transfer') {
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        {t('panel.detail.i1.kvTransfer')}
      </div>
    )
  }
  if (storyId === 'i4_kv_cache_budget') {
    return (
      <div className="rounded-md bg-white/5 p-3">
        <div className="mb-1 text-[10px] tracking-wider text-fg-mute uppercase">
          {t('panel.detail.i4.budget.title')}
        </div>
        <Mat
          tex={String.raw`\frac{N_\text{total}}{E\cdot P} + \frac{B \cdot L_\text{ctx} \cdot \text{bytes/token}}{E}`}
          display
        />
        <p className="mt-2 text-xs text-fg-soft">
          {t('panel.detail.i4.budget.body')}{' '}
          <Cite spec={BlackwellB200.hbmCapacityGB} />.
        </p>
      </div>
    )
  }
  if (storyId === 'r1_failure_recovery' && stepId === 'llama3_stats') {
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        <Cite spec={Llama3Failures.totalGPUs}>16,384</Cite> H100 ·{' '}
        <Cite spec={Llama3Failures.trainingDays} /> ·{' '}
        <Cite spec={Llama3Failures.totalInterruptions} /> ·{' '}
        <Cite spec={Llama3Failures.meanTimeBetweenInterruptionsHours} />
        {' — '}
        {t('panel.detail.r1.llama3')}
      </div>
    )
  }
  if (storyId === 'r1_failure_recovery' && stepId === 'gemini') {
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-fg-mute">
          {RecoveryMechanisms.gemini.label}
        </div>
        <p>{t(RecoveryMechanisms.gemini.summary)}</p>
        <div className="mt-2">
          {RecoveryMechanisms.gemini.sources.map((s, i) => (
            <SourceLink key={s.url} src={s} index={i + 1} />
          ))}
        </div>
      </div>
    )
  }
  if (storyId === 'r1_failure_recovery' && stepId === 'recycle') {
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-fg-mute">
          {RecoveryMechanisms.recycle.label}
        </div>
        <p>{t(RecoveryMechanisms.recycle.summary)}</p>
        <div className="mt-2">
          {RecoveryMechanisms.recycle.sources.map((s, i) => (
            <SourceLink key={s.url} src={s} index={i + 1} />
          ))}
        </div>
      </div>
    )
  }
  if (storyId === 'r1_failure_recovery' && stepId === 'effective') {
    return (
      <div className="rounded-md bg-white/5 p-3 text-xs text-fg-soft">
        <Cite spec={Llama3Failures.effectiveTrainingTimePct} /> ·{' '}
        <Cite spec={Llama3Failures.meanTimeBetweenInterruptionsHours} />
        {' — '}
        {t('panel.detail.r1.effective')}
      </div>
    )
  }
  return null
}

function SandboxSpecPanel() {
  const t = useT()
  return (
    <div className="space-y-3 rounded-md bg-white/5 p-3 text-xs">
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-fg-mute">
          {t('panel.spec.nvl72.title')}
        </div>
        <SpecRow
          label={t('panel.spec.gpus')}
          inline={<Cite spec={NVL72.totalGPUs}>72</Cite>}
        />
        <SpecRow
          label={t('panel.spec.hbmAggregate')}
          inline={<Cite spec={NVL72.totalHBMTB} />}
        />
        <SpecRow
          label={t('panel.spec.nvlinkTotal')}
          inline={<Cite spec={NVL72.scaleUpTotalBandwidth} />}
        />
        <SpecRow
          label={t('panel.spec.power')}
          inline={<Cite spec={NVL72.rackPowerKW} />}
        />
      </div>
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-fg-mute">
          {t('panel.spec.b200.title')}
        </div>
        <SpecRow
          label={t('panel.spec.hbmCapacity')}
          inline={<Cite spec={BlackwellB200.hbmCapacityGB} />}
        />
        <SpecRow
          label={t('panel.spec.hbmBandwidth')}
          inline={<Cite spec={BlackwellB200.hbmBandwidthTBs} />}
        />
        <SpecRow
          label={t('panel.spec.fp4')}
          inline={<Cite spec={BlackwellB200.fp4DenseTFLOPS} />}
        />
        <SpecRow
          label={t('panel.spec.nvlinkPerGpu')}
          inline={<Cite spec={BlackwellB200.nvlinkBandwidthPerGPU} />}
        />
      </div>
    </div>
  )
}

function SpecRow({
  label,
  inline,
}: {
  label: string
  inline: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-fg-mute">{label}</span>
      <span className="text-fg">{inline}</span>
    </div>
  )
}
