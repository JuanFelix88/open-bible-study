import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { postProcessTranslation } from "@/utils/TranslationPostProcessors";

type EnduringWordBookMapItem = {
  abbr: string;
  name: string;
  enduringWordSlug: string;
  aliases?: string[];
};

type EnduringWordSection = {
  id: string;
  category: string;
  title: string;
  startVerse: number;
  endVerse: number;
  markdown: string;
};

type EnduringWordCommentary = {
  reference: string;
  range: string;
  sourceUrl: string;
  sectionId: string;
  markdown: string;
};

const ENDURING_WORD_BASE_URL = "https://enduringword.com";
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const TRANSLATE_CHUNK_SIZE = 1_400;

const ENDURING_WORD_BOOKS: EnduringWordBookMapItem[] = [
  { abbr: "Gn", name: "Gênesis", enduringWordSlug: "genesis" },
  { abbr: "Êx", name: "Êxodo", enduringWordSlug: "exodus", aliases: ["Ex"] },
  { abbr: "Lv", name: "Levítico", enduringWordSlug: "leviticus" },
  { abbr: "Nm", name: "Números", enduringWordSlug: "numbers" },
  { abbr: "Dt", name: "Deuteronômio", enduringWordSlug: "deuteronomy" },
  { abbr: "Js", name: "Josué", enduringWordSlug: "joshua" },
  { abbr: "Jz", name: "Juízes", enduringWordSlug: "judges" },
  { abbr: "Rt", name: "Rute", enduringWordSlug: "ruth" },
  { abbr: "1Sm", name: "1 Samuel", enduringWordSlug: "1-samuel" },
  { abbr: "2Sm", name: "2 Samuel", enduringWordSlug: "2-samuel" },
  { abbr: "1Rs", name: "1 Reis", enduringWordSlug: "1-kings" },
  { abbr: "2Rs", name: "2 Reis", enduringWordSlug: "2-kings" },
  { abbr: "1Cr", name: "1 Crônicas", enduringWordSlug: "1-chronicles" },
  { abbr: "2Cr", name: "2 Crônicas", enduringWordSlug: "2-chronicles" },
  { abbr: "Ed", name: "Esdras", enduringWordSlug: "ezra" },
  { abbr: "Ne", name: "Neemias", enduringWordSlug: "nehemiah" },
  { abbr: "Et", name: "Ester", enduringWordSlug: "esther" },
  { abbr: "Jó", name: "Jó", enduringWordSlug: "job", aliases: ["Job"] },
  { abbr: "Sl", name: "Salmos", enduringWordSlug: "psalm", aliases: ["Psalms"] },
  { abbr: "Pv", name: "Provérbios", enduringWordSlug: "proverbs" },
  { abbr: "Ec", name: "Eclesiastes", enduringWordSlug: "ecclesiastes" },
  {
    abbr: "Ct",
    name: "Cânticos",
    enduringWordSlug: "song-of-solomon",
    aliases: ["Cantares", "Song of Songs"],
  },
  { abbr: "Is", name: "Isaías", enduringWordSlug: "isaiah" },
  { abbr: "Jr", name: "Jeremias", enduringWordSlug: "jeremiah" },
  {
    abbr: "Lm",
    name: "Lamentações de Jeremias",
    enduringWordSlug: "lamentations",
    aliases: ["Lamentações"],
  },
  { abbr: "Ez", name: "Ezequiel", enduringWordSlug: "ezekiel" },
  { abbr: "Dn", name: "Daniel", enduringWordSlug: "daniel" },
  { abbr: "Os", name: "Oséias", enduringWordSlug: "hosea", aliases: ["Oseias"] },
  { abbr: "Jl", name: "Joel", enduringWordSlug: "joel" },
  { abbr: "Am", name: "Amós", enduringWordSlug: "amos" },
  { abbr: "Ob", name: "Obadias", enduringWordSlug: "obadiah" },
  { abbr: "Jn", name: "Jonas", enduringWordSlug: "jonah" },
  { abbr: "Mq", name: "Miquéias", enduringWordSlug: "micah" },
  { abbr: "Na", name: "Naum", enduringWordSlug: "nahum" },
  { abbr: "Hc", name: "Habacuque", enduringWordSlug: "habakkuk" },
  { abbr: "Sf", name: "Sofonias", enduringWordSlug: "zephaniah" },
  { abbr: "Ag", name: "Ageu", enduringWordSlug: "haggai" },
  { abbr: "Zc", name: "Zacarias", enduringWordSlug: "zechariah" },
  { abbr: "Ml", name: "Malaquias", enduringWordSlug: "malachi" },
  { abbr: "Mt", name: "Mateus", enduringWordSlug: "matthew" },
  { abbr: "Mc", name: "Marcos", enduringWordSlug: "mark" },
  { abbr: "Lc", name: "Lucas", enduringWordSlug: "luke" },
  { abbr: "Jo", name: "João", enduringWordSlug: "john" },
  { abbr: "At", name: "Atos", enduringWordSlug: "acts" },
  { abbr: "Rm", name: "Romanos", enduringWordSlug: "romans" },
  { abbr: "1Co", name: "1 Coríntios", enduringWordSlug: "1-corinthians" },
  { abbr: "2Co", name: "2 Coríntios", enduringWordSlug: "2-corinthians" },
  { abbr: "Gl", name: "Gálatas", enduringWordSlug: "galatians" },
  { abbr: "Ef", name: "Efésios", enduringWordSlug: "ephesians" },
  { abbr: "Fp", name: "Filipenses", enduringWordSlug: "philippians" },
  { abbr: "Cl", name: "Colossenses", enduringWordSlug: "colossians" },
  { abbr: "1Ts", name: "1 Tessalonicenses", enduringWordSlug: "1-thessalonians" },
  { abbr: "2Ts", name: "2 Tessalonicenses", enduringWordSlug: "2-thessalonians" },
  {
    abbr: "1Tn",
    name: "1 Timóteo",
    enduringWordSlug: "1-timothy",
    aliases: ["1Tm"],
  },
  { abbr: "2Tm", name: "2 Timóteo", enduringWordSlug: "2-timothy" },
  { abbr: "Tt", name: "Tito", enduringWordSlug: "titus" },
  { abbr: "Fm", name: "Filemom", enduringWordSlug: "philemon" },
  { abbr: "Hb", name: "Hebreus", enduringWordSlug: "hebrews" },
  { abbr: "Tg", name: "Tiago", enduringWordSlug: "james" },
  { abbr: "1Pe", name: "1 Pedro", enduringWordSlug: "1-peter" },
  { abbr: "2Pe", name: "2 Pedro", enduringWordSlug: "2-peter" },
  { abbr: "1Jo", name: "1 João", enduringWordSlug: "1-john" },
  { abbr: "2Jo", name: "2 João", enduringWordSlug: "2-john" },
  { abbr: "3Jo", name: "3 João", enduringWordSlug: "3-john" },
  { abbr: "Jd", name: "Judas", enduringWordSlug: "jude" },
  { abbr: "Ap", name: "Apocalipse", enduringWordSlug: "revelation" },
];

class NotFoundError extends Error {}

function normalizeLookupKey(value: string) {
  return decodeURIComponent(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    bull: "•",
    emdash: "—",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    ndash: "–",
    nbsp: " ",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };

  return value.replace(/&(#x?[\da-f]+|[a-z]+);/gi, (entity, code) => {
    const normalizedCode = code.toLowerCase();

    if (normalizedCode.startsWith("#x")) {
      return String.fromCodePoint(parseInt(normalizedCode.slice(2), 16));
    }

    if (normalizedCode.startsWith("#")) {
      return String.fromCodePoint(parseInt(normalizedCode.slice(1), 10));
    }

    return namedEntities[normalizedCode] ?? entity;
  });
}

function stripTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .trim();
}

function htmlToMarkdown(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<form[\s\S]*?<\/form>/gi, "")
      .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (_, content) => stripTags(content))
      .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, content) => `\n# ${stripTags(content)}\n\n`)
      .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, content) => `\n## ${stripTags(content)}\n\n`)
      .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, content) => `\n### ${stripTags(content)}\n\n`)
      .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_, content) => `\n#### ${stripTags(content)}\n\n`)
      .replace(/<p\b[^>]*class="[^"]*ew-bible-text[^"]*"[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
        const text = stripTags(content);
        return text ? `\n> ${text}\n\n` : "";
      })
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, content) => `**${stripTags(content)}**`)
      .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, content) => `*${stripTags(content)}*`)
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function resolveEnduringWordBook(book: string) {
  const decodedBook = decodeURIComponent(book).trim();
  const exactAbbr = ENDURING_WORD_BOOKS.find(
    (candidate) => candidate.abbr.toLowerCase() === decodedBook.toLowerCase(),
  );

  if (exactAbbr) return exactAbbr;

  const lookupKey = normalizeLookupKey(decodedBook);

  return ENDURING_WORD_BOOKS.find((candidate) => {
    const aliases = [
      candidate.name,
      candidate.enduringWordSlug,
      ...(candidate.aliases ?? []),
    ];

    return aliases.some((alias) => normalizeLookupKey(alias) === lookupKey);
  });
}

function buildEnduringWordUrl(book: EnduringWordBookMapItem, chapter: number) {
  return `${ENDURING_WORD_BASE_URL}/bible-commentary/${book.enduringWordSlug}-${chapter}/`;
}

function extractEntryContent(html: string) {
  const start = html.indexOf('<div class="entry-content single-content">');
  if (start === -1) return "";

  const fromStart = html.slice(start);
  const end = fromStart.indexOf("</div><!-- .entry-content -->");
  const entryContent = end === -1 ? fromStart : fromStart.slice(0, end);
  const commentaryMarker = entryContent.indexOf("<!-- INSERT_GCP_COMMENTARY -->");

  return commentaryMarker === -1
    ? entryContent
    : entryContent.slice(commentaryMarker + "<!-- INSERT_GCP_COMMENTARY -->".length);
}

function getAttribute(value: string, attribute: string) {
  const match = value.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function parseRangeFromHtml(headingText: string, bodyHtml: string) {
  const dataRef = bodyHtml.match(/data-ref="[A-Z0-9]+-\d+-(\d+)(?:-(\d+))?"/i);

  if (dataRef) {
    const startVerse = parseInt(dataRef[1] ?? "", 10);
    const endVerse = parseInt(dataRef[2] ?? dataRef[1] ?? "", 10);

    if (Number.isInteger(startVerse) && Number.isInteger(endVerse)) {
      return { startVerse, endVerse };
    }
  }

  const headingRange = headingText.match(/\((\d+)(?:\s*[-–—]\s*(\d+))?\)/);
  if (!headingRange) return null;

  const startVerse = parseInt(headingRange[1] ?? "", 10);
  const endVerse = parseInt(headingRange[2] ?? headingRange[1] ?? "", 10);

  if (!Number.isInteger(startVerse) || !Number.isInteger(endVerse)) return null;

  return { startVerse, endVerse };
}

function extractCommentarySections(html: string) {
  const entryContent = extractEntryContent(html);
  const headingRegex = /<(h3|h4)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  const headings = Array.from(entryContent.matchAll(headingRegex)).map((match) => ({
    tag: match[1]?.toLowerCase() ?? "",
    attributes: match[2] ?? "",
    html: match[0] ?? "",
    content: match[3] ?? "",
    index: match.index ?? 0,
    end: (match.index ?? 0) + (match[0]?.length ?? 0),
  }));

  const sections: EnduringWordSection[] = [];

  for (const [index, heading] of headings.entries()) {
    if (heading.tag !== "h4") continue;

    const previousCategory = headings
      .slice(0, index)
      .reverse()
      .find((candidate) => candidate.tag === "h3");
    const nextBoundary = headings
      .slice(index + 1)
      .find((candidate) => candidate.tag === "h3" || candidate.tag === "h4");
    const bodyHtml = entryContent.slice(heading.end, nextBoundary?.index ?? entryContent.length);
    const title = stripTags(heading.content);
    const range = parseRangeFromHtml(title, bodyHtml);

    if (!range) continue;

    const category = previousCategory ? stripTags(previousCategory.content) : "";
    const categoryMarkdown = category ? `### ${category}\n\n` : "";
    const markdown = `${categoryMarkdown}${htmlToMarkdown(`${heading.html}${bodyHtml}`)}`.trim();

    if (!markdown) continue;

    sections.push({
      id: getAttribute(heading.attributes, "id") || `section-${sections.length + 1}`,
      category,
      title,
      startVerse: range.startVerse,
      endVerse: range.endVerse,
      markdown,
    });
  }

  return sections;
}

function splitTranslationChunks(value: string) {
  const paragraphs = value.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= TRANSLATE_CHUNK_SIZE) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);

    if (paragraph.length <= TRANSLATE_CHUNK_SIZE) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += TRANSLATE_CHUNK_SIZE) {
      chunks.push(paragraph.slice(index, index + TRANSLATE_CHUNK_SIZE));
    }

    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
}

async function translateTextToPortuguese(value: string) {
  const chunks = splitTranslationChunks(value);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", "pt");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", chunk);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 BibleStudyEnduringWordBridge/1.0",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`Google Translate returned ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error("Unexpected Google Translate response");
    }

    translatedChunks.push(
      data[0]
        .map((sentence: unknown) => (Array.isArray(sentence) ? sentence[0] : ""))
        .filter((sentence: unknown): sentence is string => typeof sentence === "string")
        .join(""),
    );
  }

  return postProcessTranslation("pt-BR", translatedChunks.join("\n\n").trim());
}

async function validateLocalReference(book: EnduringWordBookMapItem, chapter: number, verse: number) {
  const books = await BooksAndChapters.getBooks();
  const localBook = books.find(
    (candidate) => normalizeLookupKey(candidate.abbr) === normalizeLookupKey(book.abbr),
  );

  if (!localBook || chapter > localBook.numChapters) {
    throw new NotFoundError("Book or chapter not found.");
  }

  const chapters = await BooksAndChapters.getChapters(localBook.abbr);
  const verseText = chapters.at(chapter - 1)?.at(verse - 1);

  if (!verseText) {
    throw new NotFoundError("Verse not found.");
  }
}

function findSectionForVerse(sections: EnduringWordSection[], verse: number) {
  return sections.find(
    (section) => section.startVerse <= verse && verse <= section.endVerse,
  );
}

function formatRange(chapter: number, section: EnduringWordSection) {
  if (section.startVerse === section.endVerse) return `${chapter}:${section.startVerse}`;

  return `${chapter}:${section.startVerse}-${section.endVerse}`;
}

export class EnduringWordCommentaryService {
  public static isNotFound(error: unknown) {
    return error instanceof NotFoundError;
  }

  public static async getCommentary(
    bookParam: string,
    chapter: number,
    verse: number,
  ): Promise<EnduringWordCommentary> {
    if (!bookParam || chapter < 1 || verse < 1) {
      throw new NotFoundError("Invalid reference.");
    }

    const book = resolveEnduringWordBook(bookParam);
    if (!book) throw new NotFoundError("Book not found.");

    await validateLocalReference(book, chapter, verse);

    const sourceUrl = buildEnduringWordUrl(book, chapter);
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 BibleStudyEnduringWordBridge/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (response.status === 404) {
      throw new NotFoundError("Enduring Word commentary not found.");
    }

    if (!response.ok) {
      throw new Error(`Enduring Word returned ${response.status}`);
    }

    const html = await response.text();
    const sections = extractCommentarySections(html);
    const section = findSectionForVerse(sections, verse);

    if (!section) {
      throw new NotFoundError("Enduring Word commentary section not found.");
    }

    const range = formatRange(chapter, section);
    const translatedCommentary = await translateTextToPortuguese(section.markdown);
    const reference = `${book.name} ${range}`;
    const markdown = [
      translatedCommentary,
      `---\nReference [EnduringWord.com](${sourceUrl}#${section.id}).`,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      reference,
      range,
      sourceUrl: `${sourceUrl}#${section.id}`,
      sectionId: section.id,
      markdown,
    };
  }
}
