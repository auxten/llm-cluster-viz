import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useStory } from '../state/storyStore'
import { useStepGate } from './useStepGate'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { Math as Mat } from '../ui/Math'
import { useT } from '../i18n'

/**
 * S2: 每 20ms 发一班车 (rack 层叠加)
 *
 * 视觉：
 *  - rack 顶部出现一个"发车计时器"（HTML overlay）
 *  - 每 20ms（受 store.speed 影响）触发一次发车，UI 上的 "Now departing" 闪烁
 *  - 同时显示当前 batch 占用情况（bar）
 *  - 步骤：
 *      0. low batch：cost 极高
 *      1. sweet spot：~2400 tokens
 *      2. depart：到点必发，等不到上车的等下一班
 */

export function StorylineS2() {
  const gate = useStepGate('i2_20ms_batch')
  const paused = useStory((s) => s.paused)
  const speedMult = useStory((s) => s.speed)
  const [phase, setPhase] = useState(0)
  const [departCount, setDepartCount] = useState(0)
  const accumRef = useRef(0)
  const lastRef = useRef<number | null>(null)

  // 新 step 顺序：idle_low_batch, fill, sweet_spot, depart, latency
  const batchFillTarget = gate.is('idle_low_batch')
    ? 0.05
    : gate.is('fill')
      ? 0.55
      : gate.is('sweet_spot')
        ? 0.92
        : 0.7

  const [batchFill, setBatchFill] = useState(batchFillTarget)
  const t = useT()
  useEffect(() => {
    setBatchFill(batchFillTarget)
  }, [batchFillTarget])

  // 每 20ms (sim) 触发一次发车
  useFrame(() => {
    if (paused) {
      lastRef.current = null
      return
    }
    const now = performance.now()
    if (lastRef.current == null) lastRef.current = now
    const dt = (now - lastRef.current) / 1000
    lastRef.current = now
    accumRef.current += dt * speedMult
    // 加速 100x，从 20ms 真实 → 0.2s 显示一班
    const period = 0.2
    while (accumRef.current >= period) {
      accumRef.current -= period
      setDepartCount((c) => c + 1)
      setPhase((p) => 1 - p)
    }
  })

  // 在 rack 顶部 overlay 一个 HTML 面板
  return (
    <group>
      <Html
        position={[-1.6, NVL72_DIM.height * 0.82, 0]}
        center
        pointerEvents="none"
        zIndexRange={[100, 0]}
      >
        <div
          style={{
            background: 'rgba(36, 44, 60, 0.92)',
            backdropFilter: 'blur(14px) saturate(150%)',
            WebkitBackdropFilter: 'blur(14px) saturate(150%)',
            border: '1px solid rgba(164, 238, 39, 0.45)',
            borderRadius: 10,
            padding: '8px 12px',
            minWidth: 380,
            color: 'var(--color-fg)',
            fontSize: 13,
            lineHeight: 1.4,
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
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
            }}
          >
            <span>{t('s2.timetable')}</span>
            <span style={{ color: 'var(--color-accent)' }}>
              #{departCount.toString().padStart(4, '0')}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                color: phase === 1 ? '#a4ee27' : 'var(--color-fg-mute)',
                fontWeight: 600,
                transition: 'color 0.15s',
              }}
            >
              {phase === 1 ? `◉ ${t('s2.departing')}` : `○ ${t('s2.next')}`}
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-fg-mute)',
                marginBottom: 2,
              }}
            >
              {t('s2.capacity')}
            </div>
            <div
              style={{
                position: 'relative',
                height: 8,
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${batchFill * 100}%`,
                  background:
                    batchFill < 0.3
                      ? 'linear-gradient(90deg, #ff7a7a, #ffc56b)'
                      : batchFill < 0.7
                        ? 'linear-gradient(90deg, #ffc56b, #c8ff5a)'
                        : 'linear-gradient(90deg, #a4ee27, #c8ff5a)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-fg-mute)',
                marginTop: 4,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{Math.round(batchFill * 2400)} {t('s2.tokensUnit')}</span>
              <span>
                {t('s2.costPerToken')}{' '}
                <strong style={{ color: 'var(--color-fg)' }}>
                  {(1 / Math.max(0.05, batchFill)).toFixed(1)}×
                </strong>
              </span>
            </div>
          </div>
          {gate.is('sweet_spot') ? (
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid rgba(255, 255, 255, 0.16)',
                fontSize: 13,
              }}
            >
              <Mat
                tex={String.raw`B^* \approx \frac{\text{FLOPs}}{\text{HBM BW}} \cdot s = 300 \times 8`}
              />
            </div>
          ) : null}
          {gate.is('depart') ? (
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid rgba(255, 255, 255, 0.16)',
                fontSize: 13,
                color: 'var(--color-fg-soft)',
              }}
            >
              {t('s2.depart.body1')}
              <br />
              <span style={{ color: 'var(--color-fg-mute)' }}>
                {t('s2.depart.body2')}
              </span>
            </div>
          ) : null}
          {gate.is('latency') ? (
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid rgba(255, 122, 122, 0.35)',
                fontSize: 13,
                color: '#ffd0d0',
                background: 'rgba(255, 122, 122, 0.12)',
                marginLeft: -12,
                marginRight: -12,
                paddingLeft: 12,
                paddingRight: 12,
                marginBottom: -8,
                paddingBottom: 8,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
              }}
            >
              {t('s2.latency.body1')}
              <strong style={{ color: '#ff7a7a', marginLeft: 4 }}>
                40ms latency
              </strong>
              <br />
              <span style={{ color: 'var(--color-fg-mute)' }}>
                {t('s2.latency.body2')}
              </span>
            </div>
          ) : null}
        </div>
      </Html>
    </group>
  )
}
