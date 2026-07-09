---
title: Egyptian Bus Game
emoji: 🚌
colorFrom: purple
colorTo: yellow
sdk: docker
pinned: false
---

# 🚌 Egyptian Bus Complete

Multiplayer Arabic word game with a unified purple pixel aesthetic. Players fill categories (ولد، بنت، بلد، حيوان، جماد) for a random letter — fastest and most creative answers win.

**Live:** https://huggingface.co/spaces/moamed12/bus-game

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5001 — the dev server serves the React client and WebSocket API together.

## Build & production

```bash
npm run check    # TypeScript
npm run build    # Vite client + esbuild server → dist/
npm start        # Production server (uses dotenv)
```

## Word database

Validation is **database-only** (no live AI calls during gameplay). The canonical word list lives in `server/data/clean_wildcardDatabase.json`.

```bash
npm run clean:db   # Normalize letters, drop invalid keys, regenerate JSON
npm run verify:db  # Integrity checks (letter prefixes, categories, dedup)
```

## Tests

```bash
npm test           # Logic tests (voting majority, referee routing, scoring)
```

## Optional: GROQ_API_KEY

A `GROQ_API_KEY` in `.env` is optional. Live round validation does **not** call Groq — answers are checked against the local word database and player voting. The key is only relevant for offline DB generation scripts.

## Deploy to Hugging Face Spaces

```bash
python deploy.py
```

This builds the app, commits `dist/`, and force-pushes to the `huggingface` remote. The Space Dockerfile runs `npm start` on port 7860.

## Game notes

- **Solo play:** Unknown words are auto-accepted when only one active voter remains (shown in lobby).
- **Referee mode:** After each round, the designated referee reviews answers before results.
- **One power-up per round:** Server rejects a second activation in the same round.
