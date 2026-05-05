import { useEffect, useState } from 'react'

export interface DeviceCaps {
  /** 屏幕宽 < 768，或者纵横比偏纵向 */
  isMobile: boolean
  /** 屏幕宽 < 1024 */
  isNarrow: boolean
  /** 设备像素比，用于动态降 dpr */
  dpr: number
  /** 是否检测到 low-end GPU（基于 WebGL renderer 字符串） */
  isLowEnd: boolean
  /** 用户开启了系统级减弱动画 */
  prefersReducedMotion: boolean
}

let cachedCaps: DeviceCaps | null = null

function detect(): DeviceCaps {
  if (cachedCaps) return cachedCaps
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isNarrow: false,
      dpr: 1,
      isLowEnd: false,
      prefersReducedMotion: false,
    }
  }

  const w = window.innerWidth
  const isNarrow = w < 1024
  const isMobile =
    w < 768 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && w < 1100)

  let isLowEnd = false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = ext
        ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string)
        : ''
      // Apple A8 / Mali-T / Adreno 3xx 等老 GPU 关键词
      const lowEndPatterns =
        /(Adreno \(TM\) [3-5]\d\d|Mali-T|PowerVR|Apple A[5-9])/i
      if (lowEndPatterns.test(renderer ?? '')) isLowEnd = true
    } else {
      // 没有 webgl 上下文 → 直接当 low-end，让 fallback 路径介入
      isLowEnd = true
    }
  } catch {
    // ignore
  }

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  cachedCaps = {
    isMobile,
    isNarrow,
    dpr: isLowEnd ? 1 : Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75),
    isLowEnd,
    prefersReducedMotion,
  }
  return cachedCaps
}

/**
 * Hook 包装。窄屏 / 视口变化时会重新计算 isMobile / isNarrow。
 * GPU 类型判断只做一次（昂贵）。
 */
export function useDeviceCaps(): DeviceCaps {
  const [caps, setCaps] = useState<DeviceCaps>(() => detect())
  useEffect(() => {
    const onResize = () => {
      const base = detect()
      const w = window.innerWidth
      setCaps({
        ...base,
        isNarrow: w < 1024,
        isMobile:
          w < 768 ||
          /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
          (navigator.maxTouchPoints > 1 && w < 1100),
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return caps
}
