import { useEffect, useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStepGate } from './useStepGate'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import { NVL72_DIM, computeRackLayout } from '../components/3d/rack/NVL72Rack'
import { buildBackplaneCurves } from '../components/3d/rack/Backplane'
import { FlowParticles } from '../components/3d/flow/FlowParticles'
import { useT } from '../i18n'

/**
 * P2 · NVL72 解剖 (rack 层叠加)
 *
 * 5 step：
 *  0 zoom_in           平滑过渡到正面
 *  1 three_sections    上 9 / 中 9 / 下 9 三段依次绿色 sweep
 *  2 backplane         镜头绕到背面，背板 NVLink cable 用粒子流凸显
 *  3 cooling           回正面，左右两侧高亮液冷管路
 *  4 aggregate         整个 rack 包一圈绿色光晕 + 大字"130 TB/s"
 */

const RACK_W = NVL72_DIM.width
const RACK_H = NVL72_DIM.height
const RACK_D = NVL72_DIM.depth

const CAM_VIEWS: Record<
  string,
  { position: [number, number, number]; lookAt: [number, number, number] }
> = {
  zoom_in: { position: [2.4, 1.6, 2.6], lookAt: [0, RACK_H / 2, 0] },
  three_sections: { position: [2.4, 1.4, 2.6], lookAt: [0, RACK_H / 2, 0] },
  backplane: { position: [0, 1.6, -2.6], lookAt: [0, RACK_H / 2, 0] },
  cooling: { position: [2.4, 1.4, 2.6], lookAt: [0, RACK_H / 2, 0] },
  aggregate: { position: [2.8, 1.8, 3.0], lookAt: [0, RACK_H / 2, 0] },
}

// 三段对称排布的 y 中心：上 9 compute、中 9 NVSwitch、下 9 compute
const SECTION_HEIGHT = RACK_H / 3
const SECTION_CENTERS = [
  RACK_H - SECTION_HEIGHT / 2 - 0.18,
  RACK_H / 2,
  SECTION_HEIGHT / 2 + 0.18,
]

export function StorylineP2() {
  const gate = useStepGate('p2_nvl72_anatomy')
  const setTarget = useCamera((s) => s.setTarget)
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)
  const [t, setT] = useState(0)

  useFrame((_, dt) => {
    if (paused) return
    setT((p) => (p + dt * speed) % 6.0)
  })

  useEffect(() => {
    const view = CAM_VIEWS[gate.currentId]
    if (view) setTarget({ ...view, duration: 1.6 })
  }, [gate.currentId, setTarget])

  const isThreeSections = gate.is('three_sections')
  const isBackplane = gate.is('backplane')
  const isCooling = gate.is('cooling')
  const isAggregate = gate.is('aggregate')

  // backplane 步骤：复用 Backplane.tsx 真实电缆曲线，做"高亮 + 沿线流粒子"
  const backplane = useMemo(() => {
    const layout = computeRackLayout()
    const curves = buildBackplaneCurves({
      z: layout.backplaneZ,
      computeTrayYs: layout.computeTrayYs,
      nvswitchCenterY: layout.nvswitchCenterY,
      width: layout.backplaneWidth,
    })
    const tubeGeoms = curves.map(
      (c) => new THREE.TubeGeometry(c, 18, 0.022, 6, false),
    )
    return { curves, tubeGeoms, nvswitchCenterY: layout.nvswitchCenterY }
  }, [])

  useEffect(() => {
    return () => {
      backplane.tubeGeoms.forEach((g) => g.dispose())
    }
  }, [backplane])

  return (
    <group>
      {/* step 1: 三段 sweep 绿色高亮 */}
      {isThreeSections
        ? SECTION_CENTERS.map((y, i) => {
            const phase = (t - i * 0.5) % 2.4
            const alpha =
              phase >= 0 && phase <= 1.4
                ? 0.18 + 0.32 * Math.sin((phase * Math.PI) / 1.4)
                : 0.06
            return (
              <mesh key={i} position={[0, y, RACK_D / 2 + 0.02]}>
                <planeGeometry args={[RACK_W * 1.05, SECTION_HEIGHT * 0.94]} />
                <meshBasicMaterial
                  color="#a4ee27"
                  transparent
                  opacity={alpha}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )
          })
        : null}

      {/* step 2: 背板 NVLink cable —— 高亮真实电缆 + 沿曲线汇聚的数据流 */}
      {isBackplane ? (
        <>
          {/* 后挡板淡绿色辉光（标识"这是 spine 区"） */}
          <mesh position={[0, backplane.nvswitchCenterY, -RACK_D / 2 - 0.03]}>
            <planeGeometry args={[RACK_W * 0.98, RACK_H * 0.78]} />
            <meshBasicMaterial
              color="#a4ee27"
              transparent
              opacity={0.08 + 0.03 * Math.sin(t * 2)}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* 36 束 cable 高亮：套在真实 cable 之上，emissive 绿色 */}
          {backplane.tubeGeoms.map((geom, idx) => (
            <mesh key={idx} geometry={geom}>
              <meshBasicMaterial
                color="#a4ee27"
                transparent
                opacity={0.55}
                depthWrite={false}
              />
            </mesh>
          ))}

          {/* 数据流：沿曲线从 compute tray 汇聚到中部 NVSwitch */}
          <FlowParticles
            curves={backplane.curves}
            perCurve={4}
            speed={0.55}
            size={0.022}
            color="#dffaa8"
            emissive
          />
        </>
      ) : null}

      {/* step 3: 液冷管路高亮（左侧蓝、右侧红） */}
      {isCooling ? (
        <>
          <mesh
            position={[-RACK_W / 2 - 0.04, RACK_H / 2, -RACK_D / 2 + 0.05]}
          >
            <cylinderGeometry args={[0.04, 0.04, RACK_H * 0.85, 14]} />
            <meshBasicMaterial
              color="#6cb8ff"
              transparent
              opacity={0.55 + 0.25 * Math.sin(t * 4)}
            />
          </mesh>
          <mesh
            position={[RACK_W / 2 + 0.04, RACK_H / 2, -RACK_D / 2 + 0.05]}
          >
            <cylinderGeometry args={[0.04, 0.04, RACK_H * 0.85, 14]} />
            <meshBasicMaterial
              color="#ff7a7a"
              transparent
              opacity={0.55 + 0.25 * Math.sin(t * 4 + Math.PI)}
            />
          </mesh>
        </>
      ) : null}

      {/* step 4: 整个 rack 一圈光晕 */}
      {isAggregate ? (
        <mesh position={[0, RACK_H / 2, 0]}>
          <boxGeometry args={[RACK_W * 1.4, RACK_H * 1.1, RACK_D * 1.4]} />
          <meshBasicMaterial
            color="#a4ee27"
            transparent
            opacity={0.08 + 0.05 * Math.sin(t * 2)}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {/* HTML overlay：信息卡跟随 step 切换 */}
      <Html
        position={[0, RACK_H + 0.5, 0]}
        center
        pointerEvents="none"
        zIndexRange={[100, 0]}
      >
        <P2Overlay gateId={gate.currentId} />
      </Html>
    </group>
  )
}

function P2Overlay({ gateId }: { gateId: string }) {
  const t = useT()
  if (gateId === 'aggregate') {
    return (
      <div
        style={{
          background: 'rgba(36, 44, 60, 0.94)',
          backdropFilter: 'blur(14px) saturate(150%)',
          WebkitBackdropFilter: 'blur(14px) saturate(150%)',
          border: '1px solid rgba(164, 238, 39, 0.55)',
          borderRadius: 14,
          padding: '14px 22px',
          color: '#f5f7fb',
          fontSize: 12,
          textAlign: 'center',
          minWidth: 320,
          boxShadow: '0 10px 36px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-fg-mute)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            marginBottom: 6,
          }}
        >
          {t('p2.aggregate.label')}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 32,
            color: '#a4ee27',
            fontWeight: 700,
          }}
        >
          {t('p2.aggregate.banner')}
        </div>
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
            fontSize: 13,
            color: 'var(--color-fg-soft)',
          }}
        >
          {t('p2.aggregate.note')}
        </div>
      </div>
    )
  }

  const map: Record<
    string,
    { title: string; accent: string; lines: { label: string; value: string }[] }
  > = {
    zoom_in: {
      title: t('p2.zoom_in.title'),
      accent: '#c5cdd9',
      lines: [
        { label: t('p2.zoom_in.model'), value: 'GB200 NVL72' },
        { label: t('p2.zoom_in.height'), value: '~2.13 m' },
        { label: t('p2.zoom_in.power'), value: '~120 kW' },
      ],
    },
    three_sections: {
      title: t('p2.three_sections.title'),
      accent: '#a4ee27',
      lines: [
        { label: t('p2.three_sections.top'), value: '9 compute' },
        { label: t('p2.three_sections.mid'), value: '9 NVSwitch' },
        { label: t('p2.three_sections.bot'), value: '9 compute' },
      ],
    },
    backplane: {
      title: t('p2.backplane.title'),
      accent: '#a4ee27',
      lines: [
        { label: t('p2.backplane.totalLength'), value: '~3 km' },
        { label: t('p2.backplane.weight'), value: '~50 kg' },
        { label: t('p2.backplane.position'), value: t('p2.backplane.posValue') },
      ],
    },
    cooling: {
      title: t('p2.cooling.title'),
      accent: '#6cb8ff',
      lines: [
        { label: t('p2.cooling.cold'), value: t('p2.cooling.coldValue') },
        { label: t('p2.cooling.hot'), value: t('p2.cooling.hotValue') },
        { label: t('p2.cooling.power'), value: '120 kW @ liquid' },
      ],
    },
  }

  const v = map[gateId]
  if (!v) return null
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: `1px solid ${v.accent}55`,
        borderRadius: 12,
        padding: '12px 18px',
        color: '#f5f7fb',
        fontSize: 12,
        textAlign: 'left',
        minWidth: 320,
        boxShadow: '0 10px 36px rgba(0, 0, 0, 0.55)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: v.accent,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          marginBottom: 8,
          opacity: 0.95,
        }}
      >
        {v.title}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {v.lines.map((l) => (
          <div key={l.label}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-fg-mute)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {l.label}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-fg)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              {l.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
