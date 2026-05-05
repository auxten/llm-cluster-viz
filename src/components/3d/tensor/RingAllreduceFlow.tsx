import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { TensorBlock, TensorArrow } from './TensorBlock'

/**
 * Ring-AllReduce 算法可视化（真实算法，不是简单聚合）。
 *
 * 输入：N 个 GPU，每个有自己的 gradient 张量（被分成 N 个 chunk）。
 * 阶段 1 - reduce-scatter (N-1 步)：
 *   每一步，每个 GPU 把自己当前持有的某个 chunk 发给环上的下一个 GPU；
 *   接收方把收到的 chunk 加到自己同位置的 chunk 上。
 *   完成后，每个 GPU 都持有 1 个完整 reduced chunk。
 * 阶段 2 - all-gather (N-1 步)：
 *   每一步，每个 GPU 把自己持有的 reduced chunk 发给下一个；
 *   接收方覆盖自己同位置的 chunk。
 *   完成后所有 GPU 持有完整的 reduced 张量。
 *
 * 视觉：
 *   - N 个 GPU 排成圆环，每个 GPU 显示 N 个 chunk（像一个小条形图）
 *   - chunk 颜色按 "原始 owner" 染色（DP rank 0=偏蓝紫，1=偏红紫，2=偏绿紫，3=偏黄紫）
 *   - reduce 阶段：chunk 沿环顺时针飞，落地 + "+ 累加" 标签
 *   - 全部完成后所有 chunk 颜色统一变成 "灰紫色"（reduced sum 的颜色）
 */

export interface RingAllreduceFlowProps {
  /** N 个 GPU 的 3D 位置 */
  gpuPositions: [number, number, number][]
  /** 进度 0..1，把整个 2(N-1) 步动画压缩到这个区间 */
  progress: number
  /** 该 layer 的梯度 tensor 总尺寸标签，例如 "[d_model, d_ffn]" */
  gradShapeLabel?: string
  /** 让用户能在 UI 上看到 "当前在第 X 步" */
  onPhaseChange?: (phase: 'reduce' | 'gather' | 'done', subStep: number) => void
}

const CHUNK_OWNER_COLORS = [
  '#a6b8ff', // PP rank 0 偏蓝紫
  '#ff9ad6', // 1 偏红紫
  '#9affb8', // 2 偏绿紫
  '#ffd380', // 3 偏黄紫
]
const REDUCED_COLOR = '#a48cff' // 统一紫色（最终 reduced 状态）

export function RingAllreduceFlow({
  gpuPositions,
  progress,
  gradShapeLabel,
  onPhaseChange,
}: RingAllreduceFlowProps) {
  const N = gpuPositions.length

  // 每个 GPU 的 N 个 chunk 在 GPU 头顶上的局部偏移
  const chunkOffsets = useMemo(() => {
    const arr: [number, number, number][] = []
    const span = 0.55
    for (let i = 0; i < N; i++) {
      arr.push([(-span / 2) + (i / Math.max(1, N - 1)) * span, 0.5, 0])
    }
    return arr
  }, [N])

  // 总动画分 2(N-1) 步：先 reduce-scatter，再 all-gather
  const totalSteps = 2 * (N - 1)
  const e = THREE.MathUtils.clamp(progress, 0, 1)
  const stepFloat = e * totalSteps
  const currentStep = Math.floor(stepFloat)
  const stepFrac = stepFloat - currentStep

  // 当前是 reduce 还是 gather
  const phase: 'reduce' | 'gather' | 'done' =
    e >= 1 ? 'done' : currentStep < N - 1 ? 'reduce' : 'gather'
  const subStep = phase === 'reduce' ? currentStep : currentStep - (N - 1)

  // 通知外面当前 phase
  useFrame(() => {
    onPhaseChange?.(phase, subStep)
  })

  // 计算每个 GPU 当前持有的 chunk 状态：
  //   chunkOwners[gpu_i][chunk_j] = { fromOwners: [owner ids], reduced: bool }
  // 用经典 ring-reduce 调度推导。
  const chunkStates = useMemo(() => {
    const state: { fromOwners: number[]; reduced: boolean }[][] = []
    for (let i = 0; i < N; i++) {
      const row: { fromOwners: number[]; reduced: boolean }[] = []
      for (let j = 0; j < N; j++) row.push({ fromOwners: [i], reduced: false })
      state.push(row)
    }
    // reduce-scatter：在 step k (0..N-2) 时，GPU i 把 chunk (i - k) mod N 送给 GPU (i+1) mod N。
    // 接收方把收到的 chunk 加到自己 chunk[(i - k) mod N] 上。
    const stepsToApply = phase === 'reduce' ? subStep : N - 1
    for (let k = 0; k < stepsToApply; k++) {
      const newOwners: number[][][] = state.map((row) => row.map((c) => [...c.fromOwners]))
      for (let i = 0; i < N; i++) {
        const chunk = (i - k + N) % N
        const dst = (i + 1) % N
        const merged = Array.from(
          new Set([...newOwners[dst][chunk], ...state[i][chunk].fromOwners]),
        )
        newOwners[dst][chunk] = merged
      }
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) state[i][j].fromOwners = newOwners[i][j]
    }
    if (phase === 'reduce' || phase === 'gather' || phase === 'done') {
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++)
          state[i][j].reduced = state[i][j].fromOwners.length >= N
    }
    // all-gather：在 step k (0..N-2)，GPU i 把已 reduced 的 chunk (i - k + 1) mod N 送给下一个
    // 在动画上我们简化：reduced=true 的 chunk 颜色 = REDUCED_COLOR
    if (phase === 'gather') {
      const gatherSteps = subStep
      for (let k = 0; k < gatherSteps; k++) {
        const newReduced = state.map((row) => row.map((c) => c.reduced))
        for (let i = 0; i < N; i++) {
          const chunk = (i - k + 1 + N) % N
          const dst = (i + 1) % N
          if (state[i][chunk].reduced) newReduced[dst][chunk] = true
        }
        for (let i = 0; i < N; i++)
          for (let j = 0; j < N; j++) state[i][j].reduced = newReduced[i][j]
      }
    }
    if (phase === 'done') {
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) state[i][j].reduced = true
    }
    return state
  }, [N, phase, subStep])

  // 静态 chunk 显示
  const staticChunks = useMemo(() => {
    const items: {
      pos: [number, number, number]
      color: string
      reduced: boolean
      gpu: number
      chunk: number
    }[] = []
    for (let i = 0; i < N; i++) {
      const gp = gpuPositions[i]
      for (let j = 0; j < N; j++) {
        const off = chunkOffsets[j]
        const pos: [number, number, number] = [gp[0] + off[0], gp[1] + off[1], gp[2] + off[2]]
        const cs = chunkStates[i][j]
        const color = cs.reduced
          ? REDUCED_COLOR
          : cs.fromOwners.length === 1
            ? CHUNK_OWNER_COLORS[cs.fromOwners[0] % CHUNK_OWNER_COLORS.length]
            : // 多 owner 但还没 reduced 完：取第一个
              CHUNK_OWNER_COLORS[cs.fromOwners[0] % CHUNK_OWNER_COLORS.length]
        items.push({ pos, color, reduced: cs.reduced, gpu: i, chunk: j })
      }
    }
    return items
  }, [N, gpuPositions, chunkOffsets, chunkStates])

  // 当前正在传输的 chunk（动画中的 N 个箭头）
  const movingArrows = useMemo(() => {
    if (phase === 'done') return []
    const arrows: {
      from: [number, number, number]
      to: [number, number, number]
      color: string
      key: string
      shape?: string
    }[] = []
    for (let i = 0; i < N; i++) {
      const fromGpu = i
      const toGpu = (i + 1) % N
      const chunkIdx =
        phase === 'reduce' ? (i - subStep + N) % N : (i - subStep + 1 + N) % N
      const off = chunkOffsets[chunkIdx]
      const fromGp = gpuPositions[fromGpu]
      const toGp = gpuPositions[toGpu]
      const from: [number, number, number] = [fromGp[0] + off[0], fromGp[1] + off[1], fromGp[2] + off[2]]
      const to: [number, number, number] = [toGp[0] + off[0], toGp[1] + off[1], toGp[2] + off[2]]
      const cs = chunkStates[fromGpu][chunkIdx]
      const color = cs.reduced
        ? REDUCED_COLOR
        : CHUNK_OWNER_COLORS[cs.fromOwners[0] % CHUNK_OWNER_COLORS.length]
      arrows.push({ from, to, color, key: `${i}-${chunkIdx}` })
    }
    return arrows
  }, [N, phase, subStep, gpuPositions, chunkOffsets, chunkStates])

  return (
    <group>
      {/* 静态 chunk 显示 */}
      {staticChunks.map((c, idx) => (
        <TensorBlock
          key={idx}
          position={c.pos}
          role="gradient"
          color={c.color}
          size={[0.07, 0.03, 0.07]}
          pulse={c.reduced ? 0.2 : 0.6}
          shape={undefined}
          label={undefined}
        />
      ))}

      {/* 移动中的 chunk 箭头 */}
      {movingArrows.map((a) => (
        <TensorArrow
          key={a.key}
          from={a.from}
          to={a.to}
          role="gradient"
          color={a.color}
          progress={stepFrac}
          showLine={false}
          size={[0.07, 0.03, 0.07]}
        />
      ))}

      {/* 在每个 GPU 头顶显示 phase 标签 + "+" 累加视觉 */}
      {gpuPositions.map((gp, i) => (
        <Html
          key={`label-${i}`}
          position={[gp[0], gp[1] + 0.95, gp[2]]}
          center
          pointerEvents="none"
        >
          <GpuLabel index={i} phase={phase} subStep={subStep} stepFrac={stepFrac} />
        </Html>
      ))}

      {/* 中央总标签 */}
      <Html
        position={[
          gpuPositions.reduce((s, p) => s + p[0], 0) / N,
          gpuPositions[0][1] + 1.5,
          gpuPositions.reduce((s, p) => s + p[2], 0) / N,
        ]}
        center
        pointerEvents="none"
      >
        <PhaseHeader phase={phase} subStep={subStep} N={N} gradShapeLabel={gradShapeLabel} />
      </Html>
    </group>
  )
}

function GpuLabel({
  index,
  phase,
  subStep,
  stepFrac,
}: {
  index: number
  phase: 'reduce' | 'gather' | 'done'
  subStep: number
  stepFrac: number
}) {
  const isReceiving = phase !== 'done' && stepFrac > 0.55
  return (
    <div
      style={{
        background: 'rgba(28, 34, 46, 0.85)',
        border: `1px solid ${
          phase === 'done' ? 'rgba(164, 238, 39, 0.55)' : 'rgba(164, 140, 255, 0.5)'
        }`,
        borderRadius: 4,
        padding: '1px 5px',
        fontSize: 9,
        color: phase === 'done' ? '#a4ee27' : '#cbb8ff',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
        opacity: 0.95,
      }}
    >
      DP{index}
      {isReceiving && phase === 'reduce' ? (
        <span style={{ color: '#ffd966', marginLeft: 4 }}>+ accum</span>
      ) : null}
      {isReceiving && phase === 'gather' ? (
        <span style={{ color: '#a4ee27', marginLeft: 4 }}>= reduced</span>
      ) : null}
      {phase === 'done' && subStep === 0 ? (
        <span style={{ color: '#a4ee27', marginLeft: 4 }}>✓ synced</span>
      ) : null}
    </div>
  )
}

function PhaseHeader({
  phase,
  subStep,
  N,
  gradShapeLabel,
}: {
  phase: 'reduce' | 'gather' | 'done'
  subStep: number
  N: number
  gradShapeLabel?: string
}) {
  const total = N - 1
  const phaseName =
    phase === 'reduce'
      ? 'Reduce-scatter'
      : phase === 'gather'
        ? 'All-gather'
        : 'Done'
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border:
          phase === 'done'
            ? '1px solid rgba(164, 238, 39, 0.55)'
            : '1px solid rgba(164, 140, 255, 0.55)',
        borderRadius: 8,
        padding: '6px 12px',
        color: '#f5f7fb',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        Ring-AllReduce {gradShapeLabel ? `· grad ${gradShapeLabel}` : ''}
      </div>
      <div
        style={{
          marginTop: 2,
          color: phase === 'done' ? '#a4ee27' : '#cbb8ff',
          fontWeight: 600,
        }}
      >
        {phaseName}
        {phase !== 'done' ? ` · step ${subStep + 1} / ${total}` : ' ✓'}
      </div>
    </div>
  )
}
