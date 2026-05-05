import { useEffect, useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useStepGate } from './useStepGate'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import { useT } from '../i18n'

/**
 * P3 · GB200 Superchip 解剖 (chip 层叠加)
 *
 * 5 step：
 *  0 zoom_to_board    平滑过渡到默认 chip 视角
 *  1 components       Grace + 2 B200 的标签依次 emphasis
 *  2 die_to_die       2 颗 B200 之间的 die-to-die 银色脉冲 + "10 TB/s"
 *  3 hbm_stacks       HBM stack 围一圈绿色光环 + "192 GB · 8 TB/s"
 *  4 nvlink_c2c       Grace ↔ B200 绿色脉冲 + "900 GB/s"
 */

const SUPERCHIP = {
  graceX: 0,
  graceZ: 0.05,
  b200LX: -0.08,
  b200RX: 0.08,
  b200Z: -0.12,
  hbmRowZOffset: 0.045,
}

const CAM_VIEWS: Record<
  string,
  { position: [number, number, number]; lookAt: [number, number, number] }
> = {
  zoom_to_board: { position: [0.4, 0.55, 0.45], lookAt: [0, 0.02, 0] },
  components: { position: [0.4, 0.5, 0.45], lookAt: [0, 0.02, 0] },
  die_to_die: { position: [0.25, 0.28, 0.32], lookAt: [0, 0.04, -0.12] },
  hbm_stacks: { position: [0.3, 0.45, 0.35], lookAt: [0, 0.04, -0.12] },
  nvlink_c2c: { position: [0.4, 0.45, 0.5], lookAt: [0, 0.04, -0.04] },
}

export function StorylineP3() {
  const gate = useStepGate('p3_gb200_superchip')
  const setTarget = useCamera((s) => s.setTarget)
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)
  const [t, setT] = useState(0)
  const tt = useT()

  useFrame((_, dt) => {
    if (paused) return
    setT((p) => (p + dt * speed) % 6.0)
  })

  useEffect(() => {
    const view = CAM_VIEWS[gate.currentId]
    if (view) setTarget({ ...view, duration: 1.5 })
  }, [gate.currentId, setTarget])

  const isComponents = gate.is('components')
  const isDieToDie = gate.is('die_to_die')
  const isHbm = gate.is('hbm_stacks')
  const isNvlinkC2C = gate.is('nvlink_c2c')

  return (
    <group>
      {/* step 1: components - 高亮组件标签 */}
      {isComponents ? (
        <>
          <Html position={[SUPERCHIP.graceX, 0.05, SUPERCHIP.graceZ]} center pointerEvents="none">
            <Tag color="#6cb8ff" pulse={t}>
              {tt('p3.tag.grace')}
            </Tag>
          </Html>
          <Html position={[SUPERCHIP.b200LX, 0.05, SUPERCHIP.b200Z]} center pointerEvents="none">
            <Tag color="#a4ee27" pulse={t + 0.5}>
              {tt('p3.tag.b200die')}
            </Tag>
          </Html>
          <Html position={[SUPERCHIP.b200RX, 0.05, SUPERCHIP.b200Z]} center pointerEvents="none">
            <Tag color="#a4ee27" pulse={t + 1.0}>
              {tt('p3.tag.b200die')}
            </Tag>
          </Html>
        </>
      ) : null}

      {/* step 2: die-to-die - 在 2 颗 B200 之间画银色脉冲 */}
      {isDieToDie ? (
        <>
          {Array.from({ length: 6 }).map((_, i) => {
            const ratio = ((t * 1.5 + i / 6) % 1)
            const x = SUPERCHIP.b200LX + ratio * (SUPERCHIP.b200RX - SUPERCHIP.b200LX)
            return (
              <mesh key={i} position={[x, 0.025, SUPERCHIP.b200Z]}>
                <sphereGeometry args={[0.006, 8, 8]} />
                <meshBasicMaterial color="#e0e8f5" transparent opacity={0.85} />
              </mesh>
            )
          })}
          <Html position={[0, 0.07, SUPERCHIP.b200Z]} center pointerEvents="none">
            <Tag color="#e0e8f5" pulse={t}>
              {tt('p3.tag.dieToDie')}
            </Tag>
          </Html>
        </>
      ) : null}

      {/* step 3: HBM stacks - 在每颗 HBM stack 正上方画小光环 + 粒子流向 die */}
      {isHbm ? (
        <HbmStacksOverlay t={t} tt={tt} />
      ) : null}

      {/* step 4: NVLink-C2C - Grace ↔ B200 绿色脉冲 */}
      {isNvlinkC2C ? (
        <>
          {[SUPERCHIP.b200LX, SUPERCHIP.b200RX].map((bx, k) =>
            Array.from({ length: 4 }).map((_, i) => {
              const ratio = ((t + i / 4 + k * 0.5) % 1)
              const x = SUPERCHIP.graceX + ratio * (bx - SUPERCHIP.graceX)
              const z = SUPERCHIP.graceZ + ratio * (SUPERCHIP.b200Z - SUPERCHIP.graceZ)
              return (
                <mesh key={`${k}-${i}`} position={[x, 0.018, z]}>
                  <sphereGeometry args={[0.005, 8, 8]} />
                  <meshBasicMaterial color="#a4ee27" transparent opacity={0.9} />
                </mesh>
              )
            }),
          )}
          <Html position={[0, 0.12, 0]} center pointerEvents="none">
            <Tag color="#a4ee27" pulse={t}>
              {tt('p3.tag.nvlinkC2C')}
            </Tag>
          </Html>
        </>
      ) : null}

      {/* 顶部信息卡 */}
      <Html position={[0, 0.28, 0]} center pointerEvents="none" zIndexRange={[100, 0]}>
        <P3Overlay gateId={gate.currentId} />
      </Html>
    </group>
  )
}

// ── HBM Stack positions ──────────────────────────────────────────────────────
// Mirrors BlackwellGPU layout: 2 B200s, each with 8 HBM3e stacks (2 rows × 4)
// World-space y: board_h(0.01) + pkgH(0.011) + tiny gap
const PKG_W = 0.13
const PKG_D = 0.115
const HBM_S = 0.016
const HBM_Y = 0.024

function buildHbmPositions(): Array<{ pos: [number, number, number]; bIdx: number; stackIdx: number }> {
  const result: Array<{ pos: [number, number, number]; bIdx: number; stackIdx: number }> = []
  const b200Xs = [SUPERCHIP.b200LX, SUPERCHIP.b200RX]
  b200Xs.forEach((bx, bIdx) => {
    // side=-1 → front row, side=+1 → back row
    ;[-1, 1].forEach((side) => {
      const z = SUPERCHIP.b200Z + (PKG_D / 2 - HBM_S / 2 - 0.004) * side
      for (let idx = 0; idx < 4; idx++) {
        const x = bx + (-PKG_W / 2 + 0.018 + idx * ((PKG_W - 0.036) / 3))
        result.push({ pos: [x, HBM_Y, z], bIdx, stackIdx: result.length % 8 })
      }
    })
  })
  return result
}

const HBM_STACK_DEFS = buildHbmPositions()

function HbmStacksOverlay({ t, tt }: { t: number; tt: ReturnType<typeof useT> }) {
  // Pre-build particle data: 5 particles per stack, 16 stacks = 80 total
  const particles = useMemo(() => {
    return HBM_STACK_DEFS.flatMap(({ pos, bIdx }, globalIdx) =>
      Array.from({ length: 5 }, (_, pi) => ({ pos, bIdx, si: globalIdx, pi })),
    )
  }, [])

  return (
    <>
      {/* Individual halos above each of the 16 HBM stacks (8 per B200) */}
      {HBM_STACK_DEFS.map(({ pos, stackIdx }, i) => {
        const phase = t * 2.5 + stackIdx * (Math.PI / 4)
        const opacity = 0.4 + 0.5 * Math.abs(Math.sin(phase))
        return (
          <mesh
            key={`halo-${i}`}
            position={pos}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.012, 0.0025, 8, 24]} />
            <meshBasicMaterial color="#a4ee27" transparent opacity={opacity} />
          </mesh>
        )
      })}

      {/* Rising particles: each HBM stack emits particles flowing upward */}
      {particles.map(({ pos, bIdx, si, pi }) => {
        // phase offset by global stack index + particle index → cascade wave
        const phase = (t * 1.2 + si * 0.19 + pi * 0.2) % 1
        const [px, , pz] = pos
        // particles rise from HBM y up ~0.04 toward the die center
        const py = HBM_Y + phase * 0.038
        const opacity = phase < 0.85 ? (1 - phase / 0.85) * 0.75 : 0
        // converge slightly toward the B200 die center x
        const dieX = bIdx === 0 ? SUPERCHIP.b200LX : SUPERCHIP.b200RX
        const cx = px + (dieX - px) * phase * 0.25
        return (
          <mesh key={`p-${si}-${pi}`} position={[cx, py, pz]}>
            <sphereGeometry args={[0.0022, 6, 6]} />
            <meshBasicMaterial color="#a4ee27" transparent opacity={opacity} />
          </mesh>
        )
      })}

      <Html position={[0.22, 0.1, SUPERCHIP.b200Z]} center pointerEvents="none">
        <Card title={tt('p3.hbm.label')} accent="#a4ee27">
          <div style={{ display: 'flex', gap: 14 }}>
            <Stat label={tt('p3.hbm.capacity')} value="192" unit="GB" color="#a4ee27" />
            <Stat label={tt('p3.hbm.bandwidth')} value="8" unit="TB/s" color="#a4ee27" />
            <Stat label={tt('p3.hbm.stack')} value="8" unit="× 12-Hi" color="#a4ee27" />
          </div>
        </Card>
      </Html>
    </>
  )
}

function P3Overlay({ gateId }: { gateId: string }) {
  const tt = useT()
  const map: Record<
    string,
    { title: string; accent: string; subtitle?: string }
  > = {
    zoom_to_board: {
      title: tt('p3.overlay.zoom.title'),
      accent: '#c5cdd9',
      subtitle: tt('p3.overlay.zoom.sub'),
    },
    components: {
      title: tt('p3.overlay.components.title'),
      accent: '#a4ee27',
      subtitle: tt('p3.overlay.components.sub'),
    },
    die_to_die: {
      title: tt('p3.overlay.dieToDie.title'),
      accent: '#e0e8f5',
      subtitle: tt('p3.overlay.dieToDie.sub'),
    },
    hbm_stacks: {
      title: tt('p3.overlay.hbm.title'),
      accent: '#a4ee27',
      subtitle: tt('p3.overlay.hbm.sub'),
    },
    nvlink_c2c: {
      title: tt('p3.overlay.nvlinkC2C.title'),
      accent: '#a4ee27',
      subtitle: tt('p3.overlay.nvlinkC2C.sub'),
    },
  }
  const v = map[gateId]
  if (!v) return null
  return (
    <Card title={v.title} accent={v.accent}>
      {v.subtitle ? (
        <div style={{ fontSize: 13, color: 'var(--color-fg-soft)' }}>
          {v.subtitle}
        </div>
      ) : null}
    </Card>
  )
}

function Tag({
  children,
  color,
  pulse,
}: {
  children: React.ReactNode
  color: string
  pulse: number
}) {
  const alpha = 0.85 + 0.15 * Math.sin(pulse * 2.5)
  return (
    <div
      style={{
        background: `${color}22`,
        border: `1px solid ${color}88`,
        borderRadius: 6,
        padding: '3px 9px',
        color,
        fontSize: 10.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        opacity: alpha,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: `0 2px 12px ${color}44`,
      }}
    >
      {children}
    </div>
  )
}

function Card({
  title,
  accent,
  children,
}: {
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: `1px solid ${accent}55`,
        borderRadius: 10,
        padding: '10px 14px',
        color: '#f5f7fb',
        fontSize: 13,
        textAlign: 'center',
        minWidth: 300,
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string
  unit: string
  color: string
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
          fontSize: 18,
          fontWeight: 700,
          color,
          lineHeight: 1.2,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
        <span
          style={{
            fontSize: 12,
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
