import { useMemo } from 'react'
import { useStory } from '../state/storyStore'
import { storylineById } from '../data/storylines'
import { useT } from '../i18n'

/**
 * 推理 4 章共用的 2D 架构总览图。
 *
 * 永远在屏幕底部居中显示（仅当 storyId ∈ 推理章节时），
 * 把当前 step 在 storylines.ts 里声明的 archHighlight 节点 / 箭头亮起，
 * 其他节点暗化。
 *
 * 节点 ID（被 storylines.ts 中 step.archHighlight 引用）：
 *   user_in           左侧 User
 *   api_router        API Router · 队列+调度
 *   prefix_hash       Prefix cache hash table
 *   prefill_rack      Prefill Rack · compute-bound
 *   decode_rack       Decode Rack · memory-bound 容器
 *   cont_batch        Continuous Batching（decode 内部）
 *   paged_pool        PagedAttention KV pool（decode 内部）
 *   block_table       Block tables（pool 子节点）
 *   prefix_block      Prefix cache 共享 block（pool 子节点）
 *   user_out          右侧 User · SSE 流式
 *
 * 箭头 ID：
 *   arrow_user_router       User → API Router
 *   arrow_router_prefill    Router → Prefill Rack
 *   arrow_router_hash       Router → PrefixHash (lookup, 虚线)
 *   kv_arrow                Prefill → Decode (KV cache, 橙色, 大箭头)
 *   stream_arrow            Decode → User (stream tokens, 黄色)
 */

const INFERENCE_STORY_IDS = new Set([
  'i1_inference_lifecycle',
  'i2_prefill_internals',
  'i3_decode_continuous_batching',
  'i4_kv_cache_budget',
])

// 颜色映射（与 3D 场景视觉语言一致）
const COLORS = {
  user: '#6cb8ff', // 蓝
  router: '#ffaa55', // 橙
  prefill: '#a4ee27', // 绿
  decode: '#ffd966', // 黄
  kv: '#ffaa55', // 橙
  prefix: '#6cb8ff', // 蓝（hash / 共享）
  stream: '#ffd966', // 黄
  block: '#ffaa55',
  dim: 'rgba(255, 255, 255, 0.18)',
  dimText: 'rgba(255, 255, 255, 0.32)',
}

export function InferenceArchMap() {
  const storyId = useStory((s) => s.storyId)
  const stepIndex = useStory((s) => s.stepIndex)
  const mode = useStory((s) => s.mode)
  const t = useT()

  const activeIds = useMemo(() => {
    if (!storyId) return new Set<string>()
    const story = storylineById(storyId)
    const step = story?.steps[stepIndex]
    return new Set(step?.archHighlight ?? [])
  }, [storyId, stepIndex])

  const currentTitle = useMemo(() => {
    if (!storyId) return ''
    const story = storylineById(storyId)
    const step = story?.steps[stepIndex]
    return step?.title ? t(step.title) : ''
  }, [storyId, stepIndex, t])

  if (mode !== 'guided') return null
  if (!storyId || !INFERENCE_STORY_IDS.has(storyId)) return null

  return (
    <div
      className="pointer-events-none"
      style={{
        background: 'rgba(20, 26, 40, 0.92)',
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderRadius: 12,
        padding: '8px 14px 10px',
        boxShadow: '0 -4px 28px rgba(0, 0, 0, 0.55)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            color: 'var(--color-fg-mute)',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {t('arch.title')}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#ffd966',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}
        >
          {currentTitle}
        </span>
      </div>
      <ArchSvg activeIds={activeIds} t={t} />
    </div>
  )
}

function ArchSvg({
  activeIds,
  t,
}: {
  activeIds: Set<string>
  t: (key: string) => string
}) {
  const isActive = (id: string) => activeIds.has(id)

  // SVG 内部坐标
  const W = 980
  const H = 150

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block' }}
    >
      <defs>
        {/* 流光动画的 stroke-dasharray dash offset */}
        <style>{`
          .arrow-flow { stroke-dasharray: 8 4; animation: archFlow 0.8s linear infinite; }
          @keyframes archFlow { to { stroke-dashoffset: -24; } }
          .glow { filter: drop-shadow(0 0 6px currentColor); }
          .pulse { animation: archPulse 1.4s ease-in-out infinite; }
          @keyframes archPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.55; }
          }
        `}</style>
        {/* 箭头 marker · 给每种颜色一个 */}
        {[
          ['arrow-user', COLORS.user],
          ['arrow-router', COLORS.router],
          ['arrow-prefill', COLORS.prefill],
          ['arrow-kv', COLORS.kv],
          ['arrow-stream', COLORS.stream],
          ['arrow-prefix', COLORS.prefix],
          ['arrow-dim', COLORS.dim],
        ].map(([id, color]) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* ============== 节点 ============== */}

      {/* User in（左侧） */}
      <NodeBox
        id="user_in"
        x={20}
        y={48}
        w={86}
        h={42}
        label={t('arch.node.user_in.label')}
        sub={t('arch.node.user_in.sub')}
        color={COLORS.user}
        active={isActive('user_in')}
      />

      {/* API Router */}
      <NodeBox
        id="api_router"
        x={142}
        y={48}
        w={120}
        h={42}
        label={t('arch.node.api_router.label')}
        sub={t('arch.node.api_router.sub')}
        color={COLORS.router}
        active={isActive('api_router')}
      />

      {/* Prefix cache hash（router 上方） */}
      <NodeBox
        id="prefix_hash"
        x={142}
        y={4}
        w={120}
        h={32}
        label={t('arch.node.prefix_hash.label')}
        sub={t('arch.node.prefix_hash.sub')}
        color={COLORS.prefix}
        active={isActive('prefix_hash')}
        compact
      />

      {/* Prefill Rack */}
      <NodeBox
        id="prefill_rack"
        x={296}
        y={40}
        w={150}
        h={58}
        label={t('arch.node.prefill_rack.label')}
        sub={t('arch.node.prefill_rack.sub')}
        color={COLORS.prefill}
        active={isActive('prefill_rack')}
      />

      {/* Decode Rack 容器 */}
      <NodeBox
        id="decode_rack"
        x={580}
        y={4}
        w={290}
        h={138}
        label={t('arch.node.decode_rack.label')}
        sub={t('arch.node.decode_rack.sub')}
        color={COLORS.decode}
        active={isActive('decode_rack')}
        container
      />
      {/* Decode Rack 内部子节点 */}
      <NodeBox
        id="cont_batch"
        x={596}
        y={32}
        w={130}
        h={32}
        label={t('arch.node.cont_batch.label')}
        sub={t('arch.node.cont_batch.sub')}
        color={COLORS.decode}
        active={isActive('cont_batch')}
        compact
      />
      <NodeBox
        id="paged_pool"
        x={596}
        y={72}
        w={258}
        h={62}
        label={t('arch.node.paged_pool.label')}
        sub={t('arch.node.paged_pool.sub')}
        color={COLORS.kv}
        active={isActive('paged_pool')}
      />
      <NodeBox
        id="block_table"
        x={604}
        y={102}
        w={108}
        h={26}
        label={t('arch.node.block_table.label')}
        color={COLORS.block}
        active={isActive('block_table')}
        tiny
      />
      <NodeBox
        id="prefix_block"
        x={732}
        y={102}
        w={114}
        h={26}
        label={t('arch.node.prefix_block.label')}
        color={COLORS.prefix}
        active={isActive('prefix_block')}
        tiny
      />

      {/* User out（右侧） */}
      <NodeBox
        id="user_out"
        x={892}
        y={48}
        w={68}
        h={42}
        label={t('arch.node.user_out.label')}
        sub={t('arch.node.user_out.sub')}
        color={COLORS.user}
        active={isActive('user_out')}
      />

      {/* ============== 箭头 ============== */}

      <ArrowLine
        id="arrow_user_router"
        x1={106}
        y1={69}
        x2={142}
        y2={69}
        color={COLORS.user}
        active={isActive('arrow_user_router')}
        marker="arrow-user"
      />

      {/* Router → PrefixHash (虚线 lookup) */}
      <ArrowLine
        id="arrow_router_hash"
        x1={202}
        y1={48}
        x2={202}
        y2={36}
        color={COLORS.prefix}
        active={isActive('arrow_router_hash')}
        marker="arrow-prefix"
        dashed
      />

      {/* Router → Prefill */}
      <ArrowLine
        id="arrow_router_prefill"
        x1={262}
        y1={69}
        x2={296}
        y2={69}
        color={COLORS.router}
        active={isActive('arrow_router_prefill')}
        marker="arrow-router"
      />

      {/* Prefill → Decode (KV cache, 橙色大箭头) */}
      <ArrowLine
        id="kv_arrow"
        x1={446}
        y1={69}
        x2={580}
        y2={69}
        color={COLORS.kv}
        active={isActive('kv_arrow')}
        marker="arrow-kv"
        thick
        label={t('arch.arrow.kv')}
        labelColor={COLORS.kv}
      />

      {/* Decode → User (stream) */}
      <ArrowLine
        id="stream_arrow"
        x1={870}
        y1={69}
        x2={892}
        y2={69}
        color={COLORS.stream}
        active={isActive('stream_arrow')}
        marker="arrow-stream"
        label={t('arch.arrow.stream')}
        labelColor={COLORS.stream}
      />
    </svg>
  )
}

interface NodeBoxProps {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  sub?: string
  color: string
  active: boolean
  container?: boolean
  compact?: boolean
  tiny?: boolean
}

function NodeBox({
  x,
  y,
  w,
  h,
  label,
  sub,
  color,
  active,
  container,
  compact,
  tiny,
}: NodeBoxProps) {
  const fill = active
    ? `${color}24`
    : container
      ? 'rgba(255,255,255,0.025)'
      : 'rgba(255,255,255,0.04)'
  const stroke = active ? color : COLORS.dim
  const labelFill = active ? color : COLORS.dimText
  const subFill = active ? 'rgba(255,255,255,0.85)' : COLORS.dimText
  return (
    <g
      className={active ? 'glow' : undefined}
      style={{ color }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={active ? 1.6 : 1}
        strokeDasharray={container && !active ? '4 3' : undefined}
      />
      <text
        x={x + w / 2}
        y={tiny ? y + 16 : compact ? y + 13 : y + 17}
        textAnchor="middle"
        fontSize={tiny ? 10 : compact ? 10.5 : 11}
        fontWeight={600}
        fill={labelFill}
        fontFamily={tiny ? 'var(--font-mono)' : undefined}
      >
        {label}
      </text>
      {sub && !tiny ? (
        <text
          x={x + w / 2}
          y={compact ? y + 25 : y + 32}
          textAnchor="middle"
          fontSize={9}
          fill={subFill}
        >
          {sub}
        </text>
      ) : null}
    </g>
  )
}

interface ArrowLineProps {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  active: boolean
  marker: string
  dashed?: boolean
  thick?: boolean
  label?: string
  labelColor?: string
}

function ArrowLine({
  x1,
  y1,
  x2,
  y2,
  color,
  active,
  marker,
  dashed,
  thick,
  label,
  labelColor,
}: ArrowLineProps) {
  const strokeColor = active ? color : COLORS.dim
  const w = active ? (thick ? 3 : 2) : thick ? 2 : 1.2
  const className = active ? 'arrow-flow' : undefined
  const dashArr = dashed && !active ? '4 3' : undefined
  const useMarker = active ? marker : 'arrow-dim'
  return (
    <g style={{ color }}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={w}
        markerEnd={`url(#${useMarker})`}
        strokeDasharray={dashArr}
        className={className}
      />
      {label ? (
        <text
          x={(x1 + x2) / 2}
          y={Math.min(y1, y2) - 4}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill={active ? (labelColor ?? color) : COLORS.dimText}
          fontWeight={active ? 600 : 400}
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}
