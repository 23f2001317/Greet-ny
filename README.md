# Greet-ny
new year greeting web

## Deploy to Render

1. Set the **Build Command** to:

```bash
npm run build
```

2. Set the **Start Command** to:

```bash
npm start
```

Notes:
- `npm run build` produces the Vite `dist/` folder.
- The Express server (`server/index.mjs`) serves `dist/` and exposes API routes under `/api/*`.
- Do not run the Vite dev server in production.
