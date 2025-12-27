import * as THREE from 'three'
import { createGltfLoader, normalizeLoadedModel } from '../shared/gltf'

export type RelationshipType = 'friend' | 'crush' | 'secret_lover'

export type InputScene = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  root: THREE.Group
  load: () => Promise<void>
  setNameEnergy: (value01: number) => void
  setRelationship: (type: RelationshipType) => void
  triggerSelection: () => void
  update: (dtSeconds: number) => void
  setParallaxTarget: (nx: number, ny: number) => void
  dispose: () => void
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt)
}

export function createInputScene(): InputScene {
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
  camera.position.set(0, 0.28, 3.25)
  const cameraBase = camera.position.clone()
  const parallaxTarget = new THREE.Vector2(0, 0)
  const parallaxCurrent = new THREE.Vector2(0, 0)

  // One directional light only (no shadows).
  const key = new THREE.DirectionalLight(0xffc1d6, 1.1)
  key.position.set(2.4, 3.6, 2.2)
  key.castShadow = false
  scene.add(key)

  const ambient = new THREE.AmbientLight(0xffd6e4, 0.5)
  scene.add(ambient)

  const root = new THREE.Group()
  scene.add(root)

  // Soft background card inside the 3D scene.
  const backGeo = new THREE.PlaneGeometry(6.5, 4.5)
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    emissive: new THREE.Color(0x2b0f1b),
    emissiveIntensity: 0.58,
  })
  const backdrop = new THREE.Mesh(backGeo, backMat)
  backdrop.position.set(0, 0, -2.6)
  root.add(backdrop)

  // Stylized animal fallback: a small "blob" with ears.
  const animal = new THREE.Group()
  root.add(animal)

  const furMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff1f4),
    roughness: 0.92,
    metalness: 0.02,
    emissive: new THREE.Color(0x160812),
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

  const bodyGeo = new THREE.SphereGeometry(0.55, 16, 14)
  const body = new THREE.Mesh(bodyGeo, furMat)
  body.scale.set(1.0, 0.85, 1.0)
  animal.add(body)

  const earGeo = new THREE.ConeGeometry(0.16, 0.32, 10)
  const earL = new THREE.Mesh(earGeo, furMat)
  const earR = new THREE.Mesh(earGeo, furMat)
  earL.position.set(-0.22, 0.42, 0.02)
  earR.position.set(0.22, 0.42, 0.02)
  earL.rotation.z = 0.45
  earR.rotation.z = -0.45
  animal.add(earL, earR)

  // Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.07, 12, 10)
  const cheekL = new THREE.Mesh(cheekGeo, cheekMat)
  const cheekR = new THREE.Mesh(cheekGeo, cheekMat)
  cheekL.position.set(-0.14, -0.02, 0.42)
  cheekR.position.set(0.14, -0.02, 0.42)
  animal.add(cheekL, cheekR)

  // Eyes + highlights
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
  eyeLGroup.position.set(-0.09, 0.10, 0.46)
  eyeRGroup.position.set(0.09, 0.10, 0.46)
  animal.add(eyeLGroup, eyeRGroup)

  animal.position.set(0, -0.1, 0)
  animal.scale.setScalar(0.95)

  // Optional GLB override.
  const loader = createGltfLoader()
  let loaded: THREE.Object3D | null = null

  async function load() {
    try {
      const gltf = await loader.loadAsync('/models/animal-a.glb')
      loaded = gltf.scene
      normalizeLoadedModel(loaded)
      softenModelMaterials(loaded)
      loaded.scale.setScalar(1.05)
      loaded.position.copy(animal.position)
      root.add(loaded)
      animal.visible = false
    } catch {
      // keep fallback
    }
  }

  let time = 0
  let nameEnergy01 = 0

  let targetTilt = 0
  let currentTilt = 0

  let targetGlow = 0.55
  let currentGlow = 0.55

  let pulse = 0
  function setParallaxTarget(nx: number, ny: number) {
    parallaxTarget.set(THREE.MathUtils.clamp(nx, -1, 1), THREE.MathUtils.clamp(ny, -1, 1))
  }
  // blinking
  const blink: { t: number; dur: number; nextIn: number; phase: 'idle' | 'closing' | 'opening' } = {
    t: 0,
    dur: 0,
    nextIn: Math.random() * 3 + 2,
    phase: 'idle',
  }

  function setNameEnergy(value01: number) {
    nameEnergy01 = THREE.MathUtils.clamp(value01, 0, 1)
  }

  function setRelationship(type: RelationshipType) {
    if (type === 'friend') {
      targetTilt = -0.06
      targetGlow = 0.48
    } else if (type === 'crush') {
      targetTilt = 0.08
      targetGlow = 0.62
    } else {
      targetTilt = 0.14
      targetGlow = 0.72
    }
  }

  function triggerSelection() {
    // subtle one-shot pulse
    pulse = 1
  }

  function update(dtSeconds: number) {
    time += dtSeconds

    // Camera gentle parallax
    parallaxCurrent.x = THREE.MathUtils.damp(parallaxCurrent.x, parallaxTarget.x, 5.5, dtSeconds)
    parallaxCurrent.y = THREE.MathUtils.damp(parallaxCurrent.y, parallaxTarget.y, 5.5, dtSeconds)
    camera.position.x = cameraBase.x + parallaxCurrent.x * 0.05
    camera.position.y = cameraBase.y + parallaxCurrent.y * -0.035

    currentTilt = damp(currentTilt, targetTilt, 8, dtSeconds)
    currentGlow = damp(currentGlow, targetGlow, 10, dtSeconds)

    pulse = damp(pulse, 0, 10, dtSeconds)

    const bob = Math.sin(time * 0.8) * 0.016
    const sway = Math.sin(time * 0.18) * 0.06

    const target = loaded ?? animal

    target.position.y = -0.1 + bob
    target.rotation.y = sway
    target.rotation.z = currentTilt

    // Typing energy softly increases "attention".
    const attention = 0.03 + nameEnergy01 * 0.06
    target.rotation.x = Math.sin(time * 0.6) * attention

    const scalePulse = 1 + pulse * 0.03
    target.scale.setScalar(scalePulse)

    furMat.emissiveIntensity = currentGlow
    backMat.emissiveIntensity = 0.55 + pulse * 0.08

    // blink only on fallback
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
    bodyGeo.dispose()
    earGeo.dispose()
    furMat.dispose()
    cheekGeo.dispose()
    cheekMat.dispose()
    eyeGeo.dispose()
    eyeMat.dispose()
    eyeHiMat.dispose()
  }

  return {
    scene,
    camera,
    root,
    load,
    setNameEnergy,
    setRelationship,
    triggerSelection,
    update,
    setParallaxTarget,
    dispose,
  }

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
