import * as THREE from 'three'
import { useMemo } from 'react'

interface FloorProps {
  size?: number
  /** 网格密度 */
  divisions?: number
}

export function Floor({ size = 60, divisions = 60 }: FloorProps) {
  const grid = useMemo(
    () => new THREE.GridHelper(size, divisions, '#7a8aa6', '#3f4a64'),
    [size, divisions],
  )

  return (
    <group position={[0, 0, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#323c54"
          metalness={0.22}
          roughness={0.78}
        />
      </mesh>
      <primitive object={grid} position={[0, 0.001, 0]} />
    </group>
  )
}
