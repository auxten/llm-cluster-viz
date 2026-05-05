import { useMemo } from 'react'
import { useStory } from '../state/storyStore'
import { Math as Mat } from '../ui/Math'
import { BlackwellB200, DeepSeekV3 } from '../data/specs'
import { useT } from '../i18n'

/**
 * 此 HUD 渲染为一个普通的 React DOM overlay（在 App 层挂载，不进 R3F），
 * 因此它和 chip 场景无关，可以可靠地放在屏幕左上角。
 */

/**
 * S5: KV Cache 内存预算 (chip 层叠加)
 *
 * 视觉：
 *  - 在 SuperchipBoard 旁边浮空一个 HBM 占用饼图 / 横向堆叠条
 *  - 随 step 改变 batch / context 假设，看 weights vs KV 比例
 *  - 数学公式：单 GPU 内存 = N_total/(E·P) + B·L_ctx·bytes_per_tok / E
 *
 * 步骤：
 *  0. 只装 weights  (B = 0)
 *  1. 加 batch (B = 64, ctx = 16k)
 *  2. 加 context (B = 64, ctx = 128k)
 *  3. PP=4 后看 weights 减少但 KV 没变
 */

interface S5Scenario {
  E: number
  P: number
  B: number
  L: number
  bytesPerTok: number
  weightsPerGPU_GB: number
  kvPerGPU_GB: number
  hbmCap: number
  weightsPct: number
  kvPct: number
}

function useS5Scenario(): S5Scenario {
  const stepIndex = useStory((s) => s.stepIndex)
  return useMemo(() => {
    const E = 64
    const N_total_GB = DeepSeekV3.totalParamsB.value * 0.5
    const bytesPerTok = 1024
    let B = 0
    let L = 0
    let P = 1
    // i4_kv_cache_budget 的 5 步：
    //   0 weights_only, 1 short_ctx (B=64, ctx=4K), 2 long_ctx (B=64, ctx=128K),
    //   3 try_pp (PP=4), 4 tradeoff (低 batch 长 context)
    if (stepIndex === 1) {
      B = 64
      L = 4 * 1024
    } else if (stepIndex === 2) {
      B = 64
      L = 128 * 1024
    } else if (stepIndex === 3) {
      B = 64
      L = 128 * 1024
      P = 4
    } else if (stepIndex === 4) {
      // 长 context 必须降 batch 维持容量
      B = 8
      L = 128 * 1024
    }
    const weightsPerGPU_GB = N_total_GB / (E * P)
    const kvPerGPU_GB = (B * L * bytesPerTok) / E / 1e9
    const hbmCap = BlackwellB200.hbmCapacityGB.value
    return {
      E,
      P,
      B,
      L,
      bytesPerTok,
      weightsPerGPU_GB,
      kvPerGPU_GB,
      hbmCap,
      weightsPct: Math.min(1, weightsPerGPU_GB / hbmCap),
      kvPct: Math.min(1, kvPerGPU_GB / hbmCap),
    }
  }, [stepIndex])
}

/**
 * 在 R3F Canvas 之外渲染的 HUD。绑定在 App 顶层，按 storyId/layer 决定可见性。
 */
export function KvCacheHud() {
  const storyId = useStory((s) => s.storyId)
  const layer = useStory((s) => s.layer)
  const mode = useStory((s) => s.mode)
  const stepIndex = useStory((s) => s.stepIndex)
  const scenario = useS5Scenario()
  const t = useT()

  if (mode !== 'guided') return null
  if (storyId !== 'i4_kv_cache_budget') return null
  if (layer !== 'chip') return null

  return (
    <div
      className="pointer-events-none absolute z-20 hidden md:block"
      style={{ top: 96, left: 24, width: 300 }}
    >
      <div
        className="panel rounded-xl"
        style={{
          padding: '10px 14px',
          color: 'var(--color-fg)',
          fontSize: 12,
          lineHeight: 1.5,
          textAlign: 'left',
          border: '1px solid rgba(164, 238, 39, 0.45)',
        }}
      >
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-fg-mute)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}
          >
            {t('s5.title')}
          </div>

          <div
            style={{
              position: 'relative',
              height: 22,
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 4,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${scenario.weightsPct * 100}%`,
                background: 'linear-gradient(90deg, #a4ee27, #c8ff5a)',
                transition: 'width 0.6s ease',
              }}
              title="weights"
            />
            <div
              style={{
                width: `${scenario.kvPct * 100}%`,
                background: 'linear-gradient(90deg, #ffd966, #ffaa55)',
                transition: 'width 0.6s ease',
              }}
              title="kv cache"
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              marginTop: 6,
            }}
          >
            <span style={{ color: '#c8ff5a' }}>
              ◼ {t('s5.weights')} {scenario.weightsPerGPU_GB.toFixed(1)} GB
            </span>
            <span style={{ color: '#ffd966' }}>
              ◼ {t('s5.kv')} {scenario.kvPerGPU_GB.toFixed(1)} GB
            </span>
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--color-fg-mute)',
              marginTop: 4,
            }}
          >
            {t('s5.free')} {(scenario.hbmCap - scenario.weightsPerGPU_GB - scenario.kvPerGPU_GB).toFixed(1)} GB
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.16)',
              marginTop: 10,
              paddingTop: 8,
            }}
          >
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              <Mat
                tex={String.raw`\frac{N_\text{total}}{E\cdot P} + \frac{B \cdot L_\text{ctx} \cdot \text{bytes/tok}}{E}`}
              />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-fg-mute)',
                lineHeight: 1.6,
              }}
            >
              E = {scenario.E} · P = {scenario.P}
              <br />
              B = {scenario.B} · L = {scenario.L >= 1024 ? `${scenario.L / 1024}K` : scenario.L}
            </div>
          </div>

          {stepIndex === 2 ? (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: 'rgba(255, 122, 122, 0.18)',
                border: '1px solid rgba(255, 122, 122, 0.5)',
                borderRadius: 6,
                fontSize: 13,
                color: '#ffd0d0',
              }}
            >
              {t('s5.note.long')}
            </div>
          ) : null}
          {stepIndex === 3 ? (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: 'rgba(255, 122, 122, 0.18)',
                border: '1px solid rgba(255, 122, 122, 0.5)',
                borderRadius: 6,
                fontSize: 13,
                color: '#ffd0d0',
              }}
            >
              {t('s5.note.pp')}
            </div>
          ) : null}
          {stepIndex === 4 ? (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: 'rgba(108, 184, 255, 0.18)',
                border: '1px solid rgba(108, 184, 255, 0.5)',
                borderRadius: 6,
                fontSize: 13,
                color: '#bcdcff',
              }}
            >
              {t('s5.note.tradeoff')}
            </div>
          ) : null}
      </div>
    </div>
  )
}
