import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { postProcessTranslation } from "@/utils/TranslationPostProcessors";

type BibleRefBookMapItem = {
  abbr: string;
  name: string;
  bibleRefTitle: string;
  bibleRefPath: string;
  verseSlug?: string;
  aliases?: string[];
};

type BibleRefContext = {
  reference: string;
  sourceUrl: string;
  markdown: string;
};

const BIBLE_REF_BASE_URL = "https://www.bibleref.com";
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const TRANSLATE_CHUNK_SIZE = 1_400;

const BIBLE_REF_BOOKS: BibleRefBookMapItem[] = [
  { abbr: "Gn", name: "Gênesis", bibleRefTitle: "Genesis", bibleRefPath: "Genesis" },
  { abbr: "Êx", name: "Êxodo", bibleRefTitle: "Exodus", bibleRefPath: "Exodus", aliases: ["Ex"] },
  { abbr: "Lv", name: "Levítico", bibleRefTitle: "Leviticus", bibleRefPath: "Leviticus" },
  { abbr: "Nm", name: "Números", bibleRefTitle: "Numbers", bibleRefPath: "Numbers" },
  { abbr: "Dt", name: "Deuteronômio", bibleRefTitle: "Deuteronomy", bibleRefPath: "Deuteronomy" },
  { abbr: "Js", name: "Josué", bibleRefTitle: "Joshua", bibleRefPath: "Joshua" },
  { abbr: "Jz", name: "Juízes", bibleRefTitle: "Judges", bibleRefPath: "Judges" },
  { abbr: "Rt", name: "Rute", bibleRefTitle: "Ruth", bibleRefPath: "Ruth" },
  { abbr: "1Sm", name: "1 Samuel", bibleRefTitle: "1 Samuel", bibleRefPath: "1-Samuel" },
  { abbr: "2Sm", name: "2 Samuel", bibleRefTitle: "2 Samuel", bibleRefPath: "2-Samuel" },
  { abbr: "1Rs", name: "1 Reis", bibleRefTitle: "1 Kings", bibleRefPath: "1-Kings" },
  { abbr: "2Rs", name: "2 Reis", bibleRefTitle: "2 Kings", bibleRefPath: "2-Kings" },
  { abbr: "1Cr", name: "1 Crônicas", bibleRefTitle: "1 Chronicles", bibleRefPath: "1-Chronicles" },
  { abbr: "2Cr", name: "2 Crônicas", bibleRefTitle: "2 Chronicles", bibleRefPath: "2-Chronicles" },
  { abbr: "Ed", name: "Esdras", bibleRefTitle: "Ezra", bibleRefPath: "Ezra" },
  { abbr: "Ne", name: "Neemias", bibleRefTitle: "Nehemiah", bibleRefPath: "Nehemiah" },
  { abbr: "Et", name: "Ester", bibleRefTitle: "Esther", bibleRefPath: "Esther" },
  { abbr: "Jó", name: "Jó", bibleRefTitle: "Job", bibleRefPath: "Job", aliases: ["Job"] },
  { abbr: "Sl", name: "Salmos", bibleRefTitle: "Psalms", bibleRefPath: "Psalms", verseSlug: "Psalm" },
  { abbr: "Pv", name: "Provérbios", bibleRefTitle: "Proverbs", bibleRefPath: "Proverbs" },
  { abbr: "Ec", name: "Eclesiastes", bibleRefTitle: "Ecclesiastes", bibleRefPath: "Ecclesiastes" },
  { abbr: "Ct", name: "Cânticos", bibleRefTitle: "Song of Solomon", bibleRefPath: "Song-of-Solomon", aliases: ["Cantares", "Song of Songs"] },
  { abbr: "Is", name: "Isaías", bibleRefTitle: "Isaiah", bibleRefPath: "Isaiah" },
  { abbr: "Jr", name: "Jeremias", bibleRefTitle: "Jeremiah", bibleRefPath: "Jeremiah" },
  { abbr: "Lm", name: "Lamentações de Jeremias", bibleRefTitle: "Lamentations", bibleRefPath: "Lamentations", aliases: ["Lamentações"] },
  { abbr: "Ez", name: "Ezequiel", bibleRefTitle: "Ezekiel", bibleRefPath: "Ezekiel" },
  { abbr: "Dn", name: "Daniel", bibleRefTitle: "Daniel", bibleRefPath: "Daniel" },
  { abbr: "Os", name: "Oséias", bibleRefTitle: "Hosea", bibleRefPath: "Hosea", aliases: ["Oseias"] },
  { abbr: "Jl", name: "Joel", bibleRefTitle: "Joel", bibleRefPath: "Joel" },
  { abbr: "Am", name: "Amós", bibleRefTitle: "Amos", bibleRefPath: "Amos" },
  { abbr: "Ob", name: "Obadias", bibleRefTitle: "Obadiah", bibleRefPath: "Obadiah" },
  { abbr: "Jn", name: "Jonas", bibleRefTitle: "Jonah", bibleRefPath: "Jonah" },
  { abbr: "Mq", name: "Miquéias", bibleRefTitle: "Micah", bibleRefPath: "Micah" },
  { abbr: "Na", name: "Naum", bibleRefTitle: "Nahum", bibleRefPath: "Nahum" },
  { abbr: "Hc", name: "Habacuque", bibleRefTitle: "Habakkuk", bibleRefPath: "Habakkuk" },
  { abbr: "Sf", name: "Sofonias", bibleRefTitle: "Zephaniah", bibleRefPath: "Zephaniah" },
  { abbr: "Ag", name: "Ageu", bibleRefTitle: "Haggai", bibleRefPath: "Haggai" },
  { abbr: "Zc", name: "Zacarias", bibleRefTitle: "Zechariah", bibleRefPath: "Zechariah" },
  { abbr: "Ml", name: "Malaquias", bibleRefTitle: "Malachi", bibleRefPath: "Malachi" },
  { abbr: "Mt", name: "Mateus", bibleRefTitle: "Matthew", bibleRefPath: "Matthew" },
  { abbr: "Mc", name: "Marcos", bibleRefTitle: "Mark", bibleRefPath: "Mark" },
  { abbr: "Lc", name: "Lucas", bibleRefTitle: "Luke", bibleRefPath: "Luke" },
  { abbr: "Jo", name: "João", bibleRefTitle: "John", bibleRefPath: "John" },
  { abbr: "At", name: "Atos", bibleRefTitle: "Acts", bibleRefPath: "Acts" },
  { abbr: "Rm", name: "Romanos", bibleRefTitle: "Romans", bibleRefPath: "Romans" },
  { abbr: "1Co", name: "1 Coríntios", bibleRefTitle: "1 Corinthians", bibleRefPath: "1-Corinthians" },
  { abbr: "2Co", name: "2 Coríntios", bibleRefTitle: "2 Corinthians", bibleRefPath: "2-Corinthians" },
  { abbr: "Gl", name: "Gálatas", bibleRefTitle: "Galatians", bibleRefPath: "Galatians" },
  { abbr: "Ef", name: "Efésios", bibleRefTitle: "Ephesians", bibleRefPath: "Ephesians" },
  { abbr: "Fp", name: "Filipenses", bibleRefTitle: "Philippians", bibleRefPath: "Philippians" },
  { abbr: "Cl", name: "Colossenses", bibleRefTitle: "Colossians", bibleRefPath: "Colossians" },
  { abbr: "1Ts", name: "1 Tessalonicenses", bibleRefTitle: "1 Thessalonians", bibleRefPath: "1-Thessalonians" },
  { abbr: "2Ts", name: "2 Tessalonicenses", bibleRefTitle: "2 Thessalonians", bibleRefPath: "2-Thessalonians" },
  { abbr: "1Tn", name: "1 Timóteo", bibleRefTitle: "1 Timothy", bibleRefPath: "1-Timothy", aliases: ["1Tm"] },
  { abbr: "2Tm", name: "2 Timóteo", bibleRefTitle: "2 Timothy", bibleRefPath: "2-Timothy" },
  { abbr: "Tt", name: "Tito", bibleRefTitle: "Titus", bibleRefPath: "Titus" },
  { abbr: "Fm", name: "Filemom", bibleRefTitle: "Philemon", bibleRefPath: "Philemon" },
  { abbr: "Hb", name: "Hebreus", bibleRefTitle: "Hebrews", bibleRefPath: "Hebrews" },
  { abbr: "Tg", name: "Tiago", bibleRefTitle: "James", bibleRefPath: "James" },
  { abbr: "1Pe", name: "1 Pedro", bibleRefTitle: "1 Peter", bibleRefPath: "1-Peter" },
  { abbr: "2Pe", name: "2 Pedro", bibleRefTitle: "2 Peter", bibleRefPath: "2-Peter" },
  { abbr: "1Jo", name: "1 João", bibleRefTitle: "1 John", bibleRefPath: "1-John" },
  { abbr: "2Jo", name: "2 João", bibleRefTitle: "2 John", bibleRefPath: "2-John" },
  { abbr: "3Jo", name: "3 João", bibleRefTitle: "3 John", bibleRefPath: "3-John" },
  { abbr: "Jd", name: "Judas", bibleRefTitle: "Jude", bibleRefPath: "Jude" },
  { abbr: "Ap", name: "Apocalipse", bibleRefTitle: "Revelation", bibleRefPath: "Revelation" },
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
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (link) => stripTags(link))
      .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, content) => `\n# ${stripTags(content)}\n\n`)
      .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, content) => `\n## ${stripTags(content)}\n\n`)
      .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, content) => `\n### ${stripTags(content)}\n\n`)
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, content) => `**${stripTags(content)}**`)
      .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, content) => `*${stripTags(content)}*`)
      .replace(/<br\s*\/?\s*>/gi, "\n\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBetween(value: string, start: string | RegExp, end: string | RegExp) {
  const startMatch = typeof start === "string" ? value.indexOf(start) : value.search(start);
  if (startMatch === -1) return "";

  const afterStart = value.slice(startMatch);
  const endMatch = typeof end === "string" ? afterStart.indexOf(end) : afterStart.search(end);

  return endMatch === -1 ? afterStart : afterStart.slice(0, endMatch);
}

function resolveBibleRefBook(book: string) {
  const decodedBook = decodeURIComponent(book).trim();
  const exactAbbr = BIBLE_REF_BOOKS.find(
    (candidate) => candidate.abbr.toLowerCase() === decodedBook.toLowerCase(),
  );

  if (exactAbbr) return exactAbbr;

  const lookupKey = normalizeLookupKey(decodedBook);

  return BIBLE_REF_BOOKS.find((candidate) => {
    const aliases = [
      candidate.name,
      candidate.bibleRefTitle,
      candidate.bibleRefPath,
      candidate.verseSlug,
      ...(candidate.aliases ?? []),
    ].filter(Boolean) as string[];

    return aliases.some((alias) => normalizeLookupKey(alias) === lookupKey);
  });
}

function buildBibleRefUrl(book: BibleRefBookMapItem, chapter: number, verse: number) {
  const verseBookSlug = book.verseSlug ?? book.bibleRefPath;
  return `${BIBLE_REF_BASE_URL}/${book.bibleRefPath}/${chapter}/${verseBookSlug}-${chapter}-${verse}.html`;
}

function buildBibleRefChapterUrl(book: BibleRefBookMapItem, chapter: number) {
  return `${BIBLE_REF_BASE_URL}/${book.bibleRefPath}/${chapter}/${book.bibleRefPath}-chapter-${chapter}.html`;
}

function extractCommentaryMarkdown(html: string) {
  const commentarySection = extractBetween(
    html,
    '<div class="content-commentary" id="content-commentary">',
    '<div class="content-summary summary-book"',
  );
  const body = extractBetween(commentarySection, /<\/h1>/i, /<div class="expand"/i);

  return htmlToMarkdown(body);
}

function extractSummaryScriptUrls(html: string) {
  return Array.from(html.matchAll(/src="https:\/\/www\.bibleref\.com\/(summaries\/[^"]+\.js)"/g)).map(
    ([, path]) => `${BIBLE_REF_BASE_URL}/${path}`,
  );
}

function extractChapterContextSummaryScriptUrl(html: string) {
  const summarySection = extractBetween(
    html,
    /<div class="content-summary summary-chapter"[^>]*>/i,
    /<div class="expand"/i,
  );
  const match = summarySection.match(/src="https:\/\/www\.bibleref\.com\/(summaries\/[^"]+\.js)"/i);

  if (match?.[1]) return `${BIBLE_REF_BASE_URL}/${match[1]}`;

  return extractSummaryScriptUrls(html).find((summaryUrl) => /-\d+-context\.js$/i.test(summaryUrl)) ?? "";
}

function parseDocumentWriteHtml(script: string) {
  const match = script.match(/document\.write\("([\s\S]*)"\);?\s*$/);
  if (!match) return "";

  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1].replace(/\\"/g, '"').replace(/\\\//g, "/");
  }
}

function stripSummaryTitle(summary: string) {
  return summary
    .replace(/^\*\*(Context|Chapter) Summary\*\*\s*/i, "")
    .replace(/^\*\*Chapter Context\*\*\s*/i, "")
    .trim();
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
        "User-Agent": "Mozilla/5.0 BibleStudyContextBridge/1.0",
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

async function fetchSummaryMarkdown(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 BibleStudyContextBridge/1.0" },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) return "";

  const script = await response.text();
  return stripSummaryTitle(htmlToMarkdown(parseDocumentWriteHtml(script)));
}

async function validateLocalChapterReference(book: BibleRefBookMapItem, chapter: number) {
  const books = await BooksAndChapters.getBooks();
  const localBook = books.find(
    (candidate) => normalizeLookupKey(candidate.abbr) === normalizeLookupKey(book.abbr),
  );

  if (!localBook || chapter > localBook.numChapters) {
    throw new NotFoundError("Book or chapter not found.");
  }

  return localBook;
}

async function validateLocalReference(book: BibleRefBookMapItem, chapter: number, verse: number) {
  const localBook = await validateLocalChapterReference(book, chapter);
  const chapters = await BooksAndChapters.getChapters(localBook.abbr);
  const verseText = chapters.at(chapter - 1)?.at(verse - 1);

  if (!verseText) {
    throw new NotFoundError("Verse not found.");
  }
}

export class BibleRefContextService {
  public static isNotFound(error: unknown) {
    return error instanceof NotFoundError;
  }

  public static async getChapterContext(bookParam: string, chapter: number): Promise<BibleRefContext> {
    if (!bookParam || chapter < 1) {
      throw new NotFoundError("Invalid reference.");
    }

    const book = resolveBibleRefBook(bookParam);
    if (!book) throw new NotFoundError("Book not found.");

    await validateLocalChapterReference(book, chapter);

    const sourceUrl = buildBibleRefChapterUrl(book, chapter);
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 BibleStudyContextBridge/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (response.status === 404) {
      throw new NotFoundError("BibleRef chapter context not found.");
    }

    if (!response.ok) {
      throw new Error(`BibleRef returned ${response.status}`);
    }

    const html = await response.text();
    const chapterContextSummaryUrl = extractChapterContextSummaryScriptUrl(html);
    const chapterContext = chapterContextSummaryUrl
      ? await fetchSummaryMarkdown(chapterContextSummaryUrl)
      : "";

    if (!chapterContext) {
      throw new NotFoundError("BibleRef chapter context not found.");
    }

    const translatedChapterContext = await translateTextToPortuguese(chapterContext);
    const reference = `${book.name} ${chapter}`;
    const sections = [
      translatedChapterContext,
      `---\nReference [BibleRef.com](${sourceUrl}).`,
    ];

    return {
      reference,
      sourceUrl,
      markdown: sections.join("\n\n"),
    };
  }

  public static async getContext(bookParam: string, chapter: number, verse: number): Promise<BibleRefContext> {
    if (!bookParam || chapter < 1 || verse < 1) {
      throw new NotFoundError("Invalid reference.");
    }

    const book = resolveBibleRefBook(bookParam);
    if (!book) throw new NotFoundError("Book not found.");

    await validateLocalReference(book, chapter, verse);

    const sourceUrl = buildBibleRefUrl(book, chapter, verse);
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 BibleStudyContextBridge/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (response.status === 404) {
      throw new NotFoundError("BibleRef commentary not found.");
    }

    if (!response.ok) {
      throw new Error(`BibleRef returned ${response.status}`);
    }

    const html = await response.text();
    const commentary = extractCommentaryMarkdown(html);

    if (!commentary) {
      throw new NotFoundError("BibleRef commentary not found.");
    }

    const [contextSummary, chapterSummary] = await Promise.all(
      extractSummaryScriptUrls(html)
        .slice(0, 2)
        .map((summaryUrl) => fetchSummaryMarkdown(summaryUrl)),
    );

    const [translatedCommentary, translatedContextSummary, translatedChapterSummary] = await Promise.all([
      translateTextToPortuguese(commentary),
      contextSummary ? translateTextToPortuguese(contextSummary) : Promise.resolve(""),
      chapterSummary ? translateTextToPortuguese(chapterSummary) : Promise.resolve(""),
    ]);

    const reference = `${book.name} ${chapter}:${verse}`;
    const sections = [
      "## Comentário do versículo",
      translatedCommentary,
      translatedContextSummary ? `## Resumo do contexto\n\n${translatedContextSummary}` : "",
      translatedChapterSummary ? `## Resumo do capítulo\n\n${translatedChapterSummary}` : "",
      `---\nReference [BibleRef.com](${sourceUrl}).`,
    ].filter(Boolean);

    return {
      reference,
      sourceUrl,
      markdown: sections.join("\n\n"),
    };
  }
}
