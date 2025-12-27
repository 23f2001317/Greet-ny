<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { startRafLoop } from '../animations/raf'

type SymbolKind = 'snow' | 'heart' | 'flower'

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

const emit = defineEmits<{
  (e: 'select', kind: SymbolKind): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const MAX_SYMBOLS = 16

const elRefs = ref<Array<HTMLButtonElement | null>>(Array.from({ length: MAX_SYMBOLS }, () => null))
const setElRef = (i: number) => (node: unknown, _refs?: Record<string, unknown>) => {
  elRefs.value[i] = node instanceof HTMLButtonElement ? node : null
}

const glyphRefs = ref<Array<HTMLSpanElement | null>>(Array.from({ length: MAX_SYMBOLS }, () => null))
const setGlyphRef = (i: number) => (node: unknown, _refs?: Record<string, unknown>) => {
  glyphRefs.value[i] = node instanceof HTMLSpanElement ? node : null
}

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

function glowToken(kind: SymbolKind) {
  if (kind === 'snow') return 'var(--mist)'
  if (kind === 'heart') return 'var(--rose)'
  return 'var(--lilac)'
}

let stopLoop: (() => void) | null = null
let cleanupResize: (() => void) | null = null
let cleanupMedia: (() => void) | null = null
let cleanupVisibility: (() => void) | null = null

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
      // Hide pooled falling symbols when reduced motion is enabled.
      for (let i = 0; i < MAX_SYMBOLS; i += 1) {
        const el = elRefs.value[i]
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

  const states: SymbolState[] = Array.from({ length: MAX_SYMBOLS }, () => ({
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

  let nextSpawnIn = rand(0.28, 0.75)
  let locked = false

  const applyToEl = (i: number) => {
    const el = elRefs.value[i]
    const s = states[i]!
    if (!el) return

    const glyph = glyphRefs.value[i]

    if (!s.active) {
      el.style.opacity = '0'
      el.style.transform = 'translateX(-9999px) translateY(-9999px)'
      el.style.pointerEvents = 'none'
      return
    }

    if (glyph) glyph.textContent = glyphFor(s.kind)
    el.dataset.kind = s.kind
    el.dataset.idx = `${i}`
    el.style.width = `${s.size}px`
    el.style.height = `${s.size}px`
    el.style.fontSize = `${Math.floor(s.size * 0.78)}px`

    // Depth illusion: smaller feels farther.
    const depth01 = Math.max(0, Math.min(1, (s.size - 26) / (40 - 26)))
    const opacity = 0.55 + depth01 * 0.35
    const blurPx = 0.8 + (1 - depth01) * 0.9

    el.style.setProperty('--glow', glowToken(s.kind))
    el.style.setProperty('--blur', `${blurPx.toFixed(2)}px`)
    el.style.opacity = `${opacity.toFixed(3)}`
    el.style.zIndex = `${Math.round(10 + depth01 * 10)}`

    if (glyph) {
      glyph.style.setProperty('--spinDur', `${s.spinDur.toFixed(2)}s`)
      glyph.style.setProperty('--spinDir', `${s.spinDir}`)
    }

    // Falling motion must be translateX + translateY only.
    el.style.transform = `translateX(${s.x}px) translateY(${s.y}px)`
    // Store position for click animation (still translate-only).
    el.style.setProperty('--tx', `${s.x}px`)
    el.style.setProperty('--ty', `${s.y}px`)
    el.style.pointerEvents = 'auto'
  }

  const spawnOne = () => {
    if (locked) return
    for (let i = 0; i < MAX_SYMBOLS; i += 1) {
      const s = states[i]!
      if (s.active) continue

      const kind = pickKind()
      const size = rand(26, 40)

      // Avoid clutter: try a few X positions that don't overlap nearby symbols.
      const minSeparation = size * 1.15
      let x = rand(10, Math.max(10, width - size - 10))
      let ok = false
      for (let attempt = 0; attempt < 10; attempt += 1) {
        ok = true
        for (let j = 0; j < MAX_SYMBOLS; j += 1) {
          const o = states[j]!
          if (!o.active) continue
          if (Math.abs(o.y - 0) < 0) {
            // no-op: keep TS happy
          }
          if (Math.abs(x - o.x) < (minSeparation + o.size * 0.65)) {
            ok = false
            break
          }
        }
        if (ok) break
        x = rand(10, Math.max(10, width - size - 10))
      }

      // If it's too crowded right now, skip spawning this tick.
      if (!ok && states.some((st) => st.active)) return

      s.active = true
      s.kind = kind
      s.size = size
      s.x = x
      s.y = -size * 1.8
      s.t = 0

      // Light + slow.
      s.vy = rand(14, 34)
      s.vx = rand(-6, 6)

      // Gentle drift.
      s.driftAmp = rand(6, 16)
      s.driftFreq = rand(0.18, 0.35)
      s.driftPhase = rand(0, Math.PI * 2)

      // Gentle rotation: only on inner glyph.
      s.spinDur = rand(5.5, 10.5)
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
    const btn = target?.closest?.('button[data-kind]') as HTMLButtonElement | null
    if (!btn) return

    if (locked) return

    const kind = (btn.dataset.kind || '') as SymbolKind
    if (kind !== 'snow' && kind !== 'heart' && kind !== 'flower') return

    locked = true

    // Disable further interaction immediately.
    for (const el of elRefs.value) {
      if (!el) continue
      el.style.pointerEvents = 'none'
    }

    btn.classList.remove('clicked')
    // Restart animation: localized (click-only), not per-frame.
    void btn.offsetWidth
    btn.classList.add('clicked')

    // Despawn the clicked symbol after its fade-out.
    const idx = Number(btn.dataset.idx)
    if (Number.isFinite(idx) && idx >= 0 && idx < MAX_SYMBOLS) {
      window.setTimeout(() => {
        const s = states[idx]!
        s.active = false
        applyToEl(idx)
      }, 280)
    }

    emit('select', kind)
  }

  container.addEventListener('click', onClick, { passive: true })

  const onVisibility = () => {
    container.dataset.paused = document.hidden ? 'true' : 'false'
  }
  document.addEventListener('visibilitychange', onVisibility, { passive: true })
  cleanupVisibility = () => document.removeEventListener('visibilitychange', onVisibility)
  onVisibility()

  onMedia()

  if (reduced.value) {
    return
  }

  const loop = startRafLoop(
    (dt) => {
      nextSpawnIn -= dt
      if (nextSpawnIn <= 0) {
        spawnOne()
        nextSpawnIn = rand(0.55, 1.2)
      }

      for (let i = 0; i < MAX_SYMBOLS; i += 1) {
        const s = states[i]!
        if (!s.active) continue

        s.t += dt

        s.x += s.vx * dt + Math.sin(s.t * Math.PI * 2 * s.driftFreq + s.driftPhase) * (s.driftAmp * dt)
        s.y += s.vy * dt

        // Keep within a soft horizontal range.
        if (s.x < -s.size) s.x = width + s.size
        if (s.x > width + s.size) s.x = -s.size

        if (s.y > height + s.size * 2.2) {
          despawn(i)
          continue
        }

        applyToEl(i)
      }
    },
    { maxFps: 20, pauseWhenHidden: true }
  )

  stopLoop = () => {
    loop.stop()
    container.removeEventListener('click', onClick)
  }
})

onBeforeUnmount(() => {
  stopLoop?.()
  cleanupResize?.()
  cleanupMedia?.()
  cleanupVisibility?.()
  stopLoop = null
  cleanupResize = null
  cleanupMedia = null
  cleanupVisibility = null
})
</script>

<template>
  <div ref="containerRef" class="wrap" aria-label="Choose a path">
    <!-- Reduced motion fallback: static options (no motion). -->
    <div class="reduced" role="navigation" aria-label="Choose a path">
      <button class="chip" type="button" @click="$emit('select', 'snow')">❄️ friends</button>
      <button class="chip" type="button" @click="$emit('select', 'heart')">❤️ crush</button>
      <button class="chip" type="button" @click="$emit('select', 'flower')">🌸 secret</button>
    </div>

    <button
      v-for="i in MAX_SYMBOLS"
      :key="i"
      :ref="setElRef(i - 1)"
      class="sym"
      type="button"
      aria-hidden="false"
      data-kind=""
    >
      <span :ref="setGlyphRef(i - 1)" class="glyph" aria-hidden="true" />
    </button>

    <div class="hint" aria-hidden="true">
      <span class="hintChip">❄️ friends</span>
      <span class="hintChip">❤️ crush</span>
      <span class="hintChip">🌸 secret</span>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.reduced {
  position: absolute;
  left: clamp(14px, 2vw, 22px);
  bottom: clamp(14px, 2vw, 22px);
  display: none;
  gap: 10px;
  pointer-events: auto;
  z-index: 3;
}

.chip {
  border-radius: 999px;
  border: 1px solid rgb(var(--mist) / 0.14);
  background: rgb(var(--panel) / 0.22);
  backdrop-filter: blur(10px);
  color: inherit;
  padding: 8px 10px;
  font-size: 0.9rem;
}

.sym {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgb(var(--mist) / 0.14);
  background: rgb(var(--panel) / 0.14);
  backdrop-filter: blur(10px);
  padding: 0;
  opacity: 0;
  transform: translateX(-9999px) translateY(-9999px);
  will-change: transform;
  filter: blur(var(--blur, 1px));
}

.glyph {
  display: inline-block;
  will-change: transform;
  filter: drop-shadow(0 0 10px rgb(var(--glow, var(--mist)) / 0.14));
  animation: spin var(--spinDur, 8s) linear infinite;
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

.wrap[data-paused='true'] .glyph {
  animation-play-state: paused;
}

.sym.clicked {
  animation: clickPop 280ms ease-out both;
  box-shadow: 0 0 22px rgb(var(--rose) / 0.14);
}

@keyframes clickPop {
  0% {
    transform: translateX(var(--tx, 0px)) translateY(var(--ty, 0px));
    opacity: 1;
  }
  50% {
    transform: translateX(calc(var(--tx, 0px) - 2px)) translateY(calc(var(--ty, 0px) - 4px));
    opacity: 0.98;
  }
  100% {
    transform: translateX(var(--tx, 0px)) translateY(var(--ty, 0px));
    opacity: 0;
  }
}

.hint {
  position: absolute;
  left: clamp(14px, 2vw, 22px);
  bottom: clamp(14px, 2vw, 22px);
  display: flex;
  gap: 10px;
  z-index: 3;
  pointer-events: none;
}

.hintChip {
  border: 1px solid rgb(var(--mist) / 0.12);
  background: rgb(var(--panel) / 0.22);
  backdrop-filter: blur(10px);
  border-radius: 999px;
  padding: 8px 10px;
  font-size: 0.9rem;
  opacity: 0.9;
}

@media (prefers-reduced-motion: reduce) {
  .sym {
    display: none;
  }
  .hint {
    display: none;
  }
  .reduced {
    display: flex;
  }
}
</style>
