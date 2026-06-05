import { Language } from "@/entities/Language";
import {
  OriginalTokenTranslationOption,
  OriginalTranslatorToken,
} from "@/entities/OriginalsTranslator";

const REVALIDATE_SECONDS = 60 * 60 * 24 * 30;
const TRANSLATION_CONCURRENCY = 5;
const GOOGLE_TRANSLATE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";

const translationCache = new Map<string, Promise<OriginalTranslatorToken>>();

function getGoogleSourceLanguage(language: Language): string {
  const languageMap: Partial<Record<Language, string>> = {
    [Language.HE]: "he",
    [Language.GR]: "el",
    [Language.EN]: "en",
    [Language.PT_BR]: "pt",
  };

  return languageMap[language] ?? "auto";
}

function getGoogleTargetLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (normalized === "pt-br" || normalized === "pt_br") return "pt";
  return normalized || "pt";
}

export function tokenizeOriginalVerse(value: string): string[] {
  return (
    value.match(/[\p{Letter}\p{Mark}\p{Number}\u05BE'’.-]+/gu)?.filter((token) =>
      /[\p{Letter}\p{Number}]/u.test(token),
    ) ?? []
  );
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTranslation(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function addTranslation(
  translations: OriginalTokenTranslationOption[],
  seen: Set<string>,
  text: unknown,
  source: OriginalTokenTranslationOption["source"],
  partOfSpeech?: string,
) {
  const stringValue = asString(text);
  if (!stringValue) return;

  const normalizedText = normalizeTranslation(stringValue);
  const seenKey = normalizedText.toLocaleLowerCase("pt-BR");
  if (seen.has(seenKey)) return;

  seen.add(seenKey);
  translations.push({ text: normalizedText, source, partOfSpeech });
}

function extractTransliteration(data: unknown): string | undefined {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return undefined;

  for (const sentence of data[0]) {
    if (!Array.isArray(sentence)) continue;
    const transliteration = asString(sentence[3]);
    if (transliteration) return transliteration;
  }

  return undefined;
}

function extractTranslations(data: unknown): OriginalTokenTranslationOption[] {
  const translations: OriginalTokenTranslationOption[] = [];
  const seen = new Set<string>();

  if (!Array.isArray(data)) return translations;

  const sentenceTranslations = data[0];
  if (Array.isArray(sentenceTranslations)) {
    for (const sentence of sentenceTranslations) {
      if (!Array.isArray(sentence)) continue;
      addTranslation(translations, seen, sentence[0], "direct");
    }
  }

  const dictionaryEntries = data[1];
  if (Array.isArray(dictionaryEntries)) {
    for (const entry of dictionaryEntries) {
      if (!Array.isArray(entry)) continue;

      const partOfSpeech = asString(entry[0]) ?? undefined;
      const entryTranslations = entry[1];
      if (!Array.isArray(entryTranslations)) continue;

      for (const translation of entryTranslations) {
        addTranslation(translations, seen, translation, "dictionary", partOfSpeech);
      }
    }
  }

  const alternativeEntries = data[5];
  if (Array.isArray(alternativeEntries)) {
    for (const alternativeEntry of alternativeEntries) {
      if (!Array.isArray(alternativeEntry)) continue;

      const alternatives = alternativeEntry[2];
      if (!Array.isArray(alternatives)) continue;

      for (const alternative of alternatives) {
        if (!Array.isArray(alternative)) continue;
        addTranslation(translations, seen, alternative[0], "alternative");
      }
    }
  }

  return translations;
}

async function translateToken({
  token,
  tokenIndex,
  sourceLanguage,
  targetLanguage,
}: {
  token: string;
  tokenIndex: number;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<OriginalTranslatorToken> {
  const url = new URL(GOOGLE_TRANSLATE_ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", sourceLanguage);
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.append("dt", "t");
  url.searchParams.append("dt", "bd");
  url.searchParams.append("dt", "at");
  url.searchParams.append("dt", "rm");
  url.searchParams.set("q", token);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 BibleStudyOriginalsTranslator/1.0",
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Google Translate returned ${response.status}`);
  }

  const data = (await response.json()) as unknown;

  return {
    token_index: tokenIndex,
    token,
    transliteration: extractTransliteration(data),
    translations: extractTranslations(data),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

export async function translateOriginalTokens({
  tokens,
  sourceLanguage,
  targetLanguage = "pt-BR",
}: {
  tokens: string[];
  sourceLanguage: Language;
  targetLanguage?: string;
}): Promise<OriginalTranslatorToken[]> {
  const googleSourceLanguage = getGoogleSourceLanguage(sourceLanguage);
  const googleTargetLanguage = getGoogleTargetLanguage(targetLanguage);

  return mapWithConcurrency(tokens, TRANSLATION_CONCURRENCY, async (token, index) => {
    const cacheKey = `${googleSourceLanguage}:${googleTargetLanguage}:${token}`;

    try {
      let request = translationCache.get(cacheKey);
      if (!request) {
        request = translateToken({
          token,
          tokenIndex: index,
          sourceLanguage: googleSourceLanguage,
          targetLanguage: googleTargetLanguage,
        });
        translationCache.set(cacheKey, request);
      }

      const translated = await request;
      return {
        ...translated,
        token_index: index,
      };
    } catch (error) {
      translationCache.delete(cacheKey);
      return {
        token_index: index,
        token,
        translations: [],
        error: (error as Error)?.message ?? "Unable to translate token.",
      };
    }
  });
}
