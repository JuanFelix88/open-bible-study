"use client";
import ArrowLeftIconImage from "@/assets/icons/arrow-left.svg";
import type { Chapter } from "@/types/Chapter";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Reader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookAbbr = searchParams.get("book") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const verseNumber = searchParams.get("verse")
    ? parseInt(searchParams.get("verse")!, 10)
    : null;
  const [verseVersions, setVerseVersions] = useState<Chapter[]>([]);

  useEffect(() => {
    if (!bookAbbr || !chapterNumber || !verseNumber) return;

    fetch(`/api/versions/compare/${bookAbbr}/${chapterNumber}/${verseNumber}`)
      .then((response) => response.json())
      .then((data) => setVerseVersions(data))
      .catch((error) => console.error("Error fetching verse versions:", error));
  }, []);

  function handleOnPrevious() {
    router.back();
  }

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-[#f4ece8]">
      <div className="select-none fixed top-0 left-0 w-full bg-[#f4ece8] border-b border-gray-300 p-6 py-2 z-10 shadow animate-show-from-top">
        <div className="flex items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">
              {verseVersions.at(0)?.book.name || "..."}
            </h1>
            <h2 className="text-sm font-bold opacity-70">
              {chapterNumber ? `Chapter ${chapterNumber}` : "..."}
            </h2>
            <h3 className="text-xs font-bold opacity-50">
              {verseNumber ? `Verse ${verseNumber}` : "..."}
            </h3>
          </div>
          <div className="flex ml-auto">
            <button
              onClick={handleOnPrevious}
              className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
            >
              <Image
                width={30}
                height={30}
                src={ArrowLeftIconImage}
                alt="Image return to reader"
              />
            </button>
          </div>
        </div>
      </div>
      <hr className='mt-18 opacity-0' />
      {verseVersions.map((verse, index) => (
        <div
          key={index}
          id={(index + 1).toString()}
          className="cursor-cell mt-1 text-lg hover:bg-gray-300 select-none rounded-md px-1 py-[2px] hide-buttons"
        >
          <h2 className='text-xl font-medium italic'>{verse.version}</h2>
          <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
            {index + 1}
          </sup>{" "}
          {verse.book.chapter.verses.at(0) || "..."}
        </div>
      ))}
    </div>
  );
}
