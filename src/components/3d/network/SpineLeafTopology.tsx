import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { M } from '../materials'
import { IBCable } from './IBCable'
import { FlowParticles } from '../flow/FlowParticles'
import { useStory } from '../../../state/storyStore'
import { storylineById } from '../../../data/storylines'

/**
 * 简化的 IB spine-leaf 拓扑：
 * - 每个 rack 一个 leaf（在 rack 顶部，可视化为发光小盒）
 * - 数据中心顶部一排 spine 交换机（4-8 颗）
 * - 每个 leaf 上行到所有 spine
 *
 * 现实中 NVIDIA Quantum-X800 spine 一般 64 ports / spine。
 * 这里只可视化拓扑，不试图还原端口数。
 *
 * `active=true` 时：
 *   - spine 交换机端口 LED 做 chase 闪烁
 *   - leaf 指示灯做呼吸脉冲
 *   - cable 上叠加 FlowParticles 表达数据 leaf→spine 上行
 */

interface SpineLeafTopologyProps {
  /** rack 顶部坐标列表（leaf 锚点） */
  leafAnchors: { x: number; y: number; z: number }[]
  /** 把 spine 放在多高 */
  spineY?: number
  /** spine 数量 */
  spineCount?: number
  /** 是否激活（演示训练时通信） */
  active?: boolean
  /** 数据流强度（0..1）；active=false 时被忽略 */
  flowIntensity?: number
}

export function SpineLeafTopology({
  leafAnchors,
  spineY = 4.5,
  spineCount = 4,
  active = false,
  flowIntensity = 1,
}: SpineLeafTopologyProps) {
  const spinePositions = useMemo(() => {
    const minX = Math.min(...leafAnchors.map((a) => a.x))
    const maxX = Math.max(...leafAnchors.map((a) => a.x))
    const range = maxX - minX
    return Array.from({ length: spineCount }).map((_, i) => ({
      x: minX + (range * (i + 0.5)) / spineCount,
      y: spineY,
      z: 0,
    }))
  }, [leafAnchors, spineY, spineCount])

  // leaf → spine 全互联曲线，cable 形状与 IBCable 内的 quadratic bezier 一致，
  // 用于驱动 FlowParticles 沿同一路径流动。
  const cableCurves = useMemo(() => {
    const curves: THREE.Curve<THREE.Vector3>[] = []
    leafAnchors.forEach((a) => {
      spinePositions.forEach((s) => {
        const aV = new THREE.Vector3(a.x, a.y + 0.04, a.z)
        const bV = new THREE.Vector3(s.x, s.y - 0.1, s.z)
        const mid = aV.clone().add(bV).multiplyScalar(0.5)
        const dist = aV.distanceTo(bV)
        mid.y += dist * 0.15
        curves.push(new THREE.QuadraticBezierCurve3(aV, mid, bV))
      })
    })
    return curves
  }, [leafAnchors, spinePositions])

  return (
    <group>
      {spinePositions.map((p, i) => (
        <SpineSwitch
          key={`spine${i}`}
          position={[p.x, p.y, p.z]}
          active={active}
          phaseSeed={i}
        />
      ))}

      {leafAnchors.map((a, i) => (
        <LeafIndicator
          key={`leaf${i}`}
          position={[a.x, a.y, a.z]}
          active={active}
          phaseSeed={i}
        />
      ))}

      {leafAnchors.flatMap((a, i) =>
        spinePositions.map((s, j) => (
          <IBCable
            key={`up-${i}-${j}`}
            from={[a.x, a.y + 0.04, a.z]}
            to={[s.x, s.y - 0.1, s.z]}
            arc={0.15}
            radius={0.008}
            active={active}
          />
        )),
      )}

      {active && cableCurves.length > 0 ? (
        <FlowParticles
          curves={cableCurves}
          perCurve={Math.max(1, Math.round(2 * flowIntensity))}
          speed={0.55}
          color="#e8f4ff"
          size={0.055}
        />
      ) : null}
    </group>
  )
}

/** spine 交换机：12 颗端口 LED，active=true 时做 chase 闪烁 + 面板呼吸 */
function SpineSwitch({
  position,
  active,
  phaseSeed,
}: {
  position: [number, number, number]
  active: boolean
  phaseSeed: number
}) {
  const ledMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const panelMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const ledCount = 12
  const paused = useStory((s) => s.paused)

  useFrame(() => {
    if (!active || paused) return
    const t = performance.now() / 1000
    if (panelMatRef.current) {
      panelMatRef.current.emissiveIntensity =
        0.7 + 0.4 * Math.sin(t * 2.4 + phaseSeed)
    }
    for (let j = 0; j < ledCount; j++) {
      const mat = ledMatRefs.current[j]
      if (!mat) continue
      // chase 闪烁：每个 LED 错开相位，整体呈现 "数据扫过端口" 的效果
      const phase = (t * 4 + j * 0.55 + phaseSeed * 0.7) % 1.0
      mat.opacity = phase < 0.4 ? 1 : 0.18
    }
  })

  return (
    <group position={position}>
      <mesh material={M.chassis}>
        <boxGeometry args={[0.6, 0.18, 0.4]} />
      </mesh>
      {active ? (
        <mesh position={[0, 0, 0.21]}>
          <planeGeometry args={[0.55, 0.14]} />
          <meshStandardMaterial
            ref={panelMatRef}
            color="#2a4870"
            emissive="#6cb8ff"
            emissiveIntensity={0.85}
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      ) : (
        <mesh material={M.chassisDark} position={[0, 0, 0.21]}>
          <planeGeometry args={[0.55, 0.14]} />
        </mesh>
      )}
      {Array.from({ length: ledCount }).map((_, j) => (
        <mesh
          key={j}
          position={[-0.24 + (j / (ledCount - 1)) * 0.48, 0.06, 0.215]}
        >
          <boxGeometry args={[0.012, 0.006, 0.001]} />
          <meshBasicMaterial
            ref={(el) =>
              (ledMatRefs.current[j] = el as THREE.MeshBasicMaterial | null)
            }
            color="#8acaff"
            transparent
            opacity={active ? 1 : 0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

/** rack 顶部 leaf 指示灯：active=true 时呼吸脉冲 */
function LeafIndicator({
  position,
  active,
  phaseSeed,
}: {
  position: [number, number, number]
  active: boolean
  phaseSeed: number
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const paused = useStory((s) => s.paused)

  useFrame(() => {
    if (!active || paused || !matRef.current) return
    const t = performance.now() / 1000
    matRef.current.emissiveIntensity =
      0.85 + 0.5 * Math.sin(t * 3.5 + phaseSeed * 1.1)
  })

  return (
    <group position={position}>
      <mesh material={M.chassis}>
        <boxGeometry args={[0.5, 0.06, 0.3]} />
      </mesh>
      {active ? (
        <mesh position={[0, 0, 0.16]}>
          <planeGeometry args={[0.46, 0.04]} />
          <meshStandardMaterial
            ref={matRef}
            color="#2a4870"
            emissive="#6cb8ff"
            emissiveIntensity={0.85}
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      ) : (
        <mesh material={M.ledBlue} position={[0, 0, 0.16]}>
          <planeGeometry args={[0.46, 0.04]} />
        </mesh>
      )}
    </group>
  )
}

/** 给定 racks 的位置数组，生成 leaf anchors（在 rack 顶部）。 */
export function buildLeafAnchors(
  racks: { x: number; z: number }[],
  rackHeight: number,
): SpineLeafTopologyProps['leafAnchors'] {
  return racks.map((r) => ({
    x: r.x,
    y: rackHeight + 0.18,
    z: r.z,
  }))
}

/**
 * 根据当前 storyline / step 推导 IB 网络是否应该显示数据流动。
 *
 * 触发场景：
 *  - P1 spine_leaf 及之后的 step（IB 第一次被介绍）
 *  - 任意涉及 cross-rack 通信的 datacenter 层 storyline
 *    （t2 pipeline、t3 bubble、r1 failure recovery、i1 KV cache transfer 等）
 */
export function useIBActivity(): { active: boolean; intensity: number } {
  const storyId = useStory((s) => s.storyId)
  const stepIndex = useStory((s) => s.stepIndex)
  const layer = useStory((s) => s.layer)

  if (layer !== 'datacenter') return { active: false, intensity: 0 }
  if (!storyId) return { active: false, intensity: 0 }

  // P1 第一次展示 IB：在 spine_leaf step 才点亮
  if (storyId === 'p1_datacenter_overview') {
    const story = storylineById(storyId)
    const idx =
      story?.steps.findIndex((s) => s.id === 'spine_leaf') ?? -1
    if (idx < 0) return { active: false, intensity: 0 }
    if (stepIndex < idx) return { active: false, intensity: 0 }
    return { active: true, intensity: 1 }
  }

  // 涉及 cross-rack 通信的章节默认让 IB 处于"工作中"状态
  const crossRackStories = new Set([
    't1_training_iter',
    't2_pipeline_bubble',
    'i1_inference_lifecycle',
    'r1_failure_recovery',
  ])
  if (crossRackStories.has(storyId)) {
    return { active: true, intensity: 0.7 }
  }

  return { active: false, intensity: 0 }
}
