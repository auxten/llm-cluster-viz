import { M } from '../materials'
import { ColdPlate } from './ColdPlate'

/**
 * NVSwitch tray (1U)：
 * - 包含 2 颗 NVSwitch ASIC（5th-gen，每颗提供 144 NVLink ports）
 * - 全部 GPU 通过这些 ASIC 实现 all-to-all 互联
 * - 9 个 NVSwitch tray × 2 ASIC = 18 ASIC（实际配置）
 *
 * tray 尺寸 = 与 compute tray 同宽，但更扁平。
 */

interface NVSwitchTrayProps {
  position?: [number, number, number]
  /** 全部端口繁忙 → emissive 加强 */
  loadPct?: number
  lod?: 'low' | 'high'
}

const TRAY_W = 0.56
const TRAY_H = 0.045
const TRAY_D = 1.0

export function NVSwitchTray({
  position = [0, 0, 0],
  loadPct = 0.4,
  lod = 'high',
}: NVSwitchTrayProps) {
  const top = TRAY_H

  return (
    <group position={position}>
      <mesh material={M.trayMetal} position={[0, top / 2, 0]}>
        <boxGeometry args={[TRAY_W, top, TRAY_D]} />
      </mesh>

      {lod === 'high' ? (
        <>
          {/* 2 颗 NVSwitch ASIC */}
          {[-TRAY_D / 5, TRAY_D / 5].map((z, i) => (
            <group key={i} position={[0, top, z]}>
              <mesh material={M.pcbBlack}>
                <boxGeometry args={[0.32, 0.006, 0.32]} />
              </mesh>
              <mesh material={M.silicon} position={[0, 0.008, 0]}>
                <boxGeometry args={[0.13, 0.006, 0.13]} />
              </mesh>
            </group>
          ))}
          {/* 共用一片冷板 */}
          <ColdPlate
            position={[0, top + 0.012, 0]}
            size={[0.45, 0.7]}
            showConnectors
          />
        </>
      ) : null}

      <group position={[0, 0, TRAY_D / 2 + 0.001]}>
        <mesh material={M.chassisDark}>
          <planeGeometry args={[TRAY_W * 0.96, TRAY_H * 0.86]} />
        </mesh>
        {/* 一排 NVLink LED 表征流量 */}
        {Array.from({ length: 12 }).map((_, i) => {
          const intensity = Math.min(1, loadPct + 0.15 * Math.sin(i + position[1]))
          const opacity = 0.25 + 0.75 * intensity
          return (
            <mesh
              key={i}
              position={[
                -TRAY_W * 0.42 + (i / 11) * (TRAY_W * 0.84),
                0,
                0.003,
              ]}
            >
              <boxGeometry args={[0.005, 0.004, 0.001]} />
              <meshBasicMaterial color="#a4ee27" transparent opacity={opacity} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

export const NVSWITCH_TRAY_DIM = {
  width: TRAY_W,
  height: TRAY_H,
  depth: TRAY_D,
}
