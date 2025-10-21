"use client";
import AddIcon from "@/app/components/icons/AddIcon";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import DeleteIcon from "@/app/components/icons/DeleteIcon";
import DocumentIcon from "@/app/components/icons/DocumentIcon";
import EditIcon from "@/app/components/icons/EditIcon";
import LinkIcon from "@/app/components/icons/LinkIcon";
import LoadingIcon from "@/app/components/icons/LoadingIcon";
import { BookInfo } from "@/entities/BookInfo";
import { Chapter } from "@/entities/Chapter";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Reference } from "@/entities/Reference";
import { Params, ParamType } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function getVerse(
  bookAbbr: string,
  chapterNumber: number,
  verseNumber: number,
  verses: LinkToVerse[],
  chapters: Chapter[],
  versionAbbr: string
) {
  const otherRelatedVerse = verses.find(
    (verse) =>
      `${verse.abbrev.toLowerCase()} ${verse.numChapter}:${verse.numVerse}` !==
      `${bookAbbr?.toLowerCase()} ${chapterNumber}:${verseNumber}`
  );

  if (!otherRelatedVerse) {
    return {
      text: null,
      displayVerse: null,
      link: null,
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
      link: null,
    };
  }

  return {
    text:
      chapter.book.chapter.verses.at(otherRelatedVerse.numVerse - 1) ?? null,
    displayVerse: `${otherRelatedVerse.abbrev.toUpperCase()} ${
      otherRelatedVerse.numChapter
    }:${otherRelatedVerse.numVerse}`,
    link: `/reader?book=${otherRelatedVerse.abbrev}&version=${versionAbbr}&chapter=${otherRelatedVerse.numChapter}&verse=${otherRelatedVerse.numVerse}`,
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

  const queryclient = useQueryClient();

  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");

      await ThrowByResponse.throwsIfNotOk(booksResponse);

      const booksData = await booksResponse.json();

      return booksData as BookInfo[];
    },
  });

  const { data: referencesDetails, isLoading: isLoadingReferencesDetails } =
    useQuery({
      queryKey: [
        "references-details",
        versionAbbr,
        bookAbbr,
        chapterNumber,
        verseNumber,
      ],
      staleTime: 1_000 * 5,
      queryFn: async () => {
        const chapterReferences = await fetch(
          `/api/references/${bookAbbr}/${chapterNumber}`
        );

        await ThrowByResponse.throwsIfNotOk(chapterReferences);

        const booksData: Reference[] = await chapterReferences.json();

        const relatedReferences = booksData
          .map((r) => ({
            ...r,
            createdAt: new Date(r.createdAt),
          }))
          .filter((reference) =>
            reference.verses.some(
              (v) =>
                v.abbrev.toLowerCase() === bookAbbr?.toLowerCase() &&
                v.numChapter === chapterNumber &&
                v.numVerse === verseNumber
            )
          );

        if (!bookAbbr) return [];
        if (!chapterNumber) return [];
        if (!verseNumber) return [];
        if (!versionAbbr) return [];

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

        return relatedReferences.map(({ id, verses, createdAt, note }) => {
          const {
            text,
            displayVerse,
            link: linkToOpen,
          } = getVerse(
            bookAbbr,
            chapterNumber,
            verseNumber,
            verses,
            chapters,
            versionAbbr
          );

          return {
            id,
            createdAt,
            note,
            displayVerse: displayVerse ?? "Unknown Verse",
            text,
            linkToOpen,
          };
        });
      },
    });

  function handlePrevious() {
    router.back();
  }

  function handleRemove(id: number) {
    fetch(`/api/references/details/${id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then(() =>
        queryclient.invalidateQueries({ queryKey: ["references-details"] })
      );
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

  const bookName =
    books?.find((b) => b.abbr.toLowerCase() === bookAbbr?.toLowerCase())
      ?.name ?? "...";
  const chapterText = chapterNumber?.toString() ?? "...";

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center">
          <div className="flex flex-col">
            {isLoadingBooks ? (
              <div className="w-10/12 h-6 rounded-sm bg-surface animate-pulse mb-1" />
            ) : (
              <h1 className="text-2xl sm:text-4xl font-bold">
                {bookName} {chapterText}:{verseNumber ?? "..."}
              </h1>
            )}
            <h4 className="text-xs font-bold opacity-70">
              References in text:
            </h4>
          </div>
          <div className="flex ml-auto">
            <button
              onClick={handlePrevious}
              className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
            >
              <ArrowLeftIcon width={30} height={30} />
            </button>
          </div>
        </div>
      </div>
      <hr className="mt-11 opacity-0" />

      {isLoadingReferencesDetails && (
        <div className="flex flex-row gap-2 animate-pulse my-2">
          <LoadingIcon width={24} height={24} className="animate-spin" />
          <span className="opacity-70 italic text-xl">
            Loading references...
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 py-2">
        {referencesDetails?.map(
          ({ id, displayVerse, text, note, linkToOpen }) => (
            <div
              key={id + displayVerse}
              className="flex select-none flex-col py-1 pl-3 px-2 border-l-4 border-border bg-surface hover:opacity-95 rounded"
            >
              <div className="flex items-center">
                <span className="font-bold opacity-80">
                  {displayVerse ?? "..."}
                </span>
                <DocumentIcon
                  width={16}
                  height={16}
                  className="opacity-80 -mt-0.5 ml-1"
                />
              </div>
              <p className="text-lg">{text}</p>
              {note && (
                <>
                  <hr className="opacity-20 border-dashed my-1 mr-1" />
                  <p className="mt-1 bg-surface-strong p-2 italic rounded">
                    {note}
                  </p>
                </>
              )}
              <div className="flex w-full pt-3 gap-1.5">
                <Link
                  className="text-[0.75rem] bg-surface-strong p-1 px-3 rounded hover:bg-info/30 cursor-pointer"
                  href={linkToOpen ?? "#"}
                >
                  <LinkIcon
                    width={13}
                    height={13}
                    className="inline -mt-0.5 mr-1"
                  />
                  Open
                </Link>
                <Link
                  className="text-[0.75rem] bg-surface-strong p-1 px-3 rounded hover:bg-info/30 cursor-pointer"
                  href={`/reader/references/edit?id=${id}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}&version=${versionAbbr}`}
                >
                  <EditIcon
                    width={13}
                    height={13}
                    className="inline -mt-0.5 mr-1"
                  />
                  Edit
                </Link>
                <button
                  className="text-[0.75rem] bg-surface-strong p-1 px-3 rounded hover:bg-info/30 cursor-pointer"
                  onClick={() => handleRemove(id)}
                >
                  <DeleteIcon
                    width={13}
                    height={13}
                    className="inline -mt-0.5 mr-1"
                  />
                  Remove
                </button>
              </div>
            </div>
          )
        )}
        <Link
          className="w-fit mt-2 text-[0.85rem] text-text bg-surface p-1 px-2 rounded hover:bg-surface/60"
          href={`/reader/references/add?book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}&version=${versionAbbr}`}
          hidden={isLoadingReferencesDetails}
        >
          <AddIcon width={13} height={13} className="inline -mt-0.5 mr-1" />
          Add new reference
        </Link>
      </div>
    </div>
  );
}
