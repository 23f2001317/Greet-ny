import { fnv1a32, hashToBase36 } from './hash'

const HISTORY_KEY = 'new-year:essay-hashes:v1'
const MAX_ITEMS = 64

export type EssayHistory = {
  has: (hash: string) => boolean
  add: (hash: string) => void
}

export function stableEssayHash(text: string): string {
  // Normalize a bit to reduce accidental differences.
  const normalized = text.replace(/\s+/g, ' ').trim()
  return hashToBase36(fnv1a32(normalized))
}

export function getEssayHistory(): EssayHistory {
  const read = (): string[] => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter((x) => typeof x === 'string') as string[]
    } catch {
      return []
    }
  }

  const write = (items: string[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
    } catch {
      // ignore
    }
  }

  return {
    has(hash) {
      return read().includes(hash)
    },
    add(hash) {
      const items = read()
      const next = [hash, ...items.filter((h) => h !== hash)]
      write(next)
    },
  }
}
