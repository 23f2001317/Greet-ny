import * as THREE from 'three'
import { createGltfLoader, normalizeLoadedModel } from '../shared/gltf'

export type ListeningScene = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  root: THREE.Group
  load: () => Promise<void>
  update: (dtSeconds: number) => void
  setParallaxTarget: (nx: number, ny: number) => void
  dispose: () => void
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt)
}

export function createListeningScene(): ListeningScene {
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
  camera.position.set(0, 0.24, 3.35)
  const cameraBase = camera.position.clone()
  const parallaxTarget = new THREE.Vector2(0, 0)
  const parallaxCurrent = new THREE.Vector2(0, 0)

  // One directional light only + soft ambient.
  const key = new THREE.DirectionalLight(0xffc1d6, 1.0)
  key.position.set(2.4, 3.6, 2.1)
  key.castShadow = false
  scene.add(key)
  const ambient = new THREE.AmbientLight(0xffd6e4, 0.48)
  scene.add(ambient)

  const root = new THREE.Group()
  scene.add(root)

  const backGeo = new THREE.PlaneGeometry(7.2, 4.8)
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    emissive: new THREE.Color(0x22101a),
    emissiveIntensity: 0.55,
  })
  const backdrop = new THREE.Mesh(backGeo, backMat)
  backdrop.position.set(0, 0, -2.7)
  root.add(backdrop)

  // Simple resting animal fallback.
  const furMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff1f4),
    roughness: 0.92,
    metalness: 0.02,
    emissive: new THREE.Color(0x140810),
    emissiveIntensity: 0.28,
  })
  const cheekMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff1f4),
    roughness: 0.95,
    metalness: 0,
    emissive: new THREE.Color(0xffb6c1),
    emissiveIntensity: 0.42,
  })
  const eyeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1a171b),
    roughness: 0.45,
    metalness: 0,
    emissive: new THREE.Color(0x101010),
    emissiveIntensity: 0.08,
  })
  const eyeHiMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

  const bodyGeo = new THREE.SphereGeometry(0.58, 16, 14)
  const body = new THREE.Mesh(bodyGeo, furMat)
  body.scale.set(1.15, 0.78, 1.15)

  const earGeo = new THREE.ConeGeometry(0.14, 0.28, 10)
  const earL = new THREE.Mesh(earGeo, furMat)
  const earR = new THREE.Mesh(earGeo, furMat)
  earL.position.set(-0.26, 0.34, 0.08)
  earR.position.set(0.26, 0.34, 0.08)
  earL.rotation.z = 0.55
  earR.rotation.z = -0.55

  const animal = new THREE.Group()
  // Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.07, 12, 10)
  const cheekL = new THREE.Mesh(cheekGeo, cheekMat)
  const cheekR = new THREE.Mesh(cheekGeo, cheekMat)
  cheekL.position.set(-0.15, -0.02, 0.48)
  cheekR.position.set(0.15, -0.02, 0.48)
  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.034, 10, 10)
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
  const eyeLHi = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), eyeHiMat)
  const eyeRHi = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), eyeHiMat)
  const eyeLGroup = new THREE.Group()
  const eyeRGroup = new THREE.Group()
  eyeLHi.position.set(0.01, 0.01, 0.016)
  eyeRHi.position.set(0.01, 0.01, 0.016)
  eyeLGroup.add(eyeL, eyeLHi)
  eyeRGroup.add(eyeR, eyeRHi)
  eyeLGroup.position.set(-0.1, 0.08, 0.48)
  eyeRGroup.position.set(0.1, 0.08, 0.48)
  animal.add(body, earL, earR, cheekL, cheekR, eyeLGroup, eyeRGroup)
  animal.position.set(0, -0.2, 0)
  animal.scale.setScalar(0.95)
  root.add(animal)

  const loader = createGltfLoader()
  let loaded: THREE.Object3D | null = null

  async function load() {
    try {
      const gltf = await loader.loadAsync('/models/animal-a.glb')
      loaded = gltf.scene
      normalizeLoadedModel(loaded)
      softenModelMaterials(loaded)
      loaded.scale.setScalar(1.02)
      loaded.position.copy(animal.position)
      root.add(loaded)
      animal.visible = false
    } catch {
      // keep fallback
    }
  }

  let time = 0
  let currentBreath = 0
  function setParallaxTarget(nx: number, ny: number) {
    parallaxTarget.set(THREE.MathUtils.clamp(nx, -1, 1), THREE.MathUtils.clamp(ny, -1, 1))
  }
  // blink
  const blink: { t: number; dur: number; nextIn: number; phase: 'idle' | 'closing' | 'opening' } = {
    t: 0,
    dur: 0,
    nextIn: Math.random() * 3 + 2,
    phase: 'idle',
  }

  function update(dtSeconds: number) {
    time += dtSeconds

    // Camera gentle parallax
    parallaxCurrent.x = THREE.MathUtils.damp(parallaxCurrent.x, parallaxTarget.x, 5.5, dtSeconds)
    parallaxCurrent.y = THREE.MathUtils.damp(parallaxCurrent.y, parallaxTarget.y, 5.5, dtSeconds)
    camera.position.x = cameraBase.x + parallaxCurrent.x * 0.05
    camera.position.y = cameraBase.y + parallaxCurrent.y * -0.035

    // Very calm: breathe + slight sway, plus rare ear twitch.
    const targetBreath = 0.015 + (Math.sin(time * 0.35) * 0.5 + 0.5) * 0.008
    currentBreath = damp(currentBreath, targetBreath, 6, dtSeconds)

    const t = loaded ?? animal

    t.rotation.y = Math.sin(time * 0.16) * 0.06
    t.rotation.x = Math.sin(time * 0.12) * 0.025
    t.position.y = -0.2 + Math.sin(time * 0.5) * currentBreath

    // Ear twitch is subtle and infrequent.
    const twitch = Math.sin(time * 0.7) * 0.035 * Math.max(0, Math.sin(time * 0.1))
    earL.rotation.x = twitch
    earR.rotation.x = twitch

    backMat.emissiveIntensity = 0.52 + Math.sin(time * 0.25) * 0.02

    if (!loaded) {
      blink.nextIn -= dtSeconds
      if (blink.phase === 'idle' && blink.nextIn <= 0) {
        blink.phase = 'closing'
        blink.t = 0
        blink.dur = 0.12
      }
      if (blink.phase === 'closing') {
        blink.t += dtSeconds
        const p = Math.max(0, Math.min(1, blink.t / blink.dur))
        const s = 1 - THREE.MathUtils.smoothstep(p, 0, 1)
        eyeLGroup.scale.y = Math.max(0.12, s)
        eyeRGroup.scale.y = Math.max(0.12, s)
        const vis = s > 0.25
        eyeLHi.visible = vis
        eyeRHi.visible = vis
        if (p >= 1) {
          blink.phase = 'opening'
          blink.t = 0
          blink.dur = 0.14
        }
      } else if (blink.phase === 'opening') {
        blink.t += dtSeconds
        const p = Math.max(0, Math.min(1, blink.t / blink.dur))
        const s = THREE.MathUtils.smoothstep(p, 0, 1)
        eyeLGroup.scale.y = Math.max(0.12, s)
        eyeRGroup.scale.y = Math.max(0.12, s)
        const vis = s > 0.25
        eyeLHi.visible = vis
        eyeRHi.visible = vis
        if (p >= 1) {
          blink.phase = 'idle'
          blink.nextIn = Math.random() * 3 + 2
        }
      }
    }
  }

  function dispose() {
    backGeo.dispose()
    backMat.dispose()
    furMat.dispose()
    bodyGeo.dispose()
    earGeo.dispose()
    cheekGeo.dispose()
    cheekMat.dispose()
    eyeGeo.dispose()
    eyeMat.dispose()
    eyeHiMat.dispose()
  }

  return { scene, camera, root, load, update, setParallaxTarget, dispose }

  function softenModelMaterials(root: THREE.Object3D) {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!(mesh as any).isMesh) return
      const mats = Array.isArray((mesh as any).material) ? (mesh as any).material : [(mesh as any).material]
      for (const m of mats as THREE.Material[]) {
        const std = m as THREE.MeshStandardMaterial
        if (!(std as any).isMeshStandardMaterial) continue
        const name = (std.name || obj.name || '').toLowerCase()
        if (name.includes('eye') || name.includes('pupil') || name.includes('iris')) {
          std.metalness = 0
          std.roughness = Math.min(0.5, std.roughness ?? 0.5)
          std.color = new THREE.Color(0x1a171b)
          std.emissive = new THREE.Color(0x101010)
          std.emissiveIntensity = 0.08
        } else {
          std.metalness = Math.min(0.06, std.metalness ?? 0.06)
          std.roughness = Math.max(0.88, std.roughness ?? 0.88)
        }
      }
    })
  }
}
