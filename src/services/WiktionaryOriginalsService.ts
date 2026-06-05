import { Language } from "@/entities/Language";
import {
  OriginalLexicalEntrySummary,
  OriginalLexicalInsight,
  OriginalLexicalMorphologyItem,
  OriginalLexicalSemanticType,
  OriginalTranslatorToken,
} from "@/entities/OriginalsTranslator";
import {
  mapWithConcurrency,
  translatePlainText,
} from "@/services/GoogleTranslateOriginalsService";

const WIKTIONARY_API_URL = "https://en.wiktionary.org/w/api.php";
const WIKTIONARY_PAGE_URL = "https://en.wiktionary.org/wiki";
const REVALIDATE_SECONDS = 60 * 60 * 24 * 30;
const WIKTIONARY_CONCURRENCY = 1;
const MAX_DEFINITIONS = 5;
const WIKTIONARY_REQUEST_INTERVAL_MS = 180;
const WIKTIONARY_RETRY_DELAYS_MS = [750, 1_500, 3_000];

const POS_HEADINGS = [
  "Noun",
  "Proper noun",
  "Verb",
  "Adjective",
  "Adverb",
  "Pronoun",
  "Preposition",
  "Conjunction",
  "Article",
  "Particle",
  "Numeral",
  "Participle",
  "Interjection",
  "Determiner",
  "Letter",
  "Prefix",
  "Suffix",
  "Symbol",
  "Phrase",
] as const;

const POS_PATTERN = POS_HEADINGS.map((heading) =>
  heading.replace(/ /g, "\\s+"),
).join("|");

const MORPHOLOGY_LABELS: Record<string, string> = {
  "1": "first-person",
  "2": "second-person",
  "3": "third-person",
  s: "singular",
  d: "dual",
  p: "plural",
  m: "masculine",
  f: "feminine",
  n: "neuter",
  c: "common gender",
  nom: "nominative",
  gen: "genitive",
  dat: "dative",
  acc: "accusative",
  voc: "vocative",
  aor: "aorist",
  pres: "present",
  impf: "imperfect",
  fut: "future",
  perf: "perfect",
  plup: "pluperfect",
  actv: "active voice",
  mid: "middle voice",
  pass: "passive voice",
  mp: "middle/passive voice",
  indc: "indicative mood",
  subj: "subjunctive mood",
  opt: "optative mood",
  impr: "imperative mood",
  inf: "infinitive",
  part: "participle",
  comp: "comparative",
  super: "superlative",
};

const PT_BR_MORPHOLOGY_LABELS: Record<string, string> = {
  "1": "primeira pessoa",
  "2": "segunda pessoa",
  "3": "terceira pessoa",
  s: "singular",
  d: "dual",
  p: "plural",
  m: "masculino",
  f: "feminino",
  n: "neutro",
  c: "gênero comum",
  nom: "nominativo",
  gen: "genitivo",
  dat: "dativo",
  acc: "acusativo",
  voc: "vocativo",
  aor: "aoristo",
  pres: "presente",
  impf: "imperfeito",
  fut: "futuro",
  perf: "perfeito",
  plup: "mais-que-perfeito",
  actv: "voz ativa",
  mid: "voz média",
  pass: "voz passiva",
  mp: "voz média/passiva",
  indc: "modo indicativo",
  subj: "modo subjuntivo",
  opt: "modo optativo",
  impr: "modo imperativo",
  inf: "infinitivo",
  part: "particípio",
  comp: "comparativo",
  super: "superlativo",
};

const wiktionaryCache = new Map<string, Promise<OriginalLexicalInsight>>();
let nextWiktionaryRequestAt = 0;

interface WiktionaryPage {
  title: string;
  missing?: string;
  revisions?: Array<{
    slots?: {
      main?: {
        "*"?: string;
      };
    };
  }>;
  extract?: string;
}

interface WiktionarySearchItem {
  title: string;
}

interface ParsedWiktionaryEntry {
  title: string;
  url: string;
  partOfSpeech?: string;
  semanticType?: OriginalLexicalSemanticType;
  transliteration?: string;
  definitions: string[];
  etymology?: string;
  lemmaTitle?: string;
  morphology: OriginalLexicalMorphologyItem[];
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{Mark}/gu, "").toLowerCase();
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildWiktionaryUrl(title: string): string {
  return `${WIKTIONARY_PAGE_URL}/${encodeURIComponent(title)}`;
}

function getWiktionaryLanguageName(language: Language): string | null {
  const languageMap: Partial<Record<Language, string>> = {
    [Language.GR]: "Ancient Greek",
    [Language.HE]: "Hebrew",
    [Language.EN]: "English",
    [Language.PT_BR]: "Portuguese",
  };

  return languageMap[language] ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleWiktionaryRequest() {
  const now = Date.now();
  const waitMs = Math.max(0, nextWiktionaryRequestAt - now);
  nextWiktionaryRequestAt = Math.max(now, nextWiktionaryRequestAt) +
    WIKTIONARY_REQUEST_INTERVAL_MS;

  if (waitMs > 0) await wait(waitMs);
}

async function wiktionaryApi(params: Record<string, string>): Promise<unknown> {
  const url = new URL(WIKTIONARY_API_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  for (let attempt = 0; attempt <= WIKTIONARY_RETRY_DELAYS_MS.length; attempt += 1) {
    await throttleWiktionaryRequest();

    const response = await fetch(url, {
      headers: { "User-Agent": "BibleStudyOriginalsWiktionary/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (response.ok) return response.json();

    const shouldRetry = response.status === 429 || response.status >= 500;
    const retryDelay = WIKTIONARY_RETRY_DELAYS_MS.at(attempt);
    if (!shouldRetry || retryDelay === undefined) {
      throw new Error(`Wiktionary returned ${response.status}`);
    }

    await wait(retryDelay);
  }

  throw new Error("Wiktionary request failed.");
}

function getFirstPage(data: unknown): WiktionaryPage | null {
  const root = asRecord(data);
  const query = asRecord(root?.query);
  const pages = asRecord(query?.pages);
  if (!pages) return null;

  const [page] = Object.values(pages) as WiktionaryPage[];
  return page ?? null;
}

async function fetchPage(title: string): Promise<WiktionaryPage | null> {
  const data = await wiktionaryApi({
    action: "query",
    format: "json",
    prop: "revisions|extracts",
    rvprop: "content",
    rvslots: "main",
    explaintext: "1",
    titles: title,
  });

  return getFirstPage(data);
}

async function searchWiktionaryTitle(query: string): Promise<string | null> {
  const data = await wiktionaryApi({
    action: "query",
    format: "json",
    list: "search",
    srsearch: query,
    srlimit: "10",
  });
  const root = asRecord(data);
  const queryRecord = asRecord(root?.query);
  const search = queryRecord?.search;
  if (!Array.isArray(search)) return null;

  const normalizedQuery = stripDiacritics(query);
  const results = search as WiktionarySearchItem[];
  const exactMatch = results.find(
    (item) => stripDiacritics(item.title) === normalizedQuery,
  );

  return exactMatch?.title ?? results.at(0)?.title ?? null;
}

function cleanTemplate(value: string): string {
  return value
    .replace(/\{\{grc-movable nu\}\}/g, "with movable nu")
    .replace(/\{\{inflection of\|grc\|([^|}]+)\|\|([^}]+)\}\}/g, (_, lemma, tags) => {
      const labels = String(tags)
        .split("|")
        .map((tag) => MORPHOLOGY_LABELS[tag] ?? tag)
        .join(" ");
      return `${labels} of ${lemma}`;
    })
    .replace(/\{\{lb\|[^|}]+\|([^}]+)\}\}/g, (_, tags) =>
      `(${String(tags)
        .split("|")
        .map((tag) => tag.replace(/_/g, " "))
        .join(", ")})`,
    )
    .replace(/\{\{m\|[^|}]+\|([^|}]+)(?:\|\|([^}]+))?\}\}/g, (_, term, gloss) =>
      gloss ? `${term} (“${gloss}”)` : term,
    )
    .replace(/\{\{cog\|[^|}]+\|([^|}]+)(?:\|[^}]*)?\}\}/g, "$1")
    .replace(/\{\{inh\|[^|}]+\|[^|}]+\|([^|}]+)(?:\|\|([^}]+))?\}\}/g, (_, term, gloss) =>
      gloss ? `${term} (“${gloss}”)` : term,
    )
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/'{2,}/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function cleanWikiLine(value: string): string {
  return normalizeSpaces(cleanTemplate(value));
}

function extractLanguageSection(wikitext: string, languageName: string | null): string {
  if (!languageName) return wikitext;

  const heading = `==${languageName}==`;
  const startIndex = wikitext.indexOf(heading);
  if (startIndex === -1) return wikitext;

  const sectionStart = startIndex + heading.length;
  const nextLanguageIndex = wikitext.slice(sectionStart).search(/^==[^=].*==\s*$/m);
  if (nextLanguageIndex === -1) return wikitext.slice(sectionStart);

  return wikitext.slice(sectionStart, sectionStart + nextLanguageIndex);
}

function extractSectionByHeading(
  wikitext: string,
  level: number,
  headingPattern: string,
): { heading: string; body: string } | null {
  const equals = "=".repeat(level);
  const regex = new RegExp(
    `^${equals}\\s*(${headingPattern})\\s*${equals}\\s*$`,
    "im",
  );
  const match = wikitext.match(regex);
  if (!match || match.index === undefined) return null;

  const bodyStart = match.index + match[0].length;
  const nextSectionRegex = new RegExp(`^${equals}[^=].*${equals}\\s*$`, "im");
  const nextMatch = wikitext.slice(bodyStart).match(nextSectionRegex);
  const bodyEnd = nextMatch?.index === undefined ? wikitext.length : bodyStart + nextMatch.index;

  return {
    heading: normalizeSpaces(match[1]),
    body: wikitext.slice(bodyStart, bodyEnd),
  };
}

function extractEtymology(languageSection: string): string | undefined {
  const etymologySection = extractSectionByHeading(languageSection, 3, "Etymology(?:\\s+\\d+)?");
  if (!etymologySection) return undefined;

  const lines = etymologySection.body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("{{R:") && !line.startsWith("*"));

  const etymology = cleanWikiLine(lines.join(" "));
  return etymology || undefined;
}

function extractDefinitions(posSection: string): string[] {
  return Array.from(posSection.matchAll(/^#(?![#*:])\s+(.+)$/gm))
    .map((match) => cleanWikiLine(match[1]))
    .filter(Boolean)
    .slice(0, MAX_DEFINITIONS);
}

function extractTransliteration(title: string, extract?: string): string | undefined {
  if (!extract) return undefined;

  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedTitle}\\s*[•·-]?\\s*\\(([^)]+)\\)`, "u");
  const match = extract.match(regex);
  return match?.[1]?.trim() || undefined;
}

function extractInflection(wikitext: string): {
  lemmaTitle?: string;
  morphology: OriginalLexicalMorphologyItem[];
} {
  const inflectionMatch = wikitext.match(/\{\{inflection of\|[^|}]+\|([^|}]+)\|\|([^}]+)\}\}/);
  if (!inflectionMatch) return { morphology: [] };

  const tags = inflectionMatch[2]
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    lemmaTitle: inflectionMatch[1].trim(),
    morphology: tags.map((tag) => ({
      code: tag,
      label: MORPHOLOGY_LABELS[tag] ?? tag.replace(/_/g, " "),
    })),
  };
}

function inferSemanticType(
  partOfSpeech: string | undefined,
  definitions: string[],
): OriginalLexicalSemanticType | undefined {
  const normalizedPartOfSpeech = partOfSpeech?.toLowerCase();
  if (
    normalizedPartOfSpeech &&
    normalizedPartOfSpeech !== "noun" &&
    normalizedPartOfSpeech !== "proper noun"
  ) {
    return "word";
  }

  const text = definitions.join(" ").toLowerCase();

  if (/\b(city|town|village|country|region|river|mountain|island|place|location|land|territory|kingdom)\b/.test(text)) {
    return "place";
  }

  if (/\b(person|man|woman|king|queen|prophet|apostle|disciple|god|goddess|angel|name)\b/.test(text)) {
    return "person";
  }

  if (normalizedPartOfSpeech === "proper noun") return "entity";
  if (normalizedPartOfSpeech === "noun") return "concept";
  if (partOfSpeech) return "word";

  return undefined;
}

function parseWiktionaryPage({
  page,
  language,
}: {
  page: WiktionaryPage;
  language: Language;
}): ParsedWiktionaryEntry {
  const wikitext = page.revisions?.at(0)?.slots?.main?.["*"] ?? "";
  const languageSection = extractLanguageSection(
    wikitext,
    getWiktionaryLanguageName(language),
  );
  const posSection = extractSectionByHeading(languageSection, 3, POS_PATTERN);
  const partOfSpeech = posSection?.heading;
  const sectionBody = posSection?.body ?? languageSection;
  const definitions = extractDefinitions(sectionBody);
  const { lemmaTitle, morphology } = extractInflection(sectionBody);
  const etymology = extractEtymology(languageSection);

  return {
    title: page.title,
    url: buildWiktionaryUrl(page.title),
    partOfSpeech,
    semanticType: inferSemanticType(partOfSpeech, definitions),
    transliteration: extractTransliteration(page.title, page.extract),
    definitions,
    etymology,
    lemmaTitle,
    morphology,
  };
}

async function translateMany(
  values: string[],
  targetLanguage: string,
): Promise<string[] | undefined> {
  const normalizedTarget = targetLanguage.trim().toLowerCase();
  if (!values.length || normalizedTarget === "en") return undefined;

  const translations = await mapWithConcurrency(values, WIKTIONARY_CONCURRENCY, (value) =>
    translatePlainText({ text: value, sourceLanguage: "en", targetLanguage }),
  );

  return translations;
}

async function translatedLabel(
  value: string | undefined,
  targetLanguage: string,
): Promise<string | undefined> {
  if (!value || targetLanguage.trim().toLowerCase() === "en") return undefined;
  return translatePlainText({ text: value, sourceLanguage: "en", targetLanguage });
}

async function enrichEntrySummary(
  entry: ParsedWiktionaryEntry,
  targetLanguage: string,
): Promise<OriginalLexicalEntrySummary> {
  const [
    translatedPartOfSpeech,
    translatedSemanticType,
    translatedDefinitions,
    translatedEtymology,
  ] = await Promise.all([
    translatedLabel(entry.partOfSpeech, targetLanguage),
    translatedLabel(entry.semanticType, targetLanguage),
    translateMany(entry.definitions, targetLanguage),
    entry.etymology
      ? translatedLabel(entry.etymology, targetLanguage)
      : Promise.resolve(undefined),
  ]);

  return {
    title: entry.title,
    url: entry.url,
    partOfSpeech: entry.partOfSpeech,
    translatedPartOfSpeech,
    semanticType: entry.semanticType,
    translatedSemanticType,
    transliteration: entry.transliteration,
    definitions: entry.definitions,
    translatedDefinitions,
    etymology: entry.etymology,
    translatedEtymology,
  };
}

function getLocalMorphologyTranslation(
  code: string,
  targetLanguage: string,
): string | undefined {
  const normalizedTarget = targetLanguage.trim().toLowerCase();
  if (normalizedTarget === "pt" || normalizedTarget === "pt-br") {
    return PT_BR_MORPHOLOGY_LABELS[code];
  }

  return undefined;
}

async function enrichMorphology(
  morphology: OriginalLexicalMorphologyItem[],
  targetLanguage: string,
): Promise<OriginalLexicalMorphologyItem[]> {
  const labelsToTranslate = morphology.map((item) =>
    getLocalMorphologyTranslation(item.code, targetLanguage) ? "" : item.label,
  );
  const translatedLabels = await translateMany(
    labelsToTranslate.filter(Boolean),
    targetLanguage,
  );
  let translatedIndex = 0;

  return morphology.map((item) => {
    const localTranslation = getLocalMorphologyTranslation(item.code, targetLanguage);
    const translatedLabel = localTranslation ?? translatedLabels?.[translatedIndex];

    if (!localTranslation) translatedIndex += 1;

    return {
      ...item,
      translatedLabel,
    };
  });
}

function hasMeaningfulEntry(entry: ParsedWiktionaryEntry): boolean {
  return Boolean(
    entry.partOfSpeech ||
      entry.definitions.length > 0 ||
      entry.lemmaTitle ||
      entry.morphology.length > 0 ||
      entry.etymology,
  );
}

async function resolveWiktionaryPage({
  token,
  language,
}: {
  token: string;
  language: Language;
}): Promise<{ page: WiktionaryPage; parsedEntry: ParsedWiktionaryEntry; resolvedFromSearch: boolean } | null> {
  const exactPage = await fetchPage(token);

  if (exactPage && !exactPage.missing) {
    const exactParsedEntry = parseWiktionaryPage({ page: exactPage, language });
    if (hasMeaningfulEntry(exactParsedEntry)) {
      return {
        page: exactPage,
        parsedEntry: exactParsedEntry,
        resolvedFromSearch: false,
      };
    }
  }

  const searchTitle = await searchWiktionaryTitle(token);
  if (!searchTitle) return null;

  const searchPage = await fetchPage(searchTitle);
  if (!searchPage || searchPage.missing) return null;

  return {
    page: searchPage,
    parsedEntry: parseWiktionaryPage({ page: searchPage, language }),
    resolvedFromSearch: true,
  };
}

async function lookupWiktionaryToken({
  token,
  language,
  targetLanguage,
}: {
  token: string;
  language: Language;
  targetLanguage: string;
}): Promise<OriginalLexicalInsight> {
  const resolvedPage = await resolveWiktionaryPage({ token, language });

  if (!resolvedPage) {
    return {
      found: false,
      query: token,
      title: token,
      url: buildWiktionaryUrl(token),
      definitions: [],
      morphology: [],
    };
  }

  const { parsedEntry, resolvedFromSearch } = resolvedPage;
  const [entrySummary, morphology] = await Promise.all([
    enrichEntrySummary(parsedEntry, targetLanguage),
    enrichMorphology(parsedEntry.morphology, targetLanguage),
  ]);

  let lemma: OriginalLexicalEntrySummary | undefined;
  if (parsedEntry.lemmaTitle && parsedEntry.lemmaTitle !== parsedEntry.title) {
    const lemmaPage = await fetchPage(parsedEntry.lemmaTitle);
    if (lemmaPage && !lemmaPage.missing) {
      const parsedLemma = parseWiktionaryPage({ page: lemmaPage, language });
      lemma = await enrichEntrySummary(parsedLemma, targetLanguage);
    }
  }

  return {
    ...entrySummary,
    found: true,
    query: token,
    resolvedFromSearch,
    morphology,
    lemma,
  };
}

export async function enrichOriginalTokensWithWiktionary({
  tokens,
  language,
  targetLanguage = "pt-BR",
}: {
  tokens: OriginalTranslatorToken[];
  language: Language;
  targetLanguage?: string;
}): Promise<OriginalTranslatorToken[]> {
  return mapWithConcurrency(tokens, WIKTIONARY_CONCURRENCY, async (token) => {
    const cacheKey = `${language}:${targetLanguage}:${token.token}`;

    try {
      let request = wiktionaryCache.get(cacheKey);
      if (!request) {
        request = lookupWiktionaryToken({
          token: token.token,
          language,
          targetLanguage,
        });
        wiktionaryCache.set(cacheKey, request);
      }

      return {
        ...token,
        lexical: await request,
      };
    } catch (error) {
      wiktionaryCache.delete(cacheKey);
      return {
        ...token,
        lexical: {
          found: false,
          query: token.token,
          title: token.token,
          url: buildWiktionaryUrl(token.token),
          definitions: [],
          morphology: [],
          error: (error as Error)?.message ?? "Unable to fetch Wiktionary data.",
        },
      };
    }
  });
}
