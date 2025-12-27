<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { startRafLoop } from '../animations/raf'

type SymbolKind = 'snow' | 'heart' | 'flower'

type SymbolState = {
  active: boolean
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
    kind: SymbolKind
    maxSymbols?: number
  }>(),
  {
    maxSymbols: 12,
  }
)

const emit = defineEmits<{
  (e: 'burst'): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const elRefs = ref<Array<HTMLButtonElement | null>>([])
const setElRef = (i: number) => (node: unknown, _refs?: Record<string, unknown>) => {
  elRefs.value[i] = node instanceof HTMLButtonElement ? node : null
}

const glyphRefs = ref<Array<HTMLSpanElement | null>>([])
const setGlyphRef = (i: number) => (node: unknown, _refs?: Record<string, unknown>) => {
  glyphRefs.value[i] = node instanceof HTMLSpanElement ? node : null
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
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

const max = Math.max(1, Math.min(24, Math.floor(props.maxSymbols)))

// Ensure ref arrays match count.
elRefs.value = Array.from({ length: max }, () => null)
glyphRefs.value = Array.from({ length: max }, () => null)

onMounted(() => {
  const container = containerRef.value
  if (!container) return

  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reduced = ref(media.matches)

  const onMedia = () => {
    reduced.value = media.matches
    if (reduced.value) {
      stopLoop?.()
      stopLoop = null
      // Hide falling symbols.
      for (const el of elRefs.value) {
        if (!el) continue
        el.style.opacity = '0'
        el.style.transform = 'translateX(-9999px) translateY(-9999px)'
        el.style.pointerEvents = 'none'
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

  const states: SymbolState[] = Array.from({ length: max }, () => ({
    active: false,
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

  let nextSpawnIn = rand(0.12, 0.42)

  const applyToEl = (i: number) => {
    const el = elRefs.value[i]
    const glyph = glyphRefs.value[i]
    const s = states[i]!
    if (!el) return

    if (!s.active) {
      el.style.opacity = '0'
      el.style.transform = 'translateX(-9999px) translateY(-9999px)'
      el.style.pointerEvents = 'none'
      return
    }

    if (glyph) glyph.textContent = glyphFor(props.kind)

    el.dataset.idx = `${i}`

    el.style.setProperty('--glow', glowToken(props.kind))
    el.style.setProperty('--spinDur', `${s.spinDur.toFixed(2)}s`)
    el.style.setProperty('--spinDir', `${s.spinDir}`)

    el.style.width = `${s.size}px`
    el.style.height = `${s.size}px`
    el.style.fontSize = `${Math.floor(s.size * 0.78)}px`

    // Depth illusion: smaller feels farther.
    const depth01 = Math.max(0, Math.min(1, (s.size - 24) / (38 - 24)))
    const opacity = 0.06 + depth01 * 0.08
    el.style.opacity = `${opacity.toFixed(3)}`

    // Falling motion must be translateX + translateY only.
    el.style.transform = `translateX(${s.x}px) translateY(${s.y}px)`
    el.style.setProperty('--tx', `${s.x}px`)
    el.style.setProperty('--ty', `${s.y}px`)

    el.style.pointerEvents = 'auto'
  }

  const spawnOne = () => {
    for (let i = 0; i < max; i += 1) {
      const s = states[i]!
      if (s.active) continue

      const size = rand(24, 38)

      s.active = true
      s.size = size
      s.x = rand(8, Math.max(8, width - size - 8))
      s.y = -size * 1.6
      s.t = 0

      // Faster and smooth.
      s.vy = rand(40, 86)
      s.vx = rand(-9, 9)

      s.driftAmp = rand(6, 14)
      s.driftFreq = rand(0.22, 0.46)
      s.driftPhase = rand(0, Math.PI * 2)

      // Gentle rotation: only on inner glyph.
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

  const onClick = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement | null
    const btn = target?.closest?.('button[data-idx]') as HTMLButtonElement | null
    if (!btn) return

    btn.classList.remove('clicked')
    void btn.offsetWidth
    btn.classList.add('clicked')

    const idx = Number(btn.dataset.idx)
    if (Number.isFinite(idx) && idx >= 0 && idx < max) {
      window.setTimeout(() => despawn(idx), 240)
    }

    emit('burst')
  }

  container.addEventListener('click', onClick, { passive: true })

  onMedia()
  if (reduced.value) return

  // Start with a few symbols already present.
  const initial = Math.min(5, max)
  for (let i = 0; i < initial; i += 1) spawnOne()

  const loop = startRafLoop(
    (dt) => {
      nextSpawnIn -= dt
      if (nextSpawnIn <= 0) {
        spawnOne()
        nextSpawnIn = rand(0.18, 0.55)
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

  stopLoop = () => {
    loop.stop()
    container.removeEventListener('click', onClick)
  }
})

watch(
  () => props.kind,
  () => {
    // Update glyphs/colors on kind change (no rerender needed).
    for (let i = 0; i < elRefs.value.length; i += 1) {
      const el = elRefs.value[i]
      const glyph = glyphRefs.value[i]
      if (!el || !glyph) continue
      glyph.textContent = glyphFor(props.kind)
      el.style.setProperty('--glow', glowToken(props.kind))
    }
  }
)

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
  <div ref="containerRef" class="wrap" :aria-label="`Celebrate with ${kind}`">
    <!-- Reduced motion fallback: one keyboard-clickable celebration chip. -->
    <button class="chip" type="button" @click="$emit('burst')">
      <span aria-hidden="true">{{ kind === 'snow' ? '❄️' : kind === 'heart' ? '❤️' : '🌸' }}</span>
      <span class="chipText">Celebrate</span>
    </button>

    <button
      v-for="i in max"
      :key="i"
      :ref="setElRef(i - 1)"
      class="sym"
      type="button"
      :aria-label="'Celebrate'"
      data-idx=""
    >
      <span :ref="setGlyphRef(i - 1)" class="glyph" aria-hidden="true" />
    </button>
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
  pointer-events: auto;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgb(var(--mist) / 0.12);
  background: rgb(var(--panel) / 0.08);
  backdrop-filter: blur(8px);
  opacity: 0;
  transform: translateX(-9999px) translateY(-9999px);
  will-change: transform;
  filter: drop-shadow(0 0 12px rgb(var(--glow, var(--mist)) / 0.14));
}

.sym:focus-visible {
  outline: 2px solid rgb(var(--mist) / 0.55);
  outline-offset: 3px;
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

.sym.clicked {
  animation: clickPop 240ms ease-out both;
}

@keyframes clickPop {
  0% {
    transform: translateX(var(--tx, 0px)) translateY(var(--ty, 0px));
    opacity: 1;
  }
  100% {
    transform: translateX(var(--tx, 0px)) translateY(var(--ty, 0px));
    opacity: 0;
  }
}

.chip {
  position: absolute;
  left: clamp(14px, 2vw, 22px);
  bottom: clamp(14px, 2vw, 22px);
  display: none;
  gap: 8px;
  align-items: center;
  pointer-events: auto;
  z-index: 2;

  border-radius: 999px;
  border: 1px solid rgb(var(--mist) / 0.14);
  background: rgb(var(--panel) / 0.22);
  backdrop-filter: blur(10px);
  color: inherit;
  padding: 8px 10px;
  font-size: 0.9rem;
}

.chip:focus-visible {
  outline: 2px solid rgb(var(--mist) / 0.55);
  outline-offset: 3px;
}

.chipText {
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .sym {
    display: none;
  }
  .chip {
    display: inline-flex;
  }
}
</style>
