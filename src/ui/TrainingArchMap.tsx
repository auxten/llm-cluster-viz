import { useMemo } from 'react'
import { useStory } from '../state/storyStore'
import { storylineById } from '../data/storylines'
import { useT } from '../i18n'

/**
 * 训练 3 章共用的 2D 架构总览图。
 *
 * 仅当 storyId ∈ 训练章节时显示。其他设计逻辑与 InferenceArchMap 完全一致：
 *   - 默认所有节点暗化，active 节点变亮
 *   - active 箭头加粗 + CSS 流光动画
 *   - 不接管鼠标事件
 *
 * 节点 ID（被 storylines.ts 中 step.archHighlight 引用）：
 *   data_loader     左侧 mini-batch 输入
 *   pp0             PP rank 0（容器，含 fwd / moe / cache 三个子节点）
 *   pp1             PP rank 1（layer N/4..N/2）
 *   pp2             PP rank 2（layer N/2..3N/4）
 *   pp3             PP rank 3（layer 3N/4..N，输出 loss）
 *   pp_inner_fwd    PP0 内部：forward layers
 *   pp_inner_moe    PP0 内部：MoE all-to-all（EP=8）
 *   pp_inner_cache  PP0 内部：cached activations
 *   loss            Loss 节点
 *   allreduce       Ring-AllReduce（跨 DP 副本同步梯度）
 *   optimizer       Optimizer Step（AdamW: W ← W − lr·m/√v）
 *   pipeline_gantt  Pipeline 时序图节点（仅 T1 的 pipeline_bubble、T2 全部 step 高亮）
 *
 * 箭头 ID：
 *   arrow_data_pp0       Data → PP0
 *   arrow_fwd_01..23     PP_i → PP_{i+1}（forward activation 跨 IB）
 *   arrow_pp3_loss       PP3 → Loss
 *   arrow_loss_back      Loss → PP3（启动 backward）
 *   arrow_bwd_32..10     PP_{i+1} → PP_i（backward gradient）
 *   arrow_grad_pp0..3    每个 PP → AllReduce（grad 聚合）
 *   arrow_allreduce_opt  AllReduce → Optimizer
 *   arrow_opt_w          Optimizer → 回到 PP（new weights）
 */

const TRAINING_STORY_IDS = new Set([
  't1_training_iter',
  't2_pipeline_bubble',
  't3_moe_all_to_all',
])

const COLORS = {
  data: '#6cb8ff', // 蓝（输入）
  pp: '#a4ee27', // 绿（PP rack 主色）
  inner: '#ffd966', // 黄（PP 内部子节点）
  loss: '#ff7a7a', // 红（loss）
  fwd: '#a4ee27', // 绿（forward）
  bwd: '#a48cff', // 紫（backward）
  grad: '#a48cff', // 紫（grad）
  allreduce: '#5ad9c2', // 青（聚合）
  optimizer: '#5ad9c2', // 青（优化器）
  newW: '#a4ee27', // 绿（更新后权重）
  gantt: '#ff7a7a',
  dim: 'rgba(255, 255, 255, 0.18)',
  dimText: 'rgba(255, 255, 255, 0.32)',
}

export function TrainingArchMap() {
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
  if (!storyId || !TRAINING_STORY_IDS.has(storyId)) return null

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
          {t('arch.train.title')}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#a4ee27',
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

  // 画布
  const W = 980
  const H = 170

  // ── 横向位置 ──────────────────────────────────────────────────────
  const dataX = 8
  const dataW = 70
  const pp0X = 86
  const ppW = 116
  const ppGap = 10
  const pp1X = pp0X + ppW + ppGap // 212
  const pp2X = pp1X + ppW + ppGap // 338
  const pp3X = pp2X + ppW + ppGap // 464
  const lossX = pp3X + ppW + ppGap // 590
  const lossW = 60
  // Pipeline Gantt 在右侧，纵跨 Inner + AllReduce
  const ganttX = lossX + lossW + 12 // 662
  const ganttW = W - ganttX - 4 // 314

  // ── 纵向位置 ──────────────────────────────────────────────────────
  // 主行（PP rank, Data, Loss）
  const mainY = 42
  const mainH = 38
  const horizY = mainY + mainH / 2 // 61
  // backward 反向行（在主行内部下沿往下 8 像素，与主行 fwd 错开）
  const bwdY = horizY + 8 // 69

  // PP rank 内部组件行（横跨 PP0..PP3 宽度的 3 个并排 sub-cell）
  const innerY = 96
  const innerH = 18

  // 底部聚合区
  const arY = 132
  const arH = 26
  const arX = pp0X
  const arW = pp3X + ppW - pp0X
  const optX = lossX
  const optW = ganttX - optX - 8
  const optY = arY
  const optH = arH

  // ── Inner 子节点：3 等分 PP0..PP3 横向区间 ──
  const innerSpanX = arX
  const innerSpanW = arW
  const innerSubW = (innerSpanW - 12) / 3 // 3 等分留 12px gap
  const innerSubXs = [
    innerSpanX + 2,
    innerSpanX + 6 + innerSubW,
    innerSpanX + 10 + innerSubW * 2,
  ]

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block' }}
    >
      <defs>
        <style>{`
          .arrow-flow { stroke-dasharray: 8 4; animation: archFlow 0.8s linear infinite; }
          @keyframes archFlow { to { stroke-dashoffset: -24; } }
          .glow { filter: drop-shadow(0 0 6px currentColor); }
        `}</style>
        {[
          ['arrow-data', COLORS.data],
          ['arrow-fwd', COLORS.fwd],
          ['arrow-bwd', COLORS.bwd],
          ['arrow-loss', COLORS.loss],
          ['arrow-grad', COLORS.grad],
          ['arrow-allreduce', COLORS.allreduce],
          ['arrow-optimizer', COLORS.optimizer],
          ['arrow-neww', COLORS.newW],
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

      {/* ============ 主行：Data → PP0..PP3 → Loss ============ */}
      <NodeBox
        x={dataX}
        y={mainY}
        w={dataW}
        h={mainH}
        label={t('arch.train.node.data_loader.label')}
        sub={t('arch.train.node.data_loader.sub')}
        color={COLORS.data}
        active={isActive('data_loader')}
      />
      <NodeBox
        x={pp0X}
        y={mainY}
        w={ppW}
        h={mainH}
        label={t('arch.train.node.pp0.label')}
        sub={t('arch.train.node.pp0.sub')}
        color={COLORS.pp}
        active={isActive('pp0')}
      />
      <NodeBox
        x={pp1X}
        y={mainY}
        w={ppW}
        h={mainH}
        label={t('arch.train.node.pp1.label')}
        sub={t('arch.train.node.pp1.sub')}
        color={COLORS.pp}
        active={isActive('pp1')}
      />
      <NodeBox
        x={pp2X}
        y={mainY}
        w={ppW}
        h={mainH}
        label={t('arch.train.node.pp2.label')}
        sub={t('arch.train.node.pp2.sub')}
        color={COLORS.pp}
        active={isActive('pp2')}
      />
      <NodeBox
        x={pp3X}
        y={mainY}
        w={ppW}
        h={mainH}
        label={t('arch.train.node.pp3.label')}
        sub={t('arch.train.node.pp3.sub')}
        color={COLORS.pp}
        active={isActive('pp3')}
      />
      <NodeBox
        x={lossX}
        y={mainY}
        w={lossW}
        h={mainH}
        label={t('arch.train.node.loss.label')}
        sub={t('arch.train.node.loss.sub')}
        color={COLORS.loss}
        active={isActive('loss')}
      />

      {/* ============ Pipeline Gantt（右侧，纵跨 inner + AllReduce） ============ */}
      {(() => {
        const ganttActive = isActive('pipeline_gantt')
        const gy = innerY - 4
        const gh = arY + arH - gy
        if (ganttW < 60) return null
        return (
          <g
            className={ganttActive ? 'glow' : undefined}
            style={{ color: COLORS.gantt }}
          >
            <rect
              x={ganttX}
              y={gy}
              width={ganttW}
              height={gh}
              rx={4}
              fill={ganttActive ? `${COLORS.gantt}24` : 'rgba(255,255,255,0.04)'}
              stroke={ganttActive ? COLORS.gantt : COLORS.dim}
              strokeWidth={ganttActive ? 1.4 : 1}
            />
            <text
              x={ganttX + 6}
              y={gy + 11}
              fontSize={9}
              fill={ganttActive ? COLORS.gantt : COLORS.dimText}
              fontFamily="var(--font-mono)"
              fontWeight={600}
            >
              {t('arch.train.node.pipeline_gantt.label')}
            </text>
            {/* 简化甘特：4 行小条 */}
            {[0, 1, 2, 3].map((r) => (
              <g key={r}>
                {[0, 1, 2, 3, 4, 5].map((m) => (
                  <rect
                    key={`f${m}`}
                    x={ganttX + 28 + (r + m) * 7}
                    y={gy + 18 + r * 6}
                    width={6}
                    height={4}
                    fill={ganttActive ? COLORS.fwd : COLORS.dim}
                    opacity={ganttActive ? 0.85 : 0.4}
                    rx={0.5}
                  />
                ))}
              </g>
            ))}
          </g>
        )
      })()}

      {/* ============ Forward 箭头（5 段） ============ */}
      <ArrowLine
        x1={dataX + dataW}
        y1={horizY}
        x2={pp0X}
        y2={horizY}
        color={COLORS.data}
        active={isActive('arrow_data_pp0')}
        marker="arrow-data"
      />
      <ArrowLine
        x1={pp0X + ppW}
        y1={horizY}
        x2={pp1X}
        y2={horizY}
        color={COLORS.fwd}
        active={isActive('arrow_fwd_01')}
        marker="arrow-fwd"
      />
      <ArrowLine
        x1={pp1X + ppW}
        y1={horizY}
        x2={pp2X}
        y2={horizY}
        color={COLORS.fwd}
        active={isActive('arrow_fwd_12')}
        marker="arrow-fwd"
      />
      <ArrowLine
        x1={pp2X + ppW}
        y1={horizY}
        x2={pp3X}
        y2={horizY}
        color={COLORS.fwd}
        active={isActive('arrow_fwd_23')}
        marker="arrow-fwd"
      />
      <ArrowLine
        x1={pp3X + ppW}
        y1={horizY}
        x2={lossX}
        y2={horizY}
        color={COLORS.loss}
        active={isActive('arrow_pp3_loss')}
        marker="arrow-loss"
      />

      {/* fwd 单独的小标签：放在主行**上方**，避免覆盖节点 */}
      <text
        x={(pp0X + ppW + pp1X) / 2}
        y={mainY - 4}
        textAnchor="middle"
        fontSize={8.5}
        fontFamily="var(--font-mono)"
        fill={
          isActive('arrow_fwd_01') ||
          isActive('arrow_fwd_12') ||
          isActive('arrow_fwd_23')
            ? COLORS.fwd
            : COLORS.dimText
        }
      >
        {t('arch.train.arrow.fwd')}
      </text>

      {/* ============ Backward 箭头（在主行下沿，反向） ============ */}
      <ArrowCurve
        x1={lossX}
        y1={bwdY}
        x2={pp3X + ppW}
        y2={bwdY}
        color={COLORS.bwd}
        active={isActive('arrow_loss_back')}
        marker="arrow-bwd"
      />
      <ArrowLine
        x1={pp3X}
        y1={bwdY}
        x2={pp2X + ppW}
        y2={bwdY}
        color={COLORS.bwd}
        active={isActive('arrow_bwd_32')}
        marker="arrow-bwd"
        thin
      />
      <ArrowLine
        x1={pp2X}
        y1={bwdY}
        x2={pp1X + ppW}
        y2={bwdY}
        color={COLORS.bwd}
        active={isActive('arrow_bwd_21')}
        marker="arrow-bwd"
        thin
      />
      <ArrowLine
        x1={pp1X}
        y1={bwdY}
        x2={pp0X + ppW}
        y2={bwdY}
        color={COLORS.bwd}
        active={isActive('arrow_bwd_10')}
        marker="arrow-bwd"
        thin
      />
      {/* bwd 标签 */}
      <text
        x={(pp1X + pp2X + ppW) / 2}
        y={mainY + mainH + 11}
        textAnchor="middle"
        fontSize={8.5}
        fontFamily="var(--font-mono)"
        fill={
          isActive('arrow_bwd_32') ||
          isActive('arrow_bwd_21') ||
          isActive('arrow_bwd_10')
            ? COLORS.bwd
            : COLORS.dimText
        }
      >
        {t('arch.train.arrow.bwd')}
      </text>

      {/* ============ Inner 行：横跨 PP0..PP3 宽度的"PP rank 内部组件" ============ */}
      <text
        x={innerSpanX - 4}
        y={innerY + innerH / 2 + 3}
        textAnchor="end"
        fontSize={8.5}
        fontFamily="var(--font-mono)"
        fill={COLORS.dimText}
      >
        {t('arch.train.inner.prefix')}
      </text>
      <NodeBox
        x={innerSubXs[0]}
        y={innerY}
        w={innerSubW}
        h={innerH}
        label={t('arch.train.node.pp_inner_fwd.label')}
        color={COLORS.inner}
        active={isActive('pp_inner_fwd')}
        tiny
      />
      <NodeBox
        x={innerSubXs[1]}
        y={innerY}
        w={innerSubW}
        h={innerH}
        label={t('arch.train.node.pp_inner_moe.label')}
        color={COLORS.inner}
        active={isActive('pp_inner_moe')}
        tiny
      />
      <NodeBox
        x={innerSubXs[2]}
        y={innerY}
        w={innerSubW}
        h={innerH}
        label={t('arch.train.node.pp_inner_cache.label')}
        color={COLORS.inner}
        active={isActive('pp_inner_cache')}
        tiny
      />

      {/* ============ AllReduce 横条 + Optimizer ============ */}
      <NodeBox
        x={arX}
        y={arY}
        w={arW}
        h={arH}
        label={t('arch.train.node.allreduce.label')}
        color={COLORS.allreduce}
        active={isActive('allreduce')}
        tiny
      />

      {/* PP_i → AllReduce 4 条短箭头（绕过 inner 行：从 PP 底走到 inner 顶左侧再下行）
          简化：4 条直线，但起始 y=innerY-2 让它们像是从 inner 区下方"汇入"AllReduce */}
      {[
        { x: pp0X + ppW / 2, key: 'arrow_grad_pp0' },
        { x: pp1X + ppW / 2, key: 'arrow_grad_pp1' },
        { x: pp2X + ppW / 2, key: 'arrow_grad_pp2' },
        { x: pp3X + ppW / 2, key: 'arrow_grad_pp3' },
      ].map((g, i) => (
        <ArrowLine
          key={g.key}
          x1={g.x}
          y1={innerY + innerH + 1}
          x2={g.x}
          y2={arY}
          color={COLORS.grad}
          active={isActive(g.key)}
          marker="arrow-grad"
          thin
          label={i === 0 ? t('arch.train.arrow.grad') : undefined}
        />
      ))}

      {/* AllReduce → Optimizer */}
      <ArrowLine
        x1={arX + arW}
        y1={arY + arH / 2}
        x2={optX}
        y2={optY + optH / 2}
        color={COLORS.allreduce}
        active={isActive('arrow_allreduce_opt')}
        marker="arrow-allreduce"
      />

      <NodeBox
        x={optX}
        y={optY}
        w={optW}
        h={optH}
        label={t('arch.train.node.optimizer.label')}
        color={COLORS.optimizer}
        active={isActive('optimizer')}
        tiny
      />

      {/* Optimizer → 回到 4 个 PP（弧线 new W）—— 走到顶部再往下落到 PP1 顶 */}
      <ArrowReturn
        startX={optX + optW / 2}
        startY={optY}
        endX={(pp1X + ppW + pp2X) / 2}
        endY={mainY}
        color={COLORS.newW}
        active={isActive('arrow_opt_w')}
        label={t('arch.train.arrow.new_w')}
      />
    </svg>
  )
}

interface NodeBoxProps {
  x: number
  y: number
  w: number
  h: number
  label: string
  sub?: string
  color: string
  active: boolean
  container?: boolean
  tiny?: boolean
  /** 容器节点用的 label/sub 顶部 y 偏移（只用在 container=true 时） */
  labelTopY?: number
  subTopY?: number
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
  tiny,
  labelTopY,
  subTopY,
}: NodeBoxProps) {
  const fill = active
    ? `${color}24`
    : container
      ? 'rgba(255,255,255,0.025)'
      : 'rgba(255,255,255,0.04)'
  const stroke = active ? color : COLORS.dim
  const labelFill = active ? color : COLORS.dimText
  const subFill = active ? 'rgba(255,255,255,0.85)' : COLORS.dimText
  // container：label 在容器顶部；普通：居中
  const labelY = container ? (labelTopY ?? 14) : tiny ? y + 12 : y + h / 2 - 1
  const subY = container ? (subTopY ?? 28) : tiny ? undefined : y + h / 2 + 11
  return (
    <g className={active ? 'glow' : undefined} style={{ color }}>
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
        y={labelY}
        textAnchor="middle"
        fontSize={tiny ? 9.5 : 11}
        fontWeight={600}
        fill={labelFill}
        fontFamily={tiny ? 'var(--font-mono)' : undefined}
      >
        {label}
      </text>
      {sub && !tiny && subY != null ? (
        <text
          x={x + w / 2}
          y={subY}
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
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  active: boolean
  marker: string
  thin?: boolean
  label?: string
}

function ArrowLine({
  x1,
  y1,
  x2,
  y2,
  color,
  active,
  marker,
  thin,
  label,
}: ArrowLineProps) {
  const strokeColor = active ? color : COLORS.dim
  const w = active ? (thin ? 1.4 : 2) : thin ? 1 : 1.2
  const className = active ? 'arrow-flow' : undefined
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
        className={className}
      />
      {label ? (
        <text
          x={(x1 + x2) / 2}
          y={Math.min(y1, y2) - 2}
          textAnchor="middle"
          fontSize={8.5}
          fontFamily="var(--font-mono)"
          fill={active ? color : COLORS.dimText}
          fontWeight={active ? 600 : 400}
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}

/** 一段微弧的水平箭头（用于 backward 反向时和正向 fwd 错开避免重叠） */
function ArrowCurve({
  x1,
  y1,
  x2,
  y2,
  color,
  active,
  marker,
}: Omit<ArrowLineProps, 'thin' | 'label'>) {
  const strokeColor = active ? color : COLORS.dim
  const w = active ? 1.6 : 1
  const className = active ? 'arrow-flow' : undefined
  const useMarker = active ? marker : 'arrow-dim'
  // x2 < x1（从右向左），用 cubic 弧线略微上扬
  const midX = (x1 + x2) / 2
  const lift = 6
  const d = `M ${x1} ${y1} C ${midX} ${y1 - lift}, ${midX} ${y2 - lift}, ${x2} ${y2}`
  return (
    <g style={{ color }}>
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={w}
        markerEnd={`url(#${useMarker})`}
        className={className}
      />
    </g>
  )
}

/** Optimizer → 回到 PP 的弯曲返回路径 */
function ArrowReturn({
  startX,
  startY,
  endX,
  endY,
  color,
  active,
  label,
}: {
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  active: boolean
  label?: string
}) {
  const strokeColor = active ? color : COLORS.dim
  const w = active ? 1.8 : 1
  const className = active ? 'arrow-flow' : undefined
  const useMarker = active ? 'arrow-neww' : 'arrow-dim'
  // 从 (startX, startY) 上行 → 到顶部 → 弯回 (endX, endY)
  const topY = 1.2
  const midY = (startY + endY) / 2
  const d = `M ${startX} ${startY} C ${startX} ${midY - 30}, ${endX} ${topY - 14}, ${endX} ${endY}`
  return (
    <g style={{ color }}>
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={w}
        markerEnd={`url(#${useMarker})`}
        className={className}
        opacity={active ? 1 : 0.55}
      />
      {label ? (
        <text
          x={(startX + endX) / 2}
          y={topY + 8}
          textAnchor="middle"
          fontSize={8.5}
          fontFamily="var(--font-mono)"
          fill={active ? color : COLORS.dimText}
          fontWeight={active ? 600 : 400}
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}
