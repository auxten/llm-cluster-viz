import { useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStepGate } from './useStepGate'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import {
  BatchMatrix,
  KvBlockTable,
  type BatchUserRow,
} from '../components/3d/tensor/BatchMatrix'
import { useT } from '../i18n'

/**
 * I3 · Decode + Continuous Batching + PagedAttention (rack 层)
 *
 * 拆分两部分：
 *   - StorylineI3：在 R3F Canvas 内挂载，只控制相机和提供时间 t（通过 Zustand 暴露给 HUD）
 *   - I3Hud：在 App 顶层 DOM 挂载（像 KvCacheHud 那样），不进 Canvas
 *
 * 7 step 列表：
 *   decode_one_user → batch_matrix → continuous_batching
 *   → paged_attention → prefix_cache → sweet_spot → twenty_ms
 */

const CAM_VIEW: { position: [number, number, number]; lookAt: [number, number, number] } = {
  position: [-3, NVL72_DIM.height * 0.7, 6],
  lookAt: [-1.2, NVL72_DIM.height * 0.5, 0],
}

// 通过模块级 ref 把 Canvas 内驱动的 t 时间值暴露给 HUD（避免再写一个 store）
let i3Time = 0
const i3TimeListeners = new Set<(t: number) => void>()

export function StorylineI3() {
  const setTarget = useCamera((s) => s.setTarget)
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)

  useFrame((_, dt) => {
    if (paused) return
    i3Time = (i3Time + dt * speed) % 1000
    i3TimeListeners.forEach((cb) => cb(i3Time))
  })

  useEffect(() => {
    setTarget({ ...CAM_VIEW, duration: 1.4 })
  }, [setTarget])

  // Canvas 内只起相机控制作用，不渲染任何 DOM/3D（HUD 在 App 层挂载）
  return null
}

/**
 * I3 HUD：在 App.tsx 顶层挂载，作为 fixed DOM overlay。
 * 完全不依赖 R3F，避免 portal 被 R3F reconciler 当成 THREE 元素。
 */
export function I3Hud() {
  const storyId = useStory((s) => s.storyId)
  const layer = useStory((s) => s.layer)
  const mode = useStory((s) => s.mode)
  const gate = useStepGate('i3_decode_continuous_batching')
  const [t, setT] = useState(0)

  useEffect(() => {
    if (storyId !== 'i3_decode_continuous_batching') return
    const cb = (newT: number) => setT(newT)
    i3TimeListeners.add(cb)
    return () => {
      i3TimeListeners.delete(cb)
    }
  }, [storyId])

  if (mode !== 'guided') return null
  if (storyId !== 'i3_decode_continuous_batching') return null
  if (layer !== 'rack') return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 hidden md:flex"
      style={{
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        paddingTop: 96,
        paddingLeft: 32,
        paddingRight: 380,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: '100%' }}>
        {gate.is('decode_one_user') ? <DecodeOneUser t={t} /> : null}
        {gate.is('batch_matrix') ? <BatchMatrixOverlay /> : null}
        {gate.is('continuous_batching') ? <ContinuousBatching t={t} /> : null}
        {gate.is('paged_attention') ? <PagedAttention /> : null}
        {gate.is('prefix_cache') ? <PrefixCache /> : null}
        {gate.is('sweet_spot') ? <SweetSpot /> : null}
        {gate.is('twenty_ms') ? <TwentyMs t={t} /> : null}
      </div>
    </div>
  )
}

// ===== Step 1: 单用户 decode 的浪费 =====
function DecodeOneUser({ t }: { t: number }) {
  const tt = useT()
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(255, 122, 122, 0.55)',
        borderRadius: 12,
        padding: '14px 18px',
        color: '#f5f7fb',
        fontSize: 12,
        maxWidth: 560,
        boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: 10,
        }}
      >
        {tt('i3.solo.title')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#ffd966',
              fontFamily: 'var(--font-mono)',
              marginBottom: 3,
            }}
          >
            X [1, h]
          </div>
          <div
            style={{
              width: 14,
              height: 14,
              background: 'rgba(255, 217, 102, 0.30)',
              border: '1px solid rgba(255, 217, 102, 0.7)',
              borderRadius: 2,
            }}
          />
        </div>
        <span style={{ color: '#a4ee27', fontFamily: 'var(--font-mono)' }}>@</span>
        <div>
          <div
            style={{
              fontSize: 11,
              color: '#a4ee27',
              fontFamily: 'var(--font-mono)',
              marginBottom: 3,
            }}
          >
            W [h, h]
          </div>
          <div
            style={{
              width: 80,
              height: 36,
              background:
                'linear-gradient(135deg, rgba(164, 238, 39, 0.32) 0%, rgba(164, 238, 39, 0.08) 100%)',
              border: '1px solid rgba(164, 238, 39, 0.55)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#a4ee27',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {tt('i3.solo.params')}
          </div>
        </div>
        <span style={{ color: 'var(--color-fg-mute)' }}>=</span>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-fg-soft)', marginBottom: 3 }}>
            Y [1, h]
          </div>
          <div
            style={{
              width: 14,
              height: 14,
              background: 'rgba(255, 217, 102, 0.30)',
              border: '1px solid rgba(255, 217, 102, 0.7)',
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: '#ff7a7a' }}>
        {tt('i3.solo.note1')}
      </div>
      <div style={{ marginTop: 2, fontSize: 13, color: '#ff7a7a' }}>
        {tt('i3.solo.note2')}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: '#ffd966' }}>
        {tt('i3.solo.note3')}
      </div>
      <div
        style={{
          marginTop: 10,
          padding: '6px 10px',
          background: 'rgba(255, 122, 122, 0.12)',
          border: '1px dashed rgba(255, 122, 122, 0.4)',
          borderRadius: 6,
          fontSize: 12,
          color: '#ff9e9e',
          fontFamily: 'var(--font-mono)',
          opacity: 0.55 + 0.45 * Math.sin(t * 2),
        }}
      >
        {tt('i3.solo.banner')}
      </div>
    </div>
  )
}

// ===== Step 2: 把 N 个用户堆成 batch =====
function BatchMatrixOverlay() {
  const tt = useT()
  const rows: BatchUserRow[] = useMemo(
    () => [
      { id: 'A', state: 'active', label: 'User A' },
      { id: 'B', state: 'active', label: 'User B' },
      { id: 'C', state: 'active', label: 'User C' },
      { id: 'D', state: 'active', label: 'User D' },
      { id: '…', state: 'active', label: '… ×2000' },
    ],
    [],
  )
  return (
    <>
      <BatchMatrix
        rows={rows}
        hiddenCols={20}
        title="X [N=2000, h]"
        subtitle={tt('i3.batch.subtitle')}
      />
      <Caption>
        <div>
          {tt('i3.batch.body1.before')}
          <span style={{ color: '#a4ee27' }}>{tt('i3.batch.body1.highlight')}</span>
          {tt('i3.batch.body1.after')}
        </div>
        <div style={{ marginTop: 4 }}>
          {tt('i3.batch.body2.before')}
          <span style={{ color: '#ffd966' }}>{tt('i3.batch.body2.highlight')}</span>
        </div>
      </Caption>
    </>
  )
}

// ===== Step 3: continuous batching =====
const CB_FRAMES_BASE: { id: string; state: BatchUserRow['state']; labelKey: string }[][] = [
  [
    { id: 'A', state: 'active', labelKey: 'i3.cb.user.A' },
    { id: 'B', state: 'active', labelKey: 'i3.cb.user.B' },
    { id: 'C', state: 'active', labelKey: 'i3.cb.user.C' },
  ],
  [
    { id: 'A', state: 'done', labelKey: 'i3.cb.user.A.done' },
    { id: 'B', state: 'active', labelKey: 'i3.cb.user.B' },
    { id: 'C', state: 'active', labelKey: 'i3.cb.user.C' },
    { id: 'E', state: 'new', labelKey: 'i3.cb.user.E.new' },
  ],
  [
    { id: 'B', state: 'active', labelKey: 'i3.cb.user.B' },
    { id: 'C', state: 'active', labelKey: 'i3.cb.user.C' },
    { id: 'E', state: 'active', labelKey: 'i3.cb.user.E' },
  ],
  [
    { id: 'B', state: 'active', labelKey: 'i3.cb.user.B' },
    { id: 'C', state: 'done', labelKey: 'i3.cb.user.C.done' },
    { id: 'E', state: 'active', labelKey: 'i3.cb.user.E' },
    { id: 'F', state: 'new', labelKey: 'i3.cb.user.F.new' },
  ],
  [
    { id: 'B', state: 'active', labelKey: 'i3.cb.user.B' },
    { id: 'E', state: 'active', labelKey: 'i3.cb.user.E' },
    { id: 'F', state: 'active', labelKey: 'i3.cb.user.F' },
  ],
]
const CB_LABELS = ['iter t', 'iter t+1', 'iter t+2', 'iter t+3', 'iter t+4']

function ContinuousBatching({ t }: { t: number }) {
  const tt = useT()
  const frame = Math.floor((t * 0.45) % CB_FRAMES_BASE.length)
  const rows: BatchUserRow[] = CB_FRAMES_BASE[frame].map((r) => ({
    id: r.id,
    state: r.state,
    label: tt(r.labelKey),
  }))
  return (
    <>
      <BatchMatrix
        rows={rows}
        hiddenCols={18}
        showWeights={false}
        title={tt('i3.cb.title')}
        subtitle={CB_LABELS[frame]}
      />
      <Caption>
        <div>
          <span style={{ color: '#a4ee27' }}>{tt('i3.cb.body1.highlight')}</span>
          {tt('i3.cb.body1.after')}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-fg-mute)' }}>
          {tt('i3.cb.body2')}
        </div>
      </Caption>
    </>
  )
}

// ===== Step 4: PagedAttention block table =====
function PagedAttention() {
  const tt = useT()
  const users = useMemo(
    () => [
      { id: 'A', label: tt('i3.cb.user.A'), blocks: [7, 23, 4, 19] },
      { id: 'B', label: tt('i3.cb.user.B'), blocks: [12, 31, 8] },
      { id: 'C', label: tt('i3.cb.user.C'), blocks: [3, 17, 25, 11, 28] },
      { id: 'D', label: tt('i3.cb.user.D'), blocks: [9, 22] },
    ],
    [tt],
  )
  return (
    <>
      {/* 顶部铺垫："为什么需要 PagedAttention" */}
      <div
        style={{
          background: 'rgba(255, 122, 122, 0.10)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px dashed rgba(255, 122, 122, 0.55)',
          borderRadius: 10,
          padding: '10px 14px',
          color: '#f5f7fb',
          fontSize: 13,
          maxWidth: 560,
          boxShadow: '0 6px 22px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: '#ff9e9e',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom: 6,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {tt('i3.paged.problem.title')}
        </div>
        <div style={{ lineHeight: 1.55 }}>
          {tt('i3.paged.problem.body1.before')}
          <span style={{ color: '#ffd966', fontFamily: 'var(--font-mono)' }}>
            {tt('i3.paged.problem.body1.highlight')}
          </span>
          {tt('i3.paged.problem.body1.after')}
          <br />
          {tt('i3.paged.problem.body2.before')}
          <span style={{ color: '#ff7a7a' }}>{tt('i3.paged.problem.body2.contiguous')}</span>
          {tt('i3.paged.problem.body2.middle')}
          <span style={{ color: '#ff7a7a' }}>{tt('i3.paged.problem.body2.waste')}</span>
          {tt('i3.paged.problem.body2.after')}
        </div>
      </div>

      {/* 解法 KvBlockTable */}
      <KvBlockTable users={users} totalBlocks={32} />
      <Caption>
        <div>
          <span style={{ color: '#a4ee27' }}>{tt('i3.paged.solution.label')}</span>
          {tt('i3.paged.solution.body1.before')}
          <span style={{ color: '#ffaa55' }}>block</span>
          {tt('i3.paged.solution.body1.middle')}{' '}
          <span style={{ color: '#ffaa55' }}>block table</span>{' '}
          {tt('i3.paged.solution.body1.after')}
        </div>
        <div style={{ marginTop: 4 }}>
          {tt('i3.paged.solution.body2.before')}
          <span style={{ color: '#a4ee27' }}>{tt('i3.paged.solution.utilization')}</span>
          {tt('i3.paged.solution.body2.after')}
        </div>
      </Caption>
    </>
  )
}

// ===== Step 5: prefix cache =====
function PrefixCache() {
  const tt = useT()
  const users = useMemo(
    () => [
      {
        id: 'A',
        label: tt('i3.cb.user.A'),
        blocks: [1, 2, 3, 7, 23],
        sharedBlocks: new Set([1, 2, 3]),
      },
      {
        id: 'B',
        label: tt('i3.cb.user.B'),
        blocks: [1, 2, 3, 12, 31],
        sharedBlocks: new Set([1, 2, 3]),
      },
      {
        id: 'C',
        label: tt('i3.cb.user.C'),
        blocks: [1, 2, 3, 17, 25, 11],
        sharedBlocks: new Set([1, 2, 3]),
      },
    ],
    [tt],
  )
  return (
    <>
      <KvBlockTable users={users} totalBlocks={32} />
      <Caption>
        <div>
          {tt('i3.prefix.body1.before')}
          <span style={{ color: '#6cb8ff' }}>system prompt</span>{' '}
          {tt('i3.prefix.body1.middle')}{' '}
          <span style={{ color: '#6cb8ff' }}>block 1, 2, 3</span>
          {tt('i3.prefix.body1.after')}
        </div>
        <div style={{ marginTop: 4 }}>
          {tt('i3.prefix.body2.before')}
          <span style={{ color: '#a4ee27' }}>{tt('i3.prefix.body2.highlight')}</span>
        </div>
      </Caption>
    </>
  )
}

// ===== Step 6: sweet spot 曲线 =====
function SweetSpot() {
  const tt = useT()
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(164, 238, 39, 0.55)',
        borderRadius: 12,
        padding: '14px 18px',
        color: '#f5f7fb',
        fontSize: 12,
        boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
        maxWidth: 520,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: 8,
        }}
      >
        {tt('i3.sweet.title')}
      </div>
      <svg width={460} height={170} style={{ display: 'block' }}>
        <line x1={40} y1={140} x2={440} y2={140} stroke="#3a4255" />
        <line x1={40} y1={20} x2={40} y2={140} stroke="#3a4255" />
        <text x={240} y={158} textAnchor="middle" fontSize={9} fill="#a3acba">
          {tt('i3.sweet.xLabel')}
        </text>
        <text x={6} y={80} fontSize={9} fill="#a3acba" transform="rotate(-90 16 80)">
          {tt('i3.sweet.yLabel')}
        </text>
        <rect x={40} y={20} width={120} height={120} fill="rgba(255, 122, 122, 0.08)" />
        <text x={50} y={32} fontSize={9} fill="#ff7a7a">
          {tt('i3.sweet.memBound')}
        </text>
        <rect x={260} y={20} width={180} height={120} fill="rgba(108, 184, 255, 0.08)" />
        <text x={270} y={32} fontSize={9} fill="#6cb8ff">
          {tt('i3.sweet.compBound')}
        </text>
        <path
          d="M 40 30 Q 100 60, 160 95 T 260 130 L 440 132"
          fill="none"
          stroke="#a4ee27"
          strokeWidth={2.5}
        />
        <circle cx={220} cy={120} r={5} fill="#ffd966" />
        <text x={220} y={108} fontSize={10} fill="#ffd966" textAnchor="middle">
          {tt('i3.sweet.sweet')}
        </text>
        <text x={220} y={134} fontSize={9} fill="#ffd966" textAnchor="middle">
          B* ≈ 300 × s
        </text>
      </svg>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--color-fg-soft)' }}>
        {tt('i3.sweet.body.before')}
        <span style={{ color: '#ffd966' }}>{tt('i3.sweet.body.highlight')}</span>
      </div>
    </div>
  )
}

// ===== Step 7: 20ms 一拍 =====
function TwentyMs({ t }: { t: number }) {
  const phase = (t * 1.5) % 1
  const tt = useT()
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(108, 184, 255, 0.55)',
        borderRadius: 12,
        padding: '14px 18px',
        color: '#f5f7fb',
        fontSize: 12,
        maxWidth: 520,
        boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: 8,
        }}
      >
        {tt('i3.twenty.title')}
      </div>
      <svg width={460} height={70} style={{ display: 'block' }}>
        <line x1={20} y1={50} x2={440} y2={50} stroke="#3a4255" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <line x1={20 + i * 70} y1={45} x2={20 + i * 70} y2={55} stroke="#a3acba" />
            <text
              x={20 + i * 70}
              y={68}
              fontSize={9}
              textAnchor="middle"
              fill="#a3acba"
            >
              {i * 20}ms
            </text>
          </g>
        ))}
        <circle cx={20 + phase * 420} cy={50} r={6} fill="#ffd966" opacity={0.9} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={20 + i * 70}
            y={36}
            width={10}
            height={10}
            fill="#ffd966"
            opacity={0.7}
          />
        ))}
      </svg>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-fg-soft)' }}>
        {tt('i3.twenty.body1')}
        <br />
        <span style={{ color: '#ff7a7a' }}>{tt('i3.twenty.body2.highlight')}</span>{' '}
        {tt('i3.twenty.body2.after')}
      </div>
    </div>
  )
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 217, 102, 0.45)',
        borderRadius: 8,
        padding: '8px 14px',
        color: '#f5f7fb',
        fontSize: 13,
        maxWidth: 560,
        boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
      }}
    >
      {children}
    </div>
  )
}
