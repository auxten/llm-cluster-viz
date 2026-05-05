import { useStory } from '../state/storyStore'
import { Llama3Failures, NVL72, BlackwellB200 } from '../data/specs'
import { useT } from '../i18n'

/**
 * 移动端 / 窄屏 2D fallback：S4 / S6 / S7 在窄屏上 3D 多 rack 信息密度太低，
 * 这里直接渲染一个 SVG / HTML 图示版本，方便阅读。
 */
export function MobileFallbackOverlay() {
  const storyId = useStory((s) => s.storyId)
  if (storyId === 't1_training_iter') return <S4Fallback />
  if (storyId === 't2_pipeline_bubble') return <S6Fallback />
  if (storyId === 'r1_failure_recovery') return <S7Fallback />
  if (storyId === 'p1_datacenter_overview') return <S4Fallback />
  if (storyId === 'i1_inference_lifecycle') return <S4Fallback />
  return null
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="panel rounded-lg p-3">
      <div className="text-[10px] tracking-[0.18em] text-fg-mute uppercase">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-0.5 text-xs text-fg-soft">{subtitle}</div>
      ) : null}
      <div className="mt-2 text-xs text-fg">{children}</div>
    </div>
  )
}

function S4Fallback() {
  const t = useT()
  return (
    <Card title={t('mobile.s4.title')} subtitle={t('mobile.s4.subtitle')}>
      <svg viewBox="0 0 360 200" className="w-full max-w-md">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect
              x={20 + i * 85}
              y={50}
              width={60}
              height={100}
              rx={6}
              fill="rgba(164,238,39,0.08)"
              stroke="rgba(164,238,39,0.45)"
            />
            <text
              x={50 + i * 85}
              y={70}
              textAnchor="middle"
              fill="#a4ee27"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fontWeight={600}
            >
              PP{i}
            </text>
            <text
              x={50 + i * 85}
              y={86}
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize={9}
            >
              {t('mobile.s4.layerLabel')
                .replace('{a}', String(i * 16))
                .replace('{b}', String((i + 1) * 16 - 1))}
            </text>
            <text
              x={50 + i * 85}
              y={108}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize={8}
            >
              {t('mobile.s4.gpuCount')}
            </text>
          </g>
        ))}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line
              x1={80 + i * 85}
              y1={100}
              x2={20 + (i + 1) * 85}
              y2={100}
              stroke="#6cb8ff"
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={0.8}
            />
            <text
              x={80 + i * 85 + 12}
              y={94}
              fill="#6cb8ff"
              fontSize={8}
              fontFamily="var(--font-mono)"
            >
              IB
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-fg-mute">{t('mobile.s4.intraRack')}</span>
          <div className="font-mono text-[var(--color-nvlink)]">
            ~{NVL72.scaleUpTotalBandwidth.value} TB/s
          </div>
        </div>
        <div>
          <span className="text-fg-mute">{t('mobile.s4.interRack')}</span>
          <div className="font-mono text-[var(--color-ib)]">~3.6 TB/s</div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-fg-mute">{t('mobile.s4.note')}</p>
    </Card>
  )
}

function S6Fallback() {
  const t = useT()
  const stages = 4
  const microBatches = 4
  const cellW = 22
  const cellH = 14
  return (
    <Card title={t('mobile.s6.title')} subtitle={t('mobile.s6.subtitle')}>
      <div className="text-[10px] text-fg-mute mb-1">
        {t('mobile.s6.naiveLabel')}
      </div>
      <svg viewBox="0 0 320 100" className="w-full max-w-md">
        {Array.from({ length: stages }).map((_, s) => (
          <g key={s}>
            <text x={4} y={14 + s * (cellH + 3)} fill="rgba(255,255,255,0.6)" fontSize={9}>
              PP{s}
            </text>
            {Array.from({ length: microBatches }).map((_, m) => (
              <rect
                key={`f${m}`}
                x={30 + (m + s) * cellW}
                y={4 + s * (cellH + 3)}
                width={cellW - 1}
                height={cellH}
                fill="rgba(164,238,39,0.55)"
              />
            ))}
            {Array.from({ length: microBatches }).map((_, m) => (
              <rect
                key={`b${m}`}
                x={30 + (microBatches + stages + m + s) * cellW}
                y={4 + s * (cellH + 3)}
                width={cellW - 1}
                height={cellH}
                fill="rgba(108,184,255,0.55)"
              />
            ))}
          </g>
        ))}
      </svg>
      <div className="text-[10px] text-fg-mute mt-3 mb-1">
        {t('mobile.s6.f1b1Label')}
      </div>
      <svg viewBox="0 0 220 100" className="w-full max-w-md">
        {Array.from({ length: stages }).map((_, s) => (
          <g key={s}>
            <text x={4} y={14 + s * (cellH + 3)} fill="rgba(255,255,255,0.6)" fontSize={9}>
              PP{s}
            </text>
            {Array.from({ length: stages - s }).map((_, m) => (
              <rect
                key={`wf${m}`}
                x={30 + (m + s) * cellW}
                y={4 + s * (cellH + 3)}
                width={cellW - 1}
                height={cellH}
                fill="rgba(164,238,39,0.55)"
              />
            ))}
            {Array.from({ length: microBatches }).map((_, m) => (
              <g key={`sf${m}`}>
                <rect
                  x={30 + (stages + m * 2) * cellW}
                  y={4 + s * (cellH + 3)}
                  width={cellW - 1}
                  height={cellH}
                  fill="rgba(108,184,255,0.55)"
                />
                <rect
                  x={30 + (stages + m * 2 + 1) * cellW}
                  y={4 + s * (cellH + 3)}
                  width={cellW - 1}
                  height={cellH}
                  fill="rgba(164,238,39,0.55)"
                />
              </g>
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 bg-[rgba(164,238,39,0.55)]" />{' '}
          {t('mobile.s6.legend.forward')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 bg-[rgba(108,184,255,0.55)]" />{' '}
          {t('mobile.s6.legend.backward')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 bg-[rgba(255,255,255,0.05)] border border-white/20" />{' '}
          {t('mobile.s6.legend.bubble')}
        </span>
      </div>
      <p className="mt-2 text-[10px] text-fg-mute">{t('mobile.s6.note')}</p>
    </Card>
  )
}

function S7Fallback() {
  const t = useT()
  const stepIndex = useStory((s) => s.stepIndex)
  const causes = Llama3Failures.causeBreakdown.slice(0, 5)
  const callouts = [
    {
      label: t('mobile.s7.callout.baseline.label'),
      desc: t('mobile.s7.callout.baseline.desc'),
      color: '#a4ee27',
    },
    {
      label: t('mobile.s7.callout.gpu.label'),
      desc: t('mobile.s7.callout.gpu.desc'),
      color: '#ff7a7a',
    },
    {
      label: t('mobile.s7.callout.sdc.label'),
      desc: t('mobile.s7.callout.sdc.desc'),
      color: '#ffc56b',
    },
    {
      label: t('mobile.s7.callout.gemini.label'),
      desc: t('mobile.s7.callout.gemini.desc'),
      color: '#a4ee27',
    },
    {
      label: t('mobile.s7.callout.recycle.label'),
      desc: t('mobile.s7.callout.recycle.desc'),
      color: '#6cb8ff',
    },
  ]
  const cur = callouts[stepIndex] ?? callouts[0]
  return (
    <Card
      title={t('mobile.s7.title')}
      subtitle={t('mobile.s7.subtitle').replace(
        '{n}',
        String(Llama3Failures.totalInterruptions.value),
      )}
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat
          label={t('mobile.s7.unintendedBreaks')}
          value={String(Llama3Failures.totalInterruptions.value)}
          unit={t('mobile.s7.unit.times')}
        />
        <Stat
          label={t('mobile.s7.meanInterval')}
          value={String(Llama3Failures.meanTimeBetweenInterruptionsHours.value)}
          unit={t('mobile.s7.unit.hour')}
          warn
        />
        <Stat
          label={t('mobile.s7.effective')}
          value=">90"
          unit={t('mobile.s7.unit.percent')}
        />
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-wider text-fg-mute">
        {t('mobile.s7.causesTop5')}
      </div>
      <div className="mt-1 space-y-1">
        {causes.map((c) => (
          <div key={c.cause} className="flex items-center gap-2 text-[11px]">
            <span className="flex-1 truncate text-fg-soft">{t(c.cause)}</span>
            <span className="relative h-1.5 w-20 overflow-hidden rounded bg-white/5">
              <span
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${(c.pct / 30.1) * 100}%`,
                  background:
                    c.cause.includes('faultyGPU') ||
                    c.cause.includes('HBM') ||
                    c.cause.includes('SRAM')
                      ? 'linear-gradient(90deg, #ff7a7a, #ffc56b)'
                      : 'linear-gradient(90deg, #6cb8ff, #a4ee27)',
                }}
              />
            </span>
            <span className="w-10 text-right font-mono text-fg">
              {c.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <div
        className="mt-3 rounded-md p-2 text-[11px]"
        style={{
          background: `${cur.color}1a`,
          border: `1px solid ${cur.color}40`,
        }}
      >
        <strong style={{ color: cur.color }}>{cur.label}</strong> · {cur.desc}
      </div>
    </Card>
  )
}

function Stat({
  label,
  value,
  unit,
  warn,
}: {
  label: string
  value: string
  unit: string
  warn?: boolean
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-fg-mute">
        {label}
      </div>
      <div
        className={`font-mono text-lg leading-tight ${
          warn ? 'text-[var(--color-warn)]' : 'text-fg'
        }`}
      >
        {value}
        <span className="ml-1 text-[10px] text-fg-mute">{unit}</span>
      </div>
    </div>
  )
}

export function MobileSpecCard() {
  const t = useT()
  return (
    <Card title={t('mobile.spec.title')}>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <SpecRow label={t('mobile.spec.gpu')} value={`${NVL72.totalGPUs.value}× B200`} />
        <SpecRow label={t('mobile.spec.grace')} value={String(NVL72.totalGraces.value)} />
        <SpecRow label={t('mobile.spec.hbmTotal')} value={`${NVL72.totalHBMTB.value} TB`} />
        <SpecRow
          label={t('mobile.spec.hbmBw')}
          value={`${NVL72.totalHBMBandwidthPBs.value} TB/s`}
        />
        <SpecRow
          label={t('mobile.spec.nvlinkDomain')}
          value={`${NVL72.scaleUpTotalBandwidth.value} TB/s`}
        />
        <SpecRow
          label={t('mobile.spec.gpuHbm')}
          value={`${BlackwellB200.hbmCapacityGB.value} GB`}
        />
        <SpecRow
          label={t('mobile.spec.gpuNvlink')}
          value={`${BlackwellB200.nvlinkBandwidthPerGPU.value} TB/s`}
        />
        <SpecRow label={t('mobile.spec.fullLoad')} value={`${NVL72.rackPowerKW.value} kW`} />
      </ul>
    </Card>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between border-b border-white/5 pb-0.5">
      <span className="text-fg-mute">{label}</span>
      <span className="font-mono text-fg">{value}</span>
    </li>
  )
}
