import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useStepGate } from './useStepGate'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { TensorBlock, TensorArrow } from '../components/3d/tensor/TensorBlock'
import { RingAllreduceFlow } from '../components/3d/tensor/RingAllreduceFlow'
import { useT } from '../i18n'

/**
 * T1 · 一次完整训练 iter (datacenter 层)
 *
 * 主线 = forward → backward → ring-allreduce → optimizer，共 10 step。
 * 所有机制（MoE、PP、bubble）都在主线里"穿插"出现，不另起章节。
 *
 * 4 个 rack 角色化：rack0/1/2/3 = PP 阶段 0..3。
 * 同时假定 rack 之间还有 DP 复制——这里偷懒：用 4 个 rack 的同一 layer 做 ring-allreduce
 * 演示。真实 DP 域是跨 rack 的多 PP rank 0 之间，但视觉化为环更直观。
 */

const RACK_DX = NVL72_DIM.width + 1.4
const RACK_XS = [-1.5, -0.5, 0.5, 1.5].map((i) => i * RACK_DX)
const RACK_TOPS: [number, number, number][] = RACK_XS.map((x) => [x, NVL72_DIM.height + 0.6, 0])

const CAM_VIEWS: Record<
  string,
  { position: [number, number, number]; lookAt: [number, number, number] }
> = {
  load_batch: { position: [-3.6, 4.5, 7], lookAt: [-2.4, 1.8, 0] },
  forward_intra_rack: { position: [-3.0, 3.5, 6], lookAt: [-2.4, 1.6, 0] },
  forward_moe: { position: [-2.4, 3.5, 5], lookAt: [-2.4, 1.6, 0] },
  forward_pp_boundary: { position: [-1.5, 4.5, 7.5], lookAt: [0, 1.6, 0] },
  loss_and_save_act: { position: [3.6, 4.5, 7], lookAt: [2.4, 1.8, 0] },
  backward_sweep: { position: [0, 5.5, 9], lookAt: [0, 1.8, 0] },
  pipeline_bubble: { position: [0, 6.5, 11], lookAt: [0, 2.0, 0] },
  allreduce_grads: { position: [0, 5.5, 8], lookAt: [0, RACK_TOPS[0][1] + 0.5, 0] },
  optimizer_step: { position: [0, 5.5, 9], lookAt: [0, 1.8, 0] },
  next_iter: { position: [0, 6, 12], lookAt: [0, 1.8, 0] },
}

export function StorylineT1() {
  const gate = useStepGate('t1_training_iter')
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
      {/* Step: load_batch — 一个 input batch 进入 rack0 */}
      {gate.is('load_batch') ? (
        <group>
          <TensorArrow
            from={[RACK_XS[0] - 2.4, 1.6, 0]}
            to={[RACK_XS[0] - 0.4, 1.6, 0]}
            role="token"
            label="input ids"
            shape="[B=8, L=4096]"
            progress={(t * 0.6) % 1}
            size={[0.16, 0.05, 0.08]}
          />
          <Html position={[RACK_XS[0] - 1.4, 2.4, 0]} center pointerEvents="none">
            <Card title={tt('t1.load.title')} accent="#ffd966">
              {tt('t1.load.body')}
              <Mono>tensor [8, 4096]</Mono>
            </Card>
          </Html>
        </group>
      ) : null}

      {/* Step: forward_intra_rack — activation 在 rack0 内部从下到上流 */}
      {gate.is('forward_intra_rack') ? (
        <ForwardIntraRack rackX={RACK_XS[0]} t={t} />
      ) : null}

      {/* Step: forward_moe — 在 rack0 上叠加一次 all-to-all */}
      {gate.is('forward_moe') ? (
        <MoEAllToAllInside rackX={RACK_XS[0]} t={t} />
      ) : null}

      {/* Step: forward_pp_boundary — activation 沿 IB 飞过 4 个 rack */}
      {gate.is('forward_pp_boundary') ? (
        <ForwardCrossRack t={t} />
      ) : null}

      {/* Step: loss_and_save_act — rack3 输出 loss，沿途 activation 留底 */}
      {gate.is('loss_and_save_act') ? (
        <LossAndCachedActivations rackX={RACK_XS[3]} t={t} />
      ) : null}

      {/* Step: backward_sweep — gradient 反向流，activation 被消耗 */}
      {gate.is('backward_sweep') ? <BackwardSweep t={t} /> : null}

      {/* Step: pipeline_bubble — 4 个 rack 上方甘特图 */}
      {gate.is('pipeline_bubble') ? <PipelineGantt /> : null}

      {/* Step: allreduce_grads — 在 4 个 rack 顶上做 ring-allreduce 动画 */}
      {gate.is('allreduce_grads') ? (
        <RingAllreduceFlow
          gpuPositions={RACK_TOPS}
          progress={Math.min(1, (t % 8) / 7.5)}
          gradShapeLabel="[d, 4d]"
        />
      ) : null}

      {/* Step: optimizer_step — weights 块被 grad 撞击 → 颜色更新 */}
      {gate.is('optimizer_step') ? <OptimizerStep t={t} /> : null}

      {/* Step: next_iter — 大字"准备好下一拍" */}
      {gate.is('next_iter') ? (
        <Html position={[0, NVL72_DIM.height + 1.6, 0]} center pointerEvents="none">
          <Card title={tt('t1.nextIter.title')} accent="#a4ee27">
            <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
              {tt('t1.nextIter.body1')}
              <br />
              {tt('t1.nextIter.body2')}
            </div>
          </Card>
        </Html>
      ) : null}
    </group>
  )
}

// ===== 子组件 =====

function ForwardIntraRack({ rackX, t }: { rackX: number; t: number }) {
  // 在 rack 内显示 activation 从 layer1 → layer15 流动
  const phase = (t * 0.55) % 1
  const ys = Array.from({ length: 4 }).map((_, i) => 0.4 + i * 0.45)
  const tt = useT()
  return (
    <group>
      {ys.map((y, i) => {
        const p = (phase - i * 0.18 + 1) % 1
        return (
          <TensorArrow
            key={i}
            from={[rackX - 0.2, y, 0]}
            to={[rackX + 0.2, y + 0.3, 0]}
            role="activation"
            shape="[B,L,d]"
            label={`layer ${i * 4 + 1}→${i * 4 + 4}`}
            progress={p}
            size={[0.07, 0.03, 0.07]}
          />
        )
      })}
      <Html position={[rackX, NVL72_DIM.height + 0.7, 0]} center pointerEvents="none">
        <Card title={tt('t1.forwardIntra.title')} accent="#a4ee27">
          {tt('t1.forwardIntra.body')}
          <Mono>shape [8, 4096, d=8192]</Mono>
        </Card>
      </Html>
    </group>
  )
}

function MoEAllToAllInside({ rackX, t }: { rackX: number; t: number }) {
  // 在 rack 上方画一个 8×8 网格小示意，所有方块按 4 色染（按目标 expert）
  const N = 8
  const cell = 0.06
  const baseY = NVL72_DIM.height + 0.4
  const baseX = rackX - (N * cell) / 2 + cell / 2
  const tt = useT()
  return (
    <group>
      {Array.from({ length: N }).map((_, i) =>
        Array.from({ length: N }).map((__, j) => {
          const idx = (i + j + Math.floor(t * 2)) % 4
          const colors = ['#ffd966', '#ffaa55', '#a4ee27', '#6cb8ff']
          return (
            <mesh
              key={`${i}-${j}`}
              position={[baseX + j * cell, baseY + i * cell, 0]}
            >
              <boxGeometry args={[cell * 0.85, cell * 0.85, 0.01]} />
              <meshBasicMaterial color={colors[idx]} transparent opacity={0.85} />
            </mesh>
          )
        }),
      )}
      <Html
        position={[rackX, baseY + N * cell + 0.18, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('t1.moe.title')} accent="#a4ee27">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('t1.moe.body1')}
            <br />
            <span style={{ color: '#a4ee27' }}>{tt('t1.moe.keyLabel')}</span>
            {tt('t1.moe.body2')}
          </div>
        </Card>
      </Html>
    </group>
  )
}

function ForwardCrossRack({ t }: { t: number }) {
  // 4 个 rack 上方依次出现 activation 块跨 rack 飞
  const tt = useT()
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const p = ((t * 0.4) - i * 0.25 + 1) % 1
        return (
          <TensorArrow
            key={i}
            from={[RACK_XS[i] + 0.25, NVL72_DIM.height * 0.7, 0]}
            to={[RACK_XS[i + 1] - 0.25, NVL72_DIM.height * 0.7, 0]}
            role="activation"
            shape="[B,L,d]"
            label={`PP${i}→PP${i + 1}`}
            progress={p}
            size={[0.08, 0.04, 0.08]}
          />
        )
      })}
      <Html
        position={[0, NVL72_DIM.height + 1.4, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('t1.forwardCross.title')} accent="#6cb8ff">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('t1.forwardCross.body1')}
            <br />
            <span style={{ color: '#6cb8ff' }}>{tt('t1.forwardCross.body2')}</span>
          </div>
        </Card>
      </Html>
    </group>
  )
}

function LossAndCachedActivations({ rackX, t }: { rackX: number; t: number }) {
  // rack3 输出 loss，沿途 4 个 rack 顶上各放一个黄色 "saved activation" 小块
  const cachedYs = [0.6, 1.1, 1.6, 2.0]
  const tt = useT()
  return (
    <group>
      <TensorBlock
        position={[rackX + 0.5, NVL72_DIM.height * 0.85, 0]}
        role="activation"
        color="#ff7a7a"
        label="loss"
        shape="scalar"
        size={[0.08, 0.05, 0.08]}
        pulse={0.8}
      />
      {RACK_XS.map((x, i) => (
        <group key={i}>
          {cachedYs.map((y, j) => (
            <mesh key={j} position={[x - 0.32, y, 0.05]}>
              <boxGeometry args={[0.05, 0.025, 0.05]} />
              <meshBasicMaterial
                color="#ffd966"
                transparent
                opacity={0.55 + 0.2 * Math.sin(t * 2 + j)}
              />
            </mesh>
          ))}
          {i === 0 ? (
            <Html position={[x - 0.55, 1.3, 0]} center pointerEvents="none">
              <div
                style={{
                  background: 'rgba(255, 217, 102, 0.18)',
                  border: '1px solid rgba(255, 217, 102, 0.55)',
                  borderRadius: 5,
                  padding: '2px 6px',
                  fontSize: 9,
                  color: '#ffd966',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                }}
              >
                cached act
              </div>
            </Html>
          ) : null}
        </group>
      ))}
      <Html
        position={[0, NVL72_DIM.height + 1.4, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('t1.loss.title')} accent="#ff7a7a">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('t1.loss.body')}
          </div>
        </Card>
      </Html>
    </group>
  )
}

function BackwardSweep({ t }: { t: number }) {
  // gradient 块从 rack3 → rack0 反向飞
  const tt = useT()
  return (
    <group>
      {[2, 1, 0].map((i, idx) => {
        const p = ((t * 0.4) - idx * 0.25 + 1) % 1
        return (
          <TensorArrow
            key={i}
            from={[RACK_XS[i + 1] - 0.25, NVL72_DIM.height * 0.5, 0]}
            to={[RACK_XS[i] + 0.25, NVL72_DIM.height * 0.5, 0]}
            role="gradient"
            shape="[B,L,d]"
            label={`∇ PP${i + 1}→PP${i}`}
            progress={p}
            size={[0.08, 0.04, 0.08]}
          />
        )
      })}
      <Html
        position={[0, NVL72_DIM.height + 1.4, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('t1.backward.title')} accent="#a48cff">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            {tt('t1.backward.body')}
          </div>
        </Card>
      </Html>
    </group>
  )
}

function PipelineGantt() {
  const tt = useT()
  return (
    <Html
      position={[0, NVL72_DIM.height + 1.4, 0]}
      center
      pointerEvents="none"
      zIndexRange={[100, 0]}
    >
      <div
        style={{
          background: 'rgba(36, 44, 60, 0.94)',
          backdropFilter: 'blur(14px) saturate(150%)',
          WebkitBackdropFilter: 'blur(14px) saturate(150%)',
          border: '1px solid rgba(255, 122, 122, 0.55)',
          borderRadius: 10,
          padding: '12px 16px',
          color: '#f5f7fb',
          fontSize: 12,
          minWidth: 480,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-fg-mute)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom: 6,
          }}
        >
          {tt('t1.gantt.title')}
        </div>
        <svg width={460} height={120} style={{ display: 'block' }}>
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              <text x={0} y={r * 24 + 14} fontSize={9} fill="#a3acba" fontFamily="var(--font-mono)">
                PP{r}
              </text>
              {/* naive forward */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((m) => (
                <rect
                  key={`f${m}`}
                  x={28 + (r + m) * 22}
                  y={r * 24 + 6}
                  width={20}
                  height={14}
                  fill="#a4ee27"
                  opacity={0.8}
                  rx={2}
                />
              ))}
              {/* naive backward */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((m) => (
                <rect
                  key={`b${m}`}
                  x={28 + (8 + 3 + (3 - r) + m) * 22}
                  y={r * 24 + 6}
                  width={20}
                  height={14}
                  fill="#a48cff"
                  opacity={0.8}
                  rx={2}
                />
              ))}
              {/* head bubble */}
              {r > 0 ? (
                <rect
                  x={28}
                  y={r * 24 + 6}
                  width={r * 22}
                  height={14}
                  fill="rgba(255,122,122,0.22)"
                  stroke="rgba(255,122,122,0.55)"
                  strokeDasharray="2 1"
                  rx={2}
                />
              ) : null}
            </g>
          ))}
          <text
            x={230}
            y={108}
            textAnchor="middle"
            fontSize={11}
            fill="#ff7a7a"
            fontFamily="var(--font-mono)"
            fontWeight={700}
          >
            {tt('t1.gantt.summary')}
          </text>
        </svg>
      </div>
    </Html>
  )
}

function OptimizerStep({ t }: { t: number }) {
  // 每个 rack 顶上一个 weights 块（绿色），被 grad（紫色）撞击后短暂闪烁 → 颜色微变
  const flash = (Math.sin(t * 4) + 1) / 2
  const tt = useT()
  return (
    <group>
      {RACK_XS.map((x, i) => (
        <group key={i}>
          <TensorBlock
            position={[x, NVL72_DIM.height + 0.5, 0]}
            role="weights"
            label="W"
            shape="[d, 4d]"
            size={[0.14, 0.05, 0.14]}
            pulse={flash}
          />
          <TensorBlock
            position={[x + 0.16, NVL72_DIM.height + 0.5, 0]}
            role="optimizer"
            label="m, v"
            shape="(AdamW state)"
            size={[0.07, 0.04, 0.07]}
            pulse={0.3}
          />
        </group>
      ))}
      <Html
        position={[0, NVL72_DIM.height + 1.5, 0]}
        center
        pointerEvents="none"
      >
        <Card title={tt('t1.opt.title')} accent="#5ad9c2">
          <div style={{ fontSize: 12, color: 'var(--color-fg-soft)' }}>
            <span style={{ color: '#a4ee27' }}>W</span> ←{' '}
            <span style={{ color: '#a4ee27' }}>W</span> − lr ·{' '}
            <span style={{ color: '#5ad9c2' }}>m</span> /{' '}
            <span style={{ color: '#5ad9c2' }}>√v</span>
            <br />
            <span style={{ color: 'var(--color-fg-mute)' }}>
              {tt('t1.opt.body')}
            </span>
          </div>
        </Card>
      </Html>
    </group>
  )
}

// ===== UI 小工具 =====
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

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 4,
        fontSize: 12,
        color: 'var(--color-fg-mute)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </div>
  )
}
