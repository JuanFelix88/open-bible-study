"use client";
import ArrowLeftIconImage from "@/assets/icons/arrow-left.svg";
import DocRefIcon from "@/assets/icons/doc-ref.svg";
import { BookInfo } from "@/entities/BookInfo";
import { Chapter } from "@/entities/Chapter";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Reference } from "@/entities/Reference";
import { Params, ParamType } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

function getVerse(
  bookAbbr: string,
  chapterNumber: number,
  verseNumber: number,
  verses: LinkToVerse[],
  chapters: Chapter[]
) {
  const otherRelatedVerse = verses.find(
    (verse) =>
      `${verse.abbrev.toLowerCase()} ${verse.numChapter}:${verseNumber}` !==
      `${bookAbbr?.toLowerCase()} ${chapterNumber}:${verseNumber}`
  );

  if (!otherRelatedVerse) {
    return {
      text: null,
      displayVerse: null,
    };
  }

  const chapter = chapters.find(
    (c) =>
      `${c.book.abbrev.toLowerCase()} ${c.book.chapter.number}` ===
      `${otherRelatedVerse.abbrev.toLowerCase()} ${
        otherRelatedVerse.numChapter
      }`
  );

  if (!chapter) {
    return {
      text: null,
      displayVerse: null,
    };
  }

  return {
    text: chapter.book.chapter.verses.at(verseNumber - 1) ?? null,
    displayVerse: `${otherRelatedVerse.abbrev.toUpperCase()} ${
      otherRelatedVerse.numChapter
    }:${otherRelatedVerse.numVerse}`,
  };
}

export default function References() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [bookAbbr] = Params.getParamFromSearchParams(
    "book",
    searchParams,
    ParamType.STRING
  );
  const [versionAbbr] = Params.getParamFromSearchParams(
    "version",
    searchParams,
    ParamType.STRING
  );
  const [chapterNumber] = Params.getParamFromSearchParams(
    "chapter",
    searchParams,
    ParamType.NUMBER
  );
  const [verseNumber] = Params.getParamFromSearchParams(
    "verse",
    searchParams,
    ParamType.NUMBER
  );

  const { data: books } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");

      await ThrowByResponse.throwsIfNotOk(booksResponse);

      const booksData = await booksResponse.json();

      return booksData as BookInfo[];
    },
  });

  const { data: references } = useQuery({
    queryKey: ["references", bookAbbr, chapterNumber],
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

  const relatedReferences = references?.filter((reference) =>
    reference.verses.some((v) => v.numVerse === verseNumber)
  );

  const { data: referencesDetails, isLoading: isLoadingReferencesDetails } =
    useQuery({
      queryKey: [
        "references-details",
        versionAbbr,
        relatedReferences?.map((r) => r.id)?.join(","),
      ],
      queryFn: async () => {
        if (!relatedReferences || relatedReferences.length === 0) {
          return [];
        }

        if (!bookAbbr) return [];
        if (!chapterNumber) return [];
        if (!verseNumber) return [];

        const distinctBooksChapters = Array.from(
          new Set(
            relatedReferences.flatMap((r) =>
              r.verses.map((v) => `${v.abbrev}/${v.numChapter}`)
            )
          )
        );

        const chaptersResponses = await Promise.all(
          distinctBooksChapters.map((bookAndChapterStr) =>
            fetch(`/api/versions/${versionAbbr}/${bookAndChapterStr}`)
          )
        );

        for (const chapterResponse of chaptersResponses) {
          await ThrowByResponse.throwsIfNotOk(chapterResponse);
        }

        const chapters: Chapter[] = await Promise.all(
          chaptersResponses.map((vr) => vr.json())
        );

        return relatedReferences.map(
          ({ id, verses, createdAt, note }) => {
            const { text, displayVerse } = getVerse(
              bookAbbr,
              chapterNumber,
              verseNumber,
              verses,
              chapters
            );

            return {
              id,
              createdAt,
              note,
              displayVerse,
              text,
            };
          }
        );
      },
    });

  function handlePrevious() {
    router.back();
  }

  const book = books?.find(
    ({ abbr }) => abbr.toLowerCase() === bookAbbr?.toLowerCase()
  );

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-[#f4ece8]">
      <div className="select-none fixed top-0 left-0 w-full bg-[#f4ece8] border-b border-gray-300 p-6 py-2 z-10 shadow">
        <div className="flex items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">{book?.name || "..."}</h1>
            <h2 className="text-sm font-bold opacity-70">
              {chapterNumber ? `Chapter ${chapterNumber}` : "..."}
            </h2>
            <h3 className="text-xs font-bold opacity-50">
              {verseNumber ? `Verse ${verseNumber}` : "..."}
            </h3>
            <h4 className="text-xs font-bold opacity-70">
              References in text:
            </h4>
          </div>
          <div className="flex ml-auto">
            <button
              onClick={handlePrevious}
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
      <hr className="mt-20 opacity-0" />

      {isLoadingReferencesDetails && (
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

      <div className="flex flex-col gap-2 py-2">
        {referencesDetails?.map(({ id, displayVerse, text }) => (
          <div
            key={id}
            className="flex flex-col py-1 pl-3 border-l-4 border-gray-500/40 hover:border-slate-700/40 bg-gray-400/20 hover:bg-gray-500/20 rounded"
          >
            <div className="flex items-center">
              <span className="font-bold opacity-80">
                {displayVerse ?? "..."}
              </span>
              <Image
                width={16}
                height={16}
                src={DocRefIcon}
                alt="Icon - document reference"
                className="opacity-80 -mt-0.5 ml-1"
              />
            </div>
            <p className="text-lg">{text}</p>
            <div className="flex w-full pt-3 gap-1">
              <button className="text-[0.75rem] bg-gray-500/20 p-1 px-2 rounded hover:bg-gray-500/40">
                Remove
              </button>
              <button className="text-[0.75rem] bg-gray-500/20 p-1 px-2 rounded hover:bg-gray-500/40">
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
