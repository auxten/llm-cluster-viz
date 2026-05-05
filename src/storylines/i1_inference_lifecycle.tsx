import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useStepGate } from './useStepGate'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { TensorBlock, TensorArrow } from '../components/3d/tensor/TensorBlock'
import { useT } from '../i18n'

/**
 * I1 · 一次推理请求的完整生命周期 (datacenter 层)
 *
 * 把 4 个 rack 角色化：
 *   rack0 (PrefillA), rack1 (PrefillB) — compute-bound
 *   rack2 (DecodeA),  rack3 (DecodeB)  — memory-bound
 *
 * 主线 8 step：
 *   user_request → router_dispatch → prefix_cache_hit → prefill_compute
 *   → kv_emit → kv_transfer → decode_join → stream_back
 */

const RACK_DX = NVL72_DIM.width + 1.4
const RACK_XS = [-1.5, -0.5, 0.5, 1.5].map((i) => i * RACK_DX)

// Role 标签使用翻译 key，下方在渲染时通过 t() 解析
const ROLE_KEYS = ['i1.role.prefillA', 'i1.role.prefillB', 'i1.role.decodeA', 'i1.role.decodeB']
const ROLE_COLORS = ['#a4ee27', '#a4ee27', '#ffd966', '#ffd966']

const CAM_VIEWS: Record<
  string,
  { position: [number, number, number]; lookAt: [number, number, number] }
> = {
  user_request: { position: [-6, 5, 12], lookAt: [-3.5, 1.6, 0] },
  router_dispatch: { position: [-3.5, 4.5, 10], lookAt: [-2, 1.6, 0] },
  prefix_cache_hit: { position: [-3, 4, 7], lookAt: [-2.4, 1.6, 0] },
  prefill_compute: { position: [-3, 3.6, 6], lookAt: [-2.4, 1.6, 0] },
  kv_emit: { position: [-1.5, 4.5, 8], lookAt: [-1.4, 1.8, 0] },
  kv_transfer: { position: [0, 5.5, 12], lookAt: [0, 2, 0] },
  decode_join: { position: [3, 4, 7], lookAt: [2.4, 1.6, 0] },
  stream_back: { position: [4, 4.5, 10], lookAt: [3, 1.6, 0] },
}

export function StorylineI1() {
  const gate = useStepGate('i1_inference_lifecycle')
  const setTarget = useCamera((s) => s.setTarget)
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)
  const [t, setT] = useState(0)
  const tt = useT()

  useFrame((_, dt) => {
    if (paused) return
    setT((p) => (p + dt * speed) % 1000)
  })

  useEffect(() => {
    const view = CAM_VIEWS[gate.currentId]
    if (view) setTarget({ ...view, duration: 1.6 })
  }, [gate.currentId, setTarget])

  return (
    <group>
      {/* 始终显示 4 个 rack 的角色标签 */}
      {RACK_XS.map((x, i) => (
        <Html
          key={i}
          position={[x, NVL72_DIM.height + 0.25, 0]}
          center
          pointerEvents="none"
        >
          <RackRoleTag
            label={tt(ROLE_KEYS[i])}
            color={ROLE_COLORS[i]}
            active={isRackActive(gate.currentId, i)}
          />
        </Html>
      ))}

      {/* User → API Router 动画 */}
      {gate.is('user_request') ? (
        <UserRequestAnim t={t} />
      ) : null}

      {gate.is('router_dispatch') ? (
        <RouterDispatchAnim t={t} />
      ) : null}

      {gate.is('prefix_cache_hit') ? (
        <PrefixCacheHitAnim rackX={RACK_XS[0]} t={t} />
      ) : null}

      {gate.is('prefill_compute') ? (
        <PrefillComputeAnim rackX={RACK_XS[0]} t={t} />
      ) : null}

      {gate.is('kv_emit') ? (
        <KvEmitAnim rackX={RACK_XS[0]} t={t} />
      ) : null}

      {gate.is('kv_transfer') ? (
        <KvTransferAnim t={t} />
      ) : null}

      {gate.is('decode_join') ? (
        <DecodeJoinAnim rackX={RACK_XS[2]} t={t} />
      ) : null}

      {gate.is('stream_back') ? (
        <StreamBackAnim rackX={RACK_XS[2]} t={t} />
      ) : null}
    </group>
  )
}

function isRackActive(stepId: string, rackIdx: number): boolean {
  if (stepId === 'router_dispatch' && rackIdx === 0) return true
  if (
    (stepId === 'prefix_cache_hit' ||
      stepId === 'prefill_compute' ||
      stepId === 'kv_emit') &&
    rackIdx === 0
  )
    return true
  if (
    stepId === 'kv_transfer' &&
    (rackIdx === 0 || rackIdx === 2)
  )
    return true
  if (
    (stepId === 'decode_join' || stepId === 'stream_back') &&
    rackIdx === 2
  )
    return true
  return false
}

function RackRoleTag({
  label,
  color,
  active,
}: {
  label: string
  color: string
  active: boolean
}) {
  return (
    <div
      style={{
        background: active ? `${color}28` : 'rgba(28, 34, 46, 0.85)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.18)'}`,
        borderRadius: 5,
        padding: '2px 7px',
        fontSize: 9.5,
        color: active ? color : 'var(--color-fg-soft)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        textShadow: active ? `0 0 8px ${color}55` : 'none',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        opacity: active ? 1 : 0.6,
      }}
    >
      {label}
    </div>
  )
}

function UserRequestAnim({ t }: { t: number }) {
  const p = (t * 0.5) % 1
  const tt = useT()
  return (
    <group>
      {/* User icon */}
      <Html position={[-7, 1.6, 0]} center pointerEvents="none">
        <div
          style={{
            background: 'rgba(28, 34, 46, 0.92)',
            border: '1px solid rgba(108, 184, 255, 0.55)',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#cfe6ff',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            minWidth: 140,
          }}
        >
          <div style={{ color: '#6cb8ff', fontSize: 12, marginBottom: 4 }}>
            {tt('i1.user.label')}
          </div>
          {tt('i1.user.prompt')}
          <div style={{ fontSize: 11, color: 'var(--color-fg-mute)', marginTop: 4 }}>
            POST /v1/chat/completions
          </div>
        </div>
      </Html>
      {/* API Router icon */}
      <Html position={[-4.5, 1.6, 0]} center pointerEvents="none">
        <div
          style={{
            background: 'rgba(255, 170, 85, 0.18)',
            border: '1px solid rgba(255, 170, 85, 0.55)',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#ffaa55',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          API Router
          <div style={{ fontSize: 11, color: 'var(--color-fg-mute)', marginTop: 2 }}>
            {tt('i1.router.queue')}
          </div>
        </div>
      </Html>
      <TensorArrow
        from={[-6.4, 1.6, 0]}
        to={[-5.1, 1.6, 0]}
        role="token"
        label={tt('i1.arrow.prompt')}
        progress={p}
        size={[0.06, 0.03, 0.06]}
      />
    </group>
  )
}

function RouterDispatchAnim({ t }: { t: number }) {
  const p = (t * 0.5) % 1
  const tt = useT()
  return (
    <group>
      <Html position={[-4.5, 1.6, 0]} center pointerEvents="none">
        <div
          style={{
            background: 'rgba(255, 170, 85, 0.18)',
            border: '1px solid rgba(255, 170, 85, 0.7)',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#ffaa55',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            boxShadow: '0 0 18px rgba(255, 170, 85, 0.4)',
          }}
        >
          API Router
          <div style={{ fontSize: 11, color: 'var(--color-fg-soft)', marginTop: 2 }}>
            {tt('i1.router.choose')}
            <br />
            req_id = 0xA731
          </div>
        </div>
      </Html>
      <TensorArrow
        from={[-4.0, 1.6, 0]}
        to={[RACK_XS[0] - 0.4, 1.6, 0]}
        role="token"
        label={tt('i1.arrow.dispatch')}
        progress={p}
        size={[0.07, 0.03, 0.07]}
      />
      <Html
        position={[-2, NVL72_DIM.height + 1.0, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i1.dispatch.title')} accent="#ffaa55">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('i1.dispatch.body')}
          </div>
        </Card>
      </Html>
    </group>
  )
}

function PrefixCacheHitAnim({ rackX, t }: { rackX: number; t: number }) {
  // 在 rack 上方画一行 token cell，前 N 个染蓝（命中 prefix cache）
  const total = 24
  const hit = 16
  const baseX = rackX - (total * 0.05) / 2
  const baseY = NVL72_DIM.height + 0.5
  const tt = useT()
  return (
    <group>
      {Array.from({ length: total }).map((_, i) => {
        const isHit = i < hit
        const flash = isHit ? 0.6 + 0.4 * Math.sin(t * 3 + i * 0.2) : 0.7
        return (
          <mesh key={i} position={[baseX + i * 0.05, baseY, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.04]} />
            <meshBasicMaterial
              color={isHit ? '#6cb8ff' : '#ffd966'}
              transparent
              opacity={flash}
            />
          </mesh>
        )
      })}
      <Html
        position={[rackX, baseY + 0.4, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i1.prefix.title')} accent="#6cb8ff">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('i1.prefix.body1.before')}{' '}
            <span style={{ color: '#6cb8ff', fontFamily: 'var(--font-mono)' }}>{hit}</span>{' '}
            {tt('i1.prefix.body1.after')}
            <br />
            {tt('i1.prefix.body2.before')}{' '}
            <span style={{ color: '#ffd966', fontFamily: 'var(--font-mono)' }}>{total - hit}</span>{' '}
            {tt('i1.prefix.body2.after')}
          </div>
        </Card>
      </Html>
    </group>
  )
}

function PrefillComputeAnim({ rackX, t }: { rackX: number; t: number }) {
  // 在 rack 内部模拟矩阵乘法满载：4 个 layer 每层一次 X @ W = Y 大块
  const baseY = NVL72_DIM.height * 0.55
  const tt = useT()
  return (
    <group>
      {[0, 1, 2, 3].map((i) => {
        const phase = (t * 0.6 - i * 0.18 + 1) % 1
        const flash = phase < 0.3 ? 1 : phase < 0.6 ? 0.7 : 0.4
        return (
          <group key={i} position={[rackX, baseY + i * 0.18, 0]}>
            <mesh>
              <boxGeometry args={[0.18, 0.05, 0.05]} />
              <meshBasicMaterial color="#ffd966" transparent opacity={flash} />
            </mesh>
            <mesh position={[0.13, 0, 0]}>
              <boxGeometry args={[0.05, 0.05, 0.05]} />
              <meshBasicMaterial color="#a4ee27" transparent opacity={flash} />
            </mesh>
          </group>
        )
      })}
      <Html
        position={[rackX, NVL72_DIM.height + 0.7, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i1.prefill.title')} accent="#a4ee27">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('i1.prefill.body1')}
            <br />
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#ffd966' }}>X [4096, h]</span> @{' '}
              <span style={{ color: '#a4ee27' }}>W [h, h]</span>
            </span>
            <br />
            <span style={{ color: 'var(--color-fg-mute)' }}>
              {tt('i1.prefill.body2')}
            </span>
          </div>
        </Card>
      </Html>
    </group>
  )
}

function KvEmitAnim({ rackX, t }: { rackX: number; t: number }) {
  const tt = useT()
  return (
    <group>
      <TensorBlock
        position={[rackX + 0.3, NVL72_DIM.height * 0.7, 0]}
        role="kv_cache"
        label={tt('i1.kvLabel')}
        shape="[L, 2, n_layer, n_head, d_head]"
        size={[0.16, 0.08, 0.16]}
        pulse={0.7}
      />
      <TensorBlock
        position={[rackX + 0.55, NVL72_DIM.height * 0.7, 0]}
        role="token"
        label={tt('i1.nextTokenLabel')}
        shape="[1]"
        size={[0.06, 0.04, 0.06]}
        pulse={0.9 + 0.1 * Math.sin(t * 4)}
      />
      <Html
        position={[rackX, NVL72_DIM.height + 1.2, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i1.kvEmit.title')} accent="#ffaa55">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('i1.kvEmit.intro')}
            <br />
            1. <span style={{ color: '#ffaa55' }}>{tt('i1.kvLabel')}</span>{' '}
            {tt('i1.kvEmit.kvDesc')}
            <br />
            2. <span style={{ color: '#ffd966' }}>{tt('i1.kvEmit.firstToken')}</span>{' '}
            {tt('i1.kvEmit.firstTokenDesc')}
          </div>
        </Card>
      </Html>
    </group>
  )
}

function KvTransferAnim({ t }: { t: number }) {
  // KV cache 块从 rack0 飞到 rack2
  const p = (t * 0.4) % 1
  const tt = useT()
  return (
    <group>
      <TensorArrow
        from={[RACK_XS[0] + 0.2, NVL72_DIM.height * 0.7, 0]}
        to={[RACK_XS[2] - 0.2, NVL72_DIM.height * 0.7, 0]}
        role="kv_cache"
        label={tt('i1.kvLabel')}
        shape="~50 MB / req"
        progress={p}
        size={[0.18, 0.08, 0.18]}
      />
      <Html
        position={[0, NVL72_DIM.height + 1.4, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i1.kvTransfer.title')} accent="#ffaa55">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('i1.kvTransfer.body1.before')}{' '}
            <span style={{ color: '#6cb8ff' }}>InfiniBand 3.2 TB/s</span>{' '}
            {tt('i1.kvTransfer.body1.after')}
            <br />
            <span style={{ color: 'var(--color-fg-mute)' }}>
              {tt('i1.kvTransfer.body2')}
            </span>
          </div>
        </Card>
      </Html>
    </group>
  )
}

function DecodeJoinAnim({ rackX, t }: { rackX: number; t: number }) {
  // 在 rack2 顶部画一个 batch matrix 简化版：8 行 token，新加入的高亮橙色
  const rows = 8
  const baseY = NVL72_DIM.height + 0.4
  const tt = useT()
  return (
    <group>
      {Array.from({ length: rows }).map((_, i) => {
        const isNew = i === rows - 1
        const flash = isNew ? 0.7 + 0.3 * Math.sin(t * 4) : 0.55
        const color = isNew ? '#ffaa55' : '#ffd966'
        return (
          <group key={i}>
            {Array.from({ length: 8 }).map((__, c) => (
              <mesh
                key={c}
                position={[rackX - 0.2 + c * 0.05, baseY + i * 0.04, 0]}
              >
                <boxGeometry args={[0.04, 0.025, 0.04]} />
                <meshBasicMaterial color={color} transparent opacity={flash} />
              </mesh>
            ))}
          </group>
        )
      })}
      <Html
        position={[rackX, baseY + rows * 0.05 + 0.18, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i1.decodeJoin.title')} accent="#ffaa55">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('i1.decodeJoin.body1')}
            <br />
            {tt('i1.decodeJoin.body2')}
          </div>
        </Card>
      </Html>
    </group>
  )
}

function StreamBackAnim({ rackX, t }: { rackX: number; t: number }) {
  // 每一拍弹出一个 token 块从 decode rack 飞回 user
  const numTokens = 6
  const tt = useT()
  const paused = useStory((s) => s.paused)
  const speed = useStory((s) => s.speed)

  // Track elapsed time since this step mounted for the typewriter effect
  const elapsedRef = useRef(0)
  const [visibleChars, setVisibleChars] = useState(0)
  const body = tt('i1.sseBody')
  const CHARS_PER_SEC = 14

  useFrame((_, dt) => {
    if (paused) return
    elapsedRef.current += dt * speed
    const next = Math.min(body.length, Math.floor(elapsedRef.current * CHARS_PER_SEC))
    setVisibleChars(next)
  })

  return (
    <group>
      {Array.from({ length: numTokens }).map((_, i) => {
        const phase = (t * 0.55 - i * 0.13 + 2) % 1
        return (
          <TensorArrow
            key={i}
            from={[rackX + 0.2, NVL72_DIM.height * 0.6, 0]}
            to={[6.5, NVL72_DIM.height * 0.6, 0]}
            role="token"
            label={i === 0 ? tt('i1.tokenLabel') : undefined}
            progress={phase}
            size={[0.05, 0.03, 0.05]}
            showLine={false}
          />
        )
      })}
      <Html position={[6.5, NVL72_DIM.height * 0.55, 0]} center pointerEvents="none">
        <div
          style={{
            background: 'rgba(108, 184, 255, 0.18)',
            border: '1px solid rgba(108, 184, 255, 0.55)',
            borderRadius: 6,
            padding: '8px 14px',
            color: '#cfe6ff',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-line',
            boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
            minWidth: 280,
          }}
        >
          <div style={{ color: '#6cb8ff', fontSize: 11, marginBottom: 6 }}>
            {tt('i1.sseHeader')}
          </div>
          {body.slice(0, visibleChars)}
          <span
            style={{
              color: '#ffd966',
              opacity: 0.5 + 0.5 * Math.sin(t * 6),
            }}
          >
            ▌
          </span>
        </div>
      </Html>
      <Html
        position={[rackX, NVL72_DIM.height + 1.2, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('i1.stream.title')} accent="#6cb8ff">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('i1.stream.body1')}
            <br />
            {tt('i1.stream.body2')}
          </div>
        </Card>
      </Html>
    </group>
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
        padding: '8px 12px',
        color: '#f5f7fb',
        fontSize: 13,
        minWidth: 260,
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
