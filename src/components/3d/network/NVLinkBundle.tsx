import { useMemo } from 'react'
import * as THREE from 'three'
import { M } from '../materials'

/**
 * NVLink 束（rack 内 GPU 与 NVSwitch 之间的短点对点连接，可选高亮）
 */

interface NVLinkBundleProps {
  from: [number, number, number]
  to: [number, number, number]
  active?: boolean
  count?: number
  radius?: number
}

export function NVLinkBundle({
  from,
  to,
  active = false,
  count = 1,
  radius = 0.006,
}: NVLinkBundleProps) {
  const geom = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.x += 0.04
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    return new THREE.TubeGeometry(curve, 12, radius, 6, false)
  }, [from, to, radius])
  const mat = active ? M.nvlinkEmissive : M.cableJacket
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          geometry={geom}
          material={mat}
          position={[i * 0.005, 0, 0]}
        />
      ))}
    </group>
  )
}
