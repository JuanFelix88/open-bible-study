import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CHUNKS_DIR = "temp/bible_sources/headings/chunks";
const BOOKS_META_PATH = "src/assets/versions/partitions/meta.json";
const OUTPUT_DIR = "src/assets/versions/headings";

const LANGUAGE_CONFIGS = [
  {
    chunkSuffix: "pt",
    outputLanguage: "pt-BR",
  },
];

function readChunks(chunkSuffix) {
  if (!existsSync(CHUNKS_DIR)) {
    throw new Error(`Headings chunks directory not found: ${CHUNKS_DIR}`);
  }

  const files = readdirSync(CHUNKS_DIR)
    .filter((file) => file.endsWith(`.${chunkSuffix}.json`))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No headings chunks found for suffix .${chunkSuffix}.json`);
  }

  return files.flatMap((file) =>
    JSON.parse(readFileSync(path.join(CHUNKS_DIR, file), "utf-8")),
  );
}

function buildMetadata(items, booksMeta) {
  const headingsByBookAndChapter = new Map();

  for (const item of items) {
    const bookKey = item.bookAbbr.toLowerCase();
    const chapterNumber = Number(item.chapter);
    const verseNumber = Number(item.verse);

    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      throw new Error(`Invalid chapter for heading ${item.id}`);
    }

    if (!Number.isInteger(verseNumber) || verseNumber < 1) {
      throw new Error(`Invalid verse for heading ${item.id}`);
    }

    if (!item.title || typeof item.title !== "string") {
      throw new Error(`Invalid title for heading ${item.id}`);
    }

    const chapterKey = `${bookKey}:${chapterNumber}`;
    const chapterItems = headingsByBookAndChapter.get(chapterKey) ?? [];
    chapterItems.push({ verse: verseNumber, title: item.title });
    headingsByBookAndChapter.set(chapterKey, chapterItems);
  }

  return booksMeta.map((book) => ({
    name: book.name,
    abbrev: book.abbr,
    chapters: Array.from({ length: book.numChapters }, (_, chapterIndex) => {
      const chapterNumber = chapterIndex + 1;
      const chapterItems =
        headingsByBookAndChapter.get(`${book.abbr.toLowerCase()}:${chapterNumber}`) ?? [];

      return chapterItems.sort((a, b) => a.verse - b.verse);
    }),
  }));
}

const booksMeta = JSON.parse(readFileSync(BOOKS_META_PATH, "utf-8"));

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const { chunkSuffix, outputLanguage } of LANGUAGE_CONFIGS) {
  const items = readChunks(chunkSuffix);
  const metadata = buildMetadata(items, booksMeta);
  const outputPath = path.join(OUTPUT_DIR, `${outputLanguage}.json`);

  writeFileSync(outputPath, `${JSON.stringify(metadata)}\n`);

  const chapterCount = metadata.reduce((total, book) => total + book.chapters.length, 0);
  const headingCount = metadata.reduce(
    (total, book) => total + book.chapters.reduce((sum, chapter) => sum + chapter.length, 0),
    0,
  );

  console.log(
    `Converted ${metadata.length} books, ${chapterCount} chapters and ${headingCount} headings to ${outputPath}`,
  );
}
