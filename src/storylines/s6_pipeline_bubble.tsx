import { Html } from '@react-three/drei'
import { useStory } from '../state/storyStore'
import { useStepGate } from './useStepGate'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useT } from '../i18n'

/**
 * S6: 训练时序与 Pipeline Bubble (datacenter 层叠加)
 *
 * 用一个 SVG 时序图覆盖在 4 个 rack 上方，展示 forward / backward 在 PP rank 之间的交错。
 * Step 0: naive 调度（forward 先全跑完再 backward）
 * Step 1: 1F1B（前后向交错）
 * Step 2: 显示 activation memory 压力
 */

export function StorylineS6() {
  const gate = useStepGate('t2_pipeline_bubble')
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)
  const [t, setT] = useState(0)
  const tt = useT()

  useFrame((_, dt) => {
    if (paused) return
    setT((prev) => (prev + dt * speed * 0.4) % 1.0)
  })

  // 新 step 顺序：naive, bubble_cost, 1f1b, memory_pressure
  // mode: 0 = naive (含 bubble_cost), 1 = 1f1b, 2 = memory pressure
  const isBubbleCost = gate.is('bubble_cost')
  const mode = gate.atOrAfter('memory_pressure')
    ? 2
    : gate.atOrAfter('1f1b')
      ? 1
      : 0
  const headerLabel = gate.is('naive')
    ? tt('s6.header.naive')
    : isBubbleCost
      ? tt('s6.header.bubble')
      : gate.is('1f1b')
        ? tt('s6.header.1f1b')
        : tt('s6.header.mem')
  const footerLabel = gate.is('naive')
    ? tt('s6.footer.naive')
    : isBubbleCost
      ? tt('s6.footer.bubble')
      : gate.is('1f1b')
        ? tt('s6.footer.1f1b')
        : tt('s6.footer.mem')

  return (
    <group>
      <Html
        position={[0, NVL72_DIM.height + 1.6, 0]}
        center
        pointerEvents="none"
        zIndexRange={[100, 0]}
      >
        <div
          style={{
            background: 'rgba(36, 44, 60, 0.94)',
            backdropFilter: 'blur(14px) saturate(150%)',
            WebkitBackdropFilter: 'blur(14px) saturate(150%)',
            border: `1px solid ${
              isBubbleCost ? 'rgba(255, 122, 122, 0.55)' : 'rgba(164, 238, 39, 0.45)'
            }`,
            borderRadius: 10,
            padding: '12px 16px',
            color: 'var(--color-fg)',
            fontSize: 12,
            lineHeight: 1.5,
            textAlign: 'left',
            minWidth: 540,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-fg-mute)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: isBubbleCost ? '#ff7a7a' : undefined }}>
              {headerLabel}
            </span>
            <span style={{ color: 'var(--color-accent)' }}>
              t = {(t * 100).toFixed(0)}%
            </span>
          </div>
          <PipelineSchedule
            mode={mode}
            cursor={t}
            highlightBubble={isBubbleCost}
            t={tt}
          />
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: 'var(--color-fg-soft)',
            }}
          >
            {footerLabel}
          </div>
        </div>
      </Html>
    </group>
  )
}

interface ScheduleParams {
  mode: number
  cursor: number
  highlightBubble?: boolean
  t: (key: string) => string
}

const NUM_RANKS = 4
const NUM_MICROS = 8
const ROW_H = 22
const CELL_W = 24

function PipelineSchedule({ mode, cursor, highlightBubble, t }: ScheduleParams) {
  const totalCells = mode === 0 ? NUM_MICROS * 2 + (NUM_RANKS - 1) * 2 : NUM_MICROS + NUM_RANKS - 1 + 4
  const width = totalCells * CELL_W
  const height = NUM_RANKS * ROW_H + 24

  // 给定 rank 和 micro-batch 索引，返回该 cell 在时间轴上的开始/结束位置（0..totalCells）
  const fwdSlot = (rank: number, micro: number) =>
    mode === 0 ? rank + micro : rank + micro
  const bwdSlot = (rank: number, micro: number) => {
    if (mode === 0) {
      const fwdEnd = NUM_MICROS + (NUM_RANKS - 1)
      // backward 从最后一个 rank 开始，反向：rank=NUM_RANKS-1 时 t=fwdEnd
      return fwdEnd + (NUM_RANKS - 1 - rank) + micro
    }
    // 1F1B：rank r 在 cell (r + micro + NUM_RANKS) 做 backward of micro
    const warmup = NUM_RANKS - rank
    return warmup + 2 * micro + (NUM_RANKS - 1 - rank)
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      {/* rank 标签 */}
      {Array.from({ length: NUM_RANKS }).map((_, r) => (
        <text
          key={`label-${r}`}
          x={4}
          y={r * ROW_H + ROW_H / 2 + 16 + 4}
          fill="#a3acba"
          fontSize={9}
          fontFamily="var(--font-mono)"
        >
          PP{r}
        </text>
      ))}

      {/* 顶部时间刻度 */}
      <line x1={0} y1={14} x2={width} y2={14} stroke="rgba(255,255,255,0.1)" />
      {Array.from({ length: Math.ceil(totalCells / 2) }).map((_, i) => (
        <text
          key={`tick-${i}`}
          x={i * 2 * CELL_W + 28}
          y={10}
          fontSize={8}
          fill="#6b7585"
          fontFamily="var(--font-mono)"
        >
          {i * 2}
        </text>
      ))}

      {/* forward / backward cells */}
      {Array.from({ length: NUM_RANKS }).map((_, r) =>
        Array.from({ length: NUM_MICROS }).map((__, m) => {
          const fwdX = fwdSlot(r, m) * CELL_W + 28
          const bwdX = bwdSlot(r, m) * CELL_W + 28
          const y = r * ROW_H + 16
          return (
            <g key={`r${r}m${m}`}>
              <rect
                x={fwdX}
                y={y}
                width={CELL_W - 2}
                height={ROW_H - 2}
                fill="#a4ee27"
                opacity={0.9}
                rx={3}
              />
              <text
                x={fwdX + (CELL_W - 2) / 2}
                y={y + ROW_H / 2 + 3}
                textAnchor="middle"
                fontSize={9}
                fill="#0a0c10"
                fontWeight={700}
                fontFamily="var(--font-mono)"
              >
                F{m}
              </text>
              <rect
                x={bwdX}
                y={y}
                width={CELL_W - 2}
                height={ROW_H - 2}
                fill="#a48cff"
                opacity={0.9}
                rx={3}
              />
              <text
                x={bwdX + (CELL_W - 2) / 2}
                y={y + ROW_H / 2 + 3}
                textAnchor="middle"
                fontSize={9}
                fill="#0a0c10"
                fontWeight={700}
                fontFamily="var(--font-mono)"
              >
                B{m}
              </text>
            </g>
          )
        }),
      )}

      {/* bubble overlay：highlight head & tail bubbles in naive mode */}
      {highlightBubble && mode === 0 ? (
        <>
          {/* 头部 bubble (左上 PP1, PP2, PP3 在等 PP0 完成 forward) */}
          {Array.from({ length: NUM_RANKS - 1 }).map((_, r) => (
            <rect
              key={`bubble-head-${r}`}
              x={28}
              y={(r + 1) * ROW_H + 16}
              width={(r + 1) * CELL_W}
              height={ROW_H - 2}
              fill="rgba(255, 122, 122, 0.22)"
              stroke="rgba(255, 122, 122, 0.55)"
              strokeWidth={1}
              strokeDasharray="3 2"
              rx={3}
            />
          ))}
          {/* 尾部 bubble */}
          {Array.from({ length: NUM_RANKS - 1 }).map((_, r) => (
            <rect
              key={`bubble-tail-${r}`}
              x={28 + (totalCells - (r + 1)) * CELL_W}
              y={r * ROW_H + 16}
              width={(r + 1) * CELL_W}
              height={ROW_H - 2}
              fill="rgba(255, 122, 122, 0.22)"
              stroke="rgba(255, 122, 122, 0.55)"
              strokeWidth={1}
              strokeDasharray="3 2"
              rx={3}
            />
          ))}
          <text
            x={width / 2}
            y={NUM_RANKS * ROW_H + 30}
            textAnchor="middle"
            fontSize={11}
            fill="#ff7a7a"
            fontWeight={700}
          >
            {t('s6.bubble.warn').replace(
              '{pct}',
              String(Math.round(((NUM_RANKS - 1) / NUM_MICROS) * 100)),
            )}
          </text>
        </>
      ) : null}

      {/* cursor */}
      <line
        x1={cursor * width + 28}
        y1={14}
        x2={cursor * width + 28}
        y2={height}
        stroke="#ffd966"
        strokeWidth={1.5}
        opacity={0.9}
      />

      {/* 图例 */}
      <g transform={`translate(28, ${height - 4})`}>
        <rect x={0} y={-9} width={10} height={9} fill="#a4ee27" rx={2} />
        <text x={14} y={-1} fontSize={9} fill="#c5cdd9">
          {t('s6.legend.forward')}
        </text>
        <rect x={70} y={-9} width={10} height={9} fill="#a48cff" rx={2} />
        <text x={84} y={-1} fontSize={9} fill="#c5cdd9">
          {t('s6.legend.backward')}
        </text>
        {highlightBubble ? (
          <>
            <rect
              x={150}
              y={-9}
              width={10}
              height={9}
              fill="rgba(255, 122, 122, 0.22)"
              stroke="rgba(255, 122, 122, 0.55)"
              strokeDasharray="2 1"
              rx={2}
            />
            <text x={164} y={-1} fontSize={9} fill="#ffd0d0">
              {t('s6.legend.bubble')}
            </text>
          </>
        ) : null}
      </g>

      {mode === 2 ? (
        <>
          <rect
            x={28}
            y={NUM_RANKS * ROW_H + 12}
            width={width - 28}
            height={2}
            fill="#ff7a7a"
            opacity={0.6}
          />
          <text
            x={width - 4}
            y={NUM_RANKS * ROW_H + 22}
            textAnchor="end"
            fontSize={9}
            fill="#ffd0d0"
          >
            {t('s6.memHint')}
          </text>
        </>
      ) : null}
    </svg>
  )
}
