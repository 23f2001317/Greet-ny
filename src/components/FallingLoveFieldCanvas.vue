<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { startRafLoop } from '../animations/raf'

export type LoveKind = 'snow' | 'heart' | 'petal'
export type LoveMode = 'mix' | LoveKind

type Particle = {
  kind: LoveKind
  x: number
  y: number
  vy: number
  size: number
  alpha: number
  rot: number
  vr: number
  driftAmp: number
  driftFreq: number
  driftPhase: number
  t: number
}

type Burst = {
  x: number
  y: number
  t: number
  dur: number
  angles: number[]
  speeds: number[]
}

const props = withDefaults(
  defineProps<{
    maxParticles?: number
    paused?: boolean
    mode?: LoveMode
  }>(),
  {
    // Default intentionally conservative; scales up with viewport.
    maxParticles: 70,
    paused: false,
    mode: 'mix',
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)

let cleanupResize: (() => void) | null = null
let stopLoop: (() => void) | null = null

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function glyphFor(kind: LoveKind) {
  if (kind === 'snow') return '❄️'
  if (kind === 'heart') return '❤️'
  return '🌸'
}

function glowFor(kind: LoveKind) {
  if (kind === 'snow') return 'rgba(255,255,255,0.28)'
  if (kind === 'heart') return 'rgba(255,182,193,0.35)'
  return 'rgba(230,160,255,0.28)'
}

function chooseKind(mode: LoveMode): LoveKind {
  if (mode !== 'mix') return mode
  const r = Math.random()
  if (r < 0.34) return 'snow'
  if (r < 0.72) return 'heart'
  return 'petal'
}

function idealCount(width: number, height: number) {
  // Adaptive particle count: scale with area, clamp for mobile.
  const area = Math.max(1, width * height)
  const base = Math.floor(area / 34000)
  return Math.max(14, Math.min(props.maxParticles, base))
}

type SpriteKey = `${LoveKind}:${number}`
type Sprite = { canvas: HTMLCanvasElement; size: number }

// Rendering emoji text with shadow per particle per frame is expensive.
// Cache sprites (emoji + glow) into tiny offscreen canvases and drawImage them.
const spriteCache = new Map<SpriteKey, Sprite>()

function sizeBucket(px: number) {
  // Keep cache small while retaining variation.
  return Math.max(16, Math.min(36, Math.round(px / 4) * 4))
}

function getSprite(kind: LoveKind, sizePx: number) {
  const s = sizeBucket(sizePx)
  const key: SpriteKey = `${kind}:${s}`
  const cached = spriteCache.get(key)
  if (cached) return cached

  const pad = Math.ceil(s * 0.9)
  const w = s + pad * 2
  const h = s + pad * 2
  const c = document.createElement('canvas')
  c.width = w
  c.height = h

  const ctx = c.getContext('2d')
  if (!ctx) {
    const fallback = { canvas: c, size: s }
    spriteCache.set(key, fallback)
    return fallback
  }

  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.font = `${s}px ui-sans-serif, system-ui, Apple Color Emoji, Segoe UI Emoji`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = glowFor(kind)
  ctx.shadowBlur = kind === 'heart' ? 14 : 10
  ctx.fillText(glyphFor(kind), 0, 0)
  ctx.restore()

  const sprite = { canvas: c, size: s }
  spriteCache.set(key, sprite)
  return sprite
}

const bursts: Burst[] = []

let hitTestImpl: (x: number, y: number) => LoveKind | null = () => null

function burstAt(x: number, y: number) {
  const angles: number[] = []
  const speeds: number[] = []
  const count = 10
  for (let i = 0; i < count; i += 1) {
    angles.push(rand(-Math.PI, Math.PI))
    speeds.push(rand(120, 220))
  }
  bursts.push({ x, y, t: 0, dur: 0.55, angles, speeds })
}

function hitTest(x: number, y: number): LoveKind | null {
  return hitTestImpl(x, y)
}

defineExpose({ burstAt, hitTest })

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  let width = 1
  let height = 1
  let dpr = 1

  const particles: Particle[] = []

  const resize = () => {
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)

    // Keep GPU/CPU costs stable on mobile.
    dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Adjust particle count to current viewport.
    const desired = idealCount(width, height)
    while (particles.length < desired) {
      particles.push({
        kind: chooseKind(props.mode),
        x: rand(0, width),
        y: rand(0, height),
        vy: rand(42, 110),
        size: rand(18, 34),
        alpha: rand(0.35, 0.9),
        rot: rand(-0.25, 0.25),
        vr: rand(-0.35, 0.35),
        driftAmp: rand(8, 22),
        driftFreq: rand(0.6, 1.35),
        driftPhase: rand(0, Math.PI * 2),
        t: rand(0, 10),
      })
    }
    if (particles.length > desired) particles.length = desired
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })
  cleanupResize = () => window.removeEventListener('resize', onResize)
  resize()

  // Provide hitTest implementation tied to the current particle list.
  hitTestImpl = (x: number, y: number) => {
    // Search from visually-front-ish to back-ish (larger size first).
    let bestIdx = -1
    let bestSize = -1
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i]!
      if (p.size <= bestSize) continue
      const r = p.size * 0.65
      const dx = x - p.x
      const dy = y - p.y
      if (dx * dx + dy * dy <= r * r) {
        bestIdx = i
        bestSize = p.size
      }
    }
    if (bestIdx < 0) return null
    return particles[bestIdx]!.kind
  }

  const loop = startRafLoop(
    (dt) => {
      if (props.paused) return

      // Update particles. Use transform-like math only (canvas draw).
      const dtSafe = Math.min(0.05, Math.max(0, dt))

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]!
        p.t += dtSafe
        p.y += p.vy * dtSafe
        p.x += Math.sin(p.t * p.driftFreq + p.driftPhase) * (p.driftAmp * dtSafe)
        p.rot += p.vr * dtSafe

        if (p.x < -p.size) p.x = width + p.size
        if (p.x > width + p.size) p.x = -p.size

        if (p.y > height + p.size * 2.2) {
          p.kind = chooseKind(props.mode)
          p.size = rand(18, 34)
          p.alpha = rand(0.35, 0.9)
          p.x = rand(0, width)
          p.y = -p.size * rand(1.2, 2.4)
          p.vy = rand(48, 120)
          p.driftAmp = rand(8, 22)
          p.driftFreq = rand(0.6, 1.35)
          p.driftPhase = rand(0, Math.PI * 2)
          p.rot = rand(-0.25, 0.25)
          p.vr = rand(-0.35, 0.35)
          p.t = 0
        }
      }

      // Update bursts.
      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const b = bursts[i]!
        b.t += dtSafe
        if (b.t >= b.dur) bursts.splice(i, 1)
      }

      // Draw.
      ctx.clearRect(0, 0, width, height)

      // Particles
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]!

        const spr = getSprite(p.kind, p.size)
        const halfW = spr.canvas.width / 2
        const halfH = spr.canvas.height / 2

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = p.alpha
        ctx.drawImage(spr.canvas, -halfW, -halfH)
        ctx.restore()
      }

      // Click burst: ripple + hearts
      for (let i = 0; i < bursts.length; i += 1) {
        const b = bursts[i]!
        const p = clamp01(b.t / b.dur)

        // Ripple ring
        ctx.save()
        ctx.globalAlpha = (1 - p) * 0.35
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(255,182,193,0.55)'
        ctx.beginPath()
        ctx.arc(b.x, b.y, 10 + p * 44, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // Mini hearts
        const heartAlpha = (1 - p) * 0.9
        ctx.save()
        ctx.globalAlpha = heartAlpha
        ctx.font = `${Math.floor(18 + (1 - p) * 6)}px ui-sans-serif, system-ui, Apple Color Emoji, Segoe UI Emoji`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(255,182,193,0.45)'
        ctx.shadowBlur = 14

        for (let k = 0; k < b.angles.length; k += 1) {
          const a = b.angles[k]!
          const sp = b.speeds[k]!
          const r = sp * p
          const x = b.x + Math.cos(a) * r
          const y = b.y + Math.sin(a) * r
          ctx.fillText('💗', x, y)
        }

        ctx.restore()
      }
    },
    { maxFps: 60, pauseWhenHidden: true }
  )

  stopLoop = () => {
    loop.stop()
  }
})

onBeforeUnmount(() => {
  cleanupResize?.()
  cleanupResize = null
  stopLoop?.()
  stopLoop = null
})
</script>

<template>
  <canvas ref="canvasRef" class="canvas" />
</template>

<style scoped>
.canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
