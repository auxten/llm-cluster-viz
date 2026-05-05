import { useMemo } from 'react'
import { Floor } from './Floor'
import { NVL72Rack, NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import {
  SpineLeafTopology,
  buildLeafAnchors,
  useIBActivity,
} from '../components/3d/network/SpineLeafTopology'
import { useStory } from '../state/storyStore'
import { StorylineLayer } from '../storylines'
import { useFailureState } from '../storylines/s7_node_failure'

/**
 * 数据中心层：4×NVL72 + IB spine-leaf。
 * 4 个 rack 用于 S4 (PP across racks) 与 S6 (training pipeline bubble)。
 */
export function DatacenterScene() {
  const layer = useStory((s) => s.layer)
  const { rackGpuStates, switchLoads } = useFailureState()
  const ib = useIBActivity()
  const racks = useMemo(() => {
    const dx = NVL72_DIM.width + 1.4
    const positions: { x: number; z: number; id: string; pp: number }[] = []
    for (let j = 0; j < 4; j++) {
      positions.push({
        x: (j - 1.5) * dx,
        z: 0,
        id: `r${j}`,
        pp: j,
      })
    }
    return positions
  }, [])

  const leafAnchors = buildLeafAnchors(racks, NVL72_DIM.height)

  return (
    <group>
      <Floor size={28} divisions={28} />

      {racks.map((r, i) => (
        <NVL72Rack
          key={r.id}
          position={[r.x, 0, r.z]}
          lod={layer === 'datacenter' ? 'low' : 'high'}
          label={`PP${r.pp}`}
          showCooling={false}
          switchLoad={switchLoads[i] ?? 0.3}
          gpuStates={
            rackGpuStates[i] && rackGpuStates[i].length > 0
              ? rackGpuStates[i]
              : undefined
          }
        />
      ))}

      <SpineLeafTopology
        leafAnchors={leafAnchors}
        spineY={NVL72_DIM.height + 1.6}
        spineCount={4}
        active={ib.active}
        flowIntensity={ib.intensity}
      />

      <StorylineLayer layer="datacenter" />
    </group>
  )
}
