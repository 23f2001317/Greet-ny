export function pickOne<T>(items: readonly T[], fallback: T): T {
  if (!items.length) return fallback
  const index = Math.floor(Math.random() * items.length)
  const picked = items[index]
  return picked === undefined ? fallback : picked
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
