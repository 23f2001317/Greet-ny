export type RelationshipType = 'friend' | 'crush' | 'secret_lover'

export type SelectedPath = '' | 'friend' | 'love' | 'secret'

export type LoveAnswer = 'unset' | 'just_friends' | 'like_you' | 'love_you' | 'cant_say'

export type WishAnswer = 'unset' | 'relation' | 'breakup' | 'peace' | 'all'

export type Draft = {
  name: string
  selectedPath: SelectedPath
  loveAnswer: LoveAnswer
  relationship: RelationshipType
  wish: WishAnswer
  essayNonce: number
  essay: string
}

const STORAGE_KEY = 'new-year:draft:v1'

const defaultDraft: Draft = {
  name: '',
  selectedPath: '',
  loveAnswer: 'unset',
  relationship: 'friend',
  wish: 'unset',
  essayNonce: 0,
  essay: '',
}

export function readDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultDraft }
    const parsed = JSON.parse(raw) as Partial<Draft>
    const merged: Draft = {
      ...defaultDraft,
      ...parsed,
    }

    // Basic validation/migration for older stored values.
    const validLoveAnswers: readonly LoveAnswer[] = ['unset', 'just_friends', 'like_you', 'love_you', 'cant_say']
    if (!validLoveAnswers.includes(merged.loveAnswer)) merged.loveAnswer = 'unset'

    const validWishAnswers: readonly WishAnswer[] = ['unset', 'relation', 'breakup', 'peace', 'all']
    if (!validWishAnswers.includes(merged.wish)) merged.wish = 'unset'

    return merged
  } catch {
    return { ...defaultDraft }
  }
}

export function writeDraft(next: Partial<Draft>): Draft {
  const merged: Draft = {
    ...readDraft(),
    ...next,
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // ignore storage errors (private mode, etc.)
  }

  return merged
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
