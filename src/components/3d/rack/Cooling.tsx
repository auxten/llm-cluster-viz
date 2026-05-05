import { useMemo } from 'react'
import * as THREE from 'three'
import { M } from '../materials'

/**
 * NVL72 液冷管路：
 * - 蓝色 = 冷却液入（CDU 出来）
 * - 红色 = 冷却液出（GPU/NVSwitch 加热后回 CDU）
 * - 在 rack 后侧贯穿整个高度，分支到每个 tray
 */

interface CoolingProps {
  z: number
  height: number
  width: number
}

export function Cooling({ z, height, width }: CoolingProps) {
  const coldGeo = useMemo(() => {
    const points = [
      new THREE.Vector3(-width * 0.42, 0.02, z - 0.02),
      new THREE.Vector3(-width * 0.42, height - 0.05, z - 0.02),
    ]
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, 4, 0.014, 12, false)
  }, [z, height, width])

  const hotGeo = useMemo(() => {
    const points = [
      new THREE.Vector3(width * 0.42, 0.02, z - 0.02),
      new THREE.Vector3(width * 0.42, height - 0.05, z - 0.02),
    ]
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, 4, 0.014, 12, false)
  }, [z, height, width])

  return (
    <group>
      <mesh geometry={coldGeo} material={M.coolantCold} />
      <mesh geometry={hotGeo} material={M.coolantHot} />
    </group>
  )
}
