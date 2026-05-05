import { useMemo } from 'react'
import { SuperchipBoard } from '../chip/SuperchipBoard'
import { ColdPlate } from './ColdPlate'
import { ConnectX7 } from './ConnectX7'
import { M } from '../materials'

/**
 * GB200 Compute Tray (1U 高度被简化为 ~70mm，便于可视化区分)：
 * - 2 颗 GB200 Superchip（2 Grace + 4 B200）
 * - 4 个 ConnectX-7 NIC（IB-NDR 400 Gbps）
 * - 液冷冷板 + quick-disconnect 管路
 *
 * tray 在 x 方向 = 机柜宽度，z 方向 = 机柜深度。
 * 单位：米。整个 tray 尺寸约 0.55 × 0.07 × 1.0。
 */

interface ComputeTrayProps {
  position?: [number, number, number]
  /**
   * 整个 tray 内 4 颗 GPU 的状态，用于故障演示。
   * 顺序：[superchip0.gpu0, superchip0.gpu1, superchip1.gpu0, superchip1.gpu1]
   */
  gpuStates?: ('normal' | 'warn' | 'fail')[]
  /** 4 颗 GPU 的 HBM 占用百分比（每颗 8 个 HBM stack） */
  hbmFill?: number[][]
  hbmFillColor?: string
  /** lod=low 时只画外壳，不展开内部 */
  lod?: 'low' | 'high'
  /** IB NIC 是否激活（点灯） */
  ibActive?: boolean
}

const TRAY_W = 0.56
const TRAY_H = 0.07
const TRAY_D = 1.0

export function ComputeTray({
  position = [0, 0, 0],
  gpuStates = ['normal', 'normal', 'normal', 'normal'],
  hbmFill,
  hbmFillColor,
  lod = 'high',
  ibActive = false,
}: ComputeTrayProps) {
  const top = TRAY_H

  const showInternal = lod === 'high'

  // 把 4 个 NIC 安排在 tray 后方
  const nicXs = useMemo(
    () => [-TRAY_W * 0.36, -TRAY_W * 0.12, TRAY_W * 0.12, TRAY_W * 0.36],
    [],
  )

  return (
    <group position={position}>
      <mesh material={M.trayMetal} position={[0, top / 2, 0]}>
        <boxGeometry args={[TRAY_W, top, TRAY_D]} />
      </mesh>

      {showInternal ? (
        <>
          <SuperchipBoard
            position={[0, top, -TRAY_D / 4]}
            gpuStates={[gpuStates[0], gpuStates[1]]}
            hbmFill={hbmFill?.slice(0, 2)}
            hbmFillColor={hbmFillColor}
          />
          <SuperchipBoard
            position={[0, top, TRAY_D / 4]}
            gpuStates={[gpuStates[2], gpuStates[3]]}
            hbmFill={hbmFill?.slice(2, 4)}
            hbmFillColor={hbmFillColor}
          />

          <ColdPlate
            position={[0, top + 0.024, -TRAY_D / 4]}
            size={[0.5, 0.3]}
            showConnectors={false}
          />
          <ColdPlate
            position={[0, top + 0.024, TRAY_D / 4]}
            size={[0.5, 0.3]}
            showConnectors
          />

          {nicXs.map((x, i) => (
            <ConnectX7
              key={i}
              position={[x, top, TRAY_D / 2 - 0.05]}
              active={ibActive}
            />
          ))}
        </>
      ) : null}

      {/* tray 前面板：拉手 + LED */}
      <group position={[0, 0, TRAY_D / 2 + 0.001]}>
        <mesh material={M.chassisDark}>
          <planeGeometry args={[TRAY_W * 0.96, TRAY_H * 0.92]} />
        </mesh>
        <mesh material={M.heatsinkAlu} position={[0, TRAY_H / 2 - 0.008, 0.002]}>
          <boxGeometry args={[TRAY_W * 0.4, 0.006, 0.004]} />
        </mesh>
        <mesh material={M.ledGreen} position={[-TRAY_W * 0.42, 0, 0.003]}>
          <boxGeometry args={[0.006, 0.003, 0.001]} />
        </mesh>
        <mesh material={M.ledBlue} position={[TRAY_W * 0.42, 0, 0.003]}>
          <boxGeometry args={[0.006, 0.003, 0.001]} />
        </mesh>
      </group>
    </group>
  )
}

export const COMPUTE_TRAY_DIM = {
  width: TRAY_W,
  height: TRAY_H,
  depth: TRAY_D,
}
