import { Html } from '@react-three/drei'
import { useStory } from '../state/storyStore'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Llama3Failures, RecoveryMechanisms } from '../data/specs'
import { SourceLink } from '../ui/CitationPopover'
import { useT } from '../i18n'

/**
 * S7: 节点故障与恢复 (datacenter 层叠加)
 *
 * 数据：Llama 3 paper
 *  - 16,384 H100 / 54 天 / 419 次中断
 *  - 平均 ~3 小时一次
 *  - 故障类型分布（Table 5）
 *
 * 步骤：
 *  0. baseline — 全绿（正常运行）
 *  1. gpu_fault — 第 2 个 rack 上某 tray 闪红
 *  2. sdc — silent data corruption，HBM 上一条带异常颜色，loss spike
 *  3. checkpoint — GEMINI 风格，秒级恢复
 *  4. recycle — ReCycle 弹性接管
 *
 * 同时显示一个时间轴 + 故障类型饼图。
 */

export function StorylineS7() {
  const stepIndex = useStory((s) => s.stepIndex)
  const paused = useStory((s) => s.paused)

  // 故障"动画"：脉冲计数
  const [pulse, setPulse] = useState(0)
  useFrame((_, dt) => {
    if (paused) return
    setPulse((p) => (p + dt * 4) % (Math.PI * 2))
  })

  return (
    <group>
      {/* 顶部信息条：Llama 3 数据 */}
      <Html
        position={[0, NVL72_DIM.height + 1.6, 0]}
        center
        pointerEvents="none"
        zIndexRange={[100, 0]}
      >
        <FailureHUD stepIndex={stepIndex} pulse={pulse} />
      </Html>

      {/* 故障 GPU 高亮 — 在第 2 个 rack 上，仅在故障/SDC/恢复阶段显示 */}
      {stepIndex >= 1 && stepIndex <= 6 ? (
        <FaultMarker pulse={pulse} stepIndex={stepIndex} />
      ) : null}

      {/* checkpoint / recycle 流向标识 */}
      {stepIndex === 5 ? <CheckpointVisual /> : null}
      {stepIndex === 6 ? <RecycleVisual /> : null}

      {/* SDC step 加一张 loss 折线图（HUD 旁边） */}
      {stepIndex === 4 ? (
        <Html
          position={[NVL72_DIM.width * 2.6, NVL72_DIM.height * 0.7, 0]}
          center
          pointerEvents="none"
          zIndexRange={[100, 0]}
        >
          <LossSpikeChart pulse={pulse} />
        </Html>
      ) : null}

      {/* effective step 大字总结 */}
      {stepIndex === 7 ? (
        <Html
          position={[0, NVL72_DIM.height * 0.55, 0]}
          center
          pointerEvents="none"
          zIndexRange={[100, 0]}
        >
          <EffectiveBanner />
        </Html>
      ) : null}
    </group>
  )
}

function LossSpikeChart({ pulse }: { pulse: number }) {
  const t = useT()
  // 100 个数据点，第 70 个突然 spike
  const W = 260
  const H = 120
  const N = 100
  const baseY = (i: number) => 20 + (90 - i * 0.55)
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < N; i++) {
    const x = 12 + (i / (N - 1)) * (W - 24)
    let y = baseY(i)
    if (i >= 68 && i <= 75) {
      const peak = i === 71 ? 38 : 50
      y = peak + (Math.sin((i - 68) * 0.8) * 2)
    }
    points.push({ x, y })
  }
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const cursorX = 12 + ((pulse / (Math.PI * 2)) * (W - 24))
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(255, 217, 102, 0.55)',
        borderRadius: 10,
        padding: '10px 14px',
        color: '#f5f7fb',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#ffd966',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          marginBottom: 6,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {t('s7.lossChart.title')}
      </div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* 网格 */}
        {[20, 50, 80, 110].map((y) => (
          <line
            key={y}
            x1={12}
            y1={y}
            x2={W - 12}
            y2={y}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={1}
          />
        ))}
        {/* 主 loss 线 */}
        <path
          d={path}
          fill="none"
          stroke="#a4ee27"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* SDC spike 区域高亮 */}
        <rect
          x={points[68].x}
          y={20}
          width={points[75].x - points[68].x}
          height={H - 30}
          fill="rgba(255, 122, 122, 0.16)"
          stroke="rgba(255, 122, 122, 0.5)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        <text
          x={points[71].x}
          y={14}
          textAnchor="middle"
          fontSize={9}
          fill="#ff7a7a"
          fontFamily="var(--font-mono)"
          fontWeight={700}
        >
          {t('s7.lossChart.spike')}
        </text>
        {/* cursor */}
        <line
          x1={cursorX}
          y1={20}
          x2={cursorX}
          y2={H - 10}
          stroke="rgba(255, 217, 102, 0.5)"
          strokeWidth={1}
        />
      </svg>
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-fg-soft)',
          marginTop: 4,
        }}
      >
        {t('s7.lossChart.body')}
      </div>
    </div>
  )
}

function EffectiveBanner() {
  const t = useT()
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(164, 238, 39, 0.55)',
        borderRadius: 14,
        padding: '20px 32px',
        color: '#f5f7fb',
        textAlign: 'center',
        minWidth: 360,
        boxShadow: '0 14px 44px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          marginBottom: 12,
        }}
      >
        {t('s7.banner.title')}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 56,
          color: '#a4ee27',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        &gt; 90%
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color: 'var(--color-fg-soft)',
          lineHeight: 1.5,
        }}
      >
        {t('s7.banner.body1')}
        <br />
        <span style={{ color: 'var(--color-fg-mute)' }}>
          {t('s7.banner.body2')}
        </span>
      </div>
    </div>
  )
}

function FailureHUD({
  stepIndex,
  pulse,
}: {
  stepIndex: number
  pulse: number
}) {
  const t = useT()
  const total = Llama3Failures.totalInterruptions.value
  const days = Llama3Failures.trainingDays.value
  const gpus = Llama3Failures.totalGPUs.value
  const meanH = Llama3Failures.meanTimeBetweenInterruptionsHours.value

  const causes = Llama3Failures.causeBreakdown
  const top = useMemo(
    () =>
      [...causes]
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5)
        .map((c) => ({ ...c })),
    [causes],
  )

  // 顺序与 r1_failure_recovery.steps 对应（共 8 步）
  const stepCallouts = [
    {
      label: t('s7.callout.baseline.label'),
      desc: t('s7.callout.baseline.desc'),
      color: '#76b900',
    },
    {
      label: t('s7.callout.gpuFault.label'),
      desc: t('s7.callout.gpuFault.desc'),
      color: '#ff5c5c',
    },
    {
      label: t('s7.callout.llama3.label'),
      desc: t('s7.callout.llama3.desc'),
      color: '#ffb547',
    },
    {
      label: t('s7.callout.causes.label'),
      desc: t('s7.callout.causes.desc'),
      color: '#ffb547',
    },
    {
      label: t('s7.callout.sdc.label'),
      desc: t('s7.callout.sdc.desc'),
      color: '#ffb547',
    },
    {
      label: t('s7.callout.gemini.label'),
      desc: t('s7.callout.gemini.desc'),
      color: '#a4ee27',
    },
    {
      label: t('s7.callout.recycle.label'),
      desc: t('s7.callout.recycle.desc'),
      color: '#4ea1ff',
    },
    {
      label: t('s7.callout.effective.label'),
      desc: t('s7.callout.effective.desc'),
      color: '#76b900',
    },
  ]
  const cur = stepCallouts[stepIndex] ?? stepCallouts[0]
  const indicatorOn =
    stepIndex === 1 || stepIndex === 4 ? Math.sin(pulse) > 0 : true

  return (
    <div
      style={{
        background: 'rgba(15,18,24,0.92)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${cur.color}55`,
        borderRadius: 10,
        padding: '12px 16px',
        color: 'var(--color-fg)',
        fontSize: 12,
        lineHeight: 1.5,
        textAlign: 'left',
        minWidth: 540,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 8,
        }}
      >
        <span>
          {t('s7.header.title')
            .replace('{gpus}', gpus.toLocaleString())
            .replace('{days}', String(days))}
        </span>
        <span style={{ color: cur.color, opacity: indicatorOn ? 1 : 0.3 }}>
          {stepIndex === 1 ? '◉' : '○'} {cur.label}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        <Stat
          label={t('s7.stat.unintendedBreaks')}
          value={total.toString()}
          unit={t('s7.unit.times')}
        />
        <Stat
          label={t('s7.stat.meanInterval')}
          value={meanH.toString()}
          unit="h"
          warn
        />
        <Stat label={t('s7.stat.effective')} value=">90" unit="%" />
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-fg-mute)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 6,
          }}
        >
          {t('s7.causesTop5')}
        </div>
        {top.map((c) => (
          <div
            key={c.cause}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-fg-soft)',
                width: 200,
              }}
            >
              {t(c.cause)}
            </span>
            <span
              style={{
                flex: 1,
                position: 'relative',
                height: 6,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${(c.pct / 30.1) * 100}%`,
                  background:
                    c.cause.includes('faultyGPU') ||
                    c.cause.includes('HBM') ||
                    c.cause.includes('SRAM')
                      ? 'linear-gradient(90deg, #ff5c5c, #ffb547)'
                      : 'linear-gradient(90deg, #4ea1ff, #76b900)',
                }}
              />
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-fg)',
                width: 40,
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {c.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 10,
          padding: '8px 10px',
          background: `${cur.color}1a`,
          border: `1px solid ${cur.color}40`,
          borderRadius: 6,
          fontSize: 13,
          color: 'var(--color-fg)',
        }}
      >
        <strong style={{ color: cur.color }}>{cur.label}</strong> · {cur.desc}
      </div>

      {stepIndex === 5 ? (
        <RecoveryRef rec={RecoveryMechanisms.gemini} />
      ) : null}
      {stepIndex === 6 ? (
        <RecoveryRef rec={RecoveryMechanisms.recycle} />
      ) : null}
    </div>
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
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: warn ? '#ffb547' : 'var(--color-fg)',
          lineHeight: 1.2,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
        <span
          style={{
            fontSize: 13,
            color: 'var(--color-fg-mute)',
            marginLeft: 3,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  )
}

function RecoveryRef({
  rec,
}: {
  rec: { label: string; summary: string; sources: { label: string; url: string }[] }
}) {
  const t = useT()
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: 13,
        color: 'var(--color-fg-soft)',
      }}
    >
      <strong style={{ color: 'var(--color-fg)' }}>{rec.label}：</strong>
      {t(rec.summary)}
      <div style={{ marginTop: 3 }}>
        {rec.sources.map((s) => (
          <SourceLink key={s.url} src={s} />
        ))}
      </div>
    </div>
  )
}

function FaultMarker({ pulse, stepIndex }: { pulse: number; stepIndex: number }) {
  // 第 2 个 rack 中部偏上
  const dx = NVL72_DIM.width + 1.4
  const x = -0.5 * dx
  const y = NVL72_DIM.height * 0.55
  const intensity = 0.6 + 0.4 * Math.sin(pulse)
  const isSdc = stepIndex === 4
  const color = isSdc ? '#ffd966' : '#ff7a7a'
  const t = useT()
  const labelMap: Record<number, string> = {
    1: t('s7.fault.gpu1'),
    2: t('s7.fault.gpu2'),
    3: t('s7.fault.gpu3'),
    4: t('s7.fault.sdc'),
    5: t('s7.fault.restoring'),
    6: t('s7.fault.takeover'),
  }
  return (
    <group position={[x, y, NVL72_DIM.depth / 2 + 0.05]}>
      <mesh>
        <boxGeometry args={[NVL72_DIM.width * 0.94, 0.1, 0.02]} />
        <meshBasicMaterial color={color} transparent opacity={intensity} />
      </mesh>
      <Html position={[0, 0.35, 0]} center pointerEvents="none">
        <div
          style={{
            background: `${color}33`,
            border: `1px solid ${color}`,
            borderRadius: 6,
            padding: '4px 10px',
            color,
            fontSize: 12,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}
        >
          {labelMap[stepIndex] ?? t('s7.fault.gpu1')}
        </div>
      </Html>
    </group>
  )
}

function CheckpointVisual() {
  const t = useT()
  return (
    <Html
      position={[-0.5 * (NVL72_DIM.width + 1.4), NVL72_DIM.height * 0.55, NVL72_DIM.depth / 2 + 0.05]}
      center
      pointerEvents="none"
    >
      <div
        style={{
          background: 'rgba(118, 185, 0, 0.15)',
          border: '1px solid #76b900',
          borderRadius: 6,
          padding: '6px 10px',
          color: '#a4ee27',
          fontSize: 13,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        }}
      >
        {t('s7.checkpoint.restoring')}
      </div>
    </Html>
  )
}

function RecycleVisual() {
  // 第 2 个 rack 失效 → 第 1 和第 3 个 rack 接管
  const dx = NVL72_DIM.width + 1.4
  const t = useT()
  return (
    <group>
      {[-1.5, 0.5].map((i) => (
        <Html
          key={i}
          position={[i * dx, NVL72_DIM.height + 0.2, 0]}
          center
          pointerEvents="none"
        >
          <div
            style={{
              background: 'rgba(78, 161, 255, 0.18)',
              border: '1px solid #4ea1ff',
              borderRadius: 6,
              padding: '4px 10px',
              color: '#4ea1ff',
              fontSize: 12,
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {t('s7.recycle.takeover')}
          </div>
        </Html>
      ))}
    </group>
  )
}

// 提供给 DatacenterScene 的辅助：根据 storyline step 算出 racks 的 GPU 状态阵列
export function useFailureState(): {
  rackGpuStates: ('normal' | 'warn' | 'fail')[][]
  switchLoads: number[]
} {
  const storyId = useStory((s) => s.storyId)
  const stepIndex = useStory((s) => s.stepIndex)

  if (storyId !== 'r1_failure_recovery') {
    return {
      rackGpuStates: [[], [], [], []],
      switchLoads: [0.3, 0.3, 0.3, 0.3],
    }
  }

  const racks: ('normal' | 'warn' | 'fail')[][] = []
  const loads = [0.3, 0.3, 0.3, 0.3]
  for (let r = 0; r < 4; r++) {
    const arr: ('normal' | 'warn' | 'fail')[] = []
    for (let g = 0; g < 72; g++) arr.push('normal')
    racks.push(arr)
  }
  // r1_failure_recovery 的 8 步：
  //   0 steady, 1 gpu_fault, 2 llama3_stats, 3 cause_breakdown,
  //   4 sdc, 5 gemini, 6 recycle, 7 effective
  // step 1-3 都保持原始 GPU 故障标记，让用户感受到 "故障一直在那"
  if (stepIndex >= 1 && stepIndex <= 3) {
    racks[1][12] = 'fail'
    racks[1][13] = 'warn'
    loads[1] = 0
  } else if (stepIndex === 4) {
    racks[1][12] = 'fail'
    racks[1][20] = 'warn'
    loads[1] = 0
  } else if (stepIndex === 5) {
    racks[1][12] = 'warn'
    racks[1][13] = 'warn'
  } else if (stepIndex === 6) {
    for (let g = 0; g < 72; g++) racks[1][g] = 'fail'
    loads[0] = 0.7
    loads[1] = 0
    loads[2] = 0.7
  }
  // step 7 effective：所有 rack 回归 normal（默认值）
  return { rackGpuStates: racks, switchLoads: loads }
}
