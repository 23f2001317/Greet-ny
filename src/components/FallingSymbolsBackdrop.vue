<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { startRafLoop } from '../animations/raf'

type SymbolKind = 'snow' | 'heart' | 'flower'

type BackdropKind = SymbolKind | 'mixed'

type SymbolState = {
  active: boolean
  kind: SymbolKind
  x: number
  y: number
  t: number
  vx: number
  vy: number
  driftAmp: number
  driftFreq: number
  driftPhase: number
  size: number
  spinDur: number
  spinDir: 1 | -1
}

const props = withDefaults(
  defineProps<{
    kind?: BackdropKind
    maxSymbols?: number
  }>(),
  {
    kind: 'mixed',
    maxSymbols: 12,
  }
)

const containerRef = ref<HTMLDivElement | null>(null)

const elRefs = ref<Array<HTMLSpanElement | null>>([])
const setElRef = (i: number) => (node: unknown, _refs?: Record<string, unknown>) => {
  elRefs.value[i] = node instanceof HTMLSpanElement ? node : null
}

const glyphRefs = ref<Array<HTMLSpanElement | null>>([])
const setGlyphRef = (i: number) => (node: unknown, _refs?: Record<string, unknown>) => {
  glyphRefs.value[i] = node instanceof HTMLSpanElement ? node : null
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickKind(): SymbolKind {
  if (props.kind !== 'mixed') return props.kind
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

function glowToken(kind: SymbolKind) {
  if (kind === 'snow') return 'var(--mist)'
  if (kind === 'heart') return 'var(--rose)'
  return 'var(--lilac)'
}

let stopLoop: (() => void) | null = null
let cleanupResize: (() => void) | null = null
let cleanupMedia: (() => void) | null = null

onMounted(() => {
  const container = containerRef.value
  if (!container) return

  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onMedia = () => {
    if (media.matches) {
      stopLoop?.()
      stopLoop = null
      // Hide symbols under reduced motion.
      for (const el of elRefs.value) {
        if (!el) continue
        el.style.opacity = '0'
        el.style.transform = 'translateX(-9999px) translateY(-9999px)'
      }
    }
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onMedia)
    cleanupMedia = () => media.removeEventListener('change', onMedia)
  } else {
    // Safari fallback
    media.addListener(onMedia)
    cleanupMedia = () => media.removeListener(onMedia)
  }

  let width = 1
  let height = 1

  const resize = () => {
    const rect = container.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })
  cleanupResize = () => window.removeEventListener('resize', onResize)
  resize()

  const max = Math.max(1, Math.min(24, Math.floor(props.maxSymbols)))

  // Ensure ref arrays match count.
  elRefs.value = Array.from({ length: max }, () => null)
  glyphRefs.value = Array.from({ length: max }, () => null)

  const states: SymbolState[] = Array.from({ length: max }, () => ({
    active: false,
    kind: 'snow',
    x: -9999,
    y: -9999,
    t: 0,
    vx: 0,
    vy: 0,
    driftAmp: 0,
    driftFreq: 0,
    driftPhase: 0,
    size: 28,
    spinDur: 6,
    spinDir: 1,
  }))

  let nextSpawnIn = rand(0.15, 0.55)

  const applyToEl = (i: number) => {
    const el = elRefs.value[i]
    const glyph = glyphRefs.value[i]
    const s = states[i]!
    if (!el) return

    if (!s.active) {
      el.style.opacity = '0'
      el.style.transform = 'translateX(-9999px) translateY(-9999px)'
      return
    }

    if (glyph) glyph.textContent = glyphFor(s.kind)

    el.style.setProperty('--glow', glowToken(s.kind))
    el.style.setProperty('--spinDur', `${s.spinDur.toFixed(2)}s`)
    el.style.setProperty('--spinDir', `${s.spinDir}`)

    el.style.width = `${s.size}px`
    el.style.height = `${s.size}px`
    el.style.fontSize = `${Math.floor(s.size * 0.78)}px`

    // Depth illusion: smaller feels farther.
    const depth01 = Math.max(0, Math.min(1, (s.size - 24) / (38 - 24)))
    const opacity = 0.06 + depth01 * 0.08
    el.style.opacity = `${opacity.toFixed(3)}`

    el.style.transform = `translateX(${s.x}px) translateY(${s.y}px)`
  }

  const spawnOne = () => {
    for (let i = 0; i < max; i += 1) {
      const s = states[i]!
      if (s.active) continue

      const kind = pickKind()
      const size = rand(24, 38)

      s.active = true
      s.kind = kind
      s.size = size
      s.x = rand(8, Math.max(8, width - size - 8))
      s.y = -size * 1.6
      s.t = 0

      // Slower than interactive nav.
      s.vy = rand(10, 26)
      s.vx = rand(-5, 5)

      s.driftAmp = rand(4, 12)
      s.driftFreq = rand(0.16, 0.32)
      s.driftPhase = rand(0, Math.PI * 2)

      s.spinDur = rand(7.0, 12.0)
      s.spinDir = Math.random() < 0.5 ? -1 : 1

      applyToEl(i)
      return
    }
  }

  const despawn = (i: number) => {
    const s = states[i]!
    s.active = false
    applyToEl(i)
  }

  onMedia()
  if (media.matches) return

  // Start with a few symbols already present.
  const initial = Math.min(5, max)
  for (let i = 0; i < initial; i += 1) spawnOne()

  const loop = startRafLoop(
    (dt) => {
      nextSpawnIn -= dt
      if (nextSpawnIn <= 0) {
        spawnOne()
        nextSpawnIn = rand(0.35, 0.9)
      }

      for (let i = 0; i < max; i += 1) {
        const s = states[i]!
        if (!s.active) continue

        s.t += dt
        s.x += s.vx * dt + Math.sin(s.t * Math.PI * 2 * s.driftFreq + s.driftPhase) * (s.driftAmp * dt)
        s.y += s.vy * dt

        if (s.x < -s.size) s.x = width + s.size
        if (s.x > width + s.size) s.x = -s.size

        if (s.y > height + s.size * 2.2) {
          despawn(i)
          continue
        }

        applyToEl(i)
      }
    },
    { maxFps: 18, pauseWhenHidden: true }
  )

  stopLoop = () => loop.stop()
})

onBeforeUnmount(() => {
  stopLoop?.()
  cleanupResize?.()
  cleanupMedia?.()
  stopLoop = null
  cleanupResize = null
  cleanupMedia = null
})
</script>

<template>
  <div ref="containerRef" class="wrap" aria-hidden="true">
    <span v-for="i in Math.max(1, Math.min(24, Math.floor(maxSymbols)))" :key="i" :ref="setElRef(i - 1)" class="sym">
      <span :ref="setGlyphRef(i - 1)" class="glyph" aria-hidden="true" />
    </span>
  </div>
</template>

<style scoped>
.wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sym {
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  place-items: center;
  border-radius: 999px;
  opacity: 0;
  transform: translateX(-9999px) translateY(-9999px);
  will-change: transform;
  filter: drop-shadow(0 0 12px rgb(var(--glow, var(--mist)) / 0.14));
}

.glyph {
  display: inline-block;
  will-change: transform;
  animation: spin var(--spinDur, 10s) linear infinite;
  transform-origin: 50% 50%;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(calc(360deg * var(--spinDir, 1)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .wrap {
    display: none;
  }
}
</style>
