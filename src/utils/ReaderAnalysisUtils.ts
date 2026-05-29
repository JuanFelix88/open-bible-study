import { Verse } from "@/entities/Verse";

export type ReaderAnalysisUrlContext = {
  bookAbbr: string;
  version?: string | null;
  chapterNumber?: number | null;
  verseNumber?: number | null;
  referenceMessage?: string;
  referenceSource?: string;
  referenceWord?: string;
};

export type BuildSelectedWordUrlParams = {
  path: string;
  context: ReaderAnalysisUrlContext;
  word: string;
};

export type BuildRelatedAnalysisHrefParams = {
  path: string;
  current: ReaderAnalysisUrlContext;
  relatedVerse: Verse;
  selectedToken: string;
};

export class ReaderAnalysisUtils {
  static readonly INITIAL_RELATED_VERSES_COUNT = 5;
  static readonly RELATED_VERSES_FETCH_COUNT = 50;
  static readonly SELECTED_WORD_PARAM = "selectedWord";
  static readonly REFERENCE_MESSAGE_PARAM = "referenceMessage";
  static readonly REFERENCE_SOURCE_PARAM = "referenceSource";
  static readonly REFERENCE_WORD_PARAM = "referenceWord";

  static getNormalizedTokens(value: string): string[] {
    return (
      value
        .normalize("NFD")
        .replace(/\p{Mark}/gu, "")
        .toLowerCase()
        .match(/[\p{Letter}\p{Number}]+/gu) ?? []
    );
  }

  static tokenMatchesWord(token: string, word: string): boolean {
    const tokenParts = ReaderAnalysisUtils.getNormalizedTokens(token);
    const wordParts = ReaderAnalysisUtils.getNormalizedTokens(word);

    if (wordParts.length === 0) return false;
    return wordParts.every((part) => tokenParts.includes(part));
  }

  static random(init: number, end: number): number {
    return Math.floor(Math.random() * (end - init + 1)) + init;
  }

  static buildSelectedWordUrl({
    path,
    context,
    word,
  }: BuildSelectedWordUrlParams): string {
    const params = new URLSearchParams();

    params.set("book", context.bookAbbr);
    params.set("version", context.version ?? "");
    params.set("chapter", context.chapterNumber?.toString() ?? "");
    params.set("verse", context.verseNumber?.toString() ?? "");

    if (word.trim()) {
      params.set(ReaderAnalysisUtils.SELECTED_WORD_PARAM, word.trim());
    }
    if (context.referenceMessage) {
      params.set(
        ReaderAnalysisUtils.REFERENCE_MESSAGE_PARAM,
        context.referenceMessage,
      );
    }
    if (context.referenceSource) {
      params.set(ReaderAnalysisUtils.REFERENCE_SOURCE_PARAM, context.referenceSource);
    }
    if (context.referenceWord) {
      params.set(ReaderAnalysisUtils.REFERENCE_WORD_PARAM, context.referenceWord);
    }

    return `${path}?${params.toString()}`;
  }

  static buildRelatedAnalysisHref({
    path,
    current,
    relatedVerse,
    selectedToken,
  }: BuildRelatedAnalysisHrefParams): string {
    const params = new URLSearchParams();
    const sourceReference = `${current.bookAbbr} ${current.chapterNumber}:${current.verseNumber}`;

    params.set("version", current.version || relatedVerse.version);
    params.set("book", relatedVerse.bookAbbr);
    params.set("chapter", relatedVerse.chapter.toString());
    params.set("verse", relatedVerse.verse.toString());
    params.set(ReaderAnalysisUtils.SELECTED_WORD_PARAM, selectedToken);
    params.set(ReaderAnalysisUtils.REFERENCE_SOURCE_PARAM, sourceReference);
    params.set(ReaderAnalysisUtils.REFERENCE_WORD_PARAM, selectedToken);
    params.set(
      ReaderAnalysisUtils.REFERENCE_MESSAGE_PARAM,
      `Previously in ${sourceReference}, reference for ${selectedToken}`,
    );

    return `${path}?${params.toString()}`;
  }

  static getVisibleRelatedVerses(
    relatedVerses: Verse[],
    showAllRelatedVerses: boolean,
  ): Verse[] {
    return showAllRelatedVerses
      ? relatedVerses
      : relatedVerses.slice(0, ReaderAnalysisUtils.INITIAL_RELATED_VERSES_COUNT);
  }

  static hasMoreRelatedVerses(relatedVerses: Verse[]): boolean {
    return relatedVerses.length > ReaderAnalysisUtils.INITIAL_RELATED_VERSES_COUNT;
  }

  static getRemainingText(
    selectedVerseText: string | null | undefined,
    streamTokens: { token: string }[],
  ): string {
    if (!selectedVerseText || streamTokens.length === 0) {
      return selectedVerseText ?? "";
    }

    const loadedText = streamTokens.map((t) => t.token).join(" ");
    if (selectedVerseText.startsWith(loadedText)) {
      return selectedVerseText.slice(loadedText.length).trimStart();
    }

    const lastToken = streamTokens[streamTokens.length - 1].token;
    const lastIdx = selectedVerseText
      .toLowerCase()
      .lastIndexOf(lastToken.toLowerCase());

    if (lastIdx !== -1) {
      return selectedVerseText.slice(lastIdx + lastToken.length).trimStart();
    }

    return "";
  }
}
