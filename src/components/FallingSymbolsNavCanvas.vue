<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { startRafLoop } from '../animations/raf'

type SymbolKind = 'snow' | 'heart' | 'flower'

type FallingSymbol = {
  id: number
  kind: SymbolKind
  baseX: number
  x: number
  y: number
  t: number
  vy: number
  driftAmp: number
  driftFreq: number
  driftPhase: number
  rot: number
  vr: number
  size: number
  clickedAt: number | null
}

const props = withDefaults(
  defineProps<{
    maxSymbols?: number
    exiting?: boolean
  }>(),
  {
    maxSymbols: 36,
    exiting: false,
  }
)

const emit = defineEmits<{
  (e: 'select', kind: SymbolKind): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

let cleanupResize: (() => void) | null = null
let stopLoop: (() => void) | null = null

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickKind(): SymbolKind {
  const r = Math.random()
  if (r < 0.34) return 'snow'
  if (r < 0.67) return 'heart'
  return 'flower'
}

function glyphFor(kind: SymbolKind) {
  if (kind === 'snow') return '❄️'
  if (kind === 'heart') return '❤️'
  return '🌸'
}

function glowFor(kind: SymbolKind) {
  if (kind === 'snow') return 'rgba(255,255,255,0.28)'
  if (kind === 'heart') return 'rgba(255,182,193,0.32)'
  return 'rgba(230,160,255,0.28)'
}

function approach(current: number, target: number, rate: number, dtSeconds: number) {
  // Exponential approach.
  const k = 1 - Math.exp(-rate * Math.max(0, dtSeconds))
  return current + (target - current) * k
}

function easeOutCubic(t: number) {
  const tt = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - tt, 3)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  let width = 1
  let height = 1

  const symbols: FallingSymbol[] = []
  const pool: FallingSymbol[] = []
  const maxSymbols = Math.max(1, Math.min(40, Math.floor(props.maxSymbols)))

  let now = 0
  let nextSpawnIn = rand(0.18, 0.5)
  let idCounter = 1
  let locked = false

  let fade = 1
  let fadeTarget = 1

  watch(
    () => props.exiting,
    (v) => {
      fadeTarget = v ? 0 : 1
      if (v) locked = true
    },
    { immediate: true }
  )

  const resize = () => {
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)

    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })
  cleanupResize = () => window.removeEventListener('resize', onResize)
  resize()

  const onClick = (ev: MouseEvent) => {
    if (locked) return

    const rect = canvas.getBoundingClientRect()
    const mx = ev.clientX - rect.left
    const my = ev.clientY - rect.top

    for (let i = symbols.length - 1; i >= 0; i -= 1) {
      const s = symbols[i]!
      const r = s.size * 0.65
      const dx = mx - s.x
      const dy = my - s.y
      if (dx * dx + dy * dy <= r * r) {
        locked = true
        s.clickedAt = now
        emit('select', s.kind)
        break
      }
    }
  }

  canvas.addEventListener('click', onClick, { passive: true })

  const loop = startRafLoop(
    (dt) => {
      now += dt

      fade = approach(fade, fadeTarget, 6.5, dt)
      if (fade <= 0.001) {
        ctx.clearRect(0, 0, width, height)
        return
      }

      // Spawn at random intervals, but cap active symbol count.
      nextSpawnIn -= dt
      if (!locked && !props.exiting && nextSpawnIn <= 0 && symbols.length < maxSymbols) {
        const kind = pickKind()
        const size = rand(22, 36)
        const baseX = rand(14, Math.max(14, width - 14))

        const s: FallingSymbol = pool.pop() ?? {
          id: 0,
          kind: 'snow',
          baseX: 0,
          x: 0,
          y: 0,
          t: 0,
          vy: 0,
          driftAmp: 0,
          driftFreq: 0,
          driftPhase: 0,
          rot: 0,
          vr: 0,
          size: 0,
          clickedAt: null,
        }

        s.id = idCounter++
        s.kind = kind
        s.size = size
        s.baseX = baseX
        s.x = baseX
        s.y = -size * 1.8
        // Faster fall (still gentle).
        s.vy = rand(52, 92)
        // Slight side drift.
        s.t = 0
        s.driftAmp = rand(10, 22)
        s.driftFreq = rand(0.75, 1.35)
        s.driftPhase = rand(0, Math.PI * 2)
        s.rot = rand(-0.18, 0.18)
        s.vr = rand(-0.32, 0.32)
        s.clickedAt = null

        symbols.push(s)
        nextSpawnIn = rand(0.12, 0.32)
      }

      // Update + prune.
      for (let i = symbols.length - 1; i >= 0; i -= 1) {
        const s = symbols[i]!
        s.t += dt
        s.y += s.vy * dt
        s.x = s.baseX + Math.sin(s.t * s.driftFreq + s.driftPhase) * s.driftAmp
        s.rot += s.vr * dt

        if (s.y > height + s.size * 2.2) {
          const [removed] = symbols.splice(i, 1)
          if (removed) pool.push(removed)
        }
      }

      // Draw.
      ctx.clearRect(0, 0, width, height)

      for (const s of symbols) {
        let scale = 1
        let alpha = 0.9
        let shadowBlur = 8

        if (s.clickedAt !== null) {
          const t = (now - s.clickedAt) / 0.28
          const e = easeOutCubic(t)
          scale = 1 + e * 0.22
          alpha = 0.92 + e * 0.06
          shadowBlur = 14
        }

        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.rot)
        ctx.scale(scale, scale)
        ctx.globalAlpha = alpha * fade

        ctx.font = `${s.size}px ui-sans-serif, system-ui, Apple Color Emoji, Segoe UI Emoji`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        ctx.shadowColor = glowFor(s.kind)
        ctx.shadowBlur = shadowBlur
        ctx.fillText(glyphFor(s.kind), 0, 0)

        ctx.restore()
      }
    },
    { maxFps: 36, pauseWhenHidden: true }
  )

  stopLoop = () => {
    loop.stop()
    canvas.removeEventListener('click', onClick)
  }
})

onBeforeUnmount(() => {
  stopLoop?.()
  cleanupResize?.()
  stopLoop = null
  cleanupResize = null
})
</script>

<template>
  <canvas ref="canvasRef" class="canvas" aria-hidden="true" />
</template>

<style scoped>
.canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
