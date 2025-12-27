<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { writeDraft } from '../utils/session'
import FallingLoveFieldCanvas, {
  type LoveKind,
  type LoveMode,
} from '../components/FallingLoveFieldCanvas.vue'

const router = useRouter()

const exiting = ref(false)
const mode = ref<LoveMode>('mix')

const fieldRef = ref<{
  burstAt: (x: number, y: number) => void
  hitTest: (x: number, y: number) => LoveKind | null
} | null>(null)

const prefersReducedMotion = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
})

function destinationForHit(hit: LoveKind | null) {
  // Petals feel like "secret". Everything else goes to the question flow.
  if (hit === 'petal') return { name: 'secret' as const, selectedPath: 'secret' as const }
  return { name: 'question' as const, selectedPath: 'love' as const }
}

function handleLandingPointer(ev: PointerEvent) {
  if (exiting.value) return

  // Allow UI controls to be clickable without navigating away.
  const el = ev.target as HTMLElement | null
  if (el?.closest?.('.modeToggle')) return

  const hero = ev.currentTarget as HTMLElement | null
  const rect = hero?.getBoundingClientRect()
  if (!rect) return

  const x = ev.clientX - rect.left
  const y = ev.clientY - rect.top

  // Click burst animation at the pointer location.
  fieldRef.value?.burstAt(x, y)

  const hit = fieldRef.value?.hitTest(x, y) ?? null
  const dest = destinationForHit(hit)

  exiting.value = true

  writeDraft({ selectedPath: dest.selectedPath, name: '', loveAnswer: 'unset', relationship: 'friend' })

  const delayMs = prefersReducedMotion.value ? 0 : 420
  window.setTimeout(() => void router.push({ name: dest.name }), delayMs)
}
</script>

<template>
  <main class="page">
    <div class="hero" :data-exiting="exiting ? 'true' : 'false'" @pointerdown="handleLandingPointer">
      <FallingLoveFieldCanvas ref="fieldRef" class="field" :mode="mode" />
      <div class="romance" aria-hidden="true" />

      <section class="heroCard" aria-label="Welcome">
        <header class="copy">
          <h1 class="title">A little love, a little New Year magic</h1>
          <p class="subtitle">Tap anywhere to continue — petals lead to a secret.</p>
          <p class="symbols" aria-hidden="true">❤️ ❄️ 🌸 ✨ 💌 🥂</p>

          <div class="modeToggle" role="group" aria-label="Falling theme">
            <button
              type="button"
              class="chip"
              :data-active="mode === 'mix' ? 'true' : 'false'"
              @pointerdown.stop
              @click.stop="mode = 'mix'"
            >
              All
            </button>
            <button
              type="button"
              class="chip"
              :data-active="mode === 'snow' ? 'true' : 'false'"
              @pointerdown.stop
              @click.stop="mode = 'snow'"
            >
              ❄️
            </button>
            <button
              type="button"
              class="chip"
              :data-active="mode === 'heart' ? 'true' : 'false'"
              @pointerdown.stop
              @click.stop="mode = 'heart'"
            >
              ❤️
            </button>
            <button
              type="button"
              class="chip"
              :data-active="mode === 'petal' ? 'true' : 'false'"
              @pointerdown.stop
              @click.stop="mode = 'petal'"
            >
              🌸
            </button>
          </div>
        </header>
      </section>
    </div>
  </main>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  width: 100%;
  display: grid;
}

.hero {
  position: relative;
  overflow: hidden;
  border-radius: 0;
  min-height: 100dvh;
  padding: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(1200px 800px at 30% 18%, rgb(var(--rose) / 0.22), transparent 60%),
    radial-gradient(900px 680px at 82% 30%, rgb(var(--lilac) / 0.14), transparent 64%),
    radial-gradient(1100px 760px at 50% 105%, rgb(var(--mist) / 0.08), transparent 56%),
    rgb(var(--midnight));
}

.field {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.romance {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(920px 560px at 18% 18%, rgb(var(--rose) / 0.26), transparent 62%),
    radial-gradient(860px 560px at 82% 30%, rgb(var(--rose) / 0.16), transparent 62%),
    radial-gradient(1200px 720px at 50% 92%, rgb(var(--rose) / 0.14), transparent 58%),
    radial-gradient(980px 620px at 50% 105%, rgb(var(--mist) / 0.08), transparent 58%);
  pointer-events: none;
  mix-blend-mode: screen;
  z-index: 2;
  transition:
    opacity 520ms ease,
    filter 520ms ease;
}

.heroCard {
  position: relative;
  z-index: 3;
  width: min(560px, 92vw);
  text-align: center;
  background: rgb(var(--panel) / 0.24);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: clamp(16px, 3vw, 28px);
  transition:
    opacity 520ms ease,
    transform 520ms ease;
}

.hero[data-exiting='true'] .romance {
  opacity: 0.5;
  filter: blur(2px);
}

.hero[data-exiting='true'] .heroCard {
  opacity: 0.82;
  transform: translateY(2px);
}

.copy {
  display: grid;
  gap: 10px;
}

.title {
  margin: 0;
  font-size: clamp(34px, 5vw, 54px);
  letter-spacing: 0.01em;
  font-weight: 500;
  font-family:
    ui-rounded,
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}

.subtitle {
  margin: 0;
  opacity: 0.78;
  font-size: clamp(16px, 2vw, 18px);
  letter-spacing: 0.02em;
}

.symbols {
  margin: 10px 0 0;
  opacity: 0.9;
  letter-spacing: 0.18em;
  font-size: 18px;
}

.modeToggle {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.chip {
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgb(var(--panel) / 0.18);
  backdrop-filter: blur(10px);
  color: inherit;
  font-size: 0.95rem;
  line-height: 1;
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.chip:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.22);
}

.chip[data-active='true'] {
  border-color: rgba(255, 255, 255, 0.32);
  background: rgb(var(--panel) / 0.32);
}

@media (prefers-reduced-motion: reduce) {
  .bgVideo,
  .dogVideo,
  .romance,
  .heroCard {
    transition: none;
  }

  .romance {
    mix-blend-mode: normal;
  }
}
</style>
