"use client";

import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import LinkIcon from "@/app/components/icons/LinkIcon";
import LoadingIcon from "@/app/components/icons/LoadingIcon";
import { Chapter } from "@/entities/Chapter";
import { Language } from "@/entities/Language";
import {
  OriginalLexicalEntrySummary,
  OriginalTokenTranslationOption,
  OriginalTranslatorResponse,
  OriginalTranslatorToken,
} from "@/entities/OriginalsTranslator";
import { Verse } from "@/entities/Verse";
import { Params } from "@/utils/Params";
import { ReaderAnalysisUtils } from "@/utils/ReaderAnalysisUtils";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

interface TranslationTemplate {
  tokenLabel: string;
  optionsLabel: string;
  transliterationLabel: string;
  noOptions: string;
  loadingRelated: string;
  direction: "ltr" | "rtl";
  renderSummary: (token: string, count: number) => string;
}

const DEFAULT_TEMPLATE: TranslationTemplate = {
  tokenLabel: "Original token",
  optionsLabel: "Portuguese translation options",
  transliterationLabel: "Transliteration",
  noOptions: "Google Translate did not return translation options for this token.",
  loadingRelated: "Looking for verses with this word...",
  direction: "ltr",
  renderSummary: (token, count) =>
    count === 1
      ? `The original token ${token} has 1 translation option.`
      : `The original token ${token} has ${count} translation options.`,
};

const TRANSLATION_TEMPLATES: Partial<Record<Language, TranslationTemplate>> = {
  [Language.HE]: {
    tokenLabel: "Hebrew word/token",
    optionsLabel: "Possible translations in Portuguese",
    transliterationLabel: "Transliteration",
    noOptions: "Google Translate did not return Hebrew translation alternatives for this token.",
    loadingRelated: "Looking for other Hebrew verses with this word...",
    direction: "rtl",
    renderSummary: (token, count) =>
      count === 1
        ? `A palavra hebraica ${token} retornou 1 opção de tradução.`
        : `A palavra hebraica ${token} retornou ${count} opções de tradução.`,
  },
  [Language.GR]: {
    tokenLabel: "Greek word/token",
    optionsLabel: "Possible translations in Portuguese",
    transliterationLabel: "Transliteration",
    noOptions: "Google Translate did not return Greek translation alternatives for this token.",
    loadingRelated: "Looking for other Greek verses with this word...",
    direction: "ltr",
    renderSummary: (token, count) =>
      count === 1
        ? `A palavra grega ${token} retornou 1 opção de tradução.`
        : `A palavra grega ${token} retornou ${count} opções de tradução.`,
  },
  [Language.EN]: DEFAULT_TEMPLATE,
  [Language.PT_BR]: {
    ...DEFAULT_TEMPLATE,
    tokenLabel: "Palavra/token",
    optionsLabel: "Opções de tradução",
    noOptions: "Google Translate não retornou alternativas para este token.",
  },
};

const SOURCE_LABELS: Record<OriginalTokenTranslationOption["source"], string> = {
  direct: "direct",
  dictionary: "dictionary",
  alternative: "alternative",
};

const {
  INITIAL_RELATED_VERSES_COUNT,
  RELATED_VERSES_FETCH_COUNT,
  SELECTED_WORD_PARAM,
  REFERENCE_MESSAGE_PARAM,
  REFERENCE_SOURCE_PARAM,
  REFERENCE_WORD_PARAM,
} = ReaderAnalysisUtils;

function getTemplate(language?: Language): TranslationTemplate {
  if (!language) return DEFAULT_TEMPLATE;
  return TRANSLATION_TEMPLATES[language] ?? DEFAULT_TEMPLATE;
}

function getTokenDirection(language?: Language) {
  return getTemplate(language).direction;
}

function buildOptionMeta(option: OriginalTokenTranslationOption) {
  return [SOURCE_LABELS[option.source], option.partOfSpeech]
    .filter(Boolean)
    .join(" · ");
}

function getTranslatedValue(value?: string, translatedValue?: string) {
  return translatedValue || value || "";
}

function EntryDefinitions({ entry }: { entry: OriginalLexicalEntrySummary }) {
  const definitions = entry.translatedDefinitions?.length
    ? entry.translatedDefinitions
    : entry.definitions;

  if (definitions.length === 0) return null;

  return (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text/75">
      {definitions.map((definition, index) => (
        <li key={`${entry.title}-definition-${index}`}>{definition}</li>
      ))}
    </ol>
  );
}

function WiktionaryLexicalInsight({
  selectedToken,
}: {
  selectedToken: OriginalTranslatorToken;
}) {
  const lexical = selectedToken.lexical;
  if (!lexical) return null;

  if (!lexical.found) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-border bg-surface/40 px-3 py-2 text-sm text-text/55">
        Wiktionary did not return lexical data for this token.
      </div>
    );
  }

  const partOfSpeech = getTranslatedValue(
    lexical.partOfSpeech,
    lexical.translatedPartOfSpeech,
  );
  const semanticType = getTranslatedValue(
    lexical.semanticType,
    lexical.translatedSemanticType,
  );
  const morphology = lexical.morphology
    .map((item) => getTranslatedValue(item.label, item.translatedLabel))
    .filter(Boolean);

  return (
    <section className="mt-4 rounded-md border border-dashed border-info/40 bg-surface/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-info">
          Wiktionary lexical data
        </span>
        <a
          className="text-xs text-text/45 underline decoration-dashed underline-offset-2 hover:text-info"
          href={lexical.url}
          target="_blank"
          rel="noreferrer"
        >
          {lexical.title}
        </a>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {partOfSpeech && (
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text/70">
            {partOfSpeech}
          </span>
        )}
        {semanticType && (
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text/70">
            {semanticType}
          </span>
        )}
        {lexical.transliteration && (
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text/70">
            {lexical.transliteration}
          </span>
        )}
      </div>

      {morphology.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text/45">
            Morphology
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {morphology.map((item) => (
              <span
                key={item}
                className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-text/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <EntryDefinitions entry={lexical} />

      {lexical.lemma && (
        <div className="mt-3 rounded-md border border-border/60 bg-background/50 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-primary">
              Lemma
            </span>
            <a
              className="text-sm font-semibold text-text underline decoration-dashed underline-offset-2 hover:text-primary"
              href={lexical.lemma.url}
              target="_blank"
              rel="noreferrer"
            >
              {lexical.lemma.title}
            </a>
            {getTranslatedValue(
              lexical.lemma.partOfSpeech,
              lexical.lemma.translatedPartOfSpeech,
            ) && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text/55">
                {getTranslatedValue(
                  lexical.lemma.partOfSpeech,
                  lexical.lemma.translatedPartOfSpeech,
                )}
              </span>
            )}
          </div>
          <EntryDefinitions entry={lexical.lemma} />
        </div>
      )}

      {(lexical.translatedEtymology || lexical.etymology) && (
        <p className="mt-3 text-xs text-text/50">
          <strong>Etymology:</strong>{" "}
          {lexical.translatedEtymology || lexical.etymology}
        </p>
      )}
    </section>
  );
}

function TokenTranslations({
  language,
  selectedToken,
}: {
  language?: Language;
  selectedToken: OriginalTranslatorToken;
}) {
  const template = getTemplate(language);
  const direction = getTokenDirection(language);

  return (
    <div className="animate-show-from-bottom-slow" key={selectedToken.token_index}>
      <div className="rounded-md border border-dashed border-border bg-surface/60 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {template.tokenLabel}
        </p>
        <h2
          className="mt-1 text-2xl font-bold text-text"
          dir={direction}
          lang={language}
        >
          {selectedToken.token}
        </h2>
        {selectedToken.transliteration && (
          <p className="mt-1 text-xs text-text/60" dir="ltr">
            {template.transliterationLabel}: {selectedToken.transliteration}
          </p>
        )}
      </div>

      <WiktionaryLexicalInsight selectedToken={selectedToken} />

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-text">{template.optionsLabel}</h3>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text/50">
            {selectedToken.translations.length}
          </span>
        </div>

        <p className="mb-3 text-sm text-text/60">
          {template.renderSummary(selectedToken.token, selectedToken.translations.length)}
        </p>

        {selectedToken.translations.length > 0 ? (
          <ul className="space-y-2">
            {selectedToken.translations.map((option, index) => (
              <li
                key={`${option.source}-${option.text}-${index}`}
                className="rounded-md border border-border/70 bg-surface px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">{option.text}</span>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[0.7rem] uppercase tracking-wide text-text/50">
                    {buildOptionMeta(option)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-sm text-text/55">
            {selectedToken.error || template.noOptions}
          </p>
        )}
      </div>
    </div>
  );
}

type OriginalTranslatorStreamMeta = Omit<OriginalTranslatorResponse, "tokens"> & {
  tokens: string[];
};

function createPlaceholderToken(token: string, tokenIndex: number): OriginalTranslatorToken {
  return {
    token_index: tokenIndex,
    token,
    translations: [],
  };
}

function useStreamingOriginalsTranslator(url: string | null) {
  const [data, setData] = useState<OriginalTranslatorResponse | null>(null);
  const [resolvedTokenIndexes, setResolvedTokenIndexes] = useState<Set<number>>(
    () => new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    let cancelled = false;

    setData(null);
    setResolvedTokenIndexes(new Set());
    setIsLoading(true);
    setIsFetching(true);
    setError(null);

    (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        await ThrowByResponse.throwsIfNotOk(response);

        if (!response.body) {
          throw new Error("Translator stream is not available.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const lines = block.split("\n");
            let eventType = "message";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              if (line.startsWith("data: ")) eventData = line.slice(6);
            }

            if (eventData === "[DONE]") {
              if (!cancelled) setIsFetching(false);
              continue;
            }

            if (eventType === "meta") {
              const parsed = JSON.parse(eventData) as OriginalTranslatorStreamMeta;
              if (cancelled) continue;

              setData({
                text: parsed.text,
                version: parsed.version,
                language: parsed.language,
                targetLanguage: parsed.targetLanguage,
                tokens: parsed.tokens.map(createPlaceholderToken),
              });
              setIsLoading(false);
              continue;
            }

            if (eventType === "token") {
              const token = JSON.parse(eventData) as OriginalTranslatorToken;
              if (cancelled) continue;

              setData((prev) => {
                if (!prev) return prev;

                const nextTokens = [...prev.tokens];
                nextTokens[token.token_index] = token;
                return { ...prev, tokens: nextTokens };
              });
              setResolvedTokenIndexes((prev) => {
                const next = new Set(prev);
                next.add(token.token_index);
                return next;
              });
              continue;
            }

            if (eventType === "error") {
              const parsed = JSON.parse(eventData) as { message?: string };
              throw new Error(parsed.message ?? "Translator stream error.");
            }
          }
        }
      } catch (streamError) {
        if (!cancelled && !controller.signal.aborted) {
          setError(streamError as Error);
          setIsLoading(false);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url]);

  return { data, resolvedTokenIndexes, isLoading, isFetching, error };
}

export default function OriginalsTranslator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [version] = Params.getParamFromSearchParams("version", searchParams);
  const bookAbbr = searchParams.get("book") || "";
  const selectedWordParam = searchParams.get(SELECTED_WORD_PARAM)?.trim() ?? "";
  const referenceMessage =
    searchParams.get(REFERENCE_MESSAGE_PARAM)?.trim() ?? "";
  const referenceSource =
    searchParams.get(REFERENCE_SOURCE_PARAM)?.trim() ?? "";
  const referenceWord = searchParams.get(REFERENCE_WORD_PARAM)?.trim() ?? "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const verseNumber = searchParams.get("verse")
    ? parseInt(searchParams.get("verse")!, 10)
    : null;
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(
    null,
  );
  const [showAllRelatedVerses, setShowAllRelatedVerses] = useState(false);

  const { ref: refSelectedVersion, inView: inViewSelectedVersion } = useInView({
    threshold: 1,
    delay: 15,
  });

  const refVerse = useRef<HTMLDivElement>(null);
  const tokensRef = useRef<OriginalTranslatorToken[]>([]);
  const appliedUrlSelectionKeyRef = useRef("");
  const urlContextRef = useRef({
    bookAbbr,
    version,
    chapterNumber,
    verseNumber,
    referenceMessage,
    referenceSource,
    referenceWord,
  });

  const { data: chapter } = useQuery({
    queryKey: ["chapter", version, bookAbbr, chapterNumber],
    enabled: !!(version && bookAbbr && chapterNumber),
    queryFn: async () => {
      const chapterResponse = await fetch(
        `/api/versions/${version}/${bookAbbr}/${chapterNumber}`,
      );
      await ThrowByResponse.throwsIfNotOk(chapterResponse);
      return (await chapterResponse.json()) as Chapter;
    },
  });

  const translatorUrl =
    version && bookAbbr && chapterNumber && verseNumber
      ? `/api/versions/${version}/${bookAbbr}/${chapterNumber}/${verseNumber}/translator?stream=1`
      : null;

  const {
    data: translatorData,
    resolvedTokenIndexes,
    isLoading: isLoadingTranslations,
    isFetching: isFetchingTranslations,
    error: translatorError,
  } = useStreamingOriginalsTranslator(translatorUrl);

  const tokens = useMemo(
    () => translatorData?.tokens ?? [],
    [translatorData?.tokens],
  );
  tokensRef.current = tokens;

  const selectedToken =
    selectedTokenIndex !== null ? tokens.at(selectedTokenIndex) : undefined;
  const isSelectedTokenResolved =
    selectedTokenIndex !== null && resolvedTokenIndexes.has(selectedTokenIndex);
  const selectedTokenText = selectedToken?.token.trim() ?? "";
  const relatedVersesSearchVersion = translatorData?.version ?? "";
  const template = getTemplate(translatorData?.language);

  const { data: relatedVersesRaw, isFetching: isFetchingRelatedVerses } =
    useQuery({
      queryKey: ["relative-verses", relatedVersesSearchVersion, selectedTokenText],
      enabled: !!(
        relatedVersesSearchVersion &&
        selectedTokenText &&
        isSelectedTokenResolved
      ),
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60 * 3,
      queryFn: async () => {
        const relatedVersesResponse = await fetch(
          `/api/versions/${relatedVersesSearchVersion}/relative-verses?word=${encodeURIComponent(selectedTokenText)}&count=${RELATED_VERSES_FETCH_COUNT}`,
        );

        await ThrowByResponse.throwsIfNotOk(relatedVersesResponse);
        return (await relatedVersesResponse.json()) as Verse[];
      },
    });

  const relatedVerses = (relatedVersesRaw ?? []).filter(
    (relatedVerse) =>
      !(
        relatedVerse.version === relatedVersesSearchVersion &&
        relatedVerse.bookAbbr === bookAbbr &&
        relatedVerse.chapter === chapterNumber &&
        relatedVerse.verse === verseNumber
      ),
  );
  const visibleRelatedVerses = showAllRelatedVerses
    ? relatedVerses
    : relatedVerses.slice(0, INITIAL_RELATED_VERSES_COUNT);
  const hasMoreRelatedVerses =
    relatedVerses.length > INITIAL_RELATED_VERSES_COUNT;

  useEffect(() => {
    urlContextRef.current = {
      bookAbbr,
      version,
      chapterNumber,
      verseNumber,
      referenceMessage,
      referenceSource,
      referenceWord,
    };
  }, [
    bookAbbr,
    version,
    chapterNumber,
    verseNumber,
    referenceMessage,
    referenceSource,
    referenceWord,
  ]);

  function buildTranslatorUrlWithSelectedWord(word: string) {
    return ReaderAnalysisUtils.buildSelectedWordUrl({
      path: "/reader/originals/translator",
      context: urlContextRef.current,
      word,
    });
  }

  const markCurrentUrlSelectionAsConsumed = useCallback(() => {
    if (!selectedWordParam) return;

    appliedUrlSelectionKeyRef.current = [
      bookAbbr,
      chapterNumber,
      verseNumber,
      selectedWordParam,
    ].join(":");
  }, [bookAbbr, chapterNumber, selectedWordParam, verseNumber]);

  function handleSelectToken(index: number) {
    markCurrentUrlSelectionAsConsumed();
    setSelectedTokenIndex(index);
  }

  function buildRelatedTranslatorHref(relatedVerse: Verse) {
    return ReaderAnalysisUtils.buildRelatedAnalysisHref({
      path: "/reader/originals/translator",
      current: urlContextRef.current,
      relatedVerse,
      selectedToken: selectedTokenText,
    });
  }

  function handleOnPrevious() {
    router.back();
  }

  useEffect(() => {
    function handleOnKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.back();
      } else if (e.key === "ArrowRight") {
        markCurrentUrlSelectionAsConsumed();
        setSelectedTokenIndex((prev) => {
          const currentTokens = tokensRef.current;
          if (prev === null) return currentTokens.length > 0 ? 0 : null;
          return prev < currentTokens.length - 1 ? prev + 1 : prev;
        });
      } else if (e.key === "ArrowLeft") {
        markCurrentUrlSelectionAsConsumed();
        setSelectedTokenIndex((prev) => {
          const currentTokens = tokensRef.current;
          if (prev === null) return currentTokens.length > 0 ? 0 : null;
          return prev > 0 ? prev - 1 : prev;
        });
      }
    }

    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, [markCurrentUrlSelectionAsConsumed, router]);

  useEffect(() => {
    if (tokens.length === 0) return;

    if (selectedWordParam) {
      const urlSelectionKey = [
        bookAbbr,
        chapterNumber,
        verseNumber,
        selectedWordParam,
      ].join(":");
      const currentSelectedToken = selectedToken?.token ?? "";

      if (
        ReaderAnalysisUtils.tokenMatchesWord(
          currentSelectedToken,
          selectedWordParam,
        )
      ) {
        appliedUrlSelectionKeyRef.current = urlSelectionKey;
        return;
      }

      if (appliedUrlSelectionKeyRef.current === urlSelectionKey) return;

      const requestedTokenIndex = tokens.findIndex(({ token }) =>
        ReaderAnalysisUtils.tokenMatchesWord(token, selectedWordParam),
      );

      if (requestedTokenIndex !== -1) {
        appliedUrlSelectionKeyRef.current = urlSelectionKey;
        setSelectedTokenIndex(requestedTokenIndex);
        return;
      }

      if (isLoadingTranslations || isFetchingTranslations) return;
    }

    if (selectedTokenIndex === null) {
      setSelectedTokenIndex(0);
    }
  }, [
    tokens,
    selectedToken,
    selectedTokenIndex,
    selectedWordParam,
    bookAbbr,
    chapterNumber,
    verseNumber,
    isLoadingTranslations,
    isFetchingTranslations,
  ]);

  useEffect(() => {
    if (!selectedTokenText || !isSelectedTokenResolved) return;
    if (ReaderAnalysisUtils.tokenMatchesWord(selectedTokenText, selectedWordParam)) return;

    router.replace(buildTranslatorUrlWithSelectedWord(selectedTokenText), {
      scroll: false,
    });
  }, [selectedTokenText, selectedWordParam, isSelectedTokenResolved, router]);

  useEffect(() => {
    setShowAllRelatedVerses(false);
  }, [selectedTokenIndex]);

  const chapterText = chapterNumber?.toString() ?? "...";
  const isLoading = isLoadingTranslations;

  return (
    <div className="flex min-h-screen w-screen max-w-[750px] flex-col bg-background px-7 py-7 pb-15 text-text">
      <div className="fixed left-0 top-0 z-10 w-full select-none border-b border-border bg-background p-6 py-2 shadow">
        <div className="mx-auto flex max-w-[750px] items-center">
          <div className="flex flex-col">
            <Link
              className="text-2xl font-bold transition-colors hover:text-primary"
              href={`/reader?version=${version ?? ""}&book=${bookAbbr}&chapter=${chapterNumber ?? ""}&verse=${verseNumber ?? ""}`}
            >
              {chapter?.book.name || "..."} {chapterText}:{verseNumber || "..."}
            </Link>
            <h4 className="text-xs font-bold opacity-70">Original translator:</h4>
          </div>
          <div className="ml-auto flex">
            <button
              onClick={handleOnPrevious}
              className="obs-icon-button ml-4 mt-1"
            >
              <ArrowLeftIcon width={30} height={30} />
            </button>
          </div>
        </div>
      </div>
      <hr className="mt-13 opacity-0" />

      {(referenceSource || referenceMessage) && (
        <div className="mb-1 mt-1 animate-show-from-bottom-slow text-xs text-text-muted">
          {referenceSource ? (
            <>
              Previously in{" "}
              <span className="font-semibold text-secondary">
                {referenceSource}
              </span>
              , reference for{" "}
              <span className="font-semibold text-info">
                {referenceWord || selectedWordParam}
              </span>
            </>
          ) : (
            referenceMessage
          )}
        </div>
      )}

      <div
        ref={refSelectedVersion}
        className="h-1 w-full bg-background text-background"
        style={{
          height: !inViewSelectedVersion ? refVerse.current?.clientHeight : 0,
        }}
      />

      <div
        ref={refVerse}
        className="hide-buttons mt-1 w-full select-none rounded-md px-1 py-[2px] pt-3 text-lg text-text/95"
        dir={template.direction}
      >
        {tokens.length === 0 && translatorData?.text && (
          <span className="px-1 py-0.5 text-text/20">{translatorData.text}</span>
        )}

        {tokens.map((token) => {
          const isTokenResolved = resolvedTokenIndexes.has(token.token_index);

          return (
            <Fragment key={`${token.token_index}-${token.token}`}>
              <span hidden={token.token_index === 0}> </span>
              <span
                className={`cursor-pointer rounded-sm px-1 py-0.5 ${
                  selectedTokenIndex === token.token_index
                    ? "bg-secondary text-text underline decoration-primary decoration-dashed underline-offset-2"
                    : "text-text hover:bg-surface"
                } ${isTokenResolved ? "" : "animate-pulse text-text/30"}`}
                onClick={() => handleSelectToken(token.token_index)}
              >
                {token.token}
              </span>
            </Fragment>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex animate-show-from-bottom-slow items-center gap-2 py-6">
          <LoadingIcon
            width={18}
            height={18}
            className="animate-spin text-text/50 opacity-70"
          />
          <span className="animate-pulse text-sm text-text/50">
            Breaking and translating original words...
          </span>
        </div>
      )}

      {!isLoading && isFetchingTranslations && tokens.length > 0 && (
        <div className="flex animate-show-from-bottom-slow items-center gap-2 py-3">
          <LoadingIcon
            width={14}
            height={14}
            className="animate-spin text-text/40 opacity-70"
          />
          <span className="text-xs text-text/45">
            Streaming lexical data {resolvedTokenIndexes.size}/{tokens.length}...
          </span>
        </div>
      )}

      {translatorError && !isLoading && (
        <p className="mt-6 rounded-md border border-dashed border-danger/50 bg-surface px-3 py-2 text-sm text-danger">
          {(translatorError as Error)?.message ?? "Unable to translate this verse."}
        </p>
      )}

      <hr
        className="w-full border-dashed border-gray-400 pb-0 pt-2"
        hidden={isLoading && tokens.length === 0}
      />

      {selectedToken && (
        <div className="mt-4 flex w-full flex-col">
          {isSelectedTokenResolved ? (
            <TokenTranslations
              language={translatorData?.language}
              selectedToken={selectedToken}
            />
          ) : (
            <div className="flex animate-show-from-bottom-slow items-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm text-text/50">
              <LoadingIcon
                width={14}
                height={14}
                className="animate-spin opacity-70"
              />
              <span>Loading this token enrichment...</span>
            </div>
          )}

          {isSelectedTokenResolved && selectedTokenText && relatedVersesSearchVersion && (
            <div
              className="mt-5 animate-show-from-bottom-slow border-t border-dashed border-border/70 pt-4"
              key={`${selectedTokenIndex}-related-verses`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  Also found in:
                </span>
                <span className="text-xs text-text/40">
                  {relatedVersesSearchVersion} · {selectedTokenText}
                </span>
              </div>

              {isFetchingRelatedVerses && (
                <div className="flex items-center gap-2 py-2 text-sm text-text/50">
                  <LoadingIcon
                    width={14}
                    height={14}
                    className="animate-spin opacity-70"
                  />
                  <span>{template.loadingRelated}</span>
                </div>
              )}

              {!isFetchingRelatedVerses &&
                relatedVersesRaw &&
                relatedVerses.length === 0 && (
                  <p className="text-sm text-text/50">
                    No correlated verses found for this fragment.
                  </p>
                )}

              {visibleRelatedVerses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {visibleRelatedVerses.map((relatedVerse) => (
                    <Link
                      key={`${relatedVerse.version}-${relatedVerse.bookAbbr}-${relatedVerse.chapter}-${relatedVerse.verse}`}
                      className="inline-flex cursor-pointer items-center rounded bg-surface p-1 px-3 text-[0.75rem] text-text/85 hover:bg-info/30"
                      href={buildRelatedTranslatorHref(relatedVerse)}
                    >
                      <LinkIcon
                        width={13}
                        height={13}
                        className="-mt-0.5 mr-1 inline"
                      />
                      {relatedVerse.displayText}
                    </Link>
                  ))}
                </div>
              )}

              {hasMoreRelatedVerses && (
                <button
                  className="obs-control obs-control-compact mt-3"
                  onClick={() => setShowAllRelatedVerses((prev) => !prev)}
                >
                  {showAllRelatedVerses
                    ? "Show less"
                    : `Read more (${relatedVerses.length - INITIAL_RELATED_VERSES_COUNT} more)`}
                </button>
              )}
            </div>
          )}

          <div
            className="mt-3 animate-show-from-bottom-slow text-xs italic text-text/50"
            key={`${selectedTokenIndex}-google`}
          >
            <span>
              Translations by Google Translate internals for{" "}
              <strong>{translatorData?.version}</strong> and may contain errors.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
