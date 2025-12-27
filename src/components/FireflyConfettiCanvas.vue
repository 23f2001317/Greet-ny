<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { startRafLoop } from '../animations/raf'

const props = defineProps<{
  burstKey?: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

type Orb = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  phase: number
}

type Confetti = {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  rot: number
  vr: number
  life: number
}

let cleanupResize: (() => void) | null = null
let stopLoop: (() => void) | null = null

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const orbs: Orb[] = []
  const confetti: Confetti[] = []

  const resize = () => {
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()

    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Maintain a small, fixed particle budget.
    const targetOrbs = Math.min(16, Math.max(10, Math.floor(rect.width / 80)))
    while (orbs.length < targetOrbs) {
      orbs.push({
        x: rand(0, rect.width),
        y: rand(0, rect.height),
        r: rand(1.6, 3.6),
        vx: rand(-10, 10),
        vy: rand(-8, 8),
        phase: rand(0, Math.PI * 2),
      })
    }
    if (orbs.length > targetOrbs) orbs.splice(targetOrbs)
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })
  cleanupResize = () => window.removeEventListener('resize', onResize)

  resize()

  // Burst a tiny amount of confetti.
  const launchConfetti = () => {
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()

    const count = 18
    for (let i = 0; i < count; i += 1) {
      confetti.push({
        x: rect.width * rand(0.15, 0.85),
        y: rect.height * rand(0.05, 0.25),
        w: rand(4, 7),
        h: rand(10, 16),
        vx: rand(-22, 22),
        vy: rand(26, 48),
        rot: rand(0, Math.PI * 2),
        vr: rand(-2.8, 2.8),
        life: rand(1.8, 2.8),
      })
    }
  }

  launchConfetti()

  watch(
    () => props.burstKey,
    () => {
      launchConfetti()
    }
  )

  const loop = startRafLoop(
    (dt) => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.clearRect(0, 0, w, h)

      // Firefly orbs.
      for (const o of orbs) {
        o.phase += dt * rand(0.6, 1.2)
        o.x += o.vx * dt
        o.y += o.vy * dt

        // Soft wrap.
        if (o.x < -20) o.x = w + 20
        if (o.x > w + 20) o.x = -20
        if (o.y < -20) o.y = h + 20
        if (o.y > h + 20) o.y = -20

        const alpha = 0.22 + (Math.sin(o.phase) * 0.5 + 0.5) * 0.32

        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 7)
        grad.addColorStop(0, `rgba(255, 240, 210, ${alpha})`)
        grad.addColorStop(0.45, `rgba(255, 190, 220, ${alpha * 0.65})`)
        grad.addColorStop(1, 'rgba(255, 190, 220, 0)')

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(o.x, o.y, o.r * 7, 0, Math.PI * 2)
        ctx.fill()
      }

      // Confetti (short-lived + low count).
      for (let i = confetti.length - 1; i >= 0; i -= 1) {
        const c = confetti[i]!
        c.life -= dt
        if (c.life <= 0) {
          confetti.splice(i, 1)
          continue
        }

        c.x += c.vx * dt
        c.y += c.vy * dt
        c.rot += c.vr * dt
        c.vy += 18 * dt

        // Fade as it falls.
        const a = Math.max(0, Math.min(1, c.life / 2.2)) * 0.55

        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(c.rot)

        // Alternate two soft colors.
        ctx.fillStyle = i % 2 === 0 ? `rgba(255, 182, 193, ${a})` : `rgba(230, 160, 255, ${a})`
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)

        ctx.restore()
      }
    },
    { maxFps: 20, pauseWhenHidden: true }
  )

  stopLoop = () => loop.stop()
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
  pointer-events: none;
}
</style>
