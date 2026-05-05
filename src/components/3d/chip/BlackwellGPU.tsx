import { useMemo } from 'react'
import * as THREE from 'three'
import { M } from '../materials'
import { HBMStack } from './HBMStack'

/**
 * Blackwell B200 GPU package：
 * - 2 个 reticle-limited die，沿短边贴合排成长条 (~52×33mm 实际)
 * - 8 颗 HBM3e stack：die 长边的上下两侧各 4 颗
 * - die-to-die 互联 10 TB/s（在 die 中央用一条银色细带视觉化）
 *
 * 实物 package 约 76mm × 67mm；这里按可视化需要稍放大。
 * 单位米，缩放在外层 ComputeTray 里再统一调。
 */

interface BlackwellGPUProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** GPU 标识，用于故障演示等 */
  id?: string
  /** 状态：normal / warn / fail，影响发光颜色 */
  state?: 'normal' | 'warn' | 'fail'
  /** HBM 占用比例数组（长度 8），范围 0..1 */
  hbmFill?: number[]
  hbmFillColor?: string
  showHBM?: boolean
}

export function BlackwellGPU({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  state = 'normal',
  hbmFill,
  hbmFillColor,
  showHBM = true,
}: BlackwellGPUProps) {
  const stateColor = useMemo(() => {
    if (state === 'fail') return '#ff7a7a'
    if (state === 'warn') return '#ffc56b'
    return '#a4ee27'
  }, [state])

  const ledMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: stateColor,
      }),
    [stateColor],
  )

  // package：长边 (x) 容纳 die strip + 边距；短边 (z) 容纳 die 高度 + 上下两排 HBM
  const pkgW = 0.13
  const pkgH = 0.011
  const pkgD = 0.115
  // die：每片长边 (z) 比短边 (x) 长，2 片沿 x 紧贴
  const dieW = 0.028
  const dieD = 0.05
  const dieH = 0.004
  const dieGap = 0.002
  const hbmSize = 0.016

  return (
    <group position={position} rotation={rotation}>
      <mesh material={M.packageGold} position={[0, pkgH / 2, 0]}>
        <boxGeometry args={[pkgW, pkgH, pkgD]} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh
          key={`die${s}`}
          material={M.silicon}
          position={[(dieW / 2 + dieGap / 2) * s, pkgH + dieH / 2, 0]}
        >
          <boxGeometry args={[dieW, dieH, dieD]} />
        </mesh>
      ))}
      {/* die-to-die NV-HBI bar */}
      <mesh
        position={[0, pkgH + dieH + 0.0005, 0]}
        material={M.heatsinkAlu}
      >
        <boxGeometry args={[dieGap + 0.001, 0.0008, dieD * 0.9]} />
      </mesh>

      {/* 8 颗 HBM3e: die 上下两排（沿 z 边），每排 4 颗沿 x 方向 */}
      {showHBM
        ? Array.from({ length: 8 }).map((_, i) => {
            const side = i < 4 ? -1 : 1
            const idx = i % 4
            const z = (pkgD / 2 - hbmSize / 2 - 0.004) * side
            const x = -pkgW / 2 + 0.018 + idx * ((pkgW - 0.036) / 3)
            return (
              <HBMStack
                key={i}
                position={[x, pkgH, z]}
                size={hbmSize}
                fillPct={hbmFill?.[i]}
                fillColor={hbmFillColor ?? stateColor}
              />
            )
          })
        : null}

      <mesh
        material={ledMat}
        position={[pkgW / 2 - 0.005, pkgH + 0.001, pkgD / 2 - 0.005]}
      >
        <boxGeometry args={[0.003, 0.002, 0.003]} />
      </mesh>
    </group>
  )
}
