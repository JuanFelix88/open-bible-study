import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE_URL = "https://bible.helloao.org/api/por_onbv/complete.json";
const CACHE_PATH = "temp/bible_sources/helloao_api/por_onbv_complete.json";
const REFERENCE_VERSION_PATH = "src/assets/versions/NAA.json";
const OUTPUT_PATH = "src/assets/versions/paragraphs/base.json";

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

function getParagraphStarts(content) {
  const starts = [];
  let nextVerseStartsParagraph = true;

  for (const item of content) {
    if (item?.type === "line_break") {
      nextVerseStartsParagraph = true;
      continue;
    }

    if (item?.type !== "verse") {
      continue;
    }

    const verseNumber = Number(item.number);

    if (Number.isInteger(verseNumber) && nextVerseStartsParagraph) {
      starts.push(verseNumber);
    }

    nextVerseStartsParagraph = false;
  }

  return [...new Set(starts)].sort((a, b) => a - b);
}

const source = await readSource();
const referenceBooks = JSON.parse(readFileSync(REFERENCE_VERSION_PATH, "utf-8"));

const paragraphMetadata = source.books.map((book, bookIndex) => {
  const referenceBook = referenceBooks[bookIndex];

  if (!referenceBook) {
    throw new Error(`Reference book not found for source book ${book.id}`);
  }

  return {
    name: referenceBook.name,
    abbrev: referenceBook.abbrev,
    chapters: book.chapters.map((chapter) =>
      getParagraphStarts(chapter.chapter?.content ?? []),
    ),
  };
});

mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(paragraphMetadata)}\n`);

const chapterCount = paragraphMetadata.reduce(
  (total, book) => total + book.chapters.length,
  0,
);
const paragraphStartCount = paragraphMetadata.reduce(
  (total, book) =>
    total + book.chapters.reduce((sum, chapter) => sum + chapter.length, 0),
  0,
);

console.log(
  `Converted ${paragraphMetadata.length} books, ${chapterCount} chapters and ${paragraphStartCount} paragraph starts to ${OUTPUT_PATH}`,
);
