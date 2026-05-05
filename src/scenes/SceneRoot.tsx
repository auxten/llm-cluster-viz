import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { useStory } from '../state/storyStore'
import { useDeviceCaps } from '../state/deviceCaps'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { DatacenterScene } from './DatacenterScene'
import { RackScene } from './RackScene'
import { ChipScene } from './ChipScene'

/**
 * 右侧 StoryPanel 占据 ~396px（380 宽 + 16 右边距）。
 * 屏幕较宽时，把相机视口虚拟扩展到 canvasWidth + 这个量，
 * 但只渲染左侧 canvasWidth，从而让 3D 场景中心向左偏，避免被 panel 遮挡。
 */
const PANEL_AVOID_PX = 396
const MIN_WIDTH_FOR_OFFSET = 900

function ViewportOffset() {
  const { camera, size } = useThree()
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    if (size.width >= MIN_WIDTH_FOR_OFFSET) {
      const fullW = size.width + PANEL_AVOID_PX
      camera.setViewOffset(
        fullW,
        size.height,
        PANEL_AVOID_PX,
        0,
        size.width,
        size.height,
      )
    } else {
      camera.clearViewOffset()
    }
    camera.updateProjectionMatrix()
    return () => {
      camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
  }, [camera, size.width, size.height])
  return null
}

export function SceneRoot() {
  const layer = useStory((s) => s.layer)
  const caps = useDeviceCaps()
  return (
    <Canvas
      shadows={false}
      dpr={[1, caps.dpr]}
      camera={{ position: [6, 5, 9], fov: 38, near: 0.05, far: 200 }}
      gl={{
        antialias: !caps.isLowEnd,
        alpha: false,
        powerPreference: caps.isLowEnd ? 'low-power' : 'high-performance',
      }}
      frameloop={caps.prefersReducedMotion ? 'demand' : 'always'}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#2a3349']} />
      <fog attach="fog" args={['#2a3349', 36, 110]} />
      <Suspense fallback={null}>
        <Lighting />
        {layer === 'datacenter' ? <DatacenterScene /> : null}
        {layer === 'rack' ? <RackScene /> : null}
        {layer === 'chip' ? <ChipScene /> : null}
      </Suspense>
      <CameraRig />
      <ViewportOffset />
    </Canvas>
  )
}
