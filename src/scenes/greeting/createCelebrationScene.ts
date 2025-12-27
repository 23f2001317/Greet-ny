import * as THREE from 'three'
import { createGltfLoader, normalizeLoadedModel } from '../shared/gltf'

export type CelebrationScene = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  root: THREE.Group
  load: () => Promise<void>
  setMood: (mood: 'friend' | 'crush' | 'secret_lover') => void
  update: (dtSeconds: number) => void
  setParallaxTarget: (nx: number, ny: number) => void
  dispose: () => void
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt)
}

export function createCelebrationScene(): CelebrationScene {
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
  camera.position.set(0, 0.24, 3.35)
  const cameraBase = camera.position.clone()
  const parallaxTarget = new THREE.Vector2(0, 0)
  const parallaxCurrent = new THREE.Vector2(0, 0)

  // One directional light, no shadows + soft ambient.
  const key = new THREE.DirectionalLight(0xffc1d6, 1.05)
  key.position.set(2.4, 3.8, 2.3)
  key.castShadow = false
  scene.add(key)
  const ambient = new THREE.AmbientLight(0xffd6e4, 0.5)
  scene.add(ambient)

  const root = new THREE.Group()
  scene.add(root)

  const backGeo = new THREE.PlaneGeometry(7.6, 5.2)
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    emissive: new THREE.Color(0x2a0f1a),
    emissiveIntensity: 0.58,
  })
  const backdrop = new THREE.Mesh(backGeo, backMat)
  backdrop.position.set(0, 0, -2.85)
  root.add(backdrop)

  const furMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff1f4),
    roughness: 0.92,
    metalness: 0.02,
    emissive: new THREE.Color(0x140810),
    emissiveIntensity: 0.3,
  })
  const eyeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1a171b),
    roughness: 0.45,
    metalness: 0,
    emissive: new THREE.Color(0x101010),
    emissiveIntensity: 0.08,
  })
  const eyeHiMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

  // Fallback: a smiling-ish blob (ears + cheeks).
  const bodyGeo = new THREE.SphereGeometry(0.6, 16, 14)
  const body = new THREE.Mesh(bodyGeo, furMat)
  body.scale.set(1.12, 0.86, 1.12)

  const earGeo = new THREE.ConeGeometry(0.14, 0.3, 10)
  const earL = new THREE.Mesh(earGeo, furMat)
  const earR = new THREE.Mesh(earGeo, furMat)
  earL.position.set(-0.28, 0.42, 0.06)
  earR.position.set(0.28, 0.42, 0.06)
  earL.rotation.z = 0.55
  earR.rotation.z = -0.55

  const cheekGeo = new THREE.SphereGeometry(0.09, 12, 10)
  const cheekMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    emissive: new THREE.Color(0xffb6c1),
    emissiveIntensity: 0.45,
  })
  const cheekL = new THREE.Mesh(cheekGeo, cheekMat)
  const cheekR = new THREE.Mesh(cheekGeo, cheekMat)
  cheekL.position.set(-0.18, 0.06, 0.52)
  cheekR.position.set(0.18, 0.06, 0.52)

  const animal = new THREE.Group()
  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.036, 10, 10)
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
  const eyeLHi = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyeHiMat)
  const eyeRHi = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyeHiMat)
  const eyeLGroup = new THREE.Group()
  const eyeRGroup = new THREE.Group()
  eyeLHi.position.set(0.01, 0.01, 0.018)
  eyeRHi.position.set(0.01, 0.01, 0.018)
  eyeLGroup.add(eyeL, eyeLHi)
  eyeRGroup.add(eyeR, eyeRHi)
  eyeLGroup.position.set(-0.1, 0.1, 0.5)
  eyeRGroup.position.set(0.1, 0.1, 0.5)
  animal.add(body, earL, earR, cheekL, cheekR, eyeLGroup, eyeRGroup)
  animal.position.set(0, -0.18, 0)
  animal.scale.setScalar(0.95)
  root.add(animal)

  const loader = createGltfLoader()
  let loaded: THREE.Object3D | null = null

  async function load() {
    try {
      const gltf = await loader.loadAsync('/models/animal-a.glb')
      loaded = gltf.scene
      normalizeLoadedModel(loaded)
      loaded.scale.setScalar(1.02)
      loaded.position.copy(animal.position)
      root.add(loaded)
      animal.visible = false
    } catch {
      // keep fallback
    }
  }

  let time = 0
  let targetGlow = 0.55
  let currentGlow = 0.55
  let targetBounce = 0.02
  let currentBounce = 0.02
  function setParallaxTarget(nx: number, ny: number) {
    parallaxTarget.set(THREE.MathUtils.clamp(nx, -1, 1), THREE.MathUtils.clamp(ny, -1, 1))
  }
  const blink: { t: number; dur: number; nextIn: number; phase: 'idle' | 'closing' | 'opening' } = {
    t: 0,
    dur: 0,
    nextIn: Math.random() * 3 + 2,
    phase: 'idle',
  }

  function setMood(mood: 'friend' | 'crush' | 'secret_lover') {
    if (mood === 'friend') {
      targetGlow = 0.62
      targetBounce = 0.026
      cheekMat.emissiveIntensity = 0.42
    } else if (mood === 'crush') {
      targetGlow = 0.58
      targetBounce = 0.022
      cheekMat.emissiveIntensity = 0.5
    } else {
      targetGlow = 0.7
      targetBounce = 0.018
      cheekMat.emissiveIntensity = 0.55
    }
  }

  function update(dtSeconds: number) {
    time += dtSeconds

    // Camera gentle parallax
    parallaxCurrent.x = THREE.MathUtils.damp(parallaxCurrent.x, parallaxTarget.x, 5.5, dtSeconds)
    parallaxCurrent.y = THREE.MathUtils.damp(parallaxCurrent.y, parallaxTarget.y, 5.5, dtSeconds)
    camera.position.x = cameraBase.x + parallaxCurrent.x * 0.05
    camera.position.y = cameraBase.y + parallaxCurrent.y * -0.035

    currentGlow = damp(currentGlow, targetGlow, 8, dtSeconds)
    currentBounce = damp(currentBounce, targetBounce, 8, dtSeconds)

    const t = loaded ?? animal

    // Smiling/celebrating: gentle bounce + nod + ear wiggle.
    t.position.y = -0.18 + Math.sin(time * 0.9) * currentBounce
    t.rotation.y = Math.sin(time * 0.18) * 0.07
    t.rotation.x = Math.sin(time * 0.22) * 0.035

    const earWiggle = Math.sin(time * 1.6) * 0.05 * (Math.sin(time * 0.14) * 0.5 + 0.5)
    earL.rotation.x = earWiggle
    earR.rotation.x = earWiggle

    furMat.emissiveIntensity = currentGlow
    backMat.emissiveIntensity = 0.54 + Math.sin(time * 0.25) * 0.02

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

  return { scene, camera, root, load, setMood, update, setParallaxTarget, dispose }
}
