<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { startRafLoop } from '../../animations/raf'
import { createRenderer, disposeObject3D, setRendererSize } from '../shared/three'
import { createHeroScene } from './createHeroScene'

const props = withDefaults(
  defineProps<{
    exiting?: boolean
  }>(),
  {
    exiting: false,
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let rafStop: (() => void) | null = null
let cleanupResize: (() => void) | null = null
let disposeScene: (() => void) | null = null
let cleanupPointer: (() => void) | null = null

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const hero = createHeroScene()
  disposeScene = () => {
    disposeObject3D(hero.scene)
    hero.dispose()
  }

  renderer = createRenderer(canvas)

  const resize = () => {
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()
    hero.camera.aspect = rect.width / Math.max(1, rect.height)
    hero.camera.updateProjectionMatrix()
    setRendererSize(renderer!, rect.width, rect.height)
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })
  cleanupResize = () => window.removeEventListener('resize', onResize)

  resize()
  await hero.load()

  watch(
    () => props.exiting,
    (v) => {
      if (v) hero.beginExit()
    },
    { immediate: true }
  )

  // Subtle parallax on pointer move; no orbit controls.
  let targetX = 0
  let targetY = 0
  const onPointerMove = (ev: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const nx = rect.width > 0 ? (ev.clientX - rect.left) / rect.width : 0.5
    const ny = rect.height > 0 ? (ev.clientY - rect.top) / rect.height : 0.5
    targetX = (nx - 0.5) * 2
    targetY = (ny - 0.5) * 2
    hero.setParallaxTarget(targetX, targetY)
  }
  const onPointerLeave = () => {
    targetX = 0
    targetY = 0
    hero.setParallaxTarget(0, 0)
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })
  cleanupPointer = () => {
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
  }

  const loop = startRafLoop(
    (dt) => {
      hero.update(dt)
      renderer!.render(hero.scene, hero.camera)
    },
    { maxFps: 20, pauseWhenHidden: true }
  )

  rafStop = () => loop.stop()
})

onBeforeUnmount(() => {
  rafStop?.()
  cleanupResize?.()
  cleanupPointer?.()

  // Attempt to free GPU memory.
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
  }

  disposeScene?.()

  renderer = null
  rafStop = null
  cleanupResize = null
  cleanupPointer = null
  disposeScene = null
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
