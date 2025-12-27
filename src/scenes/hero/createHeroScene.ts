import * as THREE from 'three'
import { createGltfLoader, normalizeLoadedModel } from '../shared/gltf'

export type HeroScene = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  group: THREE.Group
  load: () => Promise<void>
  update: (dtSeconds: number) => void
  setParallaxTarget: (nx: number, ny: number) => void
  beginExit: () => void
  dispose: () => void
}

type IdleType = 'none' | 'earTwitch' | 'headTilt'

type AnimalMotion = {
  baseX: number
  baseY: number
  baseZ: number
  speed: number
  ampX: number
  ampZ: number
  phase: number
  nextIdleIn: number
  idleT: number
  idleDur: number
  idleType: IdleType
}

type BlinkState = {
  eyeL?: THREE.Object3D
  eyeR?: THREE.Object3D
  hiL?: THREE.Object3D
  hiR?: THREE.Object3D
  t: number
  dur: number
  nextIn: number
  phase: 'idle' | 'closing' | 'opening'
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clamp(min: number, v: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function easeInOut01(t: number) {
  const x = clamp(0, t, 1)
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

export function createHeroScene(): HeroScene {
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
  camera.position.set(0, 0.2, 3.2)
  const cameraBase = camera.position.clone()
  const parallaxTarget = new THREE.Vector2(0, 0)
  const parallaxCurrent = new THREE.Vector2(0, 0)

  const group = new THREE.Group()
  scene.add(group)

  // Lighting (calm, cute, romantic): one soft ambient + one pink-tinted directional. No shadows.
  const ambient = new THREE.AmbientLight(0xffd6e4, 0.62)
  scene.add(ambient)

  const key = new THREE.DirectionalLight(0xffc1d6, 0.92)
  key.position.set(2.6, 3.8, 2.4)
  key.castShadow = false
  scene.add(key)

  // Fallback "rabbit + panda" (low-poly + soft shading) if GLBs are missing.
  const softEmissive = new THREE.Color(0x1a0b12)
  const warmWhite = new THREE.Color(0xfff1f4)
  const softBlack = new THREE.Color(0x1a171b)
  const blush = new THREE.Color(0xffb6c1)

  const rabbitMat = new THREE.MeshStandardMaterial({
    color: warmWhite,
    metalness: 0.02,
    roughness: 0.9,
    emissive: softEmissive,
    emissiveIntensity: 0.3,
  })

  const pandaWhiteMat = new THREE.MeshStandardMaterial({
    color: warmWhite,
    metalness: 0.02,
    roughness: 0.92,
    emissive: softEmissive,
    emissiveIntensity: 0.28,
  })
  const pandaDarkMat = new THREE.MeshStandardMaterial({
    color: softBlack,
    metalness: 0.0,
    roughness: 0.94,
    emissive: new THREE.Color(0x0e0c10),
    emissiveIntensity: 0.22,
  })
  const cheekMat = new THREE.MeshStandardMaterial({
    color: warmWhite,
    metalness: 0,
    roughness: 0.95,
    emissive: blush,
    emissiveIntensity: 0.42,
  })
  const eyeMat = new THREE.MeshStandardMaterial({
    color: softBlack,
    metalness: 0,
    roughness: 0.45,
    emissive: new THREE.Color(0x101010),
    emissiveIntensity: 0.08,
  })
  const eyeHiMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

  const rabbitBodyGeo = new THREE.SphereGeometry(0.34, 14, 12)
  const rabbitHeadGeo = new THREE.SphereGeometry(0.28, 14, 12)
  const rabbitEarGeo = new THREE.ConeGeometry(0.08, 0.28, 10)

  const pandaBodyGeo = new THREE.SphereGeometry(0.36, 14, 12)
  const pandaHeadGeo = new THREE.SphereGeometry(0.30, 14, 12)
  const pandaEarGeo = new THREE.SphereGeometry(0.08, 12, 10)
  const pandaPatchGeo = new THREE.SphereGeometry(0.10, 12, 10)

  const rabbit = new THREE.Group()
  const rabbitBody = new THREE.Mesh(rabbitBodyGeo, rabbitMat)
  rabbitBody.scale.set(1.08, 0.9, 1.08)
  const rabbitHead = new THREE.Mesh(rabbitHeadGeo, rabbitMat)
  rabbitHead.position.set(0.0, 0.18, 0.18)
  const rabbitEarL = new THREE.Mesh(rabbitEarGeo, rabbitMat)
  const rabbitEarR = new THREE.Mesh(rabbitEarGeo, rabbitMat)
  rabbitEarL.position.set(-0.12, 0.42, 0.12)
  rabbitEarR.position.set(0.12, 0.42, 0.12)
  rabbitEarL.rotation.z = 0.18
  rabbitEarR.rotation.z = -0.18
  rabbitEarL.rotation.x = -0.08
  rabbitEarR.rotation.x = -0.08
  // Cheeks
  const rabbitCheekGeo = new THREE.SphereGeometry(0.06, 12, 10)
  const rCheekL = new THREE.Mesh(rabbitCheekGeo, cheekMat)
  const rCheekR = new THREE.Mesh(rabbitCheekGeo, cheekMat)
  rCheekL.position.set(-0.12, 0.04, 0.42)
  rCheekR.position.set(0.12, 0.04, 0.42)
  // Eyes
  const rabbitEyeGeo = new THREE.SphereGeometry(0.035, 10, 10)
  const rEyeL = new THREE.Mesh(rabbitEyeGeo, eyeMat)
  const rEyeR = new THREE.Mesh(rabbitEyeGeo, eyeMat)
  const rEyeLHi = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyeHiMat)
  const rEyeRHi = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyeHiMat)
  const rEyeLGroup = new THREE.Group()
  const rEyeRGroup = new THREE.Group()
  rEyeL.position.set(0, 0, 0)
  rEyeLHi.position.set(0.01, 0.01, 0.018)
  rEyeR.position.set(0, 0, 0)
  rEyeRHi.position.set(0.01, 0.01, 0.018)
  rEyeLGroup.add(rEyeL, rEyeLHi)
  rEyeRGroup.add(rEyeR, rEyeRHi)
  rEyeLGroup.position.set(-0.08, 0.16, 0.46)
  rEyeRGroup.position.set(0.08, 0.16, 0.46)
  rabbit.add(rabbitBody, rabbitHead, rabbitEarL, rabbitEarR, rCheekL, rCheekR, rEyeLGroup, rEyeRGroup)

  const panda = new THREE.Group()
  const pandaBody = new THREE.Mesh(pandaBodyGeo, pandaWhiteMat)
  pandaBody.scale.set(1.12, 0.92, 1.12)
  const pandaHead = new THREE.Mesh(pandaHeadGeo, pandaWhiteMat)
  pandaHead.position.set(0.0, 0.18, 0.18)
  const pandaEarL = new THREE.Mesh(pandaEarGeo, pandaDarkMat)
  const pandaEarR = new THREE.Mesh(pandaEarGeo, pandaDarkMat)
  pandaEarL.position.set(-0.18, 0.42, 0.12)
  pandaEarR.position.set(0.18, 0.42, 0.12)
  const pandaPatchL = new THREE.Mesh(pandaPatchGeo, pandaDarkMat)
  const pandaPatchR = new THREE.Mesh(pandaPatchGeo, pandaDarkMat)
  pandaPatchL.position.set(-0.12, 0.18, 0.44)
  pandaPatchR.position.set(0.12, 0.18, 0.44)
  pandaPatchL.scale.set(1.2, 0.9, 1.0)
  pandaPatchR.scale.set(1.2, 0.9, 1.0)
  // Eyes on patches
  const pandaEyeGeo = new THREE.SphereGeometry(0.032, 10, 10)
  const pEyeL = new THREE.Mesh(pandaEyeGeo, eyeMat)
  const pEyeR = new THREE.Mesh(pandaEyeGeo, eyeMat)
  const pEyeLHi = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), eyeHiMat)
  const pEyeRHi = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), eyeHiMat)
  const pEyeLGroup = new THREE.Group()
  const pEyeRGroup = new THREE.Group()
  pEyeLHi.position.set(0.01, 0.01, 0.016)
  pEyeRHi.position.set(0.01, 0.01, 0.016)
  pEyeLGroup.add(pEyeL, pEyeLHi)
  pEyeRGroup.add(pEyeR, pEyeRHi)
  pEyeLGroup.position.set(-0.12, 0.18, 0.44)
  pEyeRGroup.position.set(0.12, 0.18, 0.44)
  // Cheeks
  const pandaCheekGeo = new THREE.SphereGeometry(0.06, 12, 10)
  const pCheekL = new THREE.Mesh(pandaCheekGeo, cheekMat)
  const pCheekR = new THREE.Mesh(pandaCheekGeo, cheekMat)
  pCheekL.position.set(-0.16, 0.05, 0.5)
  pCheekR.position.set(0.16, 0.05, 0.5)
  panda.add(pandaBody, pandaHead, pandaEarL, pandaEarR, pandaPatchL, pandaPatchR, pEyeLGroup, pEyeRGroup, pCheekL, pCheekR)

  rabbit.position.set(-0.62, -0.18, 0)
  panda.position.set(0.62, -0.22, 0)
  rabbit.rotation.y = 0.12
  panda.rotation.y = -0.12
  group.add(rabbit, panda)

  const loader = createGltfLoader()

  let loadedA: THREE.Object3D | null = null
  let loadedB: THREE.Object3D | null = null

  let rabbitMixer: THREE.AnimationMixer | null = null
  let pandaMixer: THREE.AnimationMixer | null = null
  let rabbitAction: THREE.AnimationAction | null = null
  let pandaAction: THREE.AnimationAction | null = null

  const rabbitMotion: AnimalMotion = {
    baseX: -0.62,
    baseY: -0.18,
    baseZ: 0,
    speed: 0.18,
    ampX: 0.12,
    ampZ: 0.08,
    phase: rand(0, Math.PI * 2),
    nextIdleIn: rand(1.6, 3.2),
    idleT: 0,
    idleDur: 0,
    idleType: 'none',
  }

  const pandaMotion: AnimalMotion = {
    baseX: 0.62,
    baseY: -0.22,
    baseZ: 0,
    speed: 0.15,
    ampX: 0.10,
    ampZ: 0.07,
    phase: rand(0, Math.PI * 2),
    nextIdleIn: rand(1.9, 3.8),
    idleT: 0,
    idleDur: 0,
    idleType: 'none',
  }

  function startIdle(m: AnimalMotion, allowed: IdleType[]) {
    m.idleT = 0
    m.idleDur = rand(0.22, 0.48)
    m.idleType = allowed[Math.floor(rand(0, allowed.length))] ?? 'headTilt'
    m.nextIdleIn = rand(1.6, 3.9)
  }

  async function load() {
    // Optional user-provided lightweight GLBs.
    // Preferred names for the redesigned landing:
    // - /models/rabbit.glb
    // - /models/panda.glb
    try {
      const [rabbitGltf, pandaGltf] = await Promise.allSettled([
        loader.loadAsync('/models/rabbit.glb'),
        loader.loadAsync('/models/panda.glb'),
      ])

      if (rabbitGltf.status === 'fulfilled') {
        loadedA = rabbitGltf.value.scene
        normalizeLoadedModel(loadedA)
        softenModelMaterials(loadedA)
        loadedA.position.copy(rabbit.position)
        loadedA.scale.setScalar(0.95)
        group.add(loadedA)
        rabbit.visible = false

        const clips = rabbitGltf.value.animations
        if (clips && clips.length > 0) {
          rabbitMixer = new THREE.AnimationMixer(loadedA)
          rabbitAction = rabbitMixer.clipAction(clips[0]!)
          rabbitAction.reset()
          rabbitAction.play()
          rabbitAction.setEffectiveTimeScale(0.85)
        }
      }

      if (pandaGltf.status === 'fulfilled') {
        loadedB = pandaGltf.value.scene
        normalizeLoadedModel(loadedB)
        softenModelMaterials(loadedB)
        loadedB.position.copy(panda.position)
        loadedB.scale.setScalar(0.95)
        group.add(loadedB)
        panda.visible = false

        const clips = pandaGltf.value.animations
        if (clips && clips.length > 0) {
          pandaMixer = new THREE.AnimationMixer(loadedB)
          pandaAction = pandaMixer.clipAction(clips[0]!)
          pandaAction.reset()
          pandaAction.play()
          pandaAction.setEffectiveTimeScale(0.85)
        }
      }
    } catch {
      // keep fallback
    }
  }

  let time = 0
  let motionScale = 1
  let motionScaleTarget = 1
  const rabbitBlink: BlinkState = { t: 0, dur: 0, nextIn: Math.random() * 3 + 2, phase: 'idle', eyeL: undefined, eyeR: undefined, hiL: undefined, hiR: undefined }
  const pandaBlink: BlinkState = { t: 0, dur: 0, nextIn: Math.random() * 3 + 2, phase: 'idle', eyeL: undefined, eyeR: undefined, hiL: undefined, hiR: undefined }

  // Assign blink targets (fallback only)
  rabbitBlink.eyeL = rEyeLGroup
  rabbitBlink.eyeR = rEyeRGroup
  rabbitBlink.hiL = rEyeLHi
  rabbitBlink.hiR = rEyeRHi
  pandaBlink.eyeL = pEyeLGroup
  pandaBlink.eyeR = pEyeRGroup
  pandaBlink.hiL = pEyeLHi
  pandaBlink.hiR = pEyeRHi

  function setParallaxTarget(nx: number, ny: number) {
    parallaxTarget.set(clamp(-1, nx, 1), clamp(-1, ny, 1))
  }

  function beginExit() {
    motionScaleTarget = 0
  }

  function update(dtSeconds: number) {
    time += dtSeconds

    motionScale = THREE.MathUtils.damp(motionScale, motionScaleTarget, 4.2, dtSeconds)

    // Camera parallax (fixed camera, tiny offset).
    parallaxCurrent.x = THREE.MathUtils.damp(parallaxCurrent.x, parallaxTarget.x, 5.5, dtSeconds)
    parallaxCurrent.y = THREE.MathUtils.damp(parallaxCurrent.y, parallaxTarget.y, 5.5, dtSeconds)
    camera.position.x = cameraBase.x + parallaxCurrent.x * 0.06
    camera.position.y = cameraBase.y + parallaxCurrent.y * -0.04

    // Update embedded GLTF animation clips (if present).
    const animDt = dtSeconds * motionScale
    rabbitMixer?.update(animDt)
    pandaMixer?.update(animDt)

    if (rabbitAction) rabbitAction.setEffectiveTimeScale(0.85 * motionScale)
    if (pandaAction) pandaAction.setEffectiveTimeScale(0.85 * motionScale)

    // Keep the whole composition calm.
    group.rotation.y = Math.sin(time * 0.18) * 0.10 * motionScale
    group.rotation.x = Math.sin(time * 0.16) * 0.05 * motionScale

    const bobA = Math.sin(time * 1.05) * 0.020 * motionScale
    const bobB = Math.sin(time * 1.15 + 0.9) * 0.018 * motionScale

    const targetA = loadedA ?? rabbit
    const targetB = loadedB ?? panda

    // Roaming movement: time-based, small figure-8 / circular paths.
    {
      const t = time * (Math.PI * 2) * rabbitMotion.speed + rabbitMotion.phase
      const x = rabbitMotion.baseX + Math.sin(t) * rabbitMotion.ampX * motionScale
      const z = rabbitMotion.baseZ + Math.sin(t * 2) * rabbitMotion.ampZ * motionScale
      targetA.position.x = x
      targetA.position.z = clamp(-0.18, z, 0.18)
      targetA.position.y = rabbitMotion.baseY + bobA

      // Always look slightly inward; never push toward camera.
      targetA.rotation.y = 0.14 + Math.sin(t * 0.6) * 0.06 * motionScale
    }

    {
      const t = time * (Math.PI * 2) * pandaMotion.speed + pandaMotion.phase
      const x = pandaMotion.baseX + Math.cos(t) * pandaMotion.ampX * motionScale
      const z = pandaMotion.baseZ + Math.sin(t) * pandaMotion.ampZ * motionScale
      targetB.position.x = x
      targetB.position.z = clamp(-0.18, z, 0.18)
      targetB.position.y = pandaMotion.baseY + bobB

      targetB.rotation.y = -0.14 + Math.sin(t * 0.55) * 0.06 * motionScale
    }

    // Idle actions: occasional ear twitch / head tilt (fallback parts) or a gentle tilt on the whole model.
    rabbitMotion.nextIdleIn -= dtSeconds
    pandaMotion.nextIdleIn -= dtSeconds

    if (rabbitMotion.idleType === 'none' && rabbitMotion.nextIdleIn <= 0) {
      startIdle(rabbitMotion, ['earTwitch', 'headTilt'])
    }
    if (pandaMotion.idleType === 'none' && pandaMotion.nextIdleIn <= 0) {
      startIdle(pandaMotion, ['headTilt'])
    }

    const applyIdle = (
      motion: AnimalMotion,
      obj: THREE.Object3D,
      fallbackHead?: THREE.Object3D,
      fallbackEarL?: THREE.Object3D,
      fallbackEarR?: THREE.Object3D
    ) => {
      if (motion.idleType === 'none') return
      if (motionScale < 0.06) return
      motion.idleT += dtSeconds
      const p = motion.idleDur > 0 ? clamp(0, motion.idleT / motion.idleDur, 1) : 1
      const e = easeInOut01(p)

      if (motion.idleType === 'headTilt') {
        const tilt = Math.sin(e * Math.PI) * 0.12
        // Prefer tilting a head part if we have one; otherwise tilt whole object.
        if (fallbackHead) fallbackHead.rotation.z = tilt
        else obj.rotation.z = tilt
      } else if (motion.idleType === 'earTwitch') {
        const twitch = Math.sin(e * Math.PI) * 0.28
        if (fallbackEarL && fallbackEarR) {
          fallbackEarL.rotation.x = -0.08 + twitch
          fallbackEarR.rotation.x = -0.08 + twitch
        } else {
          // No explicit ears: a tiny nod reads like an idle.
          obj.rotation.x = twitch * 0.18
        }
      }

      if (p >= 1) {
        // Reset any fallback-only rotations we touched.
        if (motion.idleType === 'headTilt' && fallbackHead) fallbackHead.rotation.z = 0
        if (motion.idleType === 'earTwitch' && fallbackEarL && fallbackEarR) {
          fallbackEarL.rotation.x = -0.08
          fallbackEarR.rotation.x = -0.08
        }
        motion.idleType = 'none'
        motion.idleT = 0
        motion.idleDur = 0
      }
    }

    applyIdle(rabbitMotion, targetA, loadedA ? undefined : rabbitHead, loadedA ? undefined : rabbitEarL, loadedA ? undefined : rabbitEarR)
    applyIdle(pandaMotion, targetB, loadedB ? undefined : pandaHead)

    // Blinking for fallback eyes only (GLTF eyes rely on their own rigs/materials).
    updateBlink(rabbitBlink, dtSeconds)
    updateBlink(pandaBlink, dtSeconds)
  }

  function dispose() {
    rabbitAction?.stop()
    pandaAction?.stop()
    rabbitMixer = null
    pandaMixer = null
    rabbitAction = null
    pandaAction = null

    rabbitBodyGeo.dispose()
    rabbitHeadGeo.dispose()
    rabbitEarGeo.dispose()

    pandaBodyGeo.dispose()
    pandaHeadGeo.dispose()
    pandaEarGeo.dispose()
    pandaPatchGeo.dispose()
    rabbitCheekGeo.dispose()
    pandaCheekGeo.dispose()
    eyeHiMat.dispose()
    eyeMat.dispose()

    rabbitMat.dispose()
    pandaWhiteMat.dispose()
    pandaDarkMat.dispose()
  }

  return { scene, camera, group, load, update, setParallaxTarget, beginExit, dispose }

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
          std.color = new THREE.Color(softBlack)
          std.emissive = new THREE.Color(0x101010)
          std.emissiveIntensity = 0.08
        } else {
          std.metalness = Math.min(0.06, std.metalness ?? 0.06)
          std.roughness = Math.max(0.86, std.roughness ?? 0.86)
        }
      }
    })
  }

  function updateBlink(state: BlinkState, dt: number) {
    state.nextIn -= dt
    if (state.phase === 'idle' && state.nextIn <= 0) {
      state.phase = 'closing'
      state.t = 0
      state.dur = 0.12
    }
    if (state.phase === 'closing') {
      state.t += dt
      const p = clamp(0, state.t / state.dur, 1)
      const s = 1 - easeInOut01(p)
      setEyeScaleY(state, s)
      if (p >= 1) {
        state.phase = 'opening'
        state.t = 0
        state.dur = 0.14
      }
    } else if (state.phase === 'opening') {
      state.t += dt
      const p = clamp(0, state.t / state.dur, 1)
      const s = easeInOut01(p)
      setEyeScaleY(state, s)
      if (p >= 1) {
        state.phase = 'idle'
        state.nextIn = rand(2.5, 5.5)
        setEyeScaleY(state, 1)
      }
    }
  }

  function setEyeScaleY(state: BlinkState, scaleY: number) {
    const sy = clamp(0.12, scaleY, 1)
    if (state.eyeL) state.eyeL.scale.y = sy
    if (state.eyeR) state.eyeR.scale.y = sy
    const hiVisible = sy > 0.25
    if (state.hiL) (state.hiL as any).visible = hiVisible
    if (state.hiR) (state.hiR as any).visible = hiVisible
  }
}
