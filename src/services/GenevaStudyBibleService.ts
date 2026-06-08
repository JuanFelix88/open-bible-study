import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { BibleVersions } from "@/definitions/BibleVersions";
import { Language } from "@/entities/Language";
import { postProcessTranslation } from "@/utils/TranslationPostProcessors";

type GenevaStudyBibleBookMapItem = {
  abbr: string;
  name: string;
  blbCode: string;
  aliases?: string[];
};

type GenevaStudyBibleCommentary = {
  reference: string;
  sourceUrl: string;
  markdown: string;
  language: Language;
};

type GenevaVerseContent = {
  anchor: string;
  verseMarkdown: string;
  argumentMarkdown: string;
  notesMarkdown: string[];
};

const BLUE_LETTER_BIBLE_BASE_URL = "https://www.blueletterbible.org";
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const REQUEST_TIMEOUT_MS = 5_000;
const TRANSLATE_CHUNK_SIZE = 1_400;
const DEFAULT_TARGET_LANGUAGE = Language.PT_BR;

const GENEVA_STUDY_BIBLE_BOOKS: GenevaStudyBibleBookMapItem[] = [
  { abbr: "Gn", name: "Gênesis", blbCode: "Gen", aliases: ["Genesis"] },
  { abbr: "Êx", name: "Êxodo", blbCode: "Exo", aliases: ["Ex", "Exodus"] },
  { abbr: "Lv", name: "Levítico", blbCode: "Lev", aliases: ["Leviticus"] },
  { abbr: "Nm", name: "Números", blbCode: "Num", aliases: ["Numbers"] },
  { abbr: "Dt", name: "Deuteronômio", blbCode: "Deu", aliases: ["Deuteronomy"] },
  { abbr: "Js", name: "Josué", blbCode: "Jos", aliases: ["Joshua"] },
  { abbr: "Jz", name: "Juízes", blbCode: "Jdg", aliases: ["Judges"] },
  { abbr: "Rt", name: "Rute", blbCode: "Rth", aliases: ["Ruth"] },
  { abbr: "1Sm", name: "1 Samuel", blbCode: "1Sa", aliases: ["1 Samuel"] },
  { abbr: "2Sm", name: "2 Samuel", blbCode: "2Sa", aliases: ["2 Samuel"] },
  { abbr: "1Rs", name: "1 Reis", blbCode: "1Ki", aliases: ["1 Kings"] },
  { abbr: "2Rs", name: "2 Reis", blbCode: "2Ki", aliases: ["2 Kings"] },
  { abbr: "1Cr", name: "1 Crônicas", blbCode: "1Ch", aliases: ["1 Chronicles"] },
  { abbr: "2Cr", name: "2 Crônicas", blbCode: "2Ch", aliases: ["2 Chronicles"] },
  { abbr: "Ed", name: "Esdras", blbCode: "Ezr", aliases: ["Ezra"] },
  { abbr: "Ne", name: "Neemias", blbCode: "Neh", aliases: ["Nehemiah"] },
  { abbr: "Et", name: "Ester", blbCode: "Est", aliases: ["Esther"] },
  { abbr: "Jó", name: "Jó", blbCode: "Job", aliases: ["Job"] },
  { abbr: "Sl", name: "Salmos", blbCode: "Psa", aliases: ["Psalm", "Psalms"] },
  { abbr: "Pv", name: "Provérbios", blbCode: "Pro", aliases: ["Proverbs"] },
  { abbr: "Ec", name: "Eclesiastes", blbCode: "Ecc", aliases: ["Ecclesiastes"] },
  { abbr: "Ct", name: "Cânticos", blbCode: "Sng", aliases: ["Cantares", "Song of Solomon", "Song of Songs"] },
  { abbr: "Is", name: "Isaías", blbCode: "Isa", aliases: ["Isaiah"] },
  { abbr: "Jr", name: "Jeremias", blbCode: "Jer", aliases: ["Jeremiah"] },
  { abbr: "Lm", name: "Lamentações de Jeremias", blbCode: "Lam", aliases: ["Lamentações", "Lamentations"] },
  { abbr: "Ez", name: "Ezequiel", blbCode: "Eze", aliases: ["Ezekiel"] },
  { abbr: "Dn", name: "Daniel", blbCode: "Dan", aliases: ["Daniel"] },
  { abbr: "Os", name: "Oséias", blbCode: "Hos", aliases: ["Oseias", "Hosea"] },
  { abbr: "Jl", name: "Joel", blbCode: "Joe", aliases: ["Joel"] },
  { abbr: "Am", name: "Amós", blbCode: "Amo", aliases: ["Amos"] },
  { abbr: "Ob", name: "Obadias", blbCode: "Oba", aliases: ["Obadiah"] },
  { abbr: "Jn", name: "Jonas", blbCode: "Jon", aliases: ["Jonah"] },
  { abbr: "Mq", name: "Miquéias", blbCode: "Mic", aliases: ["Micah"] },
  { abbr: "Na", name: "Naum", blbCode: "Nah", aliases: ["Nahum"] },
  { abbr: "Hc", name: "Habacuque", blbCode: "Hab", aliases: ["Habakkuk"] },
  { abbr: "Sf", name: "Sofonias", blbCode: "Zep", aliases: ["Zephaniah"] },
  { abbr: "Ag", name: "Ageu", blbCode: "Hag", aliases: ["Haggai"] },
  { abbr: "Zc", name: "Zacarias", blbCode: "Zec", aliases: ["Zechariah"] },
  { abbr: "Ml", name: "Malaquias", blbCode: "Mal", aliases: ["Malachi"] },
  { abbr: "Mt", name: "Mateus", blbCode: "Mat", aliases: ["Matthew"] },
  { abbr: "Mc", name: "Marcos", blbCode: "Mar", aliases: ["Mark"] },
  { abbr: "Lc", name: "Lucas", blbCode: "Luk", aliases: ["Luke"] },
  { abbr: "Jo", name: "João", blbCode: "Jhn", aliases: ["John"] },
  { abbr: "At", name: "Atos", blbCode: "Act", aliases: ["Acts"] },
  { abbr: "Rm", name: "Romanos", blbCode: "Rom", aliases: ["Romans"] },
  { abbr: "1Co", name: "1 Coríntios", blbCode: "1Co", aliases: ["1 Corinthians"] },
  { abbr: "2Co", name: "2 Coríntios", blbCode: "2Co", aliases: ["2 Corinthians"] },
  { abbr: "Gl", name: "Gálatas", blbCode: "Gal", aliases: ["Galatians"] },
  { abbr: "Ef", name: "Efésios", blbCode: "Eph", aliases: ["Ephesians"] },
  { abbr: "Fp", name: "Filipenses", blbCode: "Phl", aliases: ["Philippians"] },
  { abbr: "Cl", name: "Colossenses", blbCode: "Col", aliases: ["Colossians"] },
  { abbr: "1Ts", name: "1 Tessalonicenses", blbCode: "1Th", aliases: ["1 Thessalonians"] },
  { abbr: "2Ts", name: "2 Tessalonicenses", blbCode: "2Th", aliases: ["2 Thessalonians"] },
  { abbr: "1Tn", name: "1 Timóteo", blbCode: "1Ti", aliases: ["1Tm", "1 Timothy"] },
  { abbr: "2Tm", name: "2 Timóteo", blbCode: "2Ti", aliases: ["2 Timothy"] },
  { abbr: "Tt", name: "Tito", blbCode: "Tit", aliases: ["Titus"] },
  { abbr: "Fm", name: "Filemom", blbCode: "Phm", aliases: ["Philemon"] },
  { abbr: "Hb", name: "Hebreus", blbCode: "Heb", aliases: ["Hebrews"] },
  { abbr: "Tg", name: "Tiago", blbCode: "Jas", aliases: ["James"] },
  { abbr: "1Pe", name: "1 Pedro", blbCode: "1Pe", aliases: ["1 Peter"] },
  { abbr: "2Pe", name: "2 Pedro", blbCode: "2Pe", aliases: ["2 Peter"] },
  { abbr: "1Jo", name: "1 João", blbCode: "1Jo", aliases: ["1 John"] },
  { abbr: "2Jo", name: "2 João", blbCode: "2Jo", aliases: ["2 John"] },
  { abbr: "3Jo", name: "3 João", blbCode: "3Jo", aliases: ["3 John"] },
  { abbr: "Jd", name: "Judas", blbCode: "Jud", aliases: ["Jude"] },
  { abbr: "Ap", name: "Apocalipse", blbCode: "Rev", aliases: ["Revelation"] },
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
      .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (_, content) => stripTags(content))
      .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_, content) => `\n# ${stripTags(content)}\n\n`)
      .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_, content) => `\n## ${stripTags(content)}\n\n`)
      .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, content) => `\n### ${stripTags(content)}\n\n`)
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

function extractBetween(value: string, start: string | RegExp, end: string | RegExp) {
  const startMatch = typeof start === "string" ? value.indexOf(start) : value.search(start);
  if (startMatch === -1) return "";

  const afterStart = value.slice(startMatch);
  const endMatch = typeof end === "string" ? afterStart.indexOf(end) : afterStart.search(end);

  return endMatch === -1 ? afterStart : afterStart.slice(0, endMatch);
}

function getAttribute(value: string, attribute: string) {
  const match = value.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function resolveGenevaStudyBibleBook(book: string) {
  const decodedBook = decodeURIComponent(book).trim();
  const exactAbbr = GENEVA_STUDY_BIBLE_BOOKS.find(
    (candidate) => candidate.abbr.toLowerCase() === decodedBook.toLowerCase(),
  );

  if (exactAbbr) return exactAbbr;

  const lookupKey = normalizeLookupKey(decodedBook);

  return GENEVA_STUDY_BIBLE_BOOKS.find((candidate) => {
    const aliases = [
      candidate.name,
      candidate.blbCode,
      ...(candidate.aliases ?? []),
    ];

    return aliases.some((alias) => normalizeLookupKey(alias) === lookupKey);
  });
}

function resolveTargetLanguage(versionParam?: string | null) {
  if (!versionParam) return DEFAULT_TARGET_LANGUAGE;

  const decodedVersion = decodeURIComponent(versionParam).trim();
  const version = BibleVersions.versions.find(
    (candidate) => candidate.abbreviation.toLowerCase() === decodedVersion.toLowerCase(),
  );

  return version?.language ?? DEFAULT_TARGET_LANGUAGE;
}

function toGoogleTranslateLanguage(language: Language) {
  if (language === Language.PT_BR) return "pt";
  if (language === Language.GR) return "el";
  if (language === Language.HE) return "he";
  return language;
}

function buildGenevaStudyBibleUrl(book: GenevaStudyBibleBookMapItem, chapter: number) {
  return `${BLUE_LETTER_BIBLE_BASE_URL}/geneva-study-bible/notes/${book.blbCode.toLowerCase()}/chapter-${chapter}`;
}

function extractGenevaVerseContent(
  html: string,
  book: GenevaStudyBibleBookMapItem,
  chapter: number,
  verse: number,
): GenevaVerseContent | null {
  const notesData = extractBetween(
    html,
    '<div class="notesData">',
    '<h4>Geneva Footnotes Search</h4>',
  );

  if (!notesData) return null;

  const verseMatches = Array.from(
    notesData.matchAll(/<p\b[^>]*class="[^"]*\bverse-text\b[^"]*"[^>]*>[\s\S]*?<\/p>/gi),
  );
  const targetReference = `${book.blbCode} ${chapter}:${verse}`.toLowerCase();
  const verseMatchIndex = verseMatches.findIndex((match) => {
    const verseText = stripTags(match[0] ?? "").toLowerCase();
    return verseText === targetReference || verseText.startsWith(`${targetReference} `);
  });

  if (verseMatchIndex === -1) return null;

  const verseMatch = verseMatches[verseMatchIndex];
  const verseHtml = verseMatch[0] ?? "";
  const sectionStart = verseMatch.index ?? 0;
  const nextVerseMatch = verseMatches[verseMatchIndex + 1];
  const sectionEnd = nextVerseMatch?.index ?? notesData.length;
  const sectionHtml = notesData.slice(sectionStart, sectionEnd);
  const anchor = getAttribute(verseHtml, "id");
  const verseMarkdown = htmlToMarkdown(verseHtml);
  const argumentMarkdown = Array.from(
    sectionHtml.matchAll(/<p\b[^>]*class="[^"]*\bargument-text\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi),
  )
    .map((match) => htmlToMarkdown(match[0] ?? ""))
    .filter(Boolean)
    .join("\n\n");
  const notesMarkdown = Array.from(
    sectionHtml.matchAll(/<p\b[^>]*class="[^"]*\bnote-text\b[^"]*"[^>]*>[\s\S]*?<\/p>/gi),
  )
    .map((match) => htmlToMarkdown(match[0] ?? ""))
    .filter(Boolean);

  if (!verseMarkdown || (!argumentMarkdown && notesMarkdown.length === 0)) {
    return null;
  }

  return {
    anchor,
    verseMarkdown,
    argumentMarkdown,
    notesMarkdown,
  };
}

function normalizeMarkdownFootnoteSpacing(value: string) {
  return value.replace(/(\*\*\([^)]+\)\*\*)(?=\S)/g, "$1 ");
}

function cleanTranslatedMarkdown(value: string) {
  return value.replace(/^> ([^\n]+?) > /gm, "> $1 ");
}

function formatGenevaMarkdown(content: GenevaVerseContent) {
  return [
    "## Geneva verse text",
    `> ${normalizeMarkdownFootnoteSpacing(content.verseMarkdown)}`,
    content.argumentMarkdown
      ? `## Book argument\n\n${normalizeMarkdownFootnoteSpacing(content.argumentMarkdown)}`
      : "",
    content.notesMarkdown.length > 0
      ? `## Study notes\n\n${content.notesMarkdown.map(normalizeMarkdownFootnoteSpacing).join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
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

async function translateText(value: string, targetLanguage: Language) {
  if (targetLanguage === Language.EN) return value;

  const chunks = splitTranslationChunks(value);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", toGoogleTranslateLanguage(targetLanguage));
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", chunk);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 BibleStudyGenevaStudyBibleBridge/1.0",
      },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  return cleanTranslatedMarkdown(
    postProcessTranslation(targetLanguage, translatedChunks.join("\n\n").trim()),
  );
}

async function validateLocalReference(
  book: GenevaStudyBibleBookMapItem,
  chapter: number,
  verse: number,
) {
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

export class GenevaStudyBibleService {
  public static isNotFound(error: unknown) {
    return error instanceof NotFoundError;
  }

  public static async getCommentary(
    bookParam: string,
    chapter: number,
    verse: number,
    versionParam?: string | null,
  ): Promise<GenevaStudyBibleCommentary> {
    if (!bookParam || chapter < 1 || verse < 1) {
      throw new NotFoundError("Invalid reference.");
    }

    const book = resolveGenevaStudyBibleBook(bookParam);
    if (!book) throw new NotFoundError("Book not found.");

    await validateLocalReference(book, chapter, verse);

    const sourceUrl = buildGenevaStudyBibleUrl(book, chapter);
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 BibleStudyGenevaStudyBibleBridge/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 404) {
      throw new NotFoundError("Geneva Study Bible notes not found.");
    }

    if (!response.ok) {
      throw new Error(`Blue Letter Bible returned ${response.status}`);
    }

    const html = await response.text();
    const verseContent = extractGenevaVerseContent(html, book, chapter, verse);

    if (!verseContent) {
      throw new NotFoundError("Geneva Study Bible note not found for this verse.");
    }

    const targetLanguage = resolveTargetLanguage(versionParam);
    const translatedCommentary = await translateText(
      formatGenevaMarkdown(verseContent),
      targetLanguage,
    );
    const sourceWithAnchor = verseContent.anchor
      ? `${sourceUrl}#${verseContent.anchor}`
      : sourceUrl;
    const reference = `${book.name} ${chapter}:${verse}`;
    const markdown = [
      translatedCommentary,
      `---\nReference [BlueLetterBible.org](${sourceWithAnchor}).`,
    ].join("\n\n");

    return {
      reference,
      sourceUrl: sourceWithAnchor,
      markdown,
      language: targetLanguage,
    };
  }
}
