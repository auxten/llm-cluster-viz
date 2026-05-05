import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStepGate } from './useStepGate'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { useT } from '../i18n'

/**
 * P1 · 数据中心总览 (datacenter 层叠加)
 *
 * 4 step：
 *  0 establish      远景，强调"4 rack ≈ 288 GPU ≈ 480 kW"
 *  1 racks_light    镜头推近，4 个 rack 顶部依次绿色 LED 扫亮
 *  2 spine_leaf     镜头略上抬，IB spine + leaf cable 高亮，蓝色 IB 标签
 *  3 contrast       拉回远景，中央大字"NVLink 130 TB/s vs IB 3.2 TB/s · 40×"
 */

const RACK_DX = NVL72_DIM.width + 1.4
const RACK_XS = [-1.5, -0.5, 0.5, 1.5].map((i) => i * RACK_DX)

const CAM_VIEWS: Record<
  string,
  { position: [number, number, number]; lookAt: [number, number, number] }
> = {
  establish: { position: [0, 8, 18], lookAt: [0, 1.6, 0] },
  racks_light: { position: [0, 6, 13], lookAt: [0, 1.6, 0] },
  spine_leaf: { position: [3.2, 7, 13], lookAt: [0, 2.4, 0] },
  contrast: { position: [0, 8, 18], lookAt: [0, 1.6, 0] },
}

export function StorylineP1() {
  const gate = useStepGate('p1_datacenter_overview')
  const setTarget = useCamera((s) => s.setTarget)
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)
  const [t, setT] = useState(0)

  useFrame((_, dt) => {
    if (paused) return
    setT((p) => (p + dt * speed) % 6.0)
  })

  // step 切换时同步相机目标
  useEffect(() => {
    const view = CAM_VIEWS[gate.currentId]
    if (view) setTarget({ ...view, duration: 1.6 })
  }, [gate.currentId, setTarget])

  const isEstablish = gate.is('establish')
  const isRacksLight = gate.is('racks_light')
  const isSpineLeaf = gate.atOrAfter('spine_leaf')
  const isContrast = gate.is('contrast')

  return (
    <group>
      {/* step 1 racks_light: 每个 rack 顶上一道绿色 sweep ring */}
      {isRacksLight
        ? RACK_XS.map((x, i) => {
            const phase = (t - i * 0.4) % 2.0
            const alpha = phase >= 0 && phase <= 1.2 ? Math.sin(phase * Math.PI / 1.2) : 0
            return (
              <group key={i} position={[x, NVL72_DIM.height + 0.32, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.45, 0.6, 32]} />
                  <meshBasicMaterial
                    color="#a4ee27"
                    transparent
                    opacity={Math.max(0.15, alpha)}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            )
          })
        : null}

      {/* step 3 contrast: 在两个 rack 之间高亮一根 IB 链路 + NVLink "巨型 GPU" 光晕 */}
      {isContrast ? (
        <>
          {/* NVLink scale-up 域光晕：每个 rack 周围一圈淡绿色 */}
          {RACK_XS.map((x, i) => (
            <mesh
              key={`nvl-${i}`}
              position={[x, NVL72_DIM.height / 2, 0]}
              rotation={[0, 0, 0]}
            >
              <sphereGeometry args={[1.4, 16, 16]} />
              <meshBasicMaterial
                color="#a4ee27"
                transparent
                opacity={0.06 + 0.04 * Math.sin(t * 2)}
                depthWrite={false}
              />
            </mesh>
          ))}
        </>
      ) : null}

      {/* HTML overlay：远景信息卡 */}
      <Html
        position={[0, NVL72_DIM.height + 2.2, 0]}
        center
        pointerEvents="none"
        zIndexRange={[100, 0]}
      >
        <P1Overlay
          isEstablish={isEstablish}
          isRacksLight={isRacksLight}
          isSpineLeaf={isSpineLeaf && !isContrast}
          isContrast={isContrast}
        />
      </Html>
    </group>
  )
}

function P1Overlay({
  isEstablish,
  isRacksLight,
  isSpineLeaf,
  isContrast,
}: {
  isEstablish: boolean
  isRacksLight: boolean
  isSpineLeaf: boolean
  isContrast: boolean
}) {
  const t = useT()
  if (isContrast) {
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
          minWidth: 380,
          boxShadow: '0 10px 36px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-fg-mute)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            marginBottom: 8,
          }}
        >
          {t('p1.contrast.label')}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 18,
          }}
        >
          <span style={{ color: '#a4ee27', fontFamily: 'var(--font-mono)' }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>130</span>
            <span style={{ fontSize: 13, marginLeft: 4 }}>TB/s</span>
            <div style={{ fontSize: 12, color: 'var(--color-fg-mute)' }}>
              {t('p1.contrast.nvlSub')}
            </div>
          </span>
          <span
            style={{
              fontSize: 22,
              color: '#ffd966',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}
          >
            ÷ 40 =
          </span>
          <span style={{ color: '#6cb8ff', fontFamily: 'var(--font-mono)' }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>3.2</span>
            <span style={{ fontSize: 13, marginLeft: 4 }}>TB/s</span>
            <div style={{ fontSize: 12, color: 'var(--color-fg-mute)' }}>
              {t('p1.contrast.ibSub')}
            </div>
          </span>
        </div>
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid rgba(255, 255, 255, 0.16)',
            fontSize: 13,
            color: 'var(--color-fg-soft)',
          }}
        >
          {t('p1.contrast.note')}
        </div>
      </div>
    )
  }

  if (isSpineLeaf) {
    return (
      <Card title={t('p1.spineLeaf.title')} accent="#6cb8ff">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <Stat
            label={t('p1.spineLeaf.uplink')}
            value="4×8"
            unit={t('p1.spineLeaf.unitPorts')}
            color="#6cb8ff"
          />
          <Stat
            label={t('p1.spineLeaf.perPort')}
            value="400"
            unit="Gb/s"
            color="#6cb8ff"
          />
          <Stat
            label={t('p1.spineLeaf.total')}
            value="3.2"
            unit="TB/s"
            color="#6cb8ff"
          />
        </div>
      </Card>
    )
  }

  if (isRacksLight) {
    return (
      <Card title={t('p1.racksLight.title')} accent="#a4ee27">
        <div style={{ fontSize: 13, color: 'var(--color-fg-soft)' }}>
          {t('p1.racksLight.body')}
        </div>
      </Card>
    )
  }

  if (isEstablish) {
    return (
      <Card title={t('p1.establish.title')} accent="#c5cdd9">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <Stat
            label={t('p1.establish.racks')}
            value="4"
            unit={t('p1.establish.unitRacks')}
          />
          <Stat label={t('p1.establish.gpus')} value="288" unit="" />
          <Stat label={t('p1.establish.power')} value="~480" unit="kW" />
        </div>
      </Card>
    )
  }
  return null
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
        borderRadius: 12,
        padding: '12px 18px',
        color: '#f5f7fb',
        fontSize: 13,
        textAlign: 'left',
        minWidth: 380,
        boxShadow: '0 10px 36px rgba(0, 0, 0, 0.55)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          marginBottom: 8,
          opacity: 0.95,
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
  color?: string
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
          fontSize: 20,
          fontWeight: 600,
          color: color ?? 'var(--color-fg)',
          lineHeight: 1.2,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
        <span
          style={{
            fontSize: 12,
            color: 'var(--color-fg-mute)',
            marginLeft: 4,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  )
}

