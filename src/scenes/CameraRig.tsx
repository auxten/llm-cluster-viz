import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStory } from '../state/storyStore'
import { useCamera } from '../state/cameraStore'
import type { LayerId } from '../data/storylines'

const LAYER_VIEWS: Record<
  LayerId,
  { position: [number, number, number]; lookAt: [number, number, number] }
> = {
  datacenter: { position: [0, 5.5, 13], lookAt: [0, 1.6, 0] },
  rack: { position: [2.4, 1.6, 2.6], lookAt: [0, 1.05, 0] },
  chip: { position: [0.7, 0.45, 0.8], lookAt: [0, 0.04, 0] },
}

/**
 * 监听 storyStore.layer 变化，为相机选择目标位置；
 * 由 cameraStore.target 提供精细化覆盖（storyline 内的特写）；
 * 每帧用阻尼插值。
 */
export function CameraRig() {
  const layer = useStory((s) => s.layer)
  const target = useCamera((s) => s.target)
  const setTarget = useCamera((s) => s.setTarget)
  const { camera } = useThree()
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const fromRef = useRef({
    pos: new THREE.Vector3().copy(camera.position),
    look: new THREE.Vector3(0, 0, 0),
  })
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    const view = LAYER_VIEWS[layer]
    setTarget({ position: view.position, lookAt: view.lookAt, duration: 1.4 })
  }, [layer, setTarget])

  useEffect(() => {
    fromRef.current.pos.copy(camera.position)
    if (controlsRef.current) {
      fromRef.current.look.copy(controlsRef.current.target)
    }
    startRef.current = performance.now()
  }, [target, camera])

  useFrame(() => {
    if (startRef.current == null) return
    const elapsed = (performance.now() - startRef.current) / 1000
    const t = Math.min(1, elapsed / target.duration)
    // ease-out cubic
    const e = 1 - Math.pow(1 - t, 3)
    const targetPos = new THREE.Vector3(...target.position)
    const targetLook = new THREE.Vector3(...target.lookAt)
    camera.position.lerpVectors(fromRef.current.pos, targetPos, e)
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(
        fromRef.current.look,
        targetLook,
        e,
      )
      controlsRef.current.update()
    }
    if (t >= 1) startRef.current = null
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableRotate
      enableZoom
      makeDefault
      minDistance={0.6}
      maxDistance={80}
      target={[0, 4, 0]}
    />
  )
}
