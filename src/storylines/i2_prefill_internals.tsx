import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useStepGate } from './useStepGate'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { TensorBlock } from '../components/3d/tensor/TensorBlock'
import { useT } from '../i18n'

/**
 * I2 · Prefill 内部 (rack 层)
 *
 * 5 step：prompt_in → parallel_attention → kv_accumulate → first_token → why_compute_bound
 *
 * 视觉以 HTML overlay + 简单 TensorBlock 拼装为主，
 * 把 prefill 阶段"长 prompt 一次算所有 token"的特征讲清楚。
 */

const CAM_VIEW: { position: [number, number, number]; lookAt: [number, number, number] } = {
  // Keep top overlays inside viewport on narrower heights.
  position: [0, NVL72_DIM.height + 0.5, 5.4],
  lookAt: [0, NVL72_DIM.height * 0.62, 0],
}

export function StorylineI2() {
  const gate = useStepGate('i2_prefill_internals')
  const setTarget = useCamera((s) => s.setTarget)
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)
  const [t, setT] = useState(0)

  useFrame((_, dt) => {
    if (paused) return
    setT((p) => (p + dt * speed) % 1000)
  })

  useEffect(() => {
    setTarget({ ...CAM_VIEW, duration: 1.4 })
  }, [setTarget])

  return (
    <group>
      {gate.is('prompt_in') ? <PromptInOverlay /> : null}
      {gate.is('parallel_attention') ? <ParallelAttentionOverlay t={t} /> : null}
      {gate.is('kv_accumulate') ? <KvAccumulateOverlay t={t} /> : null}
      {gate.is('first_token') ? <FirstTokenOverlay t={t} /> : null}
      {gate.is('why_compute_bound') ? <WhyComputeBoundOverlay /> : null}
    </group>
  )
}

function PromptInOverlay() {
  const tt = useT()
  return (
    <Html position={[0, NVL72_DIM.height + 0.4, 0]} center pointerEvents="none">
      <Card title={tt('i2.prompt.title')} accent="#ffd966" minW={460}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#ffd966',
                fontFamily: 'var(--font-mono)',
                marginBottom: 3,
              }}
            >
              input ids [1, L=4096]
            </div>
            <div style={{ display: 'flex', gap: 1 }}>
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    background: 'rgba(255, 217, 102, 0.30)',
                    border: '1px solid rgba(255, 217, 102, 0.7)',
                    borderRadius: 1,
                  }}
                />
              ))}
              <div
                style={{
                  marginLeft: 4,
                  fontSize: 11,
                  color: 'var(--color-fg-mute)',
                  alignSelf: 'center',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                … × 4096
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-fg-soft)' }}>
          {tt('i2.prompt.body1')}
          <br />
          <span style={{ color: '#ffd966' }}>{tt('i2.prompt.body2')}</span>
        </div>
      </Card>
    </Html>
  )
}

function ParallelAttentionOverlay({ t }: { t: number }) {
  // 一个 4096 长的脉冲条，模拟"所有位置同时算"
  const phase = (t * 1.5) % 1
  const tt = useT()
  return (
    <Html position={[0, NVL72_DIM.height + 0.4, 0]} center pointerEvents="none">
      <Card title={tt('i2.parallel.title')} accent="#a4ee27" minW={460}>
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 11,
              color: '#a4ee27',
              fontFamily: 'var(--font-mono)',
              marginBottom: 3,
            }}
          >
            for pos in [0, L): Q[pos], K[pos], V[pos] = X[pos] @ W_qkv
          </div>
          <div
            style={{
              position: 'relative',
              height: 14,
              background: 'rgba(255, 217, 102, 0.10)',
              border: '1px solid rgba(255, 217, 102, 0.4)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${phase * 100}%`,
                background:
                  'linear-gradient(90deg, rgba(164, 238, 39, 0.7), rgba(255, 217, 102, 0.85))',
                transition: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                textShadow: '0 0 4px rgba(0,0,0,0.7)',
              }}
            >
              {tt('i2.parallel.barLabel')}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-fg-soft)' }}>
          {tt('i2.parallel.body1')}
          <br />
          <span style={{ color: '#a4ee27' }}>{tt('i2.parallel.body2')}</span>
          {tt('i2.parallel.body3')}
        </div>
      </Card>
    </Html>
  )
}

function KvAccumulateOverlay({ t }: { t: number }) {
  // KV 块从 attention 写入 HBM 的视觉
  const layers = 6
  const tt = useT()
  return (
    <group>
      {Array.from({ length: layers }).map((_, i) => {
        const phase = (t * 0.4 - i * 0.12 + 1) % 1
        return (
          <TensorBlock
            key={i}
            position={[(-(layers - 1) / 2 + i) * 0.4, NVL72_DIM.height + 0.5, 0]}
            role="kv_cache"
            label={`L${i * 10}`}
            shape="K, V"
            size={[0.18, 0.04, 0.18]}
            pulse={0.4 + phase * 0.6}
          />
        )
      })}
      <Html
        position={[0, NVL72_DIM.height + 0.65, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i2.kvAccum.title')} accent="#ffaa55" minW={420}>
          <div style={{ fontSize: 11, color: 'var(--color-fg-soft)' }}>
            {tt('i2.kvAccum.body1')}
            <br />
            {tt('i2.kvAccum.body2')}{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffaa55' }}>[L, 2, n_layer, n_head, d_head]</span>
            <br />
            <span style={{ color: 'var(--color-fg-mute)', fontSize: 10 }}>
              4K context · n_layer=61 · n_head=128 · d_head=128 · fp16 ≈ 50 MB / req
            </span>
          </div>
        </Card>
      </Html>
    </group>
  )
}

function FirstTokenOverlay({ t }: { t: number }) {
  const tt = useT()
  return (
    <group>
      <TensorBlock
        position={[0.5, NVL72_DIM.height + 0.5, 0]}
        role="token"
        label={tt('i1.nextTokenLabel')}
        shape="[1]"
        size={[0.08, 0.05, 0.08]}
        pulse={0.95 + 0.05 * Math.sin(t * 4)}
      />
      <TensorBlock
        position={[-0.3, NVL72_DIM.height + 0.5, 0]}
        role="kv_cache"
        label={tt('i1.kvLabel')}
        shape={tt('i2.firstToken.kvShape')}
        size={[0.16, 0.06, 0.16]}
      />
      <Html
        position={[0, NVL72_DIM.height + 0.68, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i2.firstToken.title')} accent="#ffd966" minW={420}>
          <div style={{ fontSize: 11, color: 'var(--color-fg-soft)' }}>
            {tt('i2.firstToken.body1')}
            <br />
            <span style={{ color: '#ffaa55' }}>{tt('i2.firstToken.body2')}</span>
          </div>
        </Card>
      </Html>
    </group>
  )
}

function WhyComputeBoundOverlay() {
  const tt = useT()
  return (
    <Html position={[0, NVL72_DIM.height + 0.5, 0]} center pointerEvents="none">
      <Card title={tt('i2.why.title')} accent="#a4ee27" minW={520}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 8,
          }}
        >
          <div
            style={{
              padding: 10,
              border: '1px solid rgba(255, 122, 122, 0.4)',
              borderRadius: 6,
              background: 'rgba(255, 122, 122, 0.08)',
            }}
          >
            <div style={{ fontSize: 12, color: '#ff7a7a', marginBottom: 4 }}>
              {tt('i2.why.decode.label')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-fg-soft)', fontFamily: 'var(--font-mono)' }}>
              X [1, h] @ W [h, h]
              <br />
              FLOPs = 2 · h²
              <br />
              Mem = h² {tt('i2.why.decode.memNote')}
              <br />
              <span style={{ color: '#ff7a7a' }}>arith intensity ≈ 2</span>
            </div>
            <div style={{ fontSize: 12, color: '#ff7a7a', marginTop: 6 }}>
              {tt('i2.why.decode.bound')}
            </div>
          </div>
          <div
            style={{
              padding: 10,
              border: '1px solid rgba(164, 238, 39, 0.4)',
              borderRadius: 6,
              background: 'rgba(164, 238, 39, 0.08)',
            }}
          >
            <div style={{ fontSize: 12, color: '#a4ee27', marginBottom: 4 }}>
              {tt('i2.why.prefill.label')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-fg-soft)', fontFamily: 'var(--font-mono)' }}>
              X [L, h] @ W [h, h]
              <br />
              FLOPs = 2 · L · h²
              <br />
              Mem = h² {tt('i2.why.prefill.memNote')}
              <br />
              <span style={{ color: '#a4ee27' }}>arith intensity ≈ 2L = 8192</span>
            </div>
            <div style={{ fontSize: 12, color: '#a4ee27', marginTop: 6 }}>
              {tt('i2.why.prefill.bound')}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--color-fg-soft)',
            fontStyle: 'italic',
          }}
        >
          {tt('i2.why.summary1')}
          <br />
          {tt('i2.why.summary2.before')}{' '}
          <span style={{ color: '#a4ee27' }}>{tt('i2.why.flops')}</span>{' '}
          {tt('i2.why.summary2.middle')}{' '}
          <span style={{ color: '#ffd966' }}>{tt('i2.why.hbm')}</span>
          {tt('i2.why.summary2.after')}
        </div>
      </Card>
    </Html>
  )
}

function Card({
  title,
  accent,
  children,
  minW = 240,
}: {
  title: string
  accent: string
  children: React.ReactNode
  minW?: number
}) {
  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: `1px solid ${accent}55`,
        borderRadius: 10,
        padding: '8px 14px',
        color: '#f5f7fb',
        fontSize: 13,
        minWidth: minW,
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: 4,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
