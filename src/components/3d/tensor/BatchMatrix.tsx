/**
 * BatchMatrix：用 HTML/CSS 渲染一个 [N rows × hidden cols] 的 batch 矩阵。
 *
 * 用于 i3_decode_continuous_batching：
 *   - 每行 = 一个用户在当前 iter 的下一个 token
 *   - 行颜色：黄色（活跃）/ 灰色（已完成）/ 橙色（新加入）
 *   - 中间画一个 weights 矩阵 W [hidden, hidden]，箭头表示 X @ W
 *   - 输出矩阵 [N, hidden]
 *
 * 这个组件是纯 DOM，不进 Canvas（HTML overlay）。
 */
import { useT } from '../../../i18n'

export interface BatchUserRow {
  id: string
  /** 'active' | 'done' | 'new' | 'prefill' */
  state: 'active' | 'done' | 'new' | 'prefill'
  label?: string
}

export interface BatchMatrixProps {
  rows: BatchUserRow[]
  hiddenCols?: number
  /** 是否显示 W 矩阵 + 箭头 */
  showWeights?: boolean
  /** 标题 */
  title?: string
  /** 副标题 / iter 编号 */
  subtitle?: string
  /** 是否高亮 prefix cache 的"共享前缀"（每行最左 N 个 cell 用统一蓝色） */
  prefixSharedCols?: number
}

const STATE_COLORS: Record<BatchUserRow['state'], { bg: string; border: string; text: string }> = {
  active: { bg: 'rgba(255, 217, 102, 0.20)', border: 'rgba(255, 217, 102, 0.6)', text: '#ffd966' },
  done: { bg: 'rgba(120, 130, 150, 0.18)', border: 'rgba(120, 130, 150, 0.4)', text: '#8a94a8' },
  new: { bg: 'rgba(255, 170, 85, 0.28)', border: 'rgba(255, 170, 85, 0.7)', text: '#ffaa55' },
  prefill: { bg: 'rgba(108, 184, 255, 0.22)', border: 'rgba(108, 184, 255, 0.6)', text: '#6cb8ff' },
}

export function BatchMatrix({
  rows,
  hiddenCols = 24,
  showWeights = true,
  title = 'Decode batch · X [N, hidden]',
  subtitle,
  prefixSharedCols = 0,
}: BatchMatrixProps) {
  const t = useT()
  const cellSize = 8
  const cellGap = 1

  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(255, 217, 102, 0.45)',
        borderRadius: 12,
        padding: '14px 18px',
        color: '#f5f7fb',
        fontSize: 11,
        boxShadow: '0 10px 36px rgba(0, 0, 0, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 480,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: 10,
          color: 'var(--color-fg-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        <span style={{ color: '#ffd966', fontFamily: 'var(--font-mono)' }}>{title}</span>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>

      {/* main row: X | @ | W | -> | Y */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* X 矩阵 */}
        <div>
          <div
            style={{
              fontSize: 9,
              color: '#ffd966',
              fontFamily: 'var(--font-mono)',
              marginBottom: 3,
              textAlign: 'center',
              opacity: 0.9,
            }}
          >
            X [{rows.length}, h]
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: cellGap,
              padding: 4,
              border: '1px dashed rgba(255, 217, 102, 0.35)',
              borderRadius: 4,
            }}
          >
            {rows.map((r) => {
              const sc = STATE_COLORS[r.state]
              return (
                <div
                  key={r.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  title={r.label}
                >
                  <div
                    style={{
                      width: 64,
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: sc.text,
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.label ?? r.id}
                  </div>
                  <div style={{ display: 'flex', gap: cellGap }}>
                    {Array.from({ length: hiddenCols }).map((_, c) => {
                      const isPrefix = prefixSharedCols > 0 && c < prefixSharedCols
                      const cellColor = isPrefix
                        ? STATE_COLORS.prefill.bg
                        : sc.bg
                      const cellBorder = isPrefix
                        ? STATE_COLORS.prefill.border
                        : sc.border
                      return (
                        <div
                          key={c}
                          style={{
                            width: cellSize,
                            height: cellSize,
                            background: cellColor,
                            border: `1px solid ${cellBorder}`,
                            borderRadius: 1,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {showWeights ? (
          <>
            <span style={{ color: '#a4ee27', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
              @
            </span>
            {/* W 矩阵 */}
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: '#a4ee27',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 3,
                  textAlign: 'center',
                  opacity: 0.9,
                }}
              >
                W [h, h]
              </div>
              <div
                style={{
                  width: hiddenCols * (cellSize + cellGap) + 8,
                  height: hiddenCols * (cellSize + cellGap) * 0.4 + 8,
                  background:
                    'linear-gradient(135deg, rgba(164, 238, 39, 0.32) 0%, rgba(164, 238, 39, 0.08) 100%)',
                  border: '1px solid rgba(164, 238, 39, 0.55)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  color: '#a4ee27',
                  fontSize: 9,
                }}
              >
                {t('batch.weights.label')}
              </div>
            </div>
            <span
              style={{
                color: 'var(--color-fg-mute)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
              }}
            >
              →
            </span>
            {/* Y 矩阵（输出） */}
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--color-fg-soft)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 3,
                  textAlign: 'center',
                  opacity: 0.9,
                }}
              >
                Y [{rows.length}, h]
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: cellGap,
                  padding: 4,
                  border: '1px dashed rgba(255, 255, 255, 0.18)',
                  borderRadius: 4,
                }}
              >
                {rows.map((r) => {
                  const sc = STATE_COLORS[r.state]
                  return (
                    <div key={r.id} style={{ display: 'flex', gap: cellGap }}>
                      {Array.from({ length: hiddenCols }).map((_, c) => (
                        <div
                          key={c}
                          style={{
                            width: cellSize,
                            height: cellSize,
                            background: sc.bg,
                            border: `1px solid ${sc.border}`,
                            opacity: r.state === 'done' ? 0.4 : 1,
                            borderRadius: 1,
                          }}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* 行状态图例 */}
      <div style={{ display: 'flex', gap: 14, fontSize: 10 }}>
        <Legend color={STATE_COLORS.active.text} label={t('batch.legend.active')} />
        <Legend color={STATE_COLORS.done.text} label={t('batch.legend.done')} />
        <Legend color={STATE_COLORS.new.text} label={t('batch.legend.new')} />
        {prefixSharedCols > 0 ? (
          <Legend color={STATE_COLORS.prefill.text} label={t('batch.legend.prefill')} />
        ) : null}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          width: 8,
          height: 8,
          background: color,
          opacity: 0.55,
          border: `1px solid ${color}`,
          borderRadius: 1,
        }}
      />
      {label}
    </span>
  )
}

/**
 * KvBlockTable：PagedAttention 的 block table 视觉。
 * 每个用户 → 一组 16-token KV block，分散在 HBM 不同位置。
 * 命中 prefix cache 的 block 用蓝色。
 */
export interface KvBlockTableProps {
  users: {
    id: string
    blocks: number[]
    /** 哪些 block 命中 prefix cache（共享） */
    sharedBlocks?: Set<number>
    /** 显示用的完整名称（如 "User A"），fallback 到 id */
    label?: string
  }[]
  /** HBM 中总 block 数 */
  totalBlocks?: number
}

export function KvBlockTable({ users, totalBlocks = 32 }: KvBlockTableProps) {
  const t = useT()
  // 收集所有 block 的归属
  const blockOwner: Record<number, { user: string; shared: boolean } | undefined> = {}
  for (const u of users) {
    for (const b of u.blocks) {
      const isShared = u.sharedBlocks?.has(b) ?? false
      // 如果已被标记为 shared，保留 shared
      if (!blockOwner[b] || isShared) {
        blockOwner[b] = { user: u.id, shared: isShared }
      }
    }
  }
  const userColor: Record<string, string> = {}
  const palette = ['#ffd966', '#ffaa55', '#a4ee27', '#6cb8ff', '#ff9ad6', '#a48cff']
  users.forEach((u, i) => {
    userColor[u.id] = palette[i % palette.length]
  })

  return (
    <div
      style={{
        background: 'rgba(36, 44, 60, 0.94)',
        backdropFilter: 'blur(14px) saturate(150%)',
        WebkitBackdropFilter: 'blur(14px) saturate(150%)',
        border: '1px solid rgba(255, 170, 85, 0.45)',
        borderRadius: 10,
        padding: '10px 14px',
        color: '#f5f7fb',
        fontSize: 11,
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
        minWidth: 320,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#ffaa55',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: 6,
          fontFamily: 'var(--font-mono)',
        }}
      >
        PagedAttention block table
      </div>

      {/* HBM 物理 block 网格 */}
      <div
        style={{
          fontSize: 9,
          color: 'var(--color-fg-mute)',
          fontFamily: 'var(--font-mono)',
          marginBottom: 3,
        }}
      >
        HBM blocks (16 token each)
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(16, 1fr)',
          gap: 2,
          padding: 4,
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 4,
          marginBottom: 8,
        }}
      >
        {Array.from({ length: totalBlocks }).map((_, b) => {
          const owner = blockOwner[b]
          const color = owner
            ? owner.shared
              ? '#6cb8ff'
              : userColor[owner.user]
            : 'rgba(255,255,255,0.05)'
          return (
            <div
              key={b}
              style={{
                width: 14,
                height: 14,
                background: color,
                border: owner
                  ? owner.shared
                    ? '1px solid rgba(108, 184, 255, 0.85)'
                    : `1px solid ${color}`
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                fontSize: 7,
                color: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {owner ? b : ''}
            </div>
          )
        })}
      </div>

      {/* 每用户的 block 列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {users.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
            <span
              style={{
                width: 56,
                color: userColor[u.id],
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {u.label ?? u.id}
            </span>
            <span style={{ color: 'var(--color-fg-mute)', fontFamily: 'var(--font-mono)' }}>
              →
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-fg-soft)' }}>
              [
              {u.blocks
                .map((b) => {
                  const isShared = u.sharedBlocks?.has(b) ?? false
                  return isShared ? `★${b}` : `${b}`
                })
                .join(', ')}
              ]
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: 'var(--color-fg-mute)', marginTop: 6 }}>
        {t('batch.kv.prefixHint')}
      </div>
    </div>
  )
}
