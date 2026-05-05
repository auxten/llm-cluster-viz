import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { FlowParticles } from '../components/3d/flow/FlowParticles'
import { useStepGate } from './useStepGate'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { useT } from '../i18n'

/**
 * S4: Pipeline 跨 Rack (datacenter 层叠加)
 *
 * 视觉：
 *  - 4 个 NVL72 上各贴一个 PP 阶段标签
 *  - rack 之间用 IB cable 表示 micro-batch 流转
 *  - 比较 NVLink (rack 内) vs IB (rack 间) 带宽
 */

export function StorylineS4() {
  const gate = useStepGate('t2_pipeline_across_racks')
  const t = useT()

  // 新 step 顺序：cut_layers, forward_first, four_microbatches, bandwidth_contrast, why_pp_uses_ib
  const showCut = gate.atOrAfter('cut_layers')
  const showFlow = gate.atOrAfter('forward_first')
  const isFourMicrobatches = gate.atOrAfter('four_microbatches')
  const showCompare = gate.atOrAfter('bandwidth_contrast')
  const showWhyIb = gate.is('why_pp_uses_ib')

  // 4 个 rack 的 x 坐标（与 DatacenterScene 一致）
  const rackXs = useMemo(() => {
    const dx = NVL72_DIM.width + 1.4
    return [-1.5, -0.5, 0.5, 1.5].map((i) => i * dx)
  }, [])

  // 在 rack 之间画 PP 流转曲线
  const ppCurves = useMemo(() => {
    const curves: THREE.Curve<THREE.Vector3>[] = []
    for (let i = 0; i < rackXs.length - 1; i++) {
      const a = new THREE.Vector3(rackXs[i] + 0.2, NVL72_DIM.height * 0.6, 0)
      const b = new THREE.Vector3(rackXs[i + 1] - 0.2, NVL72_DIM.height * 0.6, 0)
      const mid = a.clone().add(b).multiplyScalar(0.5)
      mid.y += 0.7
      curves.push(new THREE.QuadraticBezierCurve3(a, mid, b))
    }
    return curves
  }, [rackXs])

  return (
    <group>
      {/* 在每个 rack 上方显示层切分标签 */}
      {showCut
        ? rackXs.map((x, i) => (
            <Html
              key={i}
              position={[x, NVL72_DIM.height + 0.45, 0]}
              center
              pointerEvents="none"
            >
              <div
                style={{
                  background: 'rgba(28, 34, 46, 0.88)',
                  border: '1px solid rgba(164, 238, 39, 0.5)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: 'var(--color-fg)',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              >
                <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                  PP{i}
                </div>
                <div
                  style={{
                    color: 'var(--color-fg-soft)',
                    marginTop: 2,
                    fontSize: 12,
                  }}
                >
                  {t('s4.layers')} {i * 16 + 1}–{(i + 1) * 16}
                </div>
              </div>
            </Html>
          ))
        : null}

      {/* PP 流转粒子：forward_first 只走 1 个 micro-batch；four_microbatches 后走 4 个并发 */}
      {showFlow ? (
        <FlowParticles
          curves={ppCurves}
          perCurve={isFourMicrobatches ? 4 : 1}
          speed={isFourMicrobatches ? 0.45 : 0.32}
          color="#6cb8ff"
          size={0.05}
        />
      ) : null}

      {/* 中央比较面板 */}
      {showCompare ? (
        <Html
          position={[0, NVL72_DIM.height + 1.7, 0]}
          center
          pointerEvents="none"
          zIndexRange={[100, 0]}
        >
          <div
            style={{
              background: 'rgba(36, 44, 60, 0.94)',
              backdropFilter: 'blur(14px) saturate(150%)',
              WebkitBackdropFilter: 'blur(14px) saturate(150%)',
              border: '1px solid rgba(108, 184, 255, 0.55)',
              borderRadius: 10,
              padding: '12px 16px',
              minWidth: 380,
              color: 'var(--color-fg)',
              fontSize: 12,
              lineHeight: 1.5,
              textAlign: 'left',
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
              }}
            >
              {t('s4.bw.title')}
            </div>
            <BandwidthRow
              label={t('s4.bw.nvlink')}
              valueLabel="~130 TB/s"
              fillPct={1.0}
              color="#a4ee27"
            />
            <BandwidthRow
              label={t('s4.bw.ib')}
              valueLabel="~3.2 TB/s"
              fillPct={3.2 / 130}
              color="#6cb8ff"
            />
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid rgba(255, 255, 255, 0.16)',
                color: 'var(--color-fg-soft)',
                fontSize: 13,
              }}
            >
              {t('s4.bw.ratio.before')} <strong style={{ color: '#ffd966' }}>40×</strong>
              {t('s4.bw.ratio.after')}
              {showWhyIb ? (
                <div
                  style={{
                    marginTop: 6,
                    padding: 6,
                    background: 'rgba(164, 238, 39, 0.12)',
                    border: '1px solid rgba(164, 238, 39, 0.4)',
                    borderRadius: 6,
                    color: '#dffaa8',
                  }}
                >
                  <strong style={{ color: '#a4ee27' }}>
                    {t('s4.whyIb.title')}
                  </strong>{' '}
                  {t('s4.whyIb.body')}
                </div>
              ) : null}
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  )
}

function BandwidthRow({
  label,
  valueLabel,
  fillPct,
  color,
}: {
  label: string
  valueLabel: string
  fillPct: number
  color: string
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          marginBottom: 3,
        }}
      >
        <span style={{ color: 'var(--color-fg-soft)' }}>{label}</span>
        <span style={{ color, fontFamily: 'var(--font-mono)' }}>
          {valueLabel}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${fillPct * 100}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}
