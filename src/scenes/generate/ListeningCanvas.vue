<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { startRafLoop } from '../../animations/raf'
import { createRenderer, disposeObject3D, setRendererSize } from '../shared/three'
import { createListeningScene } from './createListeningScene'

const canvasRef = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let cleanupResize: (() => void) | null = null
let stopLoop: (() => void) | null = null
let disposeScene: (() => void) | null = null
let cleanupPointer: (() => void) | null = null

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const scene = createListeningScene()
  disposeScene = () => {
    disposeObject3D(scene.scene)
    scene.dispose()
  }

  renderer = createRenderer(canvas)

  const resize = () => {
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()
    scene.camera.aspect = rect.width / Math.max(1, rect.height)
    scene.camera.updateProjectionMatrix()
    setRendererSize(renderer!, rect.width, rect.height)
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })
  cleanupResize = () => window.removeEventListener('resize', onResize)

  resize()
  await scene.load()

  const loop = startRafLoop(
    (dt) => {
      scene.update(dt)
      renderer!.render(scene.scene, scene.camera)
    },
    { maxFps: 20, pauseWhenHidden: true }
  )

  // Gentle pointer parallax
  const onPointerMove = (ev: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const nx = rect.width > 0 ? (ev.clientX - rect.left) / rect.width : 0.5
    const ny = rect.height > 0 ? (ev.clientY - rect.top) / rect.height : 0.5
    scene.setParallaxTarget((nx - 0.5) * 2, (ny - 0.5) * 2)
  }
  const onPointerLeave = () => scene.setParallaxTarget(0, 0)
  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })
  cleanupPointer = () => {
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
  }

  stopLoop = () => loop.stop()
})

onBeforeUnmount(() => {
  stopLoop?.()
  cleanupResize?.()
  cleanupPointer?.()

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
  }

  disposeScene?.()

  renderer = null
  cleanupResize = null
  cleanupPointer = null
  stopLoop = null
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
