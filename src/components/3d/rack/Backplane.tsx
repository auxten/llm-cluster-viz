import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { M } from '../materials'

/**
 * NVL72 NVLink Cable Backplane (a.k.a. "spine")：
 * - 在 rack 后部，把每个 compute tray 上的 GPU 通过 cable 连到中部的 NVSwitch tray
 * - 总计约 5,000 根铜缆，~3km，重 ~50kg
 * - 视觉上：从每 compute tray 高度向 NVSwitch 中段汇聚的一束 cable
 *
 * 我们用 catmullrom curve + tube geometry，每束 cable 用一根代表（避免 5000 根真实建模）
 */

interface BackplaneProps {
  /** rack 后侧的 z 坐标（一般 = -RACK_D/2） */
  z: number
  /** rack 高度内 compute tray 的 y 坐标列表（18 项） */
  computeTrayYs: number[]
  /** rack 高度内 NVSwitch 区域中心 y 坐标 */
  nvswitchCenterY: number
  /** 横向幅宽（rack 宽） */
  width: number
}

const CABLE_RADIUS = 0.018

export interface BackplaneCurveOpts {
  z: number
  computeTrayYs: number[]
  nvswitchCenterY: number
  width: number
}

/**
 * 生成 NVLink cable 的 catmull-rom 曲线集合。
 * 每个 compute tray 出 2 束（左右各一），全部汇聚到 NVSwitch 中段中心。
 * 对外暴露给 storyline overlay 复用，确保动画粒子真的"沿着电缆"流动。
 */
export function buildBackplaneCurves({
  z,
  computeTrayYs,
  nvswitchCenterY,
  width,
}: BackplaneCurveOpts): THREE.CatmullRomCurve3[] {
  const w = width * 0.9
  const out: THREE.CatmullRomCurve3[] = []
  computeTrayYs.forEach((y, i) => {
    ;[-1, 1].forEach((side) => {
      const x = (w / 2) * side * (0.6 + 0.4 * (i / computeTrayYs.length))
      const points = [
        new THREE.Vector3(x, y + 0.02, z),
        new THREE.Vector3(x * 0.8, (y + nvswitchCenterY) / 2, z - 0.04),
        new THREE.Vector3(x * 0.4, nvswitchCenterY, z - 0.06),
        new THREE.Vector3(0, nvswitchCenterY, z - 0.04),
      ]
      out.push(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4))
    })
  })
  return out
}

export function Backplane({
  z,
  computeTrayYs,
  nvswitchCenterY,
  width,
}: BackplaneProps) {
  const tubeGeoms = useMemo(() => {
    const curves = buildBackplaneCurves({ z, computeTrayYs, nvswitchCenterY, width })
    return curves.map((curve) => new THREE.TubeGeometry(curve, 8, CABLE_RADIUS, 6, false))
  }, [computeTrayYs, nvswitchCenterY, z, width])

  useEffect(() => {
    return () => {
      tubeGeoms.forEach((g) => g.dispose())
    }
  }, [tubeGeoms])

  return (
    <group>
      {/* spine 后挡板 */}
      <mesh material={M.chassisDark} position={[0, nvswitchCenterY, z - 0.07]}>
        <boxGeometry args={[width * 0.96, computeTrayYs.length * 0.12 + 0.4, 0.02]} />
      </mesh>
      {/* cable bundles */}
      {tubeGeoms.map((geom, idx) => (
        <mesh key={idx} geometry={geom} material={M.cableJacket} />
      ))}
    </group>
  )
}
