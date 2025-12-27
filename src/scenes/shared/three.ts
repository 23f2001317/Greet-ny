import * as THREE from 'three'

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: 'low-power',
  })

  renderer.shadowMap.enabled = false

  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // Cap DPR for battery/GPU friendliness.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
  renderer.setPixelRatio(dpr)

  return renderer
}

export function setRendererSize(renderer: THREE.WebGLRenderer, width: number, height: number) {
  renderer.setSize(Math.max(1, width), Math.max(1, height), false)
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh
    const geometry = (mesh as any).geometry as THREE.BufferGeometry | undefined
    const material = (mesh as any).material as THREE.Material | THREE.Material[] | undefined

    if (geometry) geometry.dispose()

    if (material) {
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material.dispose()
    }
  })
}
