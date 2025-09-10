"use client";
import type { Chapter } from "@/app/api/versions/[version_abbr]/[book_abbr]/[chapter_number]/route";
import ArrowLeftIconImage from "@/assets/icons/arrow-left.svg";
import ArrowRightIconImage from "@/assets/icons/arrow-right.svg";
import HomeIconImage from "@/assets/icons/home.svg";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import Image from "next/image";
import Link from "next/link";

export default function Reader() {
  const { ref, inView: inViewHeader } = useInView({ threshold: 0.3 });
  const searchParams = useSearchParams();
  const bookAbbr = searchParams.get("book") || "";
  const versionAbbr = searchParams.get("version") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;

  const [books, setBooks] = useState<any[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const router = useRouter();

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
      setChapter(null);
      setSelectedVerse(null);
    }
  }

  function handleNextChapter() {
    if (chapter?.next) {
      router.push(
        `/reader?book=${chapter?.next.abbrev}&version=${versionAbbr}&chapter=${chapter?.next.numChapter}`
      );
      setChapter(null);
      setSelectedVerse(null);
    }
  }

  useEffect(() => {
    fetch("/api/books")
      .then((response) => response.json())
      .then((data) => setBooks(data))
      .catch((error) => console.error("Error fetching books:", error));

    fetch(`/api/versions/${versionAbbr}/${bookAbbr}/${chapterNumber}`)
      .then((response) => response.json())
      .then((data) => setChapter(data));
  }, [bookAbbr, chapterNumber]);

  const selectedBook = books.find((b) => b.abbr === bookAbbr) || null;

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-[#f4ece8]">
      {!inViewHeader && (
        <div className="select-none fixed top-0 left-0 w-full bg-[#f4ece8] border-b border-gray-300 p-6 py-2 z-10 shadow animate-show-from-top">
          <div className="flex items-center">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">
                {selectedBook ? selectedBook.name : "..."}
              </h1>
              <h2 className="text-sm font-bold opacity-70">
                {chapterNumber ? `Chapter ${chapterNumber}` : "..."}
              </h2>
              <h3 className="text-xs font-bold opacity-50">
                {versionAbbr ? `${versionAbbr}` : "..."}
              </h3>
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
          <h1 className="text-4xl font-bold" ref={ref}>
            {selectedBook ? selectedBook.name : "..."}
          </h1>
          <h2 className="text-sm font-bold opacity-70">
            {chapterNumber ? `Chapter ${chapterNumber}` : "..."}
          </h2>
          <h3 className="text-xs font-bold opacity-50">
            {versionAbbr ? `${versionAbbr}` : "..."}
          </h3>
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
      {chapter?.book.chapter.verses.map((verse, index) => (
        <p
          key={index}
          id={(index + 1).toString()}
          className={
            selectedVerse === index + 1
              ? "cursor-cell mt-1 text-lg hover:bg-amber-200 select-none rounded-md px-1 py-[2px] bg-amber-100 underline underline-offset-2 decoration-dashed decoration-amber-700 relative"
              : "cursor-cell mt-1 text-lg hover:bg-gray-300 select-none rounded-md px-1 py-[2px] hide-buttons"
          }
          onClick={handleClickVerse}
        >
          <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
            {index + 1}
          </sup>{" "}
          {verse}
          <div className="control-buttons absolute left-0 -bottom-9 z-30 rounded-sm bg-amber-200  border-amber-700 border border-dashed p-1 w-full gap-2 flex" >
            <button className="border rounded-sm px-[3px] border-dashed border-gray-400 text-sm  bg-gray-100 flex">
              [1] Add ref
            </button>
            <button className="border rounded-sm px-[3px] border-dashed border-gray-400 text-sm  bg-gray-100 flex">
              [2] Start devotional
            </button>
            <button className="border rounded-sm px-[3px] border-dashed border-gray-400 text-sm  bg-gray-100 flex">
              [3] Mark color
            </button>
          </div>
        </p>
      ))}
    </div>
  );
}
