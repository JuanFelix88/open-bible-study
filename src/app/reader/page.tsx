"use client";
import { BookInfo } from "@/entities/BookInfo";
import type { Chapter } from "@/entities/Chapter";
import { Reference } from "@/entities/Reference";
import { SingleEvent } from "@/entities/SingleEvent";
import { useDialog } from "@/hooks/useDialog";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import ArrowLeftIcon from "../components/icons/ArrowLeftIcon";
import ArrowRightIcon from "../components/icons/ArrowRightIcon";
import CompareIcon from "../components/icons/CompareIcon";
import DocumentIcon from "../components/icons/DocumentIcon";
import RefIcon from "../components/icons/RefIcon";
import SearchIcon from "../components/icons/SearchIcon";
import ShareIcon from "../components/icons/ShareIcon";
import { Reading } from "@/entities/Reading";
import CopyIcon from "../components/icons/CopyIcon";

function referencesIncludesVerse(
  references: Reference[] | undefined,
  bookAbbr: string,
  chapterNumber: number,
  verseNumber: number
) {
  if (!references) return false;

  return references.some(({ verses }) =>
    verses.some(
      (v) =>
        v.numVerse === verseNumber &&
        v.numChapter === chapterNumber &&
        v.abbrev.toLowerCase() === bookAbbr.toLowerCase()
    )
  );
}

export default function Reader() {
  const { ref: refHeader, inView: inViewHeader } = useInView({});
  const searchParams = useSearchParams();
  const bookAbbr = searchParams.get("book") || "";
  const selectedVerseParam = searchParams.get("verse");
  const versionAbbr = searchParams.get("version") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const refSelected = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setDialog } = useDialog();

  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");

      await ThrowByResponse.throwsIfNotOk(booksResponse);

      const booksData = await booksResponse.json();

      return booksData as BookInfo[];
    },
  });

  const { data: chapter, isLoading: isLoadingChapter } = useQuery({
    queryKey: ["chapter", versionAbbr, bookAbbr, chapterNumber],
    queryFn: async () => {
      const chapterResponse = await fetch(
        `/api/versions/${versionAbbr}/${bookAbbr}/${chapterNumber}`
      );

      await ThrowByResponse.throwsIfNotOk(chapterResponse);

      const chapterData = await chapterResponse.json();

      return chapterData as Chapter;
    },
  });

  const { data: references } = useQuery({
    queryKey: ["references", bookAbbr, chapterNumber],
    staleTime: 1_000 * 3,
    queryFn: async () => {
      const chapterReferences = await fetch(
        `/api/references/${bookAbbr}/${chapterNumber}`
      );

      await ThrowByResponse.throwsIfNotOk(chapterReferences);

      const booksData = await chapterReferences.json();

      return booksData.map((r: Reference) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })) as Reference[];
    },
  });

  function handleClickVerse(
    ev: MouseEvent<HTMLParagraphElement, globalThis.MouseEvent>
  ) {
    if (!(ev.target instanceof HTMLElement)) return;

    const newSelected = parseInt(ev.target.id, 10) || null;

    setSelectedVerse(newSelected);
    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${ev.target.id}`,
      {
        scroll: false,
      }
    );

    router.prefetch(
      `/reader/references?version=${versionAbbr}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${ev.target.id}`
    );
  }

  function handleUnselectVerse() {
    setSelectedVerse(null);
    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}`,
      {
        scroll: false,
      }
    );
  }

  function handlePreviousChapter() {
    if (chapter?.previous) {
      setSelectedVerse(null);
      router.push(
        `/reader?book=${chapter?.previous.abbrev}&version=${versionAbbr}&chapter=${chapter?.previous.numChapter}`
      );
    }
  }

  function handleNextChapter() {
    if (chapter?.next) {
      setSelectedVerse(null);
      router.push(
        `/reader?book=${chapter?.next.abbrev}&version=${versionAbbr}&chapter=${chapter?.next.numChapter}`
      );
    }
  }

  function handleCompare(ev: SingleEvent, verseIndex: number) {
    router.push(
      `/reader/compare?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${
        verseIndex + 1
      }`
    );
    ev.stopPropagation();
  }

  function handleShare(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();

    navigator.clipboard.writeText(
      `${window.location.origin}/share?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`
    );

    setDialog({
      title: "Link copied!",
      message: `Verse ${verseNumber} ready to share.`,
      ms: 3500,
    });
  }

  function handleCopyVerse(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();

    if (!selectedVerse) return;

    const verseText = chapter?.book.chapter.verses.at(selectedVerse - 1);
    const displayVerse = `${bookAbbr} ${chapterNumber}:${selectedVerse}\n${verseText}`;

    if (!verseText) return;

    navigator.clipboard.writeText(displayVerse);

    setDialog({
      title: "Verse copied!",
      message: `Verse ${verseNumber} copied to clipboard.`,
      ms: 3500,
    });
  }

  function handleOnKeyDown(event: KeyboardEvent) {
    const selected = document.querySelector(
      "div:has(.control-buttons):not(.hidden-buttons)"
    );

    const verseNumber = parseInt(refSelected.current?.id ?? "1", 10);
    if (!selected) return;

    if (event.key === "Escape") {
      event.preventDefault();
      handleUnselectVerse();
      return;
    }

    if (event.key === "1") {
      event.preventDefault();
      handleOpenReferences(event, verseNumber - 1);
      return;
    }

    if (event.key === "2") {
      event.preventDefault();
      handleCompare(event, verseNumber - 1);
      return;
    }

    if (event.key === "3") {
      event.preventDefault();
      handleShare(event, verseNumber);
      return;
    }

    if (event.key === "4") {
      event.preventDefault();
      handleCopyVerse(event, verseNumber);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      handlePreviousVerse();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleNextVerse();
      return;
    }
  }

  function handleOpenReferences(event: SingleEvent, verseIndex: number) {
    event.stopPropagation();
    const verseNumber = verseIndex + 1;
    router.push(
      `/reader/references?version=${versionAbbr}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`
    );
  }

  function handlePreviousVerse() {
    setSelectedVerse((prev) => {
      if (prev === null) return null;
      if (prev <= 1) return prev;
      const previousVerse = prev - 1;
      queueMicrotask(() =>
        refSelected.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      );
      return previousVerse;
    });
  }

  function handleNextVerse() {
    setSelectedVerse((prev) => {
      if (prev === null) return null;
      if (prev >= chapter!.book.chapter.verses.length) return prev;
      const nextVerse = prev + 1;

      queueMicrotask(() =>
        refSelected.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      );

      return nextVerse;
    });
  }

  useEffect(() => {
    if (selectedVerse === null) return;

    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${selectedVerse}`,
      { scroll: false }
    );
  }, [selectedVerse, chapter]);

  useEffect(() => {
    refSelected.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [refSelected.current]);

  useEffect(() => {
    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, [bookAbbr, chapterNumber, chapter]);

  useEffect(() => {
    if (selectedVerseParam && /[0-9]+/.test(selectedVerseParam)) {
      setSelectedVerse(parseInt(selectedVerseParam, 10) || null);
    }
  }, [bookAbbr, chapterNumber]);

  useEffect(() => {
    if (chapter?.previous) {
      router.prefetch(
        `/reader?book=${chapter.previous.abbrev}&version=${versionAbbr}&chapter=${chapter.previous.numChapter}`
      );
    }

    if (chapter?.next) {
      router.prefetch(
        `/reader?book=${chapter.next.abbrev}&version=${versionAbbr}&chapter=${chapter.next.numChapter}`
      );
    }
  }, [chapter]);

  useEffect(() => {
    const readingStr = localStorage.getItem("reading");

    if (!readingStr) {
      const newReading = new Reading(
        bookAbbr,
        chapterNumber || 1,
        selectedVerse
      );

      localStorage.setItem("reading", JSON.stringify(newReading));
      return;
    }

    // const reading = Reading.fromString(readingStr)
  }, []);

  const bookName =
    books?.find((b) => b.abbr.toLowerCase() === bookAbbr.toLowerCase())?.name ??
    "...";
  const chapterText = chapterNumber?.toString() ?? "...";
  const versionText = versionAbbr ?? "...";

  return (
    <div className="flex min-h-screen flex-col px-7 pr-2 py-5 sm:py-7 pb-15 bg-background relative text-text">
      {!inViewHeader && (
        <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-40 shadow animate-show-from-top">
          <div className="flex items-center">
            <div className="flex flex-col">
              {isLoadingBooks ? (
                <div className="w-10/12 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              ) : (
                <h1 className="text-2xl sm:text-4xl font-bold">
                  {bookName} {chapterText}
                  {selectedVerse !== null ? (
                    <span className="text-text/80">{`:${selectedVerse}`}</span>
                  ) : (
                    ""
                  )}
                </h1>
              )}
              <h3 className="text-xs font-bold text-text/50">{versionText}</h3>
            </div>
            <div className="flex ml-auto">
              <Link
                href={`/search?version=${versionAbbr}`}
                className="cursor-pointer ml-4 mt-1.5 p-2 rounded-md hover:bg-surface opacity-80"
              >
                <SearchIcon width={25} height={25} />
              </Link>
              <button
                className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
                onClick={handlePreviousChapter}
                disabled={!chapter?.previous}
              >
                <ArrowLeftIcon width={30} height={30} />
              </button>
              <button
                className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
                onClick={handleNextChapter}
                disabled={!chapter?.next}
              >
                <ArrowRightIcon width={30} height={30} />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center select-none">
        <div className="flex flex-col mb-2">
          <h1 className="text-2xl sm:text-4xl font-bold" ref={refHeader}>
            {bookName} {chapterText}
            {selectedVerse !== null ? (
              <span className="text-text/80">{`:${selectedVerse}`}</span>
            ) : (
              ""
            )}
          </h1>
          <h3 className="text-xs font-bold text-text/50">{versionText}</h3>
        </div>
        <div className="flex ml-auto min-w-[180px] pr-2">
          <Link
            href={`/search?version=${versionAbbr}`}
            className="cursor-pointer ml-4 mt-1.5 p-2 rounded-md hover:bg-surface opacity-80"
          >
            <SearchIcon width={25} height={25} />
          </Link>
          <button
            className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
            onClick={handlePreviousChapter}
            disabled={!chapter?.previous}
          >
            <ArrowLeftIcon width={30} height={30} />
          </button>
          <button
            className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
            onClick={handleNextChapter}
            disabled={!chapter?.next}
          >
            <ArrowRightIcon width={30} height={30} />
          </button>
        </div>
      </div>

      {/* Loading verses */}
      {isLoadingChapter && (
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

      {/* Verses */}
      {chapter?.book.chapter.verses.map((verse, verseIndex) => (
        <div key={verseIndex} className="flex flex-row ">
          <div
            key={verseIndex}
            id={(verseIndex + 1).toString()}
            ref={selectedVerse === verseIndex + 1 ? refSelected : null}
            className={
              selectedVerse === verseIndex + 1
                ? "cursor-cell text-text/95 w-full mt-1 text-lg select-none rounded-md px-1 py-[2px] bg-secondary/30 underline underline-offset-2 decoration-dashed decoration-primary relative"
                : "cursor-cell text-text/95 w-full mt-1 text-lg hover:bg-surface select-none rounded-md px-1 py-[2px] hide-buttons"
            }
            onClick={handleClickVerse}
          >
            <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
              {verseIndex + 1}
            </sup>{" "}
            {verse}
            <div className="control-buttons absolute left-0 -bottom-9 z-20 rounded-sm bg-secondary border-primary border border-dashed p-1 w-full gap-2 flex flex-wrap">
              <button
                className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                onClick={(e) => handleOpenReferences(e, verseIndex)}
              >
                <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                  [1]
                </span>
                <RefIcon
                  className="sm:hidden mr-1 opacity-80"
                  width={12}
                  height={12}
                />
                Ref.
              </button>
              <button
                className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                onClick={(e) => handleCompare(e, verseIndex)}
              >
                <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                  [2]
                </span>
                <CompareIcon
                  className="sm:hidden mr-1 opacity-80"
                  width={12}
                  height={12}
                />
                Compare
              </button>
              <button
                className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                onClick={(e) => handleShare(e, verseIndex + 1)}
              >
                <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                  [3]
                </span>
                <ShareIcon
                  className="sm:hidden mr-1 opacity-80"
                  width={12}
                  height={12}
                />
                Share
              </button>
              <button
                className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                onClick={(e) => handleCopyVerse(e, verseIndex + 1)}
              >
                <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                  [4]
                </span>
                <CopyIcon
                  className="sm:hidden mr-1 opacity-80"
                  width={12}
                  height={12}
                />
                Copy
              </button>
              <button
                className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                onClick={() => setSelectedVerse(null)}
              >
                <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                  [Esc]
                </span>
                <span className="hidden sm:inline">Unselect</span>
                <span className="sm:hidden mx-1">X</span>
              </button>
            </div>
          </div>
          <div className="flex flex-start flex-col min-w-[20px] py-2 pl-1">
            {referencesIncludesVerse(
              references,
              chapter.book.abbrev,
              chapter.book.chapter.number,
              verseIndex + 1
            ) && (
              <div
                className={
                  selectedVerse === verseIndex + 1
                    ? "flex rounded-full text-primary animate-fade-in-from-bottom"
                    : "flex rounded-full text-text/70 animate-fade-in-from-bottom"
                }
              >
                <DocumentIcon width={16} height={16} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
