import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const SOURCE_URL = "https://bible.helloao.org/api/BSB/complete.json";
const CACHE_PATH = "temp/bible_sources/helloao_api/BSB_complete.json";
const REFERENCE_VERSION_PATH = "src/assets/versions/NAA.json";
const OUTPUT_DIR = "temp/bible_sources/headings";
const CHUNKS_DIR = path.join(OUTPUT_DIR, "chunks");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "bsb-headings.en.json");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const DEFAULT_CHUNK_SIZE = 180;

async function readSource() {
  if (existsSync(CACHE_PATH)) {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  }

  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Failed to download ${SOURCE_URL}: ${response.status}`);
  }

  const data = await response.json();
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(data));

  return data;
}

function normalizeHeadingContent(content) {
  return (content ?? [])
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function findNextVerseNumber(content, startIndex) {
  for (let index = startIndex + 1; index < content.length; index += 1) {
    const item = content[index];
    if (item?.type === "verse" && Number.isInteger(Number(item.number))) {
      return Number(item.number);
    }
  }

  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const item = content[index];
    if (item?.type === "verse" && Number.isInteger(Number(item.number))) {
      return Number(item.number);
    }
  }

  return 1;
}

function chunkItems(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function getChunkSize() {
  const raw = Number(process.env.HEADINGS_CHUNK_SIZE ?? DEFAULT_CHUNK_SIZE);

  if (!Number.isInteger(raw) || raw < 20) {
    return DEFAULT_CHUNK_SIZE;
  }

  return raw;
}

const source = await readSource();
const referenceBooks = JSON.parse(readFileSync(REFERENCE_VERSION_PATH, "utf-8"));
const headings = [];

for (const [bookIndex, sourceBook] of (source.books ?? []).entries()) {
  const referenceBook = referenceBooks[bookIndex];

  if (!referenceBook) {
    throw new Error(`Reference book not found for ${sourceBook.id}`);
  }

  for (const chapter of sourceBook.chapters ?? []) {
    const content = chapter.chapter?.content ?? [];
    const chapterNumber = Number(chapter.chapter?.number ?? chapter.number);
    let headingInChapter = 0;

    for (const [contentIndex, item] of content.entries()) {
      if (item?.type !== "heading") continue;

      const title = normalizeHeadingContent(item.content);
      if (!title) continue;

      headingInChapter += 1;
      const verseNumber = findNextVerseNumber(content, contentIndex);

      headings.push({
        id: `${sourceBook.id}-${String(chapterNumber).padStart(3, "0")}-${String(verseNumber).padStart(3, "0")}-${String(headingInChapter).padStart(2, "0")}`,
        bookId: sourceBook.id,
        bookAbbr: referenceBook.abbrev,
        bookName: referenceBook.name,
        chapter: chapterNumber,
        verse: verseNumber,
        title,
      });
    }
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });

if (existsSync(CHUNKS_DIR)) {
  rmSync(CHUNKS_DIR, { recursive: true });
}

mkdirSync(CHUNKS_DIR, { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(headings, null, 2)}\n`);

const chunkSize = getChunkSize();
const chunks = chunkItems(headings, chunkSize);
const chunkManifest = [];

for (const [index, chunk] of chunks.entries()) {
  const chunkNumber = index + 1;
  const fileName = `chunk-${String(chunkNumber).padStart(3, "0")}.en.json`;
  const filePath = path.join(CHUNKS_DIR, fileName);

  writeFileSync(filePath, `${JSON.stringify(chunk, null, 2)}\n`);

  const text = chunk.map((item) => `${item.bookId} ${item.chapter}:${item.verse} ${item.title}`).join("\n");

  chunkManifest.push({
    chunk: chunkNumber,
    file: path.relative(OUTPUT_DIR, filePath).replaceAll("\\", "/"),
    items: chunk.length,
    firstId: chunk.at(0)?.id ?? null,
    lastId: chunk.at(-1)?.id ?? null,
    chars: text.length,
    approxTokens: Math.ceil(text.length / 4),
  });
}

const titlesOnly = headings.map((item) => item.title).join("\n");
const withRefs = headings
  .map((item) => `${item.bookId} ${item.chapter}:${item.verse} ${item.title}`)
  .join("\n");

const manifest = {
  source: SOURCE_URL,
  output: path.relative(process.cwd(), OUTPUT_PATH).replaceAll("\\", "/"),
  chunksDir: path.relative(process.cwd(), CHUNKS_DIR).replaceAll("\\", "/"),
  chunkSize,
  headings: headings.length,
  chunks: chunks.length,
  charsTitlesOnly: titlesOnly.length,
  approxTokensTitlesOnly: Math.ceil(titlesOnly.length / 4),
  charsWithRefs: withRefs.length,
  approxTokensWithRefs: Math.ceil(withRefs.length / 4),
  chunkManifest,
};

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Extracted ${headings.length} headings into ${chunks.length} chunks (${chunkSize} items/chunk).`,
);
console.log(`Master: ${OUTPUT_PATH}`);
console.log(`Manifest: ${MANIFEST_PATH}`);
