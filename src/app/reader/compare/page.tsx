"use client";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import LinkIcon from "@/app/components/icons/LinkIcon";
import { ChapterWithDiffs } from "@/entities/ChapterWithDiffs";
import { Params } from "@/utils/Params";
import { StringCompare } from "@/utils/StringCompare";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Fragment } from "react/jsx-dev-runtime";

export default function Compare() {
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
  const selectedVersion = verseVersions?.find((v) =>
    StringCompare.isEqualIgnoringCase(v.version, version ?? ""),
  );

  const othersVersions = verseVersions
    ?.filter(
      (v) => !StringCompare.isEqualIgnoringCase(v.version, version ?? ""),
    )
    .toReversed();

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text max-w-[750px]">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">
              {verseVersions?.at(0)?.book.name || "..."} {chapterText}:
              {verseNumber || "..."}
            </h1>
            <h4 className="text-xs font-bold opacity-70">
              Compare versions with:
            </h4>
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
      {isLoadingVerseVersions && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="w-10/12 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-3/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
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

      {/* selected version */}
      {selectedVersion && (
        <div
          ref={refVerse}
          className={
            inViewSelectedVersion
              ? "w-full block"
              : "fixed left-0 top-16 px-7 z-50 w-full animate-show-from-top bg-background border-b border-b-border shadow-primary/10 shadow-lg flex justify-center"
          }
        >
          <div className="mb-1 text-text/95 w-full mt-1 text-lg select-none rounded-md px-1 py-[2px] bg-secondary/30 underline underline-offset-2 decoration-dashed decoration-primary relative max-w-[750px]">
            <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
              {selectedVersion.version}
            </sup>{" "}
            {selectedVersion.book.chapter.verses.at(0)}
          </div>
        </div>
      )}

      {othersVersions?.map((verse, index) => (
        <div
          key={index}
          id={(index + 1).toString()}
          className="text-text/95 w-full mt-1 border-t border-dashed border-t-border/70 pt-3 text-lg select-none rounded-md px-1 py-[2px] hide-buttons"
        >
          <sup className="font-bold border rounded-sm px-[2px] border-dashed border-gray-400 -mb-5">
            {verse.version}
          </sup>{" "}
          <br />
          <div className="flex flex-wrap">
            {verse.diffs.map((token, tokenIndex) => (
              <Fragment key={token.token + tokenIndex + verse.version}>
                <span className="mr-1.5">{tokenIndex > 1 ? " " : ""}</span>
                <span
                  className={
                    token.level === 0
                      ? "bg-danger/30 rounded-sm mt-0.5"
                      : token.level === 1
                        ? "bg-danger/20 rounded-sm mt-0.5"
                        : token.level === 2
                          ? "bg-warning/10 rounded-sm mt-0.5"
                          : token.level === 3
                            ? "rounded-sm mt-0.5"
                            : ""
                  }
                >
                  {token.token}
                </span>
              </Fragment>
            ))}
          </div>
          <div className="flex w-full pt-3 gap-1.5">
            <Link
              className="text-[0.75rem] bg-surface p-1 px-3 rounded hover:bg-info/30 cursor-pointer"
              href={`/reader?version=${verse.version}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`}
            >
              <LinkIcon
                width={13}
                height={13}
                className="inline -mt-0.5 mr-1"
              />
              Open {verse.version}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
