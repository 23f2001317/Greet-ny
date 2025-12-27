import type { Draft, RelationshipType } from './session'
import { getEssayHistory, stableEssayHash } from './essayHistory'
import { createRng, seedFromParts, shuffleInPlace } from './seededRandom'

type PoolSet = {
  opener: readonly string[]
  body: readonly string[]
  bridge: readonly string[]
  closing: readonly string[]
}

const pools: Record<RelationshipType, PoolSet> = {
  friend: {
    opener: [
      'I like how easy it is to be around you.',
      'I’ve been thinking about how steady your presence feels.',
      'Some people make life softer just by existing, and you’re one of them.',
    ],
    body: [
      'With you, I don’t feel like I have to perform. I can show up as myself—messy, quiet, excited, unsure—and it still feels okay.',
      'I notice the small things: the way you listen without rushing, the way you make space, the way you remember details that matter.',
      'If this year asks a lot from us, I hope we meet it with patience. I hope we keep choosing the gentle version of the truth.',
      'I’m grateful for the ordinary moments with you. They don’t look dramatic, but they hold so much comfort.',
    ],
    bridge: [
      'Whatever the label is, I want you to know you’re important to me—consistently, quietly, sincerely.',
      'I don’t need a big scene for this. I just wanted to say it clearly, so it can live in the open.',
    ],
    closing: [
      'Happy New Year. I’m glad you’re here.',
      'Happy New Year. May the year be kind to you, and may you feel supported.',
    ],
  },
  crush: {
    opener: [
      'I’ve been trying to act normal, but you keep showing up in my thoughts.',
      'There’s a soft kind of excitement I can’t quite hide.',
      'I don’t know what this is yet, but I like the feeling of it.',
    ],
    body: [
      'It’s not just that I like you—it’s the way my day brightens when I imagine you laughing at something silly, or when I remember a tiny moment we shared.',
      'I keep catching myself wanting to tell you things first. Good news, bad news, nothing news. You’re becoming my favorite place to send my thoughts.',
      'I’m not asking for anything heavy. I just want to be honest about the warmth that keeps growing, quietly, on its own.',
      'If we stay here for a while—somewhere between friendship and something more—I’m okay with that. I’d rather be real than rushed.',
    ],
    bridge: [
      'Maybe this is just a crush. Maybe it’s the beginning of something. Either way, it feels sincere.',
      'I wanted you to know, gently: I like you. I like you in a way that feels hopeful.',
    ],
    closing: [
      'Happy New Year. If you want to, let’s make more small memories.',
      'Happy New Year. I’m rooting for you, and maybe for us too.',
    ],
  },
  secret_lover: {
    opener: [
      'There’s something I’ve been carrying quietly.',
      'If I’m honest, my feelings don’t fit into casual words.',
      'I’ve wanted to say this without making it heavy.',
    ],
    body: [
      'I care about you in a way that’s steady and deep, the kind that shows up when it’s inconvenient, the kind that doesn’t disappear when life gets complicated.',
      'Sometimes I keep my feelings behind my teeth, not because they’re fragile, but because I want to handle them with respect—yours and mine.',
      'When I imagine the year ahead, I don’t only hope for big wins. I hope for softness. I hope for safety. I hope you feel loved in ways you can actually receive.',
      'I don’t want to turn this into a confession that demands an answer. I’m simply placing the truth down gently, like a small gift.',
    ],
    bridge: [
      'If you can’t hold this right now, that’s okay. I still want you to have a calm year and a heart that feels protected.',
      'And if you can hold it—if even a small part of you feels the same—then I’m here. Quietly. Honestly.',
    ],
    closing: [
      'Happy New Year. May this year be kind to you.',
      'Happy New Year. I’m here, in the soft ways that matter.',
    ],
  },
}

const loveLineByAnswer: Record<Draft['loveAnswer'], string> = {
  unset: 'I’m writing this gently, and I’m still learning the right words.',
  just_friends: 'If you ever wonder where you stand with me: you’re safe with me.',
  like_you: 'I like you. The simple kind of like that keeps returning, even when I try to be practical.',
  love_you: 'I love you. Not as a pressure—just as a truth I keep discovering in small ways.',
  cant_say: 'I can’t say it cleanly yet, but my feelings are real. I’m still learning the right words.',
}

const wishLineByAnswer: Record<Draft['wish'], string> = {
  unset: 'For the year ahead, I hope you get exactly what you need—more than you expect, and less than you fear.',
  relation: 'For the year ahead, I’m wishing you a relationship that feels safe—mutual, gentle, and real.',
  breakup: 'For the year ahead, I’m wishing you clean closure—strength to let go, and peace after the storm.',
  peace: 'For the year ahead, I’m wishing you peace that actually reaches your body—quiet mornings, steady breaths, soft nights.',
  all: 'For the year ahead, I’m wishing you everything—peace, love, growth, and small miracles you don’t have to beg for.',
}

function countWords(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

function buildEssayOnce(draft: Draft, seed: number): string {
  const rng = createRng(seed)
  const set = pools[draft.relationship]

  const opener = [...set.opener]
  const body = [...set.body]
  const bridge = [...set.bridge]
  const closing = [...set.closing]
  shuffleInPlace(opener, rng)
  shuffleInPlace(body, rng)
  shuffleInPlace(bridge, rng)
  shuffleInPlace(closing, rng)

  const lines: string[] = []
  lines.push('To you,')
  lines.push('')
  lines.push(opener[0] ?? 'I’m thinking of you as the year begins.')
  lines.push('')

  if (draft.selectedPath === 'friend') {
    lines.push('Snow feels like friendship: warm, steady, and easy to come back to.')
    lines.push('')
  } else if (draft.selectedPath === 'love') {
    lines.push('Hearts feel like romance: brave, hopeful, and a little bit glowing.')
    lines.push('')
  } else if (draft.selectedPath === 'secret') {
    lines.push('Flowers feel like unspoken affection: gentle, quiet, and still real.')
    lines.push('')
  }

  lines.push(loveLineByAnswer[draft.loveAnswer])
  lines.push('')

  lines.push(wishLineByAnswer[draft.wish])
  lines.push('')

  // Pull enough paragraphs to exceed 150 words.
  const paragraphs: string[] = []
  paragraphs.push(body[0] ?? 'I hope this year meets you gently.')
  paragraphs.push(body[1] ?? 'You matter to me more than I can neatly explain.')
  paragraphs.push(bridge[0] ?? 'I just wanted you to have these words.')

  // If still short, add more body/bridge paragraphs.
  let essayText = paragraphs.join('\n\n')
  let total = countWords(lines.join('\n') + '\n' + essayText)
  let i = 2
  while (total < 150 && i < body.length) {
    paragraphs.splice(2, 0, body[i]!)
    i += 1
    essayText = paragraphs.join('\n\n')
    total = countWords(lines.join('\n') + '\n' + essayText)
  }

  // Final closing.
  lines.push(essayText)
  lines.push('')
  lines.push(closing[0] ?? 'Happy New Year.')
  lines.push('')
  lines.push(`— ${draft.name.trim() || 'Someone who cares'}`)
  return lines.join('\n')
}

export function generateEssay(draft: Draft): { essay: string; nextNonce: number } {
  const history = getEssayHistory()

  // Deterministic, but unique per generation via nonce.
  let nonce = Math.max(0, Math.floor(draft.essayNonce || 0))

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const seed = seedFromParts([
      draft.name.trim().toLowerCase(),
      draft.selectedPath,
      draft.relationship,
      draft.loveAnswer,
      nonce,
    ])
    const essay = buildEssayOnce(draft, seed)
    const hash = stableEssayHash(essay)

    if (!history.has(hash)) {
      history.add(hash)
      return { essay, nextNonce: nonce + 1 }
    }

    // Collision with history: bump nonce and try again.
    nonce += 1
  }

  // Fallback: still return something, but bump nonce.
  const seed = seedFromParts([
    draft.name.trim().toLowerCase(),
    draft.selectedPath,
    draft.relationship,
    draft.loveAnswer,
    nonce,
    'fallback',
  ])
  const essay = buildEssayOnce(draft, seed)
  history.add(stableEssayHash(essay))
  return { essay, nextNonce: nonce + 1 }
}
