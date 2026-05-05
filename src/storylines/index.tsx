import { useStory } from '../state/storyStore'
import type { LayerId } from '../data/storylines'
import { StorylineS3 } from './s3_moe_all_to_all'
import { StorylineS6 } from './s6_pipeline_bubble'
import { StorylineS7 } from './s7_node_failure'
import { StorylineP1 } from './p1_datacenter_overview'
import { StorylineP3 } from './p3_gb200_superchip'
import { StorylineT1 } from './t1_training_iter'
import { StorylineI1 } from './i1_inference_lifecycle'
import { StorylineI2 } from './i2_prefill_internals'
import { StorylineI3 } from './i3_decode_continuous_batching'

/**
 * 在每一层场景中调用 <StorylineLayer layer="rack"/> 来叠加当前 storyline 在该层的内容。
 * 每个 storyline 只在 storyStore.layer === 自己的 layer 时显示。
 *
 * 10-storyline 架构（v2，过程为主线，机制穿插）：
 *   p1_datacenter_overview         → StorylineP1 (datacenter)
 *   p3_gb200_superchip             → StorylineP3 (chip)
 *   t1_training_iter               → StorylineT1 (datacenter, 主线)
 *   t2_pipeline_bubble             → StorylineS6 (datacenter, 放大)
 *   t3_moe_all_to_all              → StorylineS3 (rack, 放大)
 *   i1_inference_lifecycle         → StorylineI1 (datacenter, 主线)
 *   i2_prefill_internals           → StorylineI2 (rack, 放大)
 *   i3_decode_continuous_batching  → StorylineI3 (rack, 主线)
 *   i4_kv_cache_budget             → KvCacheHud (DOM overlay, 在 App 层挂载)
 *   r1_failure_recovery            → StorylineS7 (datacenter)
 */
export function StorylineLayer({ layer }: { layer: LayerId }) {
  const storyId = useStory((s) => s.storyId)
  const currentLayer = useStory((s) => s.layer)
  const mode = useStory((s) => s.mode)

  if (mode !== 'guided') return null
  if (currentLayer !== layer) return null
  if (!storyId) return null

  switch (storyId) {
    case 'p1_datacenter_overview':
      return layer === 'datacenter' ? <StorylineP1 /> : null
    case 'p3_gb200_superchip':
      return layer === 'chip' ? <StorylineP3 /> : null

    case 't1_training_iter':
      return layer === 'datacenter' ? <StorylineT1 /> : null
    case 't2_pipeline_bubble':
      return layer === 'datacenter' ? <StorylineS6 /> : null
    case 't3_moe_all_to_all':
      return layer === 'rack' ? <StorylineS3 /> : null

    case 'i1_inference_lifecycle':
      return layer === 'datacenter' ? <StorylineI1 /> : null
    case 'i2_prefill_internals':
      return layer === 'rack' ? <StorylineI2 /> : null
    case 'i3_decode_continuous_batching':
      return layer === 'rack' ? <StorylineI3 /> : null
    case 'i4_kv_cache_budget':
      // KV cache HUD 在 App 层 DOM 渲染
      return null

    case 'r1_failure_recovery':
      return layer === 'datacenter' ? <StorylineS7 /> : null

    default:
      return null
  }
}
