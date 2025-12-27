import { mkdir, copyFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  const projectRoot = process.cwd()

  const srcDir = join(
    projectRoot,
    'node_modules',
    'three',
    'examples',
    'jsm',
    'libs',
    'draco',
    'gltf'
  )

  const outDir = join(projectRoot, 'public', 'draco')

  // If three isn't installed yet, don't fail installs aggressively.
  if (!(await exists(srcDir))) {
    return
  }

  await mkdir(outDir, { recursive: true })

  const files = ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']

  await Promise.all(files.map((f) => copyFile(join(srcDir, f), join(outDir, f))))
}

await main()
