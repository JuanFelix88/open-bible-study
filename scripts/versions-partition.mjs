import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

console.time("Partition versions");

if (existsSync("./src/assets/versions/partitions")) {
  rmSync("./src/assets/versions/partitions", { recursive: true });
}

let alreadyCreatedMeta = false;

readdirSync("./src/assets/versions").forEach((version) => {
  const fullPath = `./src/assets/versions/${version}`;
  const outDir = `./src/assets/versions/partitions/${version
    .toLowerCase()
    .replace(".json", "")}`;

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  
  const books = JSON.parse(readFileSync(fullPath, "utf-8"));
  
  if (!alreadyCreatedMeta) {
    writeFileSync(`./src/assets/versions/partitions/meta.json`, JSON.stringify(
      books.map(({ name, abbrev, chapters }) => ({
        name,
        abbr: abbrev,
        numChapters: chapters.length,
      }))
    ));

    alreadyCreatedMeta = true
  }

  
  books.forEach((book) => {
    const bookPath = path.join(outDir, `${book.abbrev.toLowerCase()}.json`);
    
    writeFileSync(bookPath, JSON.stringify(book));
  });
});

console.timeEnd("Partition versions");
