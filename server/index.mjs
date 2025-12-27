import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import initSqlJs from 'sql.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 10000
const distDir = path.join(__dirname, '..', 'dist')
const distIndexHtml = path.join(distDir, 'index.html')
const shouldServeDist = process.env.NODE_ENV !== 'development' && fs.existsSync(distIndexHtml)

const dbFile = path.join(__dirname, 'db.sqlite')

function locateSqlWasm(file) {
  // Resolve the wasm asset from the installed sql.js package.
  const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  return wasmPath
}

const SQL = await initSqlJs({ locateFile: locateSqlWasm })

function loadDb() {
  if (fs.existsSync(dbFile)) {
    const bytes = fs.readFileSync(dbFile)
    return new SQL.Database(bytes)
  }
  return new SQL.Database()
}

const sqlite = loadDb()

sqlite.run(`
  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL,
    name TEXT NOT NULL,
    loveAnswer TEXT NOT NULL,
    wish TEXT NOT NULL,
    relationship TEXT NOT NULL
  );
`)

function saveDb() {
  const data = sqlite.export()
  fs.writeFileSync(dbFile, Buffer.from(data))
}

function normalizeString(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function pickRelationship(loveAnswer) {
  if (loveAnswer === 'just_friends') return 'friend'
  if (loveAnswer === 'cant_say') return 'secret_lover'
  if (loveAnswer === 'unset') return 'friend'
  return 'crush'
}

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '64kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/responses', async (_req, res) => {
  try {
    const stmt = sqlite.prepare(
      'SELECT id, createdAt, name, loveAnswer, wish, relationship FROM responses ORDER BY createdAt DESC LIMIT 500'
    )
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    res.json({ ok: true, responses: rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to read DB' })
  }
})

app.post('/api/responses', async (req, res) => {
  const name = normalizeString(req.body?.name)
  const loveAnswer = normalizeString(req.body?.loveAnswer)
  const wish = normalizeString(req.body?.wish)

  const allowedLove = new Set(['unset', 'just_friends', 'like_you', 'love_you', 'cant_say'])
  const allowedWish = new Set(['unset', 'relation', 'breakup', 'peace', 'all'])

  if (!allowedLove.has(loveAnswer)) {
    return res.status(400).json({ ok: false, error: 'Invalid loveAnswer' })
  }
  if (!allowedWish.has(wish)) {
    return res.status(400).json({ ok: false, error: 'Invalid wish' })
  }

  const recordId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const createdAt = new Date().toISOString()
  const safeName = name || 'Anonymous'
  const relationship = pickRelationship(loveAnswer)

  try {
    const insert = sqlite.prepare(
      'INSERT INTO responses (id, createdAt, name, loveAnswer, wish, relationship) VALUES (?, ?, ?, ?, ?, ?)'
    )
    insert.run([recordId, createdAt, safeName, loveAnswer, wish, relationship])
    insert.free()
    saveDb()
    res.json({ ok: true, id: recordId })
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Failed to write DB' })
  }
})

// In production on Render, serve the built Vite SPA from dist/.
// (Never use the Vite dev server in production.)
if (shouldServeDist) {
  app.use(express.static(distDir))
}

// Ensure unknown API routes remain API 404s (not the SPA index.html).
app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' })
})

// SPA fallback: send index.html for all non-API routes.
// Express 5 + path-to-regexp no longer accepts `'*'` as a catch-all string.
app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
  if (!shouldServeDist) return next()
  res.sendFile(distIndexHtml)
})

app.listen(PORT, () => {
  console.log(`[api] listening on port ${PORT}`)
  console.log(`[api] sqlite file: ${dbFile}`)
})
