"use client";
import ArrowLeftIconImage from "@/assets/icons/arrow-left.svg";
import ArrowRightIconImage from "@/assets/icons/arrow-right.svg";
import HomeIconImage from "@/assets/icons/home.svg";
import { BookInfo } from "@/entities/BookInfo";
import type { Chapter } from "@/entities/Chapter";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

export default function Reader() {
  const { ref: refHeader, inView: inViewHeader } = useInView({
    threshold: 0.3,
  });
  const searchParams = useSearchParams();
  const bookAbbr = searchParams.get("book") || "";
  const versionAbbr = searchParams.get("version") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const refSelected = useRef<HTMLDivElement>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const router = useRouter();

  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ["books", versionAbbr, bookAbbr, chapterNumber],
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

  function handleClickVerse(
    ev: MouseEvent<HTMLParagraphElement, globalThis.MouseEvent>
  ) {
    if (ev.target instanceof HTMLElement) {
      setSelectedVerse(parseInt(ev.target.id, 10) || null);
    }
  }

  function handlePreviousChapter() {
    if (chapter?.previous) {
      router.push(
        `/reader?book=${chapter?.previous.abbrev}&version=${versionAbbr}&chapter=${chapter?.previous.numChapter}`
      );
      setSelectedVerse(null);
    }
  }

  function handleNextChapter() {
    if (chapter?.next) {
      router.push(
        `/reader?book=${chapter?.next.abbrev}&version=${versionAbbr}&chapter=${chapter?.next.numChapter}`
      );
      setSelectedVerse(null);
    }
  }

  function handleCompare(verseIndex: number) {
    router.push(
      `/reader/compare?book=${bookAbbr}&chapter=${chapterNumber}&verse=${
        verseIndex + 1
      }`
    );
  }

  function handleOnKeyDown(event: KeyboardEvent) {
    const selected = document.querySelector(
      "div:has(.control-buttons):not(.hidden-buttons)"
    );

    if (!selected) return;

    if (event.key === "1") {
      event.preventDefault();
      return;
    }

    if (event.key === "2") {
      event.preventDefault();
      return;
    }

    if (event.key === "3") {
      event.preventDefault();
      return;
    }

    if (event.key === "4") {
      event.preventDefault();
      const verseIndex = parseInt(refSelected.current?.id ?? "1", 10);
      handleCompare(verseIndex - 1);
      return;
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, []);

  const bookName = books?.find((b) => b.abbr === bookAbbr)?.name ?? "...";
  const chapterText = `Chapter ${chapterNumber ?? "..."}`;
  const versionText = versionAbbr ?? "...";

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-[#f4ece8]">
      {!inViewHeader && (
        <div className="select-none fixed top-0 left-0 w-full bg-[#f4ece8] border-b border-gray-300 p-6 py-2 z-10 shadow animate-show-from-top">
          <div className="flex items-center">
            <div className="flex flex-col">
              {isLoadingBooks ? (
                <div className="w-10/12 h-6 rounded-sm bg-slate-400/70 animate-pulse mb-1" />
              ) : (
                <h1 className="text-2xl font-bold">{bookName}</h1>
              )}
              <h2 className="text-sm font-bold opacity-70">{chapterText}</h2>
              <h3 className="text-xs font-bold opacity-50">{versionText}</h3>
            </div>
            <div className="flex ml-auto">
              <Link
                href="/"
                className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
              >
                <Image
                  width={30}
                  height={30}
                  src={HomeIconImage}
                  alt="Image - home icon"
                />
              </Link>
              <button
                className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
                onClick={handlePreviousChapter}
                disabled={!chapter?.previous}
              >
                <Image
                  width={30}
                  height={30}
                  src={ArrowLeftIconImage}
                  alt="Image - next left icon"
                />
              </button>
              <button
                className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
                onClick={handleNextChapter}
                disabled={!chapter?.next}
              >
                <Image
                  width={30}
                  height={30}
                  src={ArrowRightIconImage.src}
                  alt="Image - next right icon"
                />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center select-none">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold" ref={refHeader}>
            {bookName}
          </h1>
          <h2 className="text-sm font-bold opacity-70">{chapterText}</h2>
          <h3 className="text-xs font-bold opacity-50">{versionText}</h3>
        </div>
        <div className="flex ml-auto">
          <Link
            href="/"
            className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
          >
            <Image
              width={30}
              height={30}
              src={HomeIconImage}
              alt="Image - home icon"
            />
          </Link>
          <button
            className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
            onClick={handlePreviousChapter}
            disabled={!chapter?.previous}
          >
            <Image
              width={30}
              height={30}
              src={ArrowLeftIconImage.src}
              alt="Image - next left icon"
            />
          </button>
          <button
            className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
            onClick={handleNextChapter}
            disabled={!chapter?.next}
          >
            <Image
              width={30}
              height={30}
              src={ArrowRightIconImage.src}
              alt="Image - next right icon"
            />
          </button>
        </div>
      </div>

      {/* Loading verses */}
      {isLoadingChapter && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="w-10/12 h-6 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
              <div className="w-full h-6 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
              <div className="w-3/6 h-6 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
              <div className="w-5/6 h-6 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
              <div className="w-2/6 h-6 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
            </div>
          ))}
        </div>
      )}

      {/* Verses */}
      {chapter?.book.chapter.verses.map((verse, index) => (
        <div
          key={index}
          id={(index + 1).toString()}
          ref={selectedVerse === index + 1 ? refSelected : null}
          className={
            selectedVerse === index + 1
              ? "cursor-cell mt-1 text-lg select-none rounded-md px-1 py-[2px] bg-amber-100 underline underline-offset-2 decoration-dashed decoration-amber-700 relative"
              : "cursor-cell mt-1 text-lg hover:bg-gray-300 select-none rounded-md px-1 py-[2px] hide-buttons"
          }
          onClick={handleClickVerse}
        >
          <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
            {index + 1}
          </sup>{" "}
          {verse}
          <div className="control-buttons absolute left-0 -bottom-9 z-30 rounded-sm bg-amber-200  border-amber-700 border border-dashed p-1 w-full gap-2 flex">
            <button className="border rounded-sm px-[3px] border-dashed border-gray-400 text-sm bg-gray-100 flex cursor-pointer hover:bg-amber-100">
              <span className="hidden sm:inline mr-1 text-[0.7rem]">[1]</span>
              Add ref.
            </button>
            <button className="border rounded-sm px-[3px] border-dashed border-gray-400 text-sm bg-gray-100 flex cursor-pointer hover:bg-amber-100">
              <span className="hidden sm:inline mr-1 text-[0.7rem]">[2]</span>
              Start devot.
            </button>
            <button className="border rounded-sm px-[3px] border-dashed border-gray-400 text-sm bg-gray-100 flex cursor-pointer hover:bg-amber-100">
              <span className="hidden sm:inline mr-1 text-[0.7rem]">[3]</span>
              Mark color
            </button>
            <button
              className="border rounded-sm px-[3px] border-dashed border-gray-400 text-sm bg-gray-100 flex cursor-pointer hover:bg-amber-100"
              onClick={() => handleCompare(index)}
            >
              <span className="hidden sm:inline mr-1">[4]</span>
              Compare
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
