import { fnv1a32 } from './hash'

export type Rng = {
  nextFloat: () => number
  nextInt: (maxExclusive: number) => number
}

// Fast deterministic PRNG (xorshift32). Not cryptographic.
export function createRng(seed: number): Rng {
  let state = (seed >>> 0) || 0x9e3779b9

  const nextU32 = () => {
    // xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0)
  }

  return {
    nextFloat() {
      // [0,1)
      return nextU32() / 0x100000000
    },
    nextInt(maxExclusive: number) {
      if (maxExclusive <= 0) return 0
      return Math.floor(this.nextFloat() * maxExclusive)
    },
  }
}

export function seedFromParts(parts: readonly (string | number)[]) {
  return fnv1a32(parts.join('|'))
}

export function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1)
    const a = items[i]!
    const b = items[j]!
    items[i] = b
    items[j] = a
  }
  return items
}
