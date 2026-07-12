"use client";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import LinkIcon from "@/app/components/icons/LinkIcon";
import LoadingIcon from "@/app/components/icons/LoadingIcon";
import { Chapter } from "@/entities/Chapter";
import { Language } from "@/entities/Language";
import { Verse } from "@/entities/Verse";
import { useStreamAnalysis } from "@/hooks/useStreamAnalysis";
import { Params } from "@/utils/Params";
import { ReaderAnalysisUtils } from "@/utils/ReaderAnalysisUtils";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import Markdown from "react-markdown";
import { Fragment } from "react/jsx-dev-runtime";

type OriginalVerseResponse = {
  text: string;
  version: string;
  language: Language;
};

const {
  INITIAL_RELATED_VERSES_COUNT,
  RELATED_VERSES_FETCH_COUNT,
  SELECTED_WORD_PARAM,
  REFERENCE_MESSAGE_PARAM,
  REFERENCE_SOURCE_PARAM,
  REFERENCE_WORD_PARAM,
} = ReaderAnalysisUtils;

export default function Explain() {
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
  const [iaLoadingText, setIaLoadingText] = useState(
    "Loading explanations AI...",
  );

  const { ref: refSelectedVersion, inView: inViewSelectedVersion } = useInView({
    threshold: 1,
    delay: 15,
  });

  const refVerse = useRef<HTMLDivElement>(null);
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

  const { data: originalVerse } = useQuery({
    queryKey: ["original-verse", version, bookAbbr, chapterNumber, verseNumber],
    enabled: !!(version && bookAbbr && chapterNumber && verseNumber),
    queryFn: async () => {
      const originalResponse = await fetch(
        `/api/versions/${version}/${bookAbbr}/${chapterNumber}/${verseNumber}/original`,
      );
      await ThrowByResponse.throwsIfNotOk(originalResponse);
      return (await originalResponse.json()) as OriginalVerseResponse;
    },
  });

  const streamUrl =
    version && bookAbbr && chapterNumber && verseNumber
      ? `/api/versions/${version}/${bookAbbr}/${chapterNumber}/${verseNumber}/explain-cloud`
      : null;

  const {
    tokens: streamTokens,
    meta: streamMeta,
    isLoading: isLoadingVerseAnalysis,
    isStreaming,
    lastTokenIndex,
  } = useStreamAnalysis(
    streamUrl,
    `explain-${version}-${bookAbbr}-${chapterNumber}-${verseNumber}`,
  );

  const selectedToken =
    selectedTokenIndex !== null
      ? (streamTokens.at(selectedTokenIndex)?.token.trim() ?? "")
      : "";
  const relatedVersesSearchVersion = originalVerse?.version ?? "";

  const { data: relatedVersesRaw, isFetching: isFetchingRelatedVerses } =
    useQuery({
      queryKey: ["relative-verses", relatedVersesSearchVersion, selectedToken],
      enabled: !!(relatedVersesSearchVersion && selectedToken),
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60 * 3,
      queryFn: async () => {
        const relatedVersesResponse = await fetch(
          `/api/versions/${relatedVersesSearchVersion}/relative-verses?word=${encodeURIComponent(selectedToken)}&count=${RELATED_VERSES_FETCH_COUNT}`,
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

  const streamTokensRef = useRef(streamTokens);
  const appliedUrlSelectionKeyRef = useRef("");
  streamTokensRef.current = streamTokens;

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

  function buildExplainUrlWithSelectedWord(word: string) {
    return ReaderAnalysisUtils.buildSelectedWordUrl({
      path: "/reader/explain",
      context: urlContextRef.current,
      word,
    });
  }

  function markCurrentUrlSelectionAsConsumed() {
    if (!selectedWordParam) return;

    appliedUrlSelectionKeyRef.current = [
      bookAbbr,
      chapterNumber,
      verseNumber,
      selectedWordParam,
    ].join(":");
  }

  function handleSelectToken(index: number) {
    markCurrentUrlSelectionAsConsumed();
    setSelectedTokenIndex(index);
  }

  function buildRelatedExplainHref(relatedVerse: Verse) {
    return ReaderAnalysisUtils.buildRelatedAnalysisHref({
      path: "/reader/explain",
      current: urlContextRef.current,
      relatedVerse,
      selectedToken,
    });
  }

  function handleOnPrevious() {
    router.back();
  }

  function handleOnKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      router.back();
    } else if (e.key === "ArrowRight") {
      markCurrentUrlSelectionAsConsumed();
      setSelectedTokenIndex((prev) => {
        const tokens = streamTokensRef.current;
        if (prev === null) return tokens.length > 0 ? 0 : null;
        return prev < tokens.length - 1 ? prev + 1 : prev;
      });
    } else if (e.key === "ArrowLeft") {
      markCurrentUrlSelectionAsConsumed();
      setSelectedTokenIndex((prev) => {
        if (prev === null) return streamTokensRef.current.length > 0 ? 0 : null;
        return prev > 0 ? prev - 1 : prev;
      });
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, []);

  useEffect(() => {
    if (streamTokens.length === 0) return;

    if (selectedWordParam) {
      const urlSelectionKey = [
        bookAbbr,
        chapterNumber,
        verseNumber,
        selectedWordParam,
      ].join(":");
      const currentSelectedToken =
        selectedTokenIndex !== null
          ? (streamTokens.at(selectedTokenIndex)?.token ?? "")
          : "";

      if (ReaderAnalysisUtils.tokenMatchesWord(currentSelectedToken, selectedWordParam)) {
        appliedUrlSelectionKeyRef.current = urlSelectionKey;
        return;
      }

      if (appliedUrlSelectionKeyRef.current === urlSelectionKey) return;

      const requestedTokenIndex = streamTokens.findIndex(({ token }) =>
        ReaderAnalysisUtils.tokenMatchesWord(token, selectedWordParam),
      );

      if (requestedTokenIndex !== -1) {
        appliedUrlSelectionKeyRef.current = urlSelectionKey;
        setSelectedTokenIndex(requestedTokenIndex);
        return;
      }

      if (isLoadingVerseAnalysis || isStreaming) return;
    }

    if (selectedTokenIndex === null) {
      setSelectedTokenIndex(0);
    }
  }, [
    streamTokens,
    selectedTokenIndex,
    selectedWordParam,
    bookAbbr,
    chapterNumber,
    verseNumber,
    isLoadingVerseAnalysis,
    isStreaming,
  ]);

  useEffect(() => {
    if (!selectedToken) return;
    if (selectedWordParam === selectedToken) return;

    router.replace(buildExplainUrlWithSelectedWord(selectedToken), {
      scroll: false,
    });
  }, [selectedToken, selectedWordParam, router]);

  useEffect(() => {
    setShowAllRelatedVerses(false);
  }, [selectedTokenIndex]);

  useEffect(() => {
    (async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, ReaderAnalysisUtils.random(2_000, 3_000)),
      );
      setIaLoadingText("Loading explanations from AI, please wait...");

      await new Promise((resolve) =>
        setTimeout(resolve, ReaderAnalysisUtils.random(500, 7_000)),
      );
      setIaLoadingText("Looking for references in the original texts...");

      await new Promise((resolve) =>
        setTimeout(resolve, ReaderAnalysisUtils.random(1_000, 5_000)),
      );
      setIaLoadingText("Gerating deep explanations, almost there...");

      await new Promise((resolve) =>
        setTimeout(resolve, ReaderAnalysisUtils.random(4_000, 10_000)),
      );
      setIaLoadingText("Analyzing and correcting text applications...");

      await new Promise((resolve) =>
        setTimeout(resolve, ReaderAnalysisUtils.random(3_000, 8_000)),
      );
      setIaLoadingText("Finishing explanation...");
    })();
  }, []);

  const selectedVerseText = originalVerse?.text ?? null;

  const remainingText = ReaderAnalysisUtils.getRemainingText(
    selectedVerseText,
    streamTokens,
  );

  const chapterText = chapterNumber?.toString() ?? "...";

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text max-w-[750px] w-screen">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
          <div className="flex flex-col">
            <Link
              className="text-2xl font-bold hover:text-primary transition-colors"
              href={`/reader?version=${version ?? ""}&book=${bookAbbr}&chapter=${chapterNumber ?? ""}&verse=${verseNumber ?? ""}`}
            >
              {chapter?.book.name || "..."} {chapterText}:{verseNumber || "..."}
            </Link>
            <h4 className="text-xs font-bold opacity-70">Explain verse:</h4>
          </div>
          <div className="flex ml-auto">
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
        <div className="mt-1 mb-1 text-xs text-text-muted animate-show-from-bottom-slow">
          {referenceSource ? (
            <>
              Previously in{" "}
              <span className="text-secondary font-semibold">
                {referenceSource}
              </span>
              , reference for{" "}
              <span className="text-info font-semibold">
                {referenceWord || selectedWordParam}
              </span>
            </>
          ) : (
            referenceMessage
          )}
        </div>
      )}

      {/* spacer */}
      <div
        ref={refSelectedVersion}
        className="h-1 w-full bg-background text-background"
        style={{
          height: !inViewSelectedVersion ? refVerse.current?.clientHeight : 0,
        }}
      />

      <div
        className="text-text/95 w-full mt-1 pt-3 text-lg select-none rounded-md px-1 py-[2px] hide-buttons"
        dir={
          (originalVerse?.language ?? streamMeta?.language) === Language.HE
            ? "rtl"
            : "ltr"
        }
      >
        {streamTokens.length === 0 && selectedVerseText && (
          <span className="text-text/20 px-1 py-0.5">{selectedVerseText}</span>
        )}

        {streamTokens.map((analysation, idx) => (
          <Fragment key={analysation.token_index}>
            <span className="" hidden={analysation.token_index === 0}>
              {" "}
            </span>
            <span
              className={`
                rounded-sm px-1 cursor-pointer py-0.5
                ${
                  selectedTokenIndex === analysation.token_index
                    ? "bg-secondary text-text underline underline-offset-2 decoration-dashed decoration-primary"
                    : "hover:bg-surface text-text"
                }
                ${isStreaming && idx === lastTokenIndex ? "animate-token-slide-up" : ""}
              `}
              onClick={() => handleSelectToken(analysation.token_index)}
            >
              {analysation.token}
            </span>
          </Fragment>
        ))}

        {streamTokens.length > 0 &&
          remainingText &&
          (isStreaming || isLoadingVerseAnalysis) && (
            <>
              <span className="mr-0.5"> </span>
              <span className="text-text/20 px-1 py-0.5">{remainingText}</span>
            </>
          )}
      </div>

      {(isStreaming || (isLoadingVerseAnalysis && selectedVerseText)) && (
        <div className="flex items-center gap-2 py-6 animate-show-from-bottom-slow">
          <LoadingIcon
            width={18}
            height={18}
            className="animate-spin text-text/50 opacity-70"
          />
          <span className="text-sm text-text/50 animate-pulse">
            {iaLoadingText}
          </span>
        </div>
      )}

      <hr
        className="border-dashed border-gray-400 w-full pt-2 pb-0"
        hidden={isLoadingVerseAnalysis && streamTokens.length === 0}
      />

      {selectedTokenIndex !== null && (
        <div className="flex flex-col mt-4 w-full">
          <div
            className="animate-show-from-bottom-slow prose-explain"
            key={selectedTokenIndex}
          >
            <Markdown
              components={{
                p: ({ children }) => (
                  <p className="text-text mb-2 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="text-primary font-bold">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-text/80 italic">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-text mb-2 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-text mb-2 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-text/90">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-3 border-primary bg-surface rounded-r-md px-3 py-2 my-2 text-text/80 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {streamTokens.at(selectedTokenIndex)?.explanation}
            </Markdown>
          </div>

          {selectedToken && relatedVersesSearchVersion && (
            <div
              className="mt-5 border-t border-dashed border-border/70 pt-4 animate-show-from-bottom-slow"
              key={`${selectedTokenIndex}-related-verses`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  Also found in:
                </span>
                <span className="text-xs text-text/40">
                  {relatedVersesSearchVersion} · {selectedToken}
                </span>
              </div>

              {isFetchingRelatedVerses && (
                <div className="flex items-center gap-2 text-sm text-text/50 py-2">
                  <LoadingIcon
                    width={14}
                    height={14}
                    className="animate-spin opacity-70"
                  />
                  <span>Looking for verses with this word...</span>
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
                      className="inline-flex items-center text-[0.75rem] bg-surface p-1 px-3 rounded hover:bg-info/30 cursor-pointer text-text/85"
                      href={buildRelatedExplainHref(relatedVerse)}
                    >
                      <LinkIcon
                        width={13}
                        height={13}
                        className="inline -mt-0.5 mr-1"
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
            className="mt-3 italic text-xs text-text/50 animate-show-from-bottom-slow"
            key={selectedTokenIndex + "-model"}
            hidden={isStreaming}
          >
            <span>
              Generated by <strong>{streamMeta?.modelName}</strong> for{" "}
              <strong>{streamMeta?.version}</strong> and may contain errors.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
