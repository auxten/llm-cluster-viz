import { useEffect, useRef } from 'react'
import { useStory } from './storyStore'

/**
 * 在 React 树根挂一个组件，按 requestAnimationFrame 把 elapsed 推给 storyStore。
 * autoplay=true 且 !paused 时，每达到 step.durationSec 就自动 nextStep。
 *
 * 单独抽出来，避免在 R3F Canvas 内做（Canvas unmount 会停 useFrame）。
 */
export function AutoplayDriver() {
  const tick = useStory((s) => s.tickElapsed)
  const speed = useStory((s) => s.speed)
  const lastRef = useRef<number | null>(null)

  useEffect(() => {
    let raf = 0
    const loop = (now: number) => {
      if (lastRef.current == null) lastRef.current = now
      const dt = (now - lastRef.current) / 1000
      lastRef.current = now
      tick(dt * speed)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tick, speed])

  return null
}
