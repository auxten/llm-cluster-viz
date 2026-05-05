import { Html } from '@react-three/drei'
import type { CSSProperties } from 'react'
import { SuperchipBoard } from '../components/3d/chip/SuperchipBoard'
import { useStory } from '../state/storyStore'
import { useMemo } from 'react'

const chipLabelStyle: CSSProperties = {
  color: 'var(--color-fg)',
  fontSize: '10.5px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  padding: '2px 7px',
  borderRadius: '5px',
  background: 'rgba(20, 26, 40, 0.78)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
}
import { StorylineLayer } from '../storylines'

/**
 * Chip 层：聚焦一颗 GB200 Superchip（1 Grace + 2 B200，每 B200 8 HBM stack）。
 * 后续 storyline 会在此层注入：token 流过 router/experts、HBM 占用条等。
 */
export function ChipScene() {
  const storyId = useStory((s) => s.storyId)

  // 在 KV cache war 中给 HBM 加上不同占用
  const { hbmFill, fillColor } = useMemo(() => {
    if (storyId !== 'i4_kv_cache_budget') {
      return { hbmFill: undefined, fillColor: undefined }
    }
    return {
      hbmFill: [
        [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
        [0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45],
      ],
      fillColor: '#ffd166',
    }
  }, [storyId])

  return (
    <group>
      <SuperchipBoard
        position={[0, 0, 0]}
        hbmFill={hbmFill}
        hbmFillColor={fillColor}
      />

      <Html position={[0, 0.05, 0.18]} center pointerEvents="none">
        <div style={chipLabelStyle}>Grace · 72 ARM Neoverse-V2</div>
      </Html>
      <Html position={[-0.21, 0.06, -0.12]} center pointerEvents="none">
        <div style={chipLabelStyle}>B200 · 192GB HBM3e</div>
      </Html>
      <Html position={[0.21, 0.06, -0.12]} center pointerEvents="none">
        <div style={chipLabelStyle}>B200 · 192GB HBM3e</div>
      </Html>

      <StorylineLayer layer="chip" />
    </group>
  )
}
