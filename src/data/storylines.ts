/**
 * Storyline 元数据：4 幕 10 章。
 *
 * i18n 说明：
 *   - title / caption / oneLiner / subtitle 等字段保存的是 **翻译 key**，不是字面文本。
 *   - 消费方需要通过 `useT()` 取到 `t` 之后再调用 `t(story.title)` 渲染。
 *   - 同时附带 chapterKey（如 'p1', 't1', 'i1', 'r1'），用于派生 step key 前缀
 *     `sl.<chapterKey>.step.<stepId>.title|caption`。
 */

export type LayerId = 'datacenter' | 'rack' | 'chip'

export type ActId = 'prologue' | 'training' | 'inference' | 'reality'

export interface Act {
  id: ActId
  /** 章号前缀，例如 "P" / "T" / "I" / "R" */
  shortLabel: string
  /** 翻译 key：短标题 */
  title: string
  /** 翻译 key：幕间过场卡上的副标题 */
  subtitle: string
  /** 主题色，过场卡和 Act 子标签用 */
  accent: string
}

export const acts: Act[] = [
  {
    id: 'prologue',
    shortLabel: 'P',
    title: 'acts.prologue.title',
    subtitle: 'acts.prologue.subtitle',
    accent: '#6cb8ff',
  },
  {
    id: 'training',
    shortLabel: 'T',
    title: 'acts.training.title',
    subtitle: 'acts.training.subtitle',
    accent: '#a4ee27',
  },
  {
    id: 'inference',
    shortLabel: 'I',
    title: 'acts.inference.title',
    subtitle: 'acts.inference.subtitle',
    accent: '#ffd966',
  },
  {
    id: 'reality',
    shortLabel: 'R',
    title: 'acts.reality.title',
    subtitle: 'acts.reality.subtitle',
    accent: '#ff7a7a',
  },
]

export const actById = (id: ActId): Act =>
  acts.find((a) => a.id === id) ?? acts[0]

export interface StorylineStep {
  id: string
  /** 翻译 key */
  title: string
  /** 翻译 key */
  caption: string
  /** 该 step 自动推进到下一 step 的秒数；省略表示用 storyline.defaultStepSec */
  durationSec?: number
  /**
   * v3 · 在 InferenceArchMap / TrainingArchMap 中要高亮的节点/箭头 ID 列表。
   * 节点 ID 见 src/ui/InferenceArchMap.tsx 的 NODE_IDS / ARROW_IDS 常量。
   */
  archHighlight?: string[]
}

export interface Storyline {
  id: string
  /** 章号短前缀（'p1', 'p2', 't1', ...），用于翻译 key 派生 */
  chapterKey: string
  /** 全局顺序号，从 1 开始 */
  order: number
  /** 章号在所属 Act 内的序号（1, 2, 3, ...），与 act.shortLabel 拼接显示，如 "P1" */
  actOrder: number
  act: ActId
  /** 翻译 key */
  title: string
  /** 默认相机所在的层级 */
  layer: LayerId
  /** 翻译 key：一句话总览 */
  oneLiner: string
  /**
   * 是否默认自动播放（适合"硬件之旅"等无需用户决策的章节）。
   * 用户随时可暂停或手动 next/prev。
   */
  autoplay?: boolean
  /** 在 autoplay 模式下，每个 step 默认停留多少秒 */
  defaultStepSec?: number
  /** 章节内的 step 列表，每个 step 对应一段动画 + 一段解说 */
  steps: StorylineStep[]
}

/** 内部辅助：根据章节简码 + step id 派生统一翻译 key 前缀 */
const k = (chapter: string, stepId: string) => ({
  title: `sl.${chapter}.step.${stepId}.title`,
  caption: `sl.${chapter}.step.${stepId}.caption`,
})

export const storylines: Storyline[] = [
  // ===== Act 0 · Prologue · Hardware Tour =====
  {
    id: 'p1_datacenter_overview',
    chapterKey: 'p1',
    order: 1,
    actOrder: 1,
    act: 'prologue',
    title: 'sl.p1.title',
    layer: 'datacenter',
    oneLiner: 'sl.p1.oneLiner',
    autoplay: true,
    defaultStepSec: 7,
    steps: [
      { id: 'establish', ...k('p1', 'establish') },
      { id: 'racks_light', ...k('p1', 'racks_light') },
      { id: 'spine_leaf', ...k('p1', 'spine_leaf') },
      { id: 'contrast', ...k('p1', 'contrast'), durationSec: 9 },
    ],
  },
  {
    id: 'p3_gb200_superchip',
    chapterKey: 'p3',
    order: 2,
    actOrder: 2,
    act: 'prologue',
    title: 'sl.p3.title',
    layer: 'chip',
    oneLiner: 'sl.p3.oneLiner',
    autoplay: true,
    defaultStepSec: 6,
    steps: [
      { id: 'zoom_to_board', ...k('p3', 'zoom_to_board') },
      { id: 'components', ...k('p3', 'components') },
      { id: 'die_to_die', ...k('p3', 'die_to_die') },
      { id: 'hbm_stacks', ...k('p3', 'hbm_stacks') },
      { id: 'nvlink_c2c', ...k('p3', 'nvlink_c2c'), durationSec: 8 },
    ],
  },

  // ===== Act 1 · Training =====
  {
    id: 't1_training_iter',
    chapterKey: 't1',
    order: 3,
    actOrder: 1,
    act: 'training',
    title: 'sl.t1.title',
    layer: 'datacenter',
    oneLiner: 'sl.t1.oneLiner',
    defaultStepSec: 8,
    steps: [
      {
        id: 'load_batch',
        ...k('t1', 'load_batch'),
        archHighlight: ['data_loader', 'arrow_data_pp0', 'pp0'],
      },
      {
        id: 'forward_intra_rack',
        ...k('t1', 'forward_intra_rack'),
        archHighlight: ['pp0', 'pp_inner_fwd'],
      },
      {
        id: 'forward_moe',
        ...k('t1', 'forward_moe'),
        archHighlight: ['pp0', 'pp_inner_moe'],
      },
      {
        id: 'forward_pp_boundary',
        ...k('t1', 'forward_pp_boundary'),
        archHighlight: [
          'pp0',
          'arrow_fwd_01',
          'pp1',
          'arrow_fwd_12',
          'pp2',
          'arrow_fwd_23',
          'pp3',
        ],
      },
      {
        id: 'loss_and_save_act',
        ...k('t1', 'loss_and_save_act'),
        archHighlight: ['pp3', 'arrow_pp3_loss', 'loss', 'pp_inner_cache'],
      },
      {
        id: 'backward_sweep',
        ...k('t1', 'backward_sweep'),
        archHighlight: [
          'loss',
          'arrow_loss_back',
          'pp3',
          'arrow_bwd_32',
          'pp2',
          'arrow_bwd_21',
          'pp1',
          'arrow_bwd_10',
          'pp0',
        ],
      },
      {
        id: 'pipeline_bubble',
        ...k('t1', 'pipeline_bubble'),
        archHighlight: ['pipeline_gantt', 'pp0', 'pp1', 'pp2', 'pp3'],
      },
      {
        id: 'allreduce_grads',
        ...k('t1', 'allreduce_grads'),
        archHighlight: [
          'pp0',
          'pp1',
          'pp2',
          'pp3',
          'arrow_grad_pp0',
          'arrow_grad_pp1',
          'arrow_grad_pp2',
          'arrow_grad_pp3',
          'allreduce',
        ],
      },
      {
        id: 'optimizer_step',
        ...k('t1', 'optimizer_step'),
        archHighlight: [
          'allreduce',
          'arrow_allreduce_opt',
          'optimizer',
          'arrow_opt_w',
          'pp0',
          'pp1',
          'pp2',
          'pp3',
        ],
      },
      {
        id: 'next_iter',
        ...k('t1', 'next_iter'),
        durationSec: 9,
        archHighlight: ['data_loader'],
      },
    ],
  },
  {
    id: 't2_pipeline_bubble',
    chapterKey: 't2',
    order: 4,
    actOrder: 2,
    act: 'training',
    title: 'sl.t2.title',
    layer: 'datacenter',
    oneLiner: 'sl.t2.oneLiner',
    steps: [
      {
        id: 'naive',
        ...k('t2', 'naive'),
        archHighlight: ['pipeline_gantt', 'pp0', 'pp1', 'pp2', 'pp3'],
      },
      {
        id: 'bubble_cost',
        ...k('t2', 'bubble_cost'),
        archHighlight: ['pipeline_gantt', 'pp0', 'pp1', 'pp2', 'pp3'],
      },
      {
        id: '1f1b',
        ...k('t2', '1f1b'),
        archHighlight: ['pipeline_gantt', 'pp0', 'pp1', 'pp2', 'pp3'],
      },
      {
        id: 'memory_pressure',
        ...k('t2', 'memory_pressure'),
        archHighlight: [
          'pipeline_gantt',
          'pp_inner_cache',
          'pp0',
          'pp1',
          'pp2',
          'pp3',
        ],
      },
    ],
  },
  {
    id: 't3_moe_all_to_all',
    chapterKey: 't3',
    order: 5,
    actOrder: 3,
    act: 'training',
    title: 'sl.t3.title',
    layer: 'rack',
    oneLiner: 'sl.t3.oneLiner',
    steps: [
      {
        id: 'shard',
        ...k('t3', 'shard'),
        archHighlight: ['pp0', 'pp_inner_moe'],
      },
      {
        id: 'broadcast',
        ...k('t3', 'broadcast'),
        archHighlight: ['pp0', 'pp_inner_moe'],
      },
      {
        id: 'compute',
        ...k('t3', 'compute'),
        archHighlight: ['pp0', 'pp_inner_moe'],
      },
      {
        id: 'reduce',
        ...k('t3', 'reduce'),
        archHighlight: ['pp0', 'pp_inner_moe'],
      },
      {
        id: 'cross_rack_penalty',
        ...k('t3', 'cross_rack_penalty'),
        archHighlight: ['pp0', 'pp1', 'pp_inner_moe', 'arrow_fwd_01'],
      },
      {
        id: 'conclusion',
        ...k('t3', 'conclusion'),
        archHighlight: ['pp_inner_moe'],
      },
    ],
  },

  // ===== Act 2 · Inference =====
  {
    id: 'i1_inference_lifecycle',
    chapterKey: 'i1',
    order: 6,
    actOrder: 1,
    act: 'inference',
    title: 'sl.i1.title',
    layer: 'datacenter',
    oneLiner: 'sl.i1.oneLiner',
    defaultStepSec: 8,
    steps: [
      {
        id: 'user_request',
        ...k('i1', 'user_request'),
        archHighlight: ['user_in', 'arrow_user_router', 'api_router'],
      },
      {
        id: 'router_dispatch',
        ...k('i1', 'router_dispatch'),
        archHighlight: ['api_router', 'arrow_router_prefill', 'prefill_rack'],
      },
      {
        id: 'prefix_cache_hit',
        ...k('i1', 'prefix_cache_hit'),
        archHighlight: ['api_router', 'arrow_router_hash', 'prefix_hash'],
      },
      {
        id: 'prefill_compute',
        ...k('i1', 'prefill_compute'),
        archHighlight: ['prefill_rack'],
      },
      {
        id: 'kv_emit',
        ...k('i1', 'kv_emit'),
        archHighlight: ['prefill_rack', 'kv_arrow'],
      },
      {
        id: 'kv_transfer',
        ...k('i1', 'kv_transfer'),
        archHighlight: ['prefill_rack', 'kv_arrow', 'decode_rack'],
      },
      {
        id: 'decode_join',
        ...k('i1', 'decode_join'),
        archHighlight: ['decode_rack', 'cont_batch', 'paged_pool', 'block_table'],
      },
      {
        id: 'stream_back',
        ...k('i1', 'stream_back'),
        durationSec: 9,
        archHighlight: ['decode_rack', 'stream_arrow', 'user_out'],
      },
    ],
  },
  {
    id: 'i2_prefill_internals',
    chapterKey: 'i2',
    order: 7,
    actOrder: 2,
    act: 'inference',
    title: 'sl.i2.title',
    layer: 'rack',
    oneLiner: 'sl.i2.oneLiner',
    steps: [
      {
        id: 'prompt_in',
        ...k('i2', 'prompt_in'),
        archHighlight: ['prefill_rack'],
      },
      {
        id: 'parallel_attention',
        ...k('i2', 'parallel_attention'),
        archHighlight: ['prefill_rack'],
      },
      {
        id: 'kv_accumulate',
        ...k('i2', 'kv_accumulate'),
        archHighlight: ['prefill_rack', 'kv_arrow'],
      },
      {
        id: 'first_token',
        ...k('i2', 'first_token'),
        archHighlight: ['prefill_rack', 'kv_arrow'],
      },
      {
        id: 'why_compute_bound',
        ...k('i2', 'why_compute_bound'),
        archHighlight: ['prefill_rack'],
      },
    ],
  },
  {
    id: 'i3_decode_continuous_batching',
    chapterKey: 'i3',
    order: 8,
    actOrder: 3,
    act: 'inference',
    title: 'sl.i3.title',
    layer: 'rack',
    oneLiner: 'sl.i3.oneLiner',
    defaultStepSec: 8,
    steps: [
      {
        id: 'decode_one_user',
        ...k('i3', 'decode_one_user'),
        archHighlight: ['decode_rack'],
      },
      {
        id: 'batch_matrix',
        ...k('i3', 'batch_matrix'),
        archHighlight: ['decode_rack', 'cont_batch'],
      },
      {
        id: 'continuous_batching',
        ...k('i3', 'continuous_batching'),
        archHighlight: ['decode_rack', 'cont_batch'],
      },
      {
        id: 'paged_attention',
        ...k('i3', 'paged_attention'),
        archHighlight: ['decode_rack', 'paged_pool', 'block_table'],
      },
      {
        id: 'prefix_cache',
        ...k('i3', 'prefix_cache'),
        archHighlight: ['decode_rack', 'paged_pool', 'prefix_block'],
      },
      {
        id: 'sweet_spot',
        ...k('i3', 'sweet_spot'),
        archHighlight: ['decode_rack', 'cont_batch'],
      },
      {
        id: 'twenty_ms',
        ...k('i3', 'twenty_ms'),
        durationSec: 9,
        archHighlight: ['decode_rack'],
      },
    ],
  },
  {
    id: 'i4_kv_cache_budget',
    chapterKey: 'i4',
    order: 9,
    actOrder: 4,
    act: 'inference',
    title: 'sl.i4.title',
    layer: 'chip',
    oneLiner: 'sl.i4.oneLiner',
    steps: [
      {
        id: 'weights_only',
        ...k('i4', 'weights_only'),
        archHighlight: ['decode_rack'],
      },
      {
        id: 'short_ctx',
        ...k('i4', 'short_ctx'),
        archHighlight: ['decode_rack', 'paged_pool'],
      },
      {
        id: 'long_ctx',
        ...k('i4', 'long_ctx'),
        archHighlight: ['decode_rack', 'paged_pool'],
      },
      {
        id: 'try_pp',
        ...k('i4', 'try_pp'),
        archHighlight: ['decode_rack'],
      },
      {
        id: 'tradeoff',
        ...k('i4', 'tradeoff'),
        archHighlight: ['decode_rack', 'paged_pool', 'cont_batch'],
      },
    ],
  },

  // ===== Act 3 · Reality =====
  {
    id: 'r1_failure_recovery',
    chapterKey: 'r1',
    order: 10,
    actOrder: 1,
    act: 'reality',
    title: 'sl.r1.title',
    layer: 'datacenter',
    oneLiner: 'sl.r1.oneLiner',
    steps: [
      { id: 'steady', ...k('r1', 'steady') },
      { id: 'gpu_fault', ...k('r1', 'gpu_fault') },
      { id: 'llama3_stats', ...k('r1', 'llama3_stats') },
      { id: 'cause_breakdown', ...k('r1', 'cause_breakdown') },
      { id: 'sdc', ...k('r1', 'sdc') },
      { id: 'gemini', ...k('r1', 'gemini') },
      { id: 'recycle', ...k('r1', 'recycle') },
      { id: 'effective', ...k('r1', 'effective') },
    ],
  },
]

export const storylineById = (id: string): Storyline | undefined =>
  storylines.find((s) => s.id === id)

export const storylinesByAct = (act: ActId): Storyline[] =>
  storylines.filter((s) => s.act === act)

export const firstStorylineId = storylines[0]?.id
export const nextStorylineId = (id: string): string | undefined => {
  const i = storylines.findIndex((s) => s.id === id)
  if (i < 0 || i + 1 >= storylines.length) return undefined
  return storylines[i + 1].id
}
export const prevStorylineId = (id: string): string | undefined => {
  const i = storylines.findIndex((s) => s.id === id)
  if (i <= 0) return undefined
  return storylines[i - 1].id
}
