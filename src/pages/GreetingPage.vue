<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import FallingLoveFieldCanvas from '../components/FallingLoveFieldCanvas.vue'
import { clearDraft, readDraft } from '../utils/session'

const router = useRouter()
const draft = readDraft()

const theme = computed(() => {
  if (draft.relationship === 'friend') return 'friend'
  return 'love'
})

const fallMode = computed(() => {
  if (draft.relationship === 'friend') return 'snow'
  return 'heart'
})

const bgVideoSrc = computed(() => {
  if (draft.relationship === 'friend') return '/videos/0_People_Group_3840x2160.mp4'

  // Love-related: pick a "respective" video based on the wish (same mapping as /generate).
  if (draft.wish === 'peace') return '/videos/6916549_Motion_Graphics_Motion_Graphic_3840x2160.mp4'
  if (draft.wish === 'breakup') return '/videos/7048083_Animation_Motion_Graphic_3840x2160.mp4'
  if (draft.wish === 'all') return '/videos/0_Hearts_Red_3840x2160.mp4'
  if (draft.wish === 'relation') return '/videos/0_Couple_Love_3840x2160.mp4'

  return '/videos/0_Couple_Kiss_3840x2160.mp4'
})

const name = computed(() => (draft.name || '').trim() || 'friend')

const headline = computed(() => {
  if (draft.relationship === 'friend') return `My dear lovely friend, ${name.value}`
  return `Happy New Year, ${name.value}`
})

const wishLine = computed(() => {
  // Keep this short and on-theme for greeting.
  if (draft.wish === 'peace') return 'Wishing you peace that truly reaches you.'
  if (draft.wish === 'breakup') return 'Wishing you strength, closure, and a fresh start.'
  if (draft.wish === 'relation') return 'Wishing you a relationship that feels safe and real.'
  if (draft.wish === 'all') return 'Wishing you all of it: peace, love, and bright surprises.'
  return ''
})

const message = computed(() => {
  if (draft.relationship === 'friend') {
    return (
      `I’m really grateful you’re in my life. ` +
      `May this year bring you calm days, good people, and wins that feel easy. ` +
      (wishLine.value ? wishLine.value : '')
    )
  }

  return (
    `I’m wishing you a year that feels soft, safe, and loved. ` +
    `May we make more little memories—no pressure, just something real. ` +
    (wishLine.value ? wishLine.value : '')
  )
})

function restart() {
  clearDraft()
  void router.push({ name: 'landing' })
}
</script>

<template>
  <main class="page">
    <div class="hero" :data-theme="theme">
      <video class="bgVideo" autoplay muted loop playsinline tabindex="-1" aria-hidden="true">
        <source :src="bgVideoSrc" type="video/mp4" />
      </video>
      <div class="bgShade" aria-hidden="true" />
      <FallingLoveFieldCanvas class="fall" :mode="fallMode" />

      <section class="panel">
        <header class="header">
          <div class="kicker">New Year • Greeting</div>
          <h1 class="title">{{ headline }}</h1>
          <p class="subtitle">{{ message }}</p>
        </header>

        <div class="actions">
          <button class="primary" type="button" @click="restart">Start over</button>
        </div>
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
  display: grid;
  place-items: center;

.bgShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(180deg, rgb(var(--midnight) / 0.22), rgb(var(--midnight) / 0.78));
}
}
.bgVideo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  z-index: 0;
  opacity: 0.86;
  filter: saturate(1.02) blur(0.8px);
}

.hero[data-theme='friend'] .bgShade {
  background:
    radial-gradient(980px 620px at 22% 20%, rgb(var(--mist) / 0.14), transparent 62%),
    radial-gradient(980px 620px at 78% 22%, rgb(var(--lilac) / 0.10), transparent 62%),
    linear-gradient(180deg, rgb(var(--midnight) / 0.20), rgb(var(--midnight) / 0.76));
}

.hero[data-theme='love'] .bgShade {
  background:
    radial-gradient(980px 620px at 22% 18%, rgb(var(--lilac) / 0.14), transparent 62%),
    radial-gradient(980px 620px at 78% 24%, rgb(var(--mist) / 0.08), transparent 62%),
    linear-gradient(180deg, rgb(var(--midnight) / 0.16), rgb(var(--midnight) / 0.76));
}

.fall {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.panel {
  position: relative;
  z-index: 3;
  width: min(920px, 94vw);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgb(var(--panel) / 0.26);
  backdrop-filter: blur(12px);
  padding: clamp(18px, 3vw, 30px);
}

.header {
  text-align: left;
}

.kicker {
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.title {
  margin: 10px 0 0;
  font-size: clamp(30px, 4vw, 44px);
  letter-spacing: -0.03em;
}

.subtitle {
  margin: 10px 0 0;
  opacity: 0.9;
}

.actions {
  margin-top: 18px;
}

.primary {
  padding: 0.75rem 1.1rem;
}

@media (prefers-reduced-motion: reduce) {
  .bgVideo {
    filter: none;
  }
}
</style>
