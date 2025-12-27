export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Ensure unsigned 32-bit
  return hash >>> 0
}

export function hashToBase36(u32: number): string {
  return (u32 >>> 0).toString(36)
}
