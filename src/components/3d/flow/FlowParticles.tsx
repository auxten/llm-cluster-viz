import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStory } from '../../../state/storyStore'

/**
 * 沿一组曲线流动的发光粒子。
 * 用 instancedMesh 一次性 draw call，避免每个 token 一个 mesh。
 * 适用：S1 Token Journey、S3 MoE all-to-all、IB cable 上的活动 indicator。
 */

interface FlowParticlesProps {
  /** 曲线列表；每帧每条曲线上沿 t 方向走一定距离 */
  curves: THREE.CurvePath<THREE.Vector3>[] | THREE.Curve<THREE.Vector3>[]
  /** 每条曲线上同时在飞的粒子数 */
  perCurve?: number
  /** 速度 (1.0 = 每秒走完整条曲线 1 次) */
  speed?: number
  /** 粒子大小（米） */
  size?: number
  /** 颜色 */
  color?: string
  /** 是否显示拖尾（淡出） */
  emissive?: boolean
}

export function FlowParticles({
  curves,
  perCurve = 6,
  speed = 0.4,
  size = 0.018,
  color = '#ffd966',
  emissive = true,
}: FlowParticlesProps) {
  const total = curves.length * perCurve
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const tempObj = useMemo(() => new THREE.Object3D(), [])
  const offsets = useMemo(
    () => new Float32Array(total).map((_, i) => (i % perCurve) / perCurve),
    [total, perCurve],
  )
  const startTime = useRef<number>(performance.now())
  const paused = useStory((s) => s.paused)
  const speedMult = useStory((s) => s.speed)

  const mat = useMemo(
    () =>
      emissive
        ? new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 2.2,
            metalness: 0.1,
            roughness: 0.5,
          })
        : new THREE.MeshBasicMaterial({ color }),
    [color, emissive],
  )

  const geom = useMemo(() => new THREE.SphereGeometry(size / 2, 8, 8), [size])

  useEffect(() => {
    return () => {
      geom.dispose()
      mat.dispose()
    }
  }, [geom, mat])

  useFrame(() => {
    if (!meshRef.current) return
    const now = performance.now()
    const elapsed = paused ? 0 : ((now - startTime.current) / 1000) * speedMult
    let idx = 0
    for (let c = 0; c < curves.length; c++) {
      const curve = curves[c]
      for (let p = 0; p < perCurve; p++) {
        const t = (elapsed * speed + offsets[idx]) % 1
        const pos = curve.getPointAt(t)
        tempObj.position.copy(pos)
        const scale = 0.55 + 0.45 * Math.sin(t * Math.PI)
        tempObj.scale.setScalar(scale)
        tempObj.updateMatrix()
        meshRef.current.setMatrixAt(idx, tempObj.matrix)
        idx++
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geom, mat, total]} frustumCulled={false} />
  )
}
