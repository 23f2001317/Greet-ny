<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { generateEssay } from '../utils/essay'
import { readDraft, writeDraft } from '../utils/session'
import { saveResponse } from '../utils/api'
import FallingLoveFieldCanvas, { type LoveMode } from '../components/FallingLoveFieldCanvas.vue'

const router = useRouter()

const isWorking = ref(true)
const errorMessage = ref<string | null>(null)
const output = ref('')
const revealKey = ref(0)

const draft = readDraft()

function isReady(d: ReturnType<typeof readDraft>) {
  return d.loveAnswer !== 'unset' && d.wish !== 'unset'
}

const theme = computed(() => {
  // /question always sets selectedPath='love', so theme must follow the chosen relationship.
  if (draft.relationship === 'friend') return 'snow'
  if (draft.relationship === 'crush') return 'heart'
  if (draft.relationship === 'secret_lover') return 'heart'
  return 'neutral'
})

const fallMode = computed<LoveMode>(() => {
  if (draft.relationship === 'friend') return 'snow'
  return 'heart'
})

const bgVideoSrc = computed(() => {
  if (draft.relationship === 'friend') return '/videos/0_People_Group_3840x2160.mp4'

  // Love-related: pick a "respective" video based on the wish.
  if (draft.wish === 'peace') return '/videos/6916549_Motion_Graphics_Motion_Graphic_3840x2160.mp4'
  if (draft.wish === 'breakup') return '/videos/7048083_Animation_Motion_Graphic_3840x2160.mp4'
  if (draft.wish === 'all') return '/videos/0_Hearts_Red_3840x2160.mp4'
  if (draft.wish === 'relation') return '/videos/0_Couple_Love_3840x2160.mp4'

  return '/videos/0_Couple_Kiss_3840x2160.mp4'
})

function responseDedupKey(d: ReturnType<typeof readDraft>) {
  const name = (d.name || '').trim().toLowerCase() || 'anonymous'
  return `new-year:responseSaved:v1:${name}:${d.loveAnswer}:${d.wish}`
}

async function saveResponseOnce(current: ReturnType<typeof readDraft>) {
  const key = responseDedupKey(current)
  try {
    if (sessionStorage.getItem(key) === '1') return
    await saveResponse({
      name: (current.name || '').trim(),
      loveAnswer: current.loveAnswer,
      wish: current.wish,
    })
    sessionStorage.setItem(key, '1')
  } catch {
    // Non-blocking: keep the UX smooth even if API is down.
  }
}

async function run() {
  errorMessage.value = null

  const current = readDraft()
  if (!isReady(current)) {
    errorMessage.value = 'Missing input. Please go back and choose the options.'
    isWorking.value = false
    return
  }

  isWorking.value = true

  try {
    await new Promise((r) => setTimeout(r, 450))

    // Generate deterministically but ensure uniqueness via nonce + history.
    const result = generateEssay(current)
    output.value = result.essay
    revealKey.value += 1

    writeDraft({
      essay: output.value,
      essayNonce: result.nextNonce,
    })

    // Store the user's name + chosen answers in the local database.
    void saveResponseOnce(current)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to generate.'
  } finally {
    isWorking.value = false
  }
}

function continueToGreeting() {
  void router.push({ name: 'greeting' })
}

function backToInput() {
  void router.push({ name: 'question' })
}

onMounted(() => {
  void run()
})
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
          <div class="kicker">New Year • Essay</div>
          <h1 class="title">
            For <span class="name">{{ (draft.name || 'you').trim() || 'you' }}</span>
          </h1>
          <p class="subtitle">
            {{ draft.relationship === 'friend' ? 'A warm friend note.' : 'A soft love note.' }}
          </p>
        </header>

        <div class="body">
          <div v-if="isWorking" class="loading" aria-live="polite">
            <div class="spinner" aria-hidden="true" />
            <p class="loadingText">Writing…</p>
            <p class="loadingSub">Hold on—this only takes a moment.</p>
          </div>

          <div v-else class="result">
            <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

            <article v-else class="essay" :key="revealKey">
              <pre class="essayText fadeIn">{{ output }}</pre>
            </article>
          </div>
        </div>

        <footer class="actions">
          <button type="button" class="ghost" @click="backToInput">Back</button>
          <button v-if="!errorMessage" class="primary" type="button" @click="continueToGreeting">Continue</button>
        </footer>
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
}

.bgVideo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.82;
  filter: saturate(1.02) blur(0.8px);
  z-index: 0;
}

.bgShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(180deg, rgb(var(--midnight) / 0.22), rgb(var(--midnight) / 0.78));
}

.hero[data-theme='snow'] .bgVideo {
  opacity: 0.78;
  filter: saturate(0.95) blur(0.8px);
}

.hero[data-theme='heart'] .bgVideo {
  opacity: 0.68;
  filter: saturate(1.12) blur(0.5px);
}

.hero[data-theme='snow'] .bgShade {
  background:
    radial-gradient(980px 620px at 22% 20%, rgb(var(--mist) / 0.14), transparent 62%),
    radial-gradient(980px 620px at 78% 22%, rgb(var(--lilac) / 0.10), transparent 62%),
    linear-gradient(180deg, rgb(var(--midnight) / 0.20), rgb(var(--midnight) / 0.72));
}

.hero[data-theme='heart'] .bgShade {
  background:
    radial-gradient(980px 620px at 22% 18%, rgb(var(--lilac) / 0.14), transparent 62%),
    radial-gradient(980px 620px at 78% 24%, rgb(var(--mist) / 0.08), transparent 62%),
    linear-gradient(180deg, rgb(var(--midnight) / 0.16), rgb(var(--midnight) / 0.72));
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

.hero[data-theme='snow'] .panel {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgb(var(--panel) / 0.24);
}

.hero[data-theme='heart'] .panel {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgb(var(--panel) / 0.30);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
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
  font-size: clamp(30px, 4vw, 42px);
  letter-spacing: -0.03em;
}

.name {
  opacity: 0.98;
}

.subtitle {
  margin: 10px 0 0;
  opacity: 0.9;
}

.body {
  margin-top: 16px;
}

.loading {
  margin-top: 10px;
  display: grid;
  gap: 8px;
  justify-items: start;
}

.loadingText {
  margin: 0;
  opacity: 0.92;
  font-weight: 650;
}

.loadingSub {
  margin: 0;
  opacity: 0.85;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result {
  margin-top: 18px;
}

.error {
  margin: 0;
  color: inherit;
  opacity: 0.95;
}

.essay {
  margin-top: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgb(var(--panel) / 0.22);
  padding: 16px;
}

.essayText {
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.98rem;
  line-height: 1.5;
}

.fadeIn {
  animation: fadeInUp 420ms ease both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fadeIn {
    animation: none;
  }
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
}

.primary {
  padding: 0.75rem 1.1rem;
}

.ghost {
  padding: 0.75rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgb(var(--panel) / 0.14);
  color: inherit;
  border-radius: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .fadeIn {
    animation: none;
  }
}
</style>
