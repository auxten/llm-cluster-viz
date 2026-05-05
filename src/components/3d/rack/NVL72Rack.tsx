import { useMemo } from 'react'
import { M } from '../materials'
import { ComputeTray, COMPUTE_TRAY_DIM } from './ComputeTray'
import { NVSwitchTray, NVSWITCH_TRAY_DIM } from './NVSwitchTray'
import { Backplane } from './Backplane'
import { Cooling } from './Cooling'

/**
 * GB200 NVL72 完整机柜（程序化）。
 *
 * 真实物理参数（参考 NVIDIA datasheet）：
 * - 总高度约 2.13m（~48U + cable manager）
 * - 宽度约 0.6m（含 side rail 后约 0.7m，仅可视化）
 * - 深度约 1.2m
 * - 18 compute trays + 9 NVSwitch trays，按 [9 compute][9 nvswitch][9 compute] 三段对称排布
 * - 5,000+ 根 NVLink 铜缆汇聚到背部 spine
 * - 满负载 ~120kW，必须液冷
 */

interface NVL72RackProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** 沙盒/storyline 高亮 */
  highlight?: boolean
  /** 远景 LOD：low 不展开 tray 内部 */
  lod?: 'low' | 'high'
  /**
   * 72 颗 GPU 状态数组（按 tray 顺序展开），用于故障演示。
   * 长度应为 72，按 [tray0.gpu0..3, tray1.gpu0..3, ...] 排列。
   * 不传则全部 normal。
   */
  gpuStates?: ('normal' | 'warn' | 'fail')[]
  /** 整个 rack 的 NVSwitch 平均流量负载（0..1） */
  switchLoad?: number
  /** rack 标签（用于 multi-rack 场景区分） */
  label?: string
  /** 是否显示液冷管路 */
  showCooling?: boolean
}

const RACK_W = 0.66
const RACK_H = 2.1
const RACK_D = 1.2
const FRAME_T = 0.025
const TRAY_GAP = 0.005

const computeRows = 18
const switchRows = 9
const totalTrays = computeRows + switchRows

const BACKPLANE_Z = -RACK_D / 2 + 0.04
const BACKPLANE_WIDTH = RACK_W * 0.92

export interface RackTrayPos {
  kind: 'compute' | 'switch'
  y: number
  trayIndex: number
}

/**
 * 纯函数：算出 NVL72 内部 tray 的 y 坐标布局。
 * 让 storyline overlay 可以在不依赖 NVL72Rack 实例的情况下复用同一套位置。
 */
export function computeRackLayout() {
  const baseY = 0.18
  const items: { kind: 'compute' | 'switch'; trayIndex: number }[] = []
  let computeIdx = 0
  for (let i = 0; i < 9; i++)
    items.push({ kind: 'compute', trayIndex: computeIdx++ })
  for (let i = 0; i < 9; i++)
    items.push({ kind: 'switch', trayIndex: i })
  for (let i = 0; i < 9; i++)
    items.push({ kind: 'compute', trayIndex: computeIdx++ })

  const trays: RackTrayPos[] = []
  let cursor = baseY
  items.forEach((it) => {
    const h =
      it.kind === 'compute' ? COMPUTE_TRAY_DIM.height : NVSWITCH_TRAY_DIM.height
    trays.push({ kind: it.kind, y: cursor + h / 2, trayIndex: it.trayIndex })
    cursor += h + TRAY_GAP
  })

  const computeTrayYs = trays.filter((y) => y.kind === 'compute').map((y) => y.y)
  const nvswitchYs = trays.filter((y) => y.kind === 'switch').map((y) => y.y)
  const nvswitchCenterY =
    nvswitchYs.reduce((a, b) => a + b, 0) / Math.max(1, nvswitchYs.length)

  return {
    trays,
    computeTrayYs,
    nvswitchYs,
    nvswitchCenterY,
    backplaneZ: BACKPLANE_Z,
    backplaneWidth: BACKPLANE_WIDTH,
  }
}

export function NVL72Rack({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  highlight = false,
  lod = 'high',
  gpuStates,
  switchLoad = 0.4,
  label,
  showCooling = true,
}: NVL72RackProps) {
  const layout = useMemo(() => computeRackLayout(), [])
  const yPositions = layout.trays
  const computeYs = layout.computeTrayYs
  const nvswitchCenterY = layout.nvswitchCenterY

  return (
    <group position={position} rotation={rotation}>
      <RackFrame highlight={highlight} />

      {yPositions.map((y, i) => {
        if (y.kind === 'compute') {
          const trayGpuStates = gpuStates
            ? gpuStates.slice(y.trayIndex * 4, y.trayIndex * 4 + 4)
            : undefined
          return (
            <ComputeTray
              key={`c${i}`}
              position={[0, y.y - COMPUTE_TRAY_DIM.height / 2, 0]}
              gpuStates={trayGpuStates as ('normal' | 'warn' | 'fail')[]}
              ibActive={switchLoad > 0.1}
              lod={lod}
            />
          )
        }
        return (
          <NVSwitchTray
            key={`s${i}`}
            position={[0, y.y - NVSWITCH_TRAY_DIM.height / 2, 0]}
            loadPct={switchLoad}
            lod={lod}
          />
        )
      })}

      {lod === 'high' ? (
        <Backplane
          z={BACKPLANE_Z}
          computeTrayYs={computeYs}
          nvswitchCenterY={nvswitchCenterY}
          width={BACKPLANE_WIDTH}
        />
      ) : null}

      {lod === 'high' && showCooling ? (
        <Cooling z={-RACK_D / 2 + 0.02} height={RACK_H} width={RACK_W * 0.94} />
      ) : null}

      {label ? <RackLabel label={label} /> : null}

      {highlight ? (
        <mesh position={[0, RACK_H / 2, 0]}>
          <boxGeometry args={[RACK_W * 1.06, RACK_H * 1.02, RACK_D * 1.06]} />
          <meshBasicMaterial
            color="#76b900"
            transparent
            opacity={0.06}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  )
}

function RackFrame({ highlight }: { highlight?: boolean }) {
  return (
    <group>
      {/* 4 corner posts */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          material={M.chassis}
          position={[
            (sx * RACK_W) / 2,
            RACK_H / 2,
            (sz * RACK_D) / 2,
          ]}
        >
          <boxGeometry args={[FRAME_T, RACK_H, FRAME_T]} />
        </mesh>
      ))}
      {/* top + bottom */}
      <mesh material={M.chassis} position={[0, RACK_H - FRAME_T / 2, 0]}>
        <boxGeometry args={[RACK_W, FRAME_T, RACK_D]} />
      </mesh>
      <mesh material={M.chassisDark} position={[0, FRAME_T / 2, 0]}>
        <boxGeometry args={[RACK_W, FRAME_T, RACK_D]} />
      </mesh>
      {/* side panels (back only, leaving front open for trays) */}
      <mesh
        material={M.chassisDark}
        position={[-RACK_W / 2 + FRAME_T / 2, RACK_H / 2, 0]}
      >
        <boxGeometry args={[FRAME_T * 0.8, RACK_H - FRAME_T * 2, RACK_D * 0.95]} />
      </mesh>
      <mesh
        material={M.chassisDark}
        position={[RACK_W / 2 - FRAME_T / 2, RACK_H / 2, 0]}
      >
        <boxGeometry args={[FRAME_T * 0.8, RACK_H - FRAME_T * 2, RACK_D * 0.95]} />
      </mesh>
      {/* indicator on top */}
      <mesh
        material={highlight ? M.ledGreen : M.ledBlue}
        position={[0, RACK_H - 0.012, RACK_D / 2 - 0.04]}
      >
        <boxGeometry args={[0.06, 0.004, 0.012]} />
      </mesh>
    </group>
  )
}

function RackLabel({ label }: { label: string }) {
  // 简单用一个发光的小条作为可识别标签锚（真实文字标签由 HTML overlay 提供，避免 R3F 字体加载）
  return (
    <group>
      <mesh material={M.ledBlue} position={[0, RACK_H + 0.04, 0]}>
        <boxGeometry args={[0.12, 0.008, 0.012]} />
      </mesh>
      <mesh
        material={M.chassisDark}
        position={[0, RACK_H + 0.025, 0]}
        visible={false}
      >
        <boxGeometry args={[label.length * 0.02, 0.04, 0.02]} />
      </mesh>
    </group>
  )
}

export const NVL72_DIM = {
  width: RACK_W,
  height: RACK_H,
  depth: RACK_D,
  computeTrayCount: computeRows,
  switchTrayCount: switchRows,
  totalTrayCount: totalTrays,
  backplaneZ: BACKPLANE_Z,
  backplaneWidth: BACKPLANE_WIDTH,
}
