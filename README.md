![bible icon](src/app/favicon.ico)

## Open Bible Study

Fast, minimal Bible reading/study web app. It serves local Bible versions (JSON files) and exposes chapter-reading endpoints, with a reader UI that lets you navigate between previous/next chapters and highlight verses.

**Tech Stack**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Lottie (animations), React Intersection Observer

**Local URL**
- `http://localhost:3000`

**Requirements**
- Node.js 18+ (20+ recommended)
- One package manager: PNPM, NPM, Yarn, or Bun

**Install**
```bash
pnpm install
# or
npm install
# or
yarn
# or
bun install
```

**Run in development**
```bash
pnpm dev
# or
npm run dev
# or
yarn dev
# or
bun dev
```

**Build and production**
```bash
pnpm build
pnpm start
```

**Scripts**
- `dev`: start Next.js with Turbopack
- `build`: create a production build
- `start`: serve the production build
- `lint`: run ESLint

**Project Structure (highlights)**
- `src/app/page.tsx`: home screen to choose book and chapter
- `src/app/reader/page.tsx`: chapter reader with prev/next navigation and verse selection
- `src/app/api/books/route.ts`: list available books (name, abbr, number of chapters)
- `src/app/api/versions/route.ts`: list available Bible versions metadata
- `src/app/api/versions/[version_abbr]/[book_abbr]/[chapter_number]/route.ts`: return chapter content
- `src/assets/versions/*.json`: local Bible versions (ACF, ARA, ARC, NVI, etc.)
- `src/definitions/BooksAndChapters.ts`: helper to extract books/chapters from default version (NVI)

**API**
- `GET /api/books`
	- Response: `[{ abbr: string, name: string, numChapters: number }]`
- `GET /api/versions`
	- Response: `[{ name: string, abbr: string, language: 'PT_BR' }, ... ]`
- `GET /api/versions/:version_abbr/:book_abbr/:chapter_number`
	- Params: `version_abbr` (e.g. `NVI`), `book_abbr` (e.g. `GN`), `chapter_number` (e.g. `1`)
	- Response shape:
		```json
		{
			"version": "NVI",
			"book": {
				"name": "Gênesis",
				"abbrev": "GN",
				"chapter": { "number": 1, "verses": ["No princípio...", "..."] }
			},
			"previous": { "abbrev": "...", "numChapter": 1 },
			"next": { "abbrev": "...", "numChapter": 2 }
		}
		```

**Using the UI**
- On the home page, select a book and chapter, then click “Start reading”.
- In the reader page, use the arrows to navigate between chapters; click a verse to highlight it.

**Configuration Notes**
- `next.config.ts`: base Next.js config
- `eslint.config.mjs`: ESLint config (rule `@typescript-eslint/no-explicit-any` is disabled)
- Tailwind CSS v4: works zero‑config via PostCSS; add a config file only if you need custom tokens/plugins.

**SVG Notes**
- SVGs in `src/assets/icons/*.svg` are consumed as file paths with `next/image`. If you prefer React components (e.g. `<Icon />`), configure SVGR in the Next.js Webpack pipeline.

**Deploy**
- Vercel is recommended. Ensure Node 18+ and a build command like `pnpm build`.

**License**
- Personal/study use. Adapt as needed.
