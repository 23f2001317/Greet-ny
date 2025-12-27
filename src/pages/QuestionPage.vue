<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import FallingLoveFieldCanvas, { type LoveMode } from '../components/FallingLoveFieldCanvas.vue'
import { type LoveAnswer, readDraft, writeDraft, type WishAnswer } from '../utils/session'

const router = useRouter()

const draft = readDraft()

const name = ref(draft.name)
const loveAnswer = ref<LoveAnswer>(draft.loveAnswer)
const wish = ref<WishAnswer>(draft.wish)

const mode = ref<LoveMode>('mix')

const prefersReducedMotion = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
})

const canContinue = computed(() => {
  return loveAnswer.value !== 'unset' && wish.value !== 'unset'
})

function inferRelationship(a: LoveAnswer) {
  if (a === 'cant_say') return 'secret_lover' as const
  if (a === 'just_friends') return 'friend' as const
  if (a === 'unset') return 'friend' as const
  return 'crush' as const
}

const relationship = computed(() => inferRelationship(loveAnswer.value))

function continueToGenerate() {
  if (!canContinue.value) return

  writeDraft({
    selectedPath: 'love',
    name: name.value,
    loveAnswer: loveAnswer.value,
    relationship: relationship.value,
    wish: wish.value,
  })

  void router.push({ name: 'generate' })
}
</script>

<template>
  <main class="page">
    <div class="hero">
      <video class="bgVideo" autoplay muted loop playsinline tabindex="-1" aria-hidden="true">
        <source src="/videos/0_Couple_Love_3840x2160.mp4" type="video/mp4" />
      </video>
      <div class="bgShade" aria-hidden="true" />

      <FallingLoveFieldCanvas class="field" :mode="mode" />

      <section class="panel">
        <header class="header">
          <div class="kicker" aria-hidden="true">New Year • Love</div>
          <h1 class="title">One gentle minute.</h1>
          <p class="subtitle">Answer these and I’ll write something soft for you.</p>

          <div class="modeToggle" role="group" aria-label="Falling theme">
            <button
              type="button"
              class="chip"
              :data-active="mode === 'mix' ? 'true' : 'false'"
              @click="mode = 'mix'"
            >
              All
            </button>
            <button
              type="button"
              class="chip"
              :data-active="mode === 'snow' ? 'true' : 'false'"
              @click="mode = 'snow'"
            >
              ❄️
            </button>
            <button
              type="button"
              class="chip"
              :data-active="mode === 'heart' ? 'true' : 'false'"
              @click="mode = 'heart'"
            >
              ❤️
            </button>
            <button
              type="button"
              class="chip"
              :data-active="mode === 'petal' ? 'true' : 'false'"
              @click="mode = 'petal'"
            >
              🌸
            </button>
          </div>
        </header>

        <form class="form" @submit.prevent="continueToGenerate">
          <label class="fieldRow">
            <span class="label">Your name</span>
            <input v-model="name" class="input" autocomplete="name" placeholder="Type your name" />
          </label>

          <div class="questionsGrid" role="group" aria-label="Questions">
            <div class="questionCard">
              <fieldset class="fieldRow">
                <legend class="label">How do you feel about me?</legend>
                <div class="options" role="radiogroup" aria-label="How do you feel about me?">
                  <label class="option">
                    <input v-model="loveAnswer" type="radio" name="love" value="just_friends" />
                    <span class="optionText">Just friends</span>
                  </label>
                  <label class="option">
                    <input v-model="loveAnswer" type="radio" name="love" value="like_you" />
                    <span class="optionText">I like you</span>
                  </label>
                  <label class="option">
                    <input v-model="loveAnswer" type="radio" name="love" value="love_you" />
                    <span class="optionText">I love you</span>
                  </label>
                  <label class="option">
                    <input v-model="loveAnswer" type="radio" name="love" value="cant_say" />
                    <span class="optionText">I can’t say</span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div class="questionCard">
              <fieldset class="fieldRow">
                <legend class="label">Your New Year wish</legend>
                <div class="options" role="radiogroup" aria-label="Your New Year wish">
                  <label class="option">
                    <input v-model="wish" type="radio" name="wish" value="relation" />
                    <span class="optionText">Get into relation</span>
                  </label>
                  <label class="option">
                    <input v-model="wish" type="radio" name="wish" value="breakup" />
                    <span class="optionText">Make breakup</span>
                  </label>
                  <label class="option">
                    <input v-model="wish" type="radio" name="wish" value="peace" />
                    <span class="optionText">Peace</span>
                  </label>
                  <label class="option">
                    <input v-model="wish" type="radio" name="wish" value="all" />
                    <span class="optionText">All</span>
                  </label>
                </div>
              </fieldset>
            </div>
          </div>

          <div class="actions">
            <button class="primary" type="submit" :disabled="!canContinue">
              {{ prefersReducedMotion ? 'Continue' : 'Continue →' }}
            </button>
            <p class="hint" aria-hidden="true">💗 Soft answers only. No pressure.</p>
          </div>
        </form>
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
  min-height: 100dvh;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: rgb(var(--midnight));
}

.bgVideo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.62;
  filter: saturate(1.05) blur(0.5px);
}

.bgShade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 780px at 20% 18%, rgb(var(--rose) / 0.28), transparent 62%),
    radial-gradient(980px 720px at 82% 30%, rgb(var(--lilac) / 0.18), transparent 64%),
    radial-gradient(1200px 900px at 50% 100%, rgb(var(--midnight) / 0.65), transparent 64%),
    linear-gradient(180deg, rgb(var(--midnight) / 0.35), rgb(var(--midnight) / 0.65));
  pointer-events: none;
}

.field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.panel {
  position: relative;
  z-index: 2;
  width: min(720px, 92vw);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgb(var(--panel) / 0.28);
  backdrop-filter: blur(12px);
  padding: clamp(18px, 3vw, 30px);
  animation: floatIn 520ms ease both;
}

@keyframes floatIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.header {
  text-align: left;
}

.kicker {
  font-size: 0.9rem;
  opacity: 0.88;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: 8px 0 0;
  font-size: clamp(28px, 3.8vw, 40px);
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 10px 0 0;
  opacity: 0.9;
}

.modeToggle {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.chip {
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgb(var(--panel) / 0.18);
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

.form {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.questionsGrid {
  display: grid;
  gap: 14px;
}

.questionCard {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgb(var(--panel) / 0.16);
  padding: 12px;
}

.fieldRow {
  display: grid;
  gap: 8px;
}

.label {
  font-weight: 650;
}

.input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgb(var(--panel) / 0.22);
  color: inherit;
  padding: 0.75rem 0.9rem;
}

.options {
  display: grid;
  gap: 10px;
}

.option {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgb(var(--panel) / 0.18);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.option:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.22);
}

.optionText {
  opacity: 0.95;
}

.actions {
  margin-top: 6px;
  display: grid;
  gap: 10px;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  margin: 0;
  opacity: 0.85;
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    animation: none;
  }

  .chip,
  .option {
    transition: none;
  }

  .bgVideo {
    filter: none;
  }
}
</style>
