"use client";
import ArrowLeftIconImage from "@/assets/icons/arrow-left.svg";
import type { Chapter } from "@/entities/Chapter";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export default function Compare() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookAbbr = searchParams.get("book") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const verseNumber = searchParams.get("verse")
    ? parseInt(searchParams.get("verse")!, 10)
    : null;
  const { data: verseVersions, isLoading: isLoadingVerseVersions } = useQuery({
    queryKey: ["compare", bookAbbr, chapterNumber, verseNumber],
    queryFn: async () => {
      const versesCompareResponse = await fetch(
        `/api/versions/compare/${bookAbbr}/${chapterNumber}/${verseNumber}`
      );

      await ThrowByResponse.throwsIfNotOk(versesCompareResponse);

      const chapterData = await versesCompareResponse.json();

      return chapterData as Chapter[];
    },
  });

  function handleOnPrevious() {
    router.back()
  }

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-backcolor">
      <div className="select-none fixed top-0 left-0 w-full bg-backcolor border-b border-gray-300 p-6 py-2 z-10 shadow">
        <div className="flex items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">
              {verseVersions?.at(0)?.book.name || "..."}
            </h1>
            <h2 className="text-sm font-bold opacity-70">
              {chapterNumber ? `Chapter ${chapterNumber}` : "..."}
            </h2>
            <h3 className="text-xs font-bold opacity-50">
              {verseNumber ? `Verse ${verseNumber}` : "..."}
            </h3>
            <h4 className="text-xs font-bold opacity-70">
              Compare versions:
            </h4>
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
      <hr className="mt-18 opacity-0" />

      {/* Loading verses */}
      {isLoadingVerseVersions && (
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

      {verseVersions?.map((verse, index) => (
        <div
          key={index}
          id={(index + 1).toString()}
          className="cursor-cell mt-3 text-lg hover:bg-gray-300 select-none rounded-md px-1 py-[2px] hide-buttons border-b border-b-gray-400 border-dashed"
        >
          <h2 className="text-xl font-medium italic">{verse.version}</h2>
          <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
            {verse.book.name} {verse.book.chapter.number}:{verseNumber}
          </sup>
          <br />
          {verse.book.chapter.verses.at(0) || "..."}
        </div>
      ))}
    </div>
  );
}
