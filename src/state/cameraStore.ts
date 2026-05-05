import { create } from 'zustand'

/**
 * Camera 状态：与 storyStore 中的 layer 解耦，由 storyStore 通过订阅触发 camera 平滑过渡。
 * 这里只存储 "目标" 视点；真正的插值在 R3F 组件内每帧执行。
 */

interface CameraTarget {
  position: [number, number, number]
  lookAt: [number, number, number]
  /** 过渡时间（秒），下一次 setTarget 会重置 */
  duration: number
}

interface CameraState {
  target: CameraTarget
  setTarget: (t: Partial<CameraTarget>) => void
}

const defaultTarget: CameraTarget = {
  position: [0, 12, 22],
  lookAt: [0, 4, 0],
  duration: 1.4,
}

export const useCamera = create<CameraState>((set) => ({
  target: defaultTarget,
  setTarget: (t) =>
    set((s) => ({
      target: { ...s.target, ...t, duration: t.duration ?? 1.4 },
    })),
}))
