import { useMemo } from 'react'
import * as THREE from 'three'
import { BlackwellGPU } from './BlackwellGPU'
import { GraceCPU } from './GraceCPU'
import { M } from '../materials'

/**
 * GB200 Superchip 板（Bianca 板）：1 颗 Grace + 2 颗 B200。
 *
 * 实物比例：约 215mm × 400mm 的纵向 PCB（高:宽 ≈ 1.85:1）。
 * 上 1/3：2 颗 B200 + 高速连接器；中 1/3：Grace + LPDDR；下 1/3：电源 / 边连接器。
 * 每个 ComputeTray 装 2 块 SuperchipBoard，沿 tray 长边 (z) 串联。
 */

interface SuperchipBoardProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** GPU 状态数组 [gpu0, gpu1] */
  gpuStates?: ('normal' | 'warn' | 'fail')[]
  /** 每颗 GPU 的 HBM 占用百分比（0..1），传入二维数组 [gpu][hbm] */
  hbmFill?: number[][]
  hbmFillColor?: string
  showHBM?: boolean
}

const BOARD_W = 0.3
const BOARD_H = 0.01
const BOARD_D = 0.5

export function SuperchipBoard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  gpuStates = ['normal', 'normal'],
  hbmFill,
  hbmFillColor,
  showHBM = true,
}: SuperchipBoardProps) {
  const w = BOARD_W
  const h = BOARD_H
  const d = BOARD_D

  const connectorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#222633',
        metalness: 0.5,
        roughness: 0.45,
      }),
    [],
  )
  const connectorPin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c4a55a',
        metalness: 0.95,
        roughness: 0.3,
      }),
    [],
  )
  const capMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1f2c',
        metalness: 0.4,
        roughness: 0.55,
      }),
    [],
  )
  const goldPadMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#caa84e',
        metalness: 0.92,
        roughness: 0.3,
      }),
    [],
  )

  // —— 沿 z 方向（长边）从上往下分区 ——
  // -z = 板的"上端"（照片顶部），+z = "下端"（照片底部）
  const topConnectorZ = -d / 2 + 0.02
  const b200Z = -d / 2 + 0.13
  const graceZ = -d / 2 + 0.30
  const vrmZ = d / 2 - 0.13
  const bottomConnectorZ = d / 2 - 0.02

  // 2 颗 B200 沿 x 方向（短边）并排
  const b200X = w / 2 - 0.07

  return (
    <group position={position} rotation={rotation}>
      {/* PCB 主体 */}
      <mesh material={M.pcbGreen} position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
      </mesh>

      {/* ===== 顶端 2 个 NVLink / 电源连接器（板的上端）===== */}
      {[-1, 1].map((sx) => (
        <group key={`tcn${sx}`} position={[sx * w * 0.27, h, topConnectorZ]}>
          <mesh material={connectorMat} position={[0, 0.012, 0]}>
            <boxGeometry args={[0.10, 0.024, 0.025]} />
          </mesh>
          {/* 触片 */}
          <mesh material={connectorPin} position={[0, 0.024, 0.013]}>
            <boxGeometry args={[0.085, 0.002, 0.001]} />
          </mesh>
          {/* 顶部箭头标识 */}
          <mesh material={M.heatsinkAlu} position={[0, 0.025, 0]}>
            <boxGeometry args={[0.018, 0.0005, 0.012]} />
          </mesh>
        </group>
      ))}

      {/* PCB trace 装饰带 */}
      <mesh material={M.heatsinkAlu} position={[0, h + 0.0005, -d / 2 + 0.05]}>
        <boxGeometry args={[w * 0.78, 0.001, 0.003]} />
      </mesh>

      {/* ===== 上 1/3：2 颗 B200 ===== */}
      <BlackwellGPU
        position={[-b200X, h, b200Z]}
        state={gpuStates[0]}
        hbmFill={hbmFill?.[0]}
        hbmFillColor={hbmFillColor}
        showHBM={showHBM}
      />
      <BlackwellGPU
        position={[b200X, h, b200Z]}
        state={gpuStates[1]}
        hbmFill={hbmFill?.[1]}
        hbmFillColor={hbmFillColor}
        showHBM={showHBM}
      />

      {/* B200 周围的安装挂耳 */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].flatMap((sxx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`scr-${sx}-${sxx}-${sz}`}
              material={goldPadMat}
              position={[
                sx * b200X + sxx * 0.078,
                h + 0.001,
                b200Z + sz * 0.072,
              ]}
            >
              <cylinderGeometry args={[0.004, 0.004, 0.003, 12]} />
            </mesh>
          )),
        ),
      )}

      {/* ===== 中 1/3：Grace + LPDDR ===== */}
      <GraceCPU position={[0, h, graceZ]} />

      {/* ===== 下 1/3：电源 / 连接器 ===== */}
      {/* 中央两块 voltage regulator */}
      {[-1, 1].map((sx) => (
        <mesh
          key={`vrm${sx}`}
          material={goldPadMat}
          position={[sx * 0.05, h + 0.001, vrmZ]}
        >
          <boxGeometry args={[0.06, 0.002, 0.04]} />
        </mesh>
      ))}

      {/* 左右两侧 PCIe 边连接器 */}
      {[-1, 1].map((sx) => (
        <group
          key={`edge${sx}`}
          position={[sx * (w / 2 - 0.025), h, vrmZ + 0.04]}
        >
          <mesh material={connectorMat} position={[0, 0.005, 0]}>
            <boxGeometry args={[0.04, 0.01, 0.07]} />
          </mesh>
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh
              key={i}
              material={connectorPin}
              position={[0, 0.0105, -0.03 + i * 0.01]}
            >
              <boxGeometry args={[0.03, 0.001, 0.002]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 散布的电容/小元件 */}
      {Array.from({ length: 22 }).map((_, i) => {
        const seed = i * 13.7
        const x = ((seed % w) - w / 2) * 0.85
        const z = vrmZ - 0.07 + ((seed * 0.31) % 0.18)
        return (
          <mesh
            key={`cap${i}`}
            material={capMat}
            position={[x, h + 0.0015, z]}
          >
            <boxGeometry args={[0.005, 0.003, 0.004]} />
          </mesh>
        )
      })}

      {/* 底端 2 个电源/IO 连接器 */}
      {[-1, 1].map((sx) => (
        <group
          key={`bcn${sx}`}
          position={[sx * w * 0.30, h, bottomConnectorZ]}
        >
          <mesh material={connectorMat} position={[0, 0.008, 0]}>
            <boxGeometry args={[0.05, 0.016, 0.02]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export const SUPERCHIP_BOARD_DIM = {
  width: BOARD_W,
  depth: BOARD_D,
  height: BOARD_H,
  b200X: BOARD_W / 2 - 0.07,
  b200Z: -BOARD_D / 2 + 0.13,
  graceZ: -BOARD_D / 2 + 0.30,
}
