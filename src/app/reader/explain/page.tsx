"use client";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import { ChapterWithDiffs } from "@/entities/ChapterWithDiffs";
import { VerseAnalysis } from "@/entities/VerseAnalysis";
import { Params } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
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
    null
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
        `/api/versions/compare/${bookAbbr}/${chapterNumber}/${verseNumber}`
      );

      await ThrowByResponse.throwsIfNotOk(versesCompareResponse);

      const chapterData = await versesCompareResponse.json();

      return chapterData as ChapterWithDiffs[];
    },
  });

  const { data: verseAnalysis, isLoading: isLoadingVerseAnalysis } = useQuery({
    queryKey: ["explain", version, bookAbbr, chapterNumber, verseNumber],
    staleTime: Infinity,
    queryFn: async () => {
      const verseExplainResponse = await fetch(
        `/api/versions/${version}/${bookAbbr}/${chapterNumber}/${verseNumber}/explain`
      );

      await ThrowByResponse.throwsIfNotOk(verseExplainResponse);

      const explainData = await verseExplainResponse.json();

      return explainData as VerseAnalysis[];
    },
  });

  function handleOnPrevious() {
    router.back();
  }

  function handleOnKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      router.back();
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, []);

  const chapterText = chapterNumber?.toString() ?? "...";

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center">
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
      {(isLoadingVerseVersions || isLoadingVerseAnalysis) && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-5/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-2/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
            </div>
          ))}
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

      <div className="text-text/95 w-full mt-1pt-3 text-lg select-none rounded-md px-1 py-[2px] hide-buttons">
        {verseAnalysis?.map((analysation) => (
          <Fragment key={analysation.token_index}>
            <span className="mr-1.5">
              {analysation.token_index > 1 ? " " : ""}
            </span>
            <span
              className={
                selectedTokenIndex === analysation.token_index
                  ? "rounded-sm px-1 py-0.5 bg-secondary text-text"
                  : "rounded-sm px-1 py-0.5 hover:bg-surface text-text"
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
        hidden={isLoadingVerseAnalysis}
      />

      {selectedTokenIndex !== null && (
        <div className="mt-4">
          <span>{verseAnalysis?.at(selectedTokenIndex)?.explanation}</span>
        </div>
      )}
    </div>
  );
}
