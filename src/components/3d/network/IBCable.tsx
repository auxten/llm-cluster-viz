import { useMemo } from 'react'
import * as THREE from 'three'
import { M } from '../materials'

/**
 * 一根 IB cable：从 (from) 到 (to) 的弯曲管，可选自带 emissive 流动效果。
 * 流动效果用 useFrame 在 storyline 组件中覆盖。
 */

interface IBCableProps {
  from: [number, number, number]
  to: [number, number, number]
  /** 弯曲幅度（向上抬起的高度比例） */
  arc?: number
  /** 半径 */
  radius?: number
  /** 是否高亮（数据流动中） */
  active?: boolean
  /** 颜色覆盖（默认蓝色 IB） */
  color?: 'ib' | 'nvlink'
}

export function IBCable({
  from,
  to,
  arc = 0.3,
  radius = 0.012,
  active = false,
  color = 'ib',
}: IBCableProps) {
  const geom = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const dist = a.distanceTo(b)
    mid.y += dist * arc
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    return new THREE.TubeGeometry(curve, 24, radius, 8, false)
  }, [from, to, arc, radius])

  const mat = useMemo(() => {
    if (active) return color === 'ib' ? M.ibEmissive : M.nvlinkEmissive
    return M.cableJacket
  }, [active, color])

  return <mesh geometry={geom} material={mat} />
}
