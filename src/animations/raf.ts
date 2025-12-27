export type RafHandle = {
  stop: () => void
}

export type RafOptions = {
  maxFps?: number
  pauseWhenHidden?: boolean
}

export function startRafLoop(tick: (dtSeconds: number) => void, options: RafOptions = {}): RafHandle {
  let rafId = 0
  let last = performance.now()
  let stopped = false
  let started = false

  const maxFps = options.maxFps && options.maxFps > 0 ? options.maxFps : undefined
  const minFrameMs = maxFps ? 1000 / maxFps : 0
  let accMs = 0

  const step = (now: number) => {
    if (stopped) return

    // When resuming after being hidden, avoid a large dt spike.
    const rawMs = Math.min(50, now - last)
    last = now

    if (minFrameMs > 0) {
      accMs += rawMs
      if (accMs < minFrameMs) {
        rafId = requestAnimationFrame(step)
        return
      }
      accMs = accMs % minFrameMs
    }

    tick(rawMs / 1000)
    rafId = requestAnimationFrame(step)
  }

  const start = () => {
    if (stopped || started) return
    started = true
    last = performance.now()
    accMs = 0
    rafId = requestAnimationFrame(step)
  }

  const stopFrames = () => {
    started = false
    cancelAnimationFrame(rafId)
  }

  let cleanupVisibility: (() => void) | null = null
  if (options.pauseWhenHidden) {
    const onVisibility = () => {
      if (stopped) return
      if (document.hidden) stopFrames()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility, { passive: true })
    cleanupVisibility = () => document.removeEventListener('visibilitychange', onVisibility)
  }

  if (!options.pauseWhenHidden || !document.hidden) start()

  return {
    stop() {
      stopped = true
      stopFrames()
      cleanupVisibility?.()
      cleanupVisibility = null
    },
  }
}
