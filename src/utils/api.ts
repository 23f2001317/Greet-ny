import type { LoveAnswer, WishAnswer } from './session'

export type SaveResponsePayload = {
  name: string
  loveAnswer: LoveAnswer
  wish: WishAnswer
}

export async function saveResponse(payload: SaveResponsePayload): Promise<{ ok: boolean; id?: string }> {
  const res = await fetch('/api/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Failed to save response (${res.status})`)
  }

  return (await res.json()) as { ok: boolean; id?: string }
}
