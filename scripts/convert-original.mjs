import { readFile, writeFile } from "fs/promises";
import path from "path";

const INPUT_DIR = path.resolve("src", "assets", "versions", "originals");
const OUTPUT_DIR = path.resolve("src", "assets", "versions");

async function convertOriginalVersion(name) {
  const localPath = path.resolve(
    "src",
    "assets",
    "versions",
    "originals",
    `${name}.json`,
  );

  const rawData = await readFile(localPath, "utf-8");

  const data = JSON.parse(rawData);
  const outputPath = path.resolve(OUTPUT_DIR, `${name}.json`);
  const uniqueBooksNames = [
    ...new Set(data.verses.map(({ book_name: bookName }) => bookName)).keys(),
  ];

  const outputData = uniqueBooksNames.map((bookName) => {
    const bookVerses = data.verses.filter((verse) => verse.book_name === bookName);
    const maxChapter = Math.max(...bookVerses.map((v) => v.chapter));
    const chapters = [];

    for (let ch = 1; ch <= maxChapter; ch++) {
      const chapterVerses = bookVerses
        .filter((v) => v.chapter === ch)
        .sort((a, b) => a.verse - b.verse)
        .map((v) => v.text);
      chapters.push(chapterVerses);
    }

    return {
      abbrev: "",
      chapters,
      name: bookName,
    };
  });

  writeFile(outputPath, JSON.stringify(outputData), "utf-8");
}

convertOriginalVersion("TR");
convertOriginalVersion("WLC");
