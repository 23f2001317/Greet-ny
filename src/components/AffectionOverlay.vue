<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    kind: 'friend' | 'crush' | 'love' | 'secret'
    max?: number
    fadeOut?: boolean
  }>(),
  { max: 12, fadeOut: false }
)

const items = ref(
  Array.from({ length: Math.max(1, Math.min(20, Math.floor(props.max))) }, (_, i) => ({
    id: i + 1,
    x: Math.random(),
    y: Math.random(),
    s: 0.8 + Math.random() * 0.6,
    d: 6 + Math.random() * 8,
    type: 0,
  }))
)

const assets = computed(() => {
  if (props.kind === 'friend') return ['snow', 'star'] as const
  if (props.kind === 'crush') return ['heart', 'blush'] as const
  if (props.kind === 'love') return ['heart', 'gift'] as const
  return ['flower', 'envelope'] as const
})

function pickAsset(i: number) {
  const a = assets.value
  return a[i % a.length]
}

let stop: (() => void) | null = null

onMounted(() => {
  let raf = 0
  let t = 0
  const step = () => {
    t += 1 / 60
    for (const it of items.value) {
      const drift = Math.sin((t + it.id) * 0.3) * 0.003
      it.y = (it.y + (0.003 + it.s * 0.0012)) % 1
      it.x = (it.x + drift + 1) % 1
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  stop = () => cancelAnimationFrame(raf)
})

onBeforeUnmount(() => stop?.())
</script>

<template>
  <div class="wrap" :data-fade="fadeOut ? 'true' : 'false'" aria-hidden="true">
    <span
      v-for="it in items"
      :key="it.id"
      class="sprite"
      :data-type="pickAsset(it.id)"
      :style="{
        left: `${it.x * 100}%`,
        top: `${it.y * 100}%`,
        transform: `translate(-50%,-50%) scale(${it.s})`,
        animationDuration: `${it.d}s`,
      }"
    />
  </div>
</template>

<style scoped>
.wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.9;
  transition: opacity 480ms ease;
}
.wrap[data-fade='true'] { opacity: 0; }

.sprite {
  position: absolute;
  width: 28px;
  height: 28px;
  background-repeat: no-repeat;
  background-size: contain;
  filter: drop-shadow(0 2px 6px rgba(255, 192, 203, 0.2));
  opacity: 0.85;
  animation-name: floatY;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

/* Inline SVG data URIs for soft pastel assets */
/* Heart */
.sprite[data-type='heart'] { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><path fill='%23ffafc4' d='M32 56s-4.7-3.87-9.4-7.75C16 44.38 8 38 8 27.75 8 19.6 14.27 14 21.5 14c4.1 0 7.44 1.9 10.5 5 3.06-3.1 6.4-5 10.5-5C49.73 14 56 19.6 56 27.75 56 38 48 44.38 41.4 48.25 36.7 52.13 32 56 32 56z'/></svg>"); }
/* Snow */
.sprite[data-type='snow'] { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><g fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round'><path d='M32 8v48'/><path d='M12 18l40 28'/><path d='M52 18L12 46'/></g></svg>"); opacity: 0.8; }
/* Star */
.sprite[data-type='star'] { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path fill='%23ffe0a3' d='M32 6l7 14 16 2-12 11 3 16-14-7-14 7 3-16L9 22l16-2z'/></svg>"); }
/* Flower */
.sprite[data-type='flower'] { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill='%23f6b0ff'><circle cx='32' cy='18' r='8'/><circle cx='32' cy='46' r='8'/><circle cx='18' cy='32' r='8'/><circle cx='46' cy='32' r='8'/><circle cx='32' cy='32' r='10' fill='%23ffd6e9'/></g></svg>"); }
/* Envelope */
.sprite[data-type='envelope'] { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect x='8' y='16' width='48' height='32' rx='6' fill='%23ffe6ef'/><path d='M12 20l20 14a4 4 0 004 0L56 20' fill='none' stroke='%23ffafc4' stroke-width='3'/></svg>"); }
/* Gift */
.sprite[data-type='gift'] { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect x='12' y='24' width='40' height='28' rx='6' fill='%23ffd6e9'/><path d='M32 24v28M12 36h40' stroke='%23ffafc4' stroke-width='4'/><path d='M24 24c-6 0-6-8 0-8 5 0 8 8 8 8s3-8 8-8c6 0 6 8 0 8' fill='%23ffafc4'/></svg>"); }
/* Blush */
.sprite[data-type='blush'] { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><ellipse cx='22' cy='42' rx='10' ry='6' fill='%23ffc3d1' opacity='0.7'/><ellipse cx='42' cy='42' rx='10' ry='6' fill='%23ffc3d1' opacity='0.7'/></svg>"); }

@keyframes floatY {
  0% { transform: translate(-50%,-50%) translateY(0) }
  50% { transform: translate(-50%,-50%) translateY(-8px) }
  100% { transform: translate(-50%,-50%) translateY(0) }
}

@media (prefers-reduced-motion: reduce) {
  .wrap { display: none; }
}
</style>
