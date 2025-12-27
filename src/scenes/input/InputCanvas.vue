<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { startRafLoop } from '../../animations/raf'
import { createRenderer, disposeObject3D, setRendererSize } from '../shared/three'
import type { RelationshipType } from './createInputScene'
import { createInputScene } from './createInputScene'

const props = defineProps<{
  nameEnergy01: number
  relationship: RelationshipType
  pulseKey: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let cleanupResize: (() => void) | null = null
let disposeScene: (() => void) | null = null
let cleanupPointer: (() => void) | null = null

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const inputScene = createInputScene()
  disposeScene = () => {
    disposeObject3D(inputScene.scene)
    inputScene.dispose()
  }

  renderer = createRenderer(canvas)

  const resize = () => {
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()
    inputScene.camera.aspect = rect.width / Math.max(1, rect.height)
    inputScene.camera.updateProjectionMatrix()
    setRendererSize(renderer!, rect.width, rect.height)
  }

  const onResize = () => resize()
  window.addEventListener('resize', onResize, { passive: true })
  cleanupResize = () => window.removeEventListener('resize', onResize)

  resize()
  await inputScene.load()

  // Keep scene in sync with UI state.
  inputScene.setNameEnergy(props.nameEnergy01)
  inputScene.setRelationship(props.relationship)

  watch(
    () => props.nameEnergy01,
    (v) => inputScene.setNameEnergy(v),
    { immediate: false }
  )

  watch(
    () => props.relationship,
    (v) => inputScene.setRelationship(v),
    { immediate: false }
  )

  watch(
    () => props.pulseKey,
    () => inputScene.triggerSelection(),
    { immediate: false }
  )

  const loop = startRafLoop(
    (dt) => {
      inputScene.update(dt)
      renderer!.render(inputScene.scene, inputScene.camera)
    },
    { maxFps: 20, pauseWhenHidden: true }
  )

  // Gentle pointer parallax
  const onPointerMove = (ev: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const nx = rect.width > 0 ? (ev.clientX - rect.left) / rect.width : 0.5
    const ny = rect.height > 0 ? (ev.clientY - rect.top) / rect.height : 0.5
    inputScene.setParallaxTarget((nx - 0.5) * 2, (ny - 0.5) * 2)
  }
  const onPointerLeave = () => inputScene.setParallaxTarget(0, 0)
  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })
  cleanupPointer = () => {
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
  }

  onBeforeUnmount(() => {
    loop.stop()
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
    disposeScene = null
  })
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
