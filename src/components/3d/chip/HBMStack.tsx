import { useMemo } from 'react'
import * as THREE from 'three'
import { M } from '../materials'

/**
 * 一颗 HBM3e 堆栈：12 层（HBM3e 12-Hi），堆叠在 base die 上。
 * 实物大约 11mm × 11mm × 0.78mm。
 */

interface HBMStackProps {
  position?: [number, number, number]
  /** 单位 = 米。默认 0.011（11mm） */
  size?: number
  /** 占用百分比 (0..1)，会在顶部画一道发光指示，用于 KV cache / weights 占用可视化 */
  fillPct?: number
  /** 占用条颜色 */
  fillColor?: string
}

export function HBMStack({
  position = [0, 0, 0],
  size = 0.04,
  fillPct,
  fillColor = '#a4ee27',
}: HBMStackProps) {
  const layers = 12
  const layerH = size * 0.18 / layers
  const baseH = size * 0.04

  const fillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: fillColor,
        transparent: true,
        opacity: 0.85,
      }),
    [fillColor],
  )

  const totalH = baseH + layers * layerH

  return (
    <group position={position}>
      <mesh material={M.silicon} position={[0, baseH / 2, 0]}>
        <boxGeometry args={[size, baseH, size]} />
      </mesh>
      {Array.from({ length: layers }).map((_, i) => (
        <mesh
          key={i}
          material={M.hbm}
          position={[0, baseH + (i + 0.5) * layerH, 0]}
        >
          <boxGeometry args={[size * 0.96, layerH, size * 0.96]} />
        </mesh>
      ))}
      {fillPct != null && fillPct > 0 ? (
        <mesh
          material={fillMat}
          position={[0, baseH + layers * layerH + 0.0006, 0]}
        >
          <boxGeometry
            args={[size * 0.7 * fillPct, 0.001, size * 0.7]}
          />
        </mesh>
      ) : null}
      <mesh
        position={[0, totalH + 0.0001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  )
}
