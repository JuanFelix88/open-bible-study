import pdf from "pdf-parse/lib/pdf-parse.js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const buf = readFileSync("src/assets/o-poder.pdf");

const pages = [];

const data = await pdf(buf, {
  pagerender: function (pageData) {
    return pageData.getTextContent().then(function (textContent) {
      let pageText = "";
      let lastY = null;
      for (const item of textContent.items) {
        if (lastY !== null && Math.abs(lastY - item.transform[5]) > 2) {
          pageText += "\n";
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
      pages.push(pageText.trim());
      return pageText;
    });
  },
});

console.log("Total pages:", data.numpages);

for (let i = 0; i < pages.length; i++) {
  console.log(`--- Page ${i + 1} (${pages[i].length} chars) ---`);
  console.log(pages[i].substring(0, 150));
  console.log("...\n");
}

mkdirSync("src/assets/o-poder", { recursive: true });
writeFileSync(
  "src/assets/o-poder/pages.json",
  JSON.stringify(
    { title: "O Poder", totalPages: pages.length, pages },
    null,
    2,
  ),
);

console.log("Saved to src/assets/o-poder/pages.json");
