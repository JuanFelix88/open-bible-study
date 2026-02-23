"use client";
import AIIcon from "@/app/components/icons/AIIcon";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import { ChapterWithDiffs } from "@/entities/ChapterWithDiffs";
import { Language } from "@/entities/Language";
import { useStreamAnalysis } from "@/hooks/useStreamAnalysis";
import { Params } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import Markdown from "react-markdown";
import { Fragment } from "react/jsx-dev-runtime";

export default function Explain() {
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
    "Loading explanations AI...",
  );

  const { ref: refSelectedVersion, inView: inViewSelectedVersion } = useInView({
    threshold: 1,
    delay: 15,
  });

  const refVerse = useRef<HTMLDivElement>(null);

  const { data: verseVersions, isLoading: isLoadingVerseVersions } = useQuery({
    queryKey: ["compare", bookAbbr, chapterNumber, verseNumber],
    queryFn: async () => {
      const versesCompareResponse = await fetch(
        `/api/versions/compare/${bookAbbr}/${chapterNumber}/${verseNumber}`,
      );

      await ThrowByResponse.throwsIfNotOk(versesCompareResponse);

      const chapterData = await versesCompareResponse.json();

      return chapterData as ChapterWithDiffs[];
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
  } = useStreamAnalysis(
    streamUrl,
    `explain-${version}-${bookAbbr}-${chapterNumber}-${verseNumber}`,
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
      setIaLoadingText("Loading explanations from AI, please wait...");

      await new Promise((resolve) => setTimeout(resolve, random(500, 7_000)));
      setIaLoadingText("Looking for references in the original texts...");

      await new Promise((resolve) => setTimeout(resolve, random(1_000, 5_000)));
      setIaLoadingText("Gerating deep explanations, almost there...");

      await new Promise((resolve) =>
        setTimeout(resolve, random(4_000, 10_000)),
      );
      setIaLoadingText("Analyzing and correcting text applications...");

      await new Promise((resolve) => setTimeout(resolve, random(3_000, 8_000)));
      setIaLoadingText("Finishing explanation...");
    })();
  }, []);

  const chapterText = chapterNumber?.toString() ?? "...";

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text max-w-[750px] w-screen">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">
              {verseVersions?.at(0)?.book.name || "..."} {chapterText}:
              {verseNumber || "..."}
            </h1>
            <h4 className="text-xs font-bold opacity-70">Explain verse:</h4>
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

      {/* Loading verses */}
      {(isLoadingVerseVersions ||
        (isLoadingVerseAnalysis && streamTokens.length === 0)) && (
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

      {/* spacer */}
      <div
        ref={refSelectedVersion}
        className="h-1 w-full bg-background text-background"
        style={{
          height: !inViewSelectedVersion ? refVerse.current?.clientHeight : 0,
        }}
      />

      <div
        className="text-text/95 w-full mt-1pt-3 text-lg select-none rounded-md px-1 py-[2px] hide-buttons"
        dir={streamMeta?.language === Language.HE ? "rtl" : "ltr"}
      >
        {streamTokens.map((analysation) => (
          <Fragment key={analysation.token_index}>
            <span className="mr-0.5" hidden={analysation.token_index === 0}>
              {" "}
            </span>
            <span
              className={
                selectedTokenIndex === analysation.token_index
                  ? "rounded-sm px-1 py-0.5 bg-secondary text-text underline underline-offset-2 decoration-dashed decoration-primary"
                  : "rounded-sm px-1 cursor-pointer py-0.5 hover:bg-surface text-text"
              }
              onClick={() => setSelectedTokenIndex(analysation.token_index)}
            >
              {analysation.token}
            </span>
          </Fragment>
        ))}
      </div>

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
