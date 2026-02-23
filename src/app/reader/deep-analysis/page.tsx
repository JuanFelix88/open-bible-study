"use client";
import AIIcon from "@/app/components/icons/AIIcon";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import LoadingIcon from "@/app/components/icons/LoadingIcon";
import { BookInfo } from "@/entities/BookInfo";
import { Chapter } from "@/entities/Chapter";
import { useStreamAnalysis } from "@/hooks/useStreamAnalysis";
import { Params } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import Markdown, { Components } from "react-markdown";
import { Fragment } from "react/jsx-dev-runtime";

function resolveVerseLink(
  text: string,
  books: BookInfo[],
  currentVersion: string,
): { href: string; label: string } | null {
  const match = text.match(
    /^\*{0,2}(\d?\s?[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)(?:-\d+)?\*{0,2}$/,
  );
  if (!match) return null;

  const [, rawBook, chapter, verse] = match;
  const bookName = rawBook.trim();

  const book = books.find(
    (b) =>
      b.name.toLowerCase() === bookName.toLowerCase() ||
      b.abbr.toLowerCase() === bookName.toLowerCase(),
  );

  if (!book) return null;

  return {
    href: `/reader?book=${book.abbr}&version=${currentVersion}&chapter=${chapter}&verse=${verse}`,
    label: text.replace(/\*+/g, ""),
  };
}

export default function DeepAnalysis() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [version] = Params.getParamFromSearchParams("version", searchParams);
  const bookAbbr = searchParams.get("book") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const verseNumber = searchParams.get("verse")
    ? parseInt(searchParams.get("verse")!, 10)
    : null;
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(
    null,
  );
  const [iaLoadingText, setIaLoadingText] = useState(
    "Analyzing verse deeply...",
  );

  const { ref: refSelectedVersion, inView: inViewSelectedVersion } = useInView({
    threshold: 1,
    delay: 15,
  });

  const refVerse = useRef<HTMLDivElement>(null);

  const { data: books } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");
      await ThrowByResponse.throwsIfNotOk(booksResponse);
      return (await booksResponse.json()) as BookInfo[];
    },
  });

  const { data: chapter, isLoading: isLoadingChapter } = useQuery({
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

  const streamUrl =
    version && bookAbbr && chapterNumber && verseNumber
      ? `/api/versions/${version}/${bookAbbr}/${chapterNumber}/${verseNumber}/deep-analysis`
      : null;

  const {
    tokens: streamTokens,
    meta: streamMeta,
    isLoading: isLoadingVerseAnalysis,
    isStreaming,
    lastTokenIndex,
  } = useStreamAnalysis(
    streamUrl,
    `deep-analysis-${version}-${bookAbbr}-${chapterNumber}-${verseNumber}`,
  );

  function handleOnPrevious() {
    router.back();
  }

  function handleOnKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      router.back();
    }
  }

  function random(init: number, end: number) {
    return Math.floor(Math.random() * (end - init + 1)) + init;
  }

  useEffect(() => {
    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, []);

  useEffect(() => {
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, random(2_000, 3_000)));
      setIaLoadingText("Mapping to original language...");

      await new Promise((resolve) => setTimeout(resolve, random(500, 7_000)));
      setIaLoadingText("Searching cross-references...");

      await new Promise((resolve) => setTimeout(resolve, random(1_000, 5_000)));
      setIaLoadingText("Building deep theological analysis...");

      await new Promise((resolve) =>
        setTimeout(resolve, random(4_000, 10_000)),
      );
      setIaLoadingText("Connecting related verses...");

      await new Promise((resolve) => setTimeout(resolve, random(3_000, 8_000)));
      setIaLoadingText("Finishing analysis...");
    })();
  }, []);

  const selectedVerseText =
    chapter && verseNumber
      ? chapter.book.chapter.verses.at(verseNumber - 1)
      : null;

  const remainingText = (() => {
    if (!selectedVerseText || streamTokens.length === 0)
      return selectedVerseText ?? "";
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
  })();

  const chapterText = chapterNumber?.toString() ?? "...";

  const markdownComponents: Components = {
    p: ({ children }) => (
      <p className="text-text mb-2 leading-relaxed">{children}</p>
    ),
    strong: ({ children }) => {
      const text = String(children ?? "");
      const verseLink = books
        ? resolveVerseLink(text, books, version ?? "")
        : null;

      if (verseLink) {
        return (
          <a
            href={verseLink.href}
            className="text-primary font-bold underline underline-offset-2 decoration-dotted hover:decoration-solid cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              router.push(verseLink.href);
            }}
          >
            {verseLink.label}
          </a>
        );
      }

      return <strong className="text-primary font-bold">{children}</strong>;
    },
    em: ({ children }) => <em className="text-text/80 italic">{children}</em>,
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
    li: ({ children }) => <li className="text-text/90">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-3 border-primary bg-surface rounded-r-md px-3 py-2 my-2 text-text/80 italic">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text max-w-[750px] w-screen">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">
              {chapter?.book.name || "..."} {chapterText}:{verseNumber || "..."}
            </h1>
            <h4 className="text-xs font-bold opacity-70">Deep analysis:</h4>
          </div>
          <div className="flex ml-auto">
            <button
              onClick={handleOnPrevious}
              className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
            >
              <ArrowLeftIcon width={30} height={30} />
            </button>
          </div>
        </div>
      </div>
      <hr className="mt-13 opacity-0" />

      {(isLoadingChapter ||
        (isLoadingVerseAnalysis &&
          streamTokens.length === 0 &&
          !selectedVerseText)) && (
        <div className="flex flex-col gap-2">
          <div
            className="flex gap-1 text-text/60 animate-show-from-bottom-slow items-center"
            key={iaLoadingText}
          >
            <AIIcon width={18} height={18} className="-mt-0.5 animate-pulse" />
            <span className="animate-pulse animate-pulse-[2s]">
              {iaLoadingText}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
            <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
            <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
            <br />
            <div className="w-5/6 h-4 rounded-sm bg-surface animate-pulse mb-1" />
            <div className="w-2/6 h-4 rounded-sm bg-surface animate-pulse mb-1" />
            <div className="w-3/6 h-4 rounded-sm bg-surface animate-pulse mb-1" />
            <div className="w-2/6 h-4 rounded-sm bg-surface animate-pulse mb-1" />
          </div>
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
        className="text-text/95 w-full mt-1 pt-3 text-lg select-none rounded-md px-1 py-[2px] hide-buttons"
        dir="ltr"
      >
        {streamTokens.length === 0 && selectedVerseText && (
          <span className="text-text/20 px-1 py-0.5">{selectedVerseText}</span>
        )}
        {streamTokens.map((analysation, idx) => (
          <Fragment key={analysation.token_index}>
            <span className="mr-0.5" hidden={analysation.token_index === 0}>
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
              onClick={() => setSelectedTokenIndex(analysation.token_index)}
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

      {streamMeta && (
        <div className="text-text/50 text-xs mt-2 italic">
          {streamMeta.version} ({streamMeta.language})
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
            <Markdown components={markdownComponents}>
              {streamTokens.at(selectedTokenIndex)?.explanation}
            </Markdown>
          </div>
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
