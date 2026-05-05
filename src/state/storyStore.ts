import { create } from 'zustand'
import {
  storylines,
  type LayerId,
  storylineById,
  acts,
  actById,
} from '../data/storylines'

export type Mode = 'guided' | 'sandbox'

interface StoryState {
  mode: Mode
  /** 当前 storyline id，null 表示纯沙盒（无章节激活） */
  storyId: string | null
  /** 当前 storyline 内的 step 索引 */
  stepIndex: number
  /** 当前层级（沙盒切换或章节切换都会更新） */
  layer: LayerId
  /** 动画是否暂停 */
  paused: boolean
  /** 全局动画速度倍率 */
  speed: number

  /** 是否启用自动推进（按 step 时长自动 next）。autoplay 默认根据 storyline.autoplay 字段。 */
  autoplay: boolean
  /** 当前 step 已经播放的秒数，用于进度条 */
  stepElapsedSec: number
  /** 在切换 act 时显示幕间过场卡，传 actId（intermission 显示完后跳到下一 storyline 的第 0 step） */
  intermissionActId: string | null

  setMode: (m: Mode) => void
  setLayer: (l: LayerId) => void
  setStory: (id: string | null) => void
  nextStep: () => void
  prevStep: () => void
  setStep: (i: number) => void
  setPaused: (p: boolean) => void
  togglePaused: () => void
  setSpeed: (s: number) => void
  setAutoplay: (a: boolean) => void
  toggleAutoplay: () => void
  /** 由动画驱动器调用，每帧累加 elapsed */
  tickElapsed: (deltaSec: number) => void
  resetElapsed: () => void
  dismissIntermission: () => void
}

const initialStory = storylines[0]

export const useStory = create<StoryState>((set, get) => ({
  mode: 'guided',
  storyId: initialStory?.id ?? null,
  stepIndex: 0,
  layer: initialStory?.layer ?? 'rack',
  paused: false,
  speed: 1,
  autoplay: initialStory?.autoplay ?? false,
  stepElapsedSec: 0,
  intermissionActId: null,

  setMode: (mode) => set({ mode }),
  setLayer: (layer) => set({ layer }),
  setStory: (id) => {
    if (id === null) {
      set({ storyId: null, stepIndex: 0, stepElapsedSec: 0 })
      return
    }
    const s = storylineById(id)
    if (!s) return
    set({
      storyId: id,
      stepIndex: 0,
      layer: s.layer,
      mode: 'guided',
      autoplay: s.autoplay ?? false,
      stepElapsedSec: 0,
      intermissionActId: null,
    })
  },
  nextStep: () => {
    const { storyId, stepIndex, autoplay } = get()
    if (!storyId) return
    const s = storylineById(storyId)
    if (!s) return
    if (stepIndex < s.steps.length - 1) {
      set({ stepIndex: stepIndex + 1, stepElapsedSec: 0 })
      return
    }
    const idx = storylines.findIndex((x) => x.id === storyId)
    const next = storylines[idx + 1]
    if (!next) {
      // 最后一章：停在最后一步，autoplay 自动暂停
      set({ autoplay: false, stepElapsedSec: 0 })
      return
    }
    if (next.act !== s.act) {
      // 跨幕：先显示过场卡，dismissIntermission 后真正切换
      set({ intermissionActId: next.act, paused: true })
      return
    }
    set({
      storyId: next.id,
      stepIndex: 0,
      layer: next.layer,
      // 保留用户当前的 autoplay 偏好，只要没手动关掉就一直自动播下去
      autoplay: autoplay || (next.autoplay ?? false),
      stepElapsedSec: 0,
    })
  },
  prevStep: () => {
    const { storyId, stepIndex, intermissionActId } = get()
    if (intermissionActId) {
      // 在过场卡上，prev 应该回到上一章最后一步
      set({ intermissionActId: null, paused: false })
      return
    }
    if (!storyId) return
    if (stepIndex > 0) {
      set({ stepIndex: stepIndex - 1, stepElapsedSec: 0 })
      return
    }
    const idx = storylines.findIndex((x) => x.id === storyId)
    const prev = storylines[idx - 1]
    if (prev) {
      set({
        storyId: prev.id,
        stepIndex: prev.steps.length - 1,
        layer: prev.layer,
        autoplay: false,
        stepElapsedSec: 0,
      })
    }
  },
  setStep: (i) =>
    set({ stepIndex: Math.max(0, i), stepElapsedSec: 0 }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setSpeed: (speed) => set({ speed }),
  setAutoplay: (autoplay) => set({ autoplay, stepElapsedSec: 0 }),
  toggleAutoplay: () =>
    set((s) => ({ autoplay: !s.autoplay, stepElapsedSec: 0 })),
  tickElapsed: (deltaSec) => {
    const {
      storyId,
      stepIndex,
      autoplay,
      paused,
      stepElapsedSec,
      intermissionActId,
    } = get()
    if (!autoplay || paused || intermissionActId) return
    if (!storyId) return
    const s = storylineById(storyId)
    if (!s) return
    const step = s.steps[stepIndex]
    if (!step) return
    const dur = step.durationSec ?? s.defaultStepSec ?? 6
    const next = stepElapsedSec + deltaSec
    if (next >= dur) {
      get().nextStep()
    } else {
      set({ stepElapsedSec: next })
    }
  },
  resetElapsed: () => set({ stepElapsedSec: 0 }),
  dismissIntermission: () => {
    const { intermissionActId, storyId, autoplay } = get()
    if (!intermissionActId || !storyId) {
      set({ intermissionActId: null, paused: false })
      return
    }
    // 找到当前 story 之后的第一个属于 intermissionActId 的 storyline
    const idx = storylines.findIndex((x) => x.id === storyId)
    const next = storylines
      .slice(idx + 1)
      .find((x) => x.act === intermissionActId)
    if (!next) {
      set({ intermissionActId: null, paused: false })
      return
    }
    set({
      storyId: next.id,
      stepIndex: 0,
      layer: next.layer,
      // 跨幕也保留用户的 autoplay 偏好（进入幕间卡时只是 paused，autoplay 字段没变）
      autoplay: autoplay || (next.autoplay ?? false),
      stepElapsedSec: 0,
      intermissionActId: null,
      paused: false,
    })
  },
}))

export const currentStoryline = () => {
  const id = useStory.getState().storyId
  return id ? storylineById(id) : undefined
}

export { acts, actById }
