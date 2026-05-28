<p align="center">
  <img src="public/manifest-icons/icon-192.png" width="96" alt="Open Bible Study icon" />
</p>

<h1 align="center">Open Bible Study</h1>

<p align="center">
  A fast, minimal Bible reading & study web app - <strong>Reader UI + HTTP API</strong> powered by local JSON versions.
</p>

<p align="center">
  <a href="README.pt-BR.md">Português (pt-BR)</a>
</p>

<p align="center">
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js"></a>
  <a href="https://react.dev"><img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://tailwindcss.com"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white"></a>
</p>

---

<p align="center">
  <img src="src/assets/examples/ad-en-01.png" alt="Screenshot" width="900" />
</p>

<p align="center">
  <img src="src/assets/examples/ad-en-02.png" alt="Screenshot" width="900" />
</p>

---

## What is this?

**Open Bible Study** is a lightweight Bible reader focused on speed and simplicity, while still giving you "study mode" tools when you need them.

### Core experience

1. Pick a **Bible version**, **book**, and **chapter**
2. Read with a clean UI and **prev/next chapter navigation**
3. Click a verse to open a toolbox:
   - **Refs**: related references (stored in Postgres)
   - **Versions**: compare the same verse across versions (diff-highlight)
   - **Share**: copy shareable links (+ optional verse text)
   - **Original**: show the original language verse + AI token explanations
   - **Deep**: AI deep-analysis with cross references auto-linked
   - **Marker**: save named reading markers (localStorage)

Also included:

- **Search** (simple "book/chapter/verse" search + deep full-text search)
- **HTTP API** (Next.js route handlers) to query books, versions and chapters
- **Local-first Bible data**: versions live as JSON in this repository

---

## Table of contents

- [Quickstart](#quickstart)
- [Features](#features)
- [Environment variables](#environment-variables)
- [API](#api)
- [Bible data format](#bible-data-format)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Deploy](#deploy)
- [License / legal note](#license--legal-note)

---

## Quickstart

### Requirements

- Node.js **18+** (20+ recommended)
- One package manager: **pnpm** (recommended), npm, yarn, or bun

### Install

```bash
pnpm install
```

### Run (development)

```bash
pnpm dev
```

- App: `http://localhost:3000`

**Note:** `pnpm dev` runs data generation steps (`orig` + `parts`) before starting Next.js.

### Build + start (production)

```bash
pnpm build
pnpm start
```

---

## Features

### Reader

- Chapter reader with **previous/next** navigation
- Verse selection with a compact **action bar** (Refs / Versions / Share / Original / Deep / Marker)
- **Reading markers** saved locally in the browser (localStorage)

### Study tools

- **Cross-references**: create and browse verse-to-verse references (requires Postgres)
- **Compare versions**: open a verse and see the same verse in multiple versions with diff highlighting
- **Original language**: fetch original verse text (Greek/Hebrew) for the selected translation

### AI (optional)

If you configure an AI provider (Ollama-compatible API), the app can:

- Stream **token-by-token explanations** of the original language (Explain)
- Stream a **deep analysis** mapping the translation back to original language + theology + cross references

### Search

- Simple search: `Book Chapter:Verse` patterns
- Deep search: full-text search across verses (powered by a server route)

---

## Environment variables

Some features require external services.

Create a `.env.local` file:

```bash
# --- AI (optional, used by /reader/explain and /reader/deep-analysis)
# Example for Ollama: http://localhost:11434
AI_API_URL=http://localhost:11434
AI_API_MODEL=llama3.1
# Optional, if your Ollama-compatible endpoint requires auth
AI_OLLAMA_API_KEY=

# --- Postgres (required for References feature)
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=open_bible
```

If you don't want AI or references, you can still use the reader + local versions, but routes that depend on these services must be disabled/removed or properly configured.

---

## API

Base URL (local): `http://localhost:3000`

### List books

`GET /api/books`

Response:

```json
[{ "abbr": "Gn", "name": "Gênesis", "numChapters": 50 }]
```

### List versions

`GET /api/versions`

Response:

```json
[{ "name": "NVI", "abbr": "NVI", "language": "PT_BR" }]
```

### Get chapter

`GET /api/versions/:version_abbr/:book_abbr/:chapter_number`

Example:

```bash
curl "http://localhost:3000/api/versions/NVI/Gn/1"
```

Response shape:

```json
{
  "version": "NVI",
  "book": {
    "name": "Gênesis",
    "abbrev": "Gn",
    "chapter": {
      "number": 1,
      "verses": ["No princípio...", "..."]
    }
  },
  "previous": { "abbrev": "...", "numChapter": 1 },
  "next": { "abbrev": "...", "numChapter": 2 }
}
```

---

## Bible data format

Bible versions live in:

- `src/assets/versions/*.json`

A version file is an array of books:

- `abbrev`: book abbreviation (e.g. `Gn`)
- `name`: book name (e.g. `Gênesis`)
- `chapters`: array of chapters, where each chapter is an array of verse strings

To speed up imports, versions are also partitioned per-book under:

- `src/assets/versions/partitions/<version>/<book>.json`

The books metadata used by the UI comes from:

- `src/assets/versions/partitions/meta.json`

---

## Scripts

- `dev`: runs data generation and starts Next.js with Turbopack
- `build`: runs data generation and creates a production build
- `start`: serves the production build
- `lint`: runs ESLint
- `lint:fix`: ESLint auto-fix
- `orig`: converts "original" sources from `src/assets/versions/originals` into the app's book/chapter/verse structure
- `parts`: partitions each version into per-book JSON files + generates `partitions/meta.json`

---

## Project structure

Highlights:

- `src/app/page.tsx`: home screen to choose book and chapter
- `src/app/reader/page.tsx`: reader UI (verse action bar + navigation)
- `src/app/search/page.tsx`: verse search UI
- `src/app/share/page.tsx`: shareable verse URL with metadata

- `src/app/api/books/route.ts`: list available books
- `src/app/api/versions/route.ts`: list available versions
- `src/app/api/versions/[version_abbr]/[book_abbr]/[chapter_number]/route.ts`: chapter endpoint

- `src/assets/versions/*.json`: local Bible versions
- `src/assets/versions/partitions/*`: per-version/per-book partitions + `meta.json`

---

## Deploy

Vercel is recommended.

- Build command: `pnpm build`
- Node: 18+

If you enable AI or Postgres-backed features, ensure you set the environment variables in your hosting provider.

---

## License / legal note

- Source code: [MIT](LICENSE)
- Bible texts: availability and usage rights depend on each version's copyright/license.

If you plan to publish/redistribute this app publicly, make sure you have the proper permissions for every Bible version included.
