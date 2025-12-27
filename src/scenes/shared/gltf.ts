import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let dracoLoader: DRACOLoader | null = null

function getDracoLoader(): DRACOLoader {
  if (dracoLoader) return dracoLoader

  dracoLoader = new DRACOLoader()

  // Expects decoder files in `public/draco/`:
  // - draco_decoder.js
  // - draco_decoder.wasm
  // - draco_wasm_wrapper.js
  dracoLoader.setDecoderPath('/draco/')
  dracoLoader.setDecoderConfig({ type: 'wasm' })

  return dracoLoader
}

export function createGltfLoader(options?: { useDraco?: boolean }): GLTFLoader {
  const loader = new GLTFLoader()
  const useDraco = options?.useDraco ?? true

  if (useDraco) {
    loader.setDRACOLoader(getDracoLoader())
  }

  return loader
}

export function normalizeLoadedModel(root: THREE.Object3D) {
  root.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh
    if ((mesh as any).isMesh) {
      mesh.castShadow = false
      mesh.receiveShadow = false
      mesh.frustumCulled = true
    }
  })
}
