import { useMemo } from 'react'
import * as THREE from 'three'
import { M } from '../materials'

/**
 * Grace ARM CPU package：72 Neoverse V2 cores + LPDDR5X 集成。
 * 在 GB200 superchip 中 1 颗 Grace 通过 NVLink-C2C (900 GB/s) 连接到 2 颗 B200。
 *
 * 实物上 Grace die 居中，周围一圈 LPDDR5X 封装（共 16 颗，组成 480 GB）。
 * 整个 module 安装在一块 teal 色的载板/凹槽里。
 */

interface GraceCPUProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function GraceCPU({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: GraceCPUProps) {
  const w = 0.21
  const h = 0.011
  const d = 0.13

  const carrierMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1f5a6e',
        metalness: 0.35,
        roughness: 0.55,
      }),
    [],
  )

  const lpddrMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a3242',
        metalness: 0.3,
        roughness: 0.55,
      }),
    [],
  )

  const dieW = 0.058
  const dieD = 0.05
  const lpddrW = 0.018
  const lpddrD = 0.014

  return (
    <group position={position} rotation={rotation}>
      {/* teal 凹槽 / carrier 板 */}
      <mesh material={carrierMat} position={[0, h * 0.4, 0]}>
        <boxGeometry args={[w, h * 0.8, d]} />
      </mesh>

      {/* Grace 封装 substrate */}
      <mesh material={M.packageGold} position={[0, h, 0]}>
        <boxGeometry args={[dieW + 0.012, h * 0.5, dieD + 0.012]} />
      </mesh>
      {/* Grace die (single chiplet) */}
      <mesh material={M.silicon} position={[0, h + h * 0.3, 0]}>
        <boxGeometry args={[dieW, 0.005, dieD]} />
      </mesh>

      {/* LPDDR5X：上下两排各 4 颗 + 左右两侧各 1 颗，共 10 颗 */}
      {[-1, 1].map((sz) =>
        [-1.5, -0.5, 0.5, 1.5].map((nx) => {
          const x = nx * (lpddrW + 0.004)
          const z = sz * (dieD / 2 + lpddrD / 2 + 0.005)
          return (
            <mesh
              key={`lp-h-${sz}-${nx}`}
              material={lpddrMat}
              position={[x, h + 0.0035, z]}
            >
              <boxGeometry args={[lpddrW, 0.006, lpddrD]} />
            </mesh>
          )
        }),
      )}
      {[-1, 1].map((sx) => (
        <mesh
          key={`lp-v-${sx}`}
          material={lpddrMat}
          position={[sx * (dieW / 2 + lpddrW / 2 + 0.005), h + 0.0035, 0]}
        >
          <boxGeometry args={[lpddrW, 0.006, lpddrD]} />
        </mesh>
      ))}
    </group>
  )
}
