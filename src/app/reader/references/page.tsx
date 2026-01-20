"use client";
import AddIcon from "@/app/components/icons/AddIcon";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import DeleteIcon from "@/app/components/icons/DeleteIcon";
import EditIcon from "@/app/components/icons/EditIcon";
import LinkIcon from "@/app/components/icons/LinkIcon";
import { BookInfo } from "@/entities/BookInfo";
import { Chapter } from "@/entities/Chapter";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Reference } from "@/entities/Reference";
import { Params, ParamType } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";

function getVerse(
  bookAbbr: string,
  chapterNumber: number,
  verseNumber: number,
  verses: LinkToVerse[],
  chapters: Chapter[],
  versionAbbr: string,
) {
  const otherRelatedVerse = verses.find(
    (verse) =>
      `${verse.abbrev.toLowerCase()} ${verse.numChapter}:${verse.numVerse}` !==
      `${bookAbbr?.toLowerCase()} ${chapterNumber}:${verseNumber}`,
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
      }`,
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
    displayVerse: `${chapter.book.name} ${otherRelatedVerse.numChapter}:${otherRelatedVerse.numVerse}`,
    bookName: chapter.book.name,
    link: `/reader?book=${otherRelatedVerse.abbrev}&version=${versionAbbr}&chapter=${otherRelatedVerse.numChapter}&verse=${otherRelatedVerse.numVerse}`,
  };
}

export default function References() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [bookAbbr] = Params.getParamFromSearchParams(
    "book",
    searchParams,
    ParamType.STRING,
  );
  const [versionAbbr] = Params.getParamFromSearchParams(
    "version",
    searchParams,
    ParamType.STRING,
  );
  const [chapterNumber] = Params.getParamFromSearchParams(
    "chapter",
    searchParams,
    ParamType.NUMBER,
  );
  const [verseNumber] = Params.getParamFromSearchParams(
    "verse",
    searchParams,
    ParamType.NUMBER,
  );

  const { ref: refSelectedVerse, inView: inViewSelectedVerse } = useInView({
    threshold: 1,
    delay: 15,
  });

  const refVerse = useRef<HTMLDivElement>(null);

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

  const { data: selectedVerse, isLoading: isLoadingVerse } = useQuery({
    queryKey: ["verse", versionAbbr, bookAbbr, chapterNumber, verseNumber],
    queryFn: async () => {
      if (!verseNumber) return;

      const chapterResponse = await fetch(
        `/api/versions/${versionAbbr}/${bookAbbr}/${chapterNumber}`,
      );

      await ThrowByResponse.throwsIfNotOk(chapterResponse);

      const chapterData = await chapterResponse.json();

      return (chapterData as Chapter).book.chapter.verses.at(verseNumber - 1);
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
          `/api/references/${bookAbbr}/${chapterNumber}`,
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
                v.numVerse === verseNumber,
            ),
          );

        if (!bookAbbr) return [];
        if (!chapterNumber) return [];
        if (!verseNumber) return [];
        if (!versionAbbr) return [];

        const distinctBooksChapters = Array.from(
          new Set(
            relatedReferences.flatMap((r) =>
              r.verses.map((v) => `${v.abbrev}/${v.numChapter}`),
            ),
          ),
        );

        const chaptersResponses = await Promise.all(
          distinctBooksChapters.map((bookAndChapterStr) =>
            fetch(`/api/versions/${versionAbbr}/${bookAndChapterStr}`),
          ),
        );

        for (const chapterResponse of chaptersResponses) {
          await ThrowByResponse.throwsIfNotOk(chapterResponse);
        }

        const chapters: Chapter[] = await Promise.all(
          chaptersResponses.map((vr) => vr.json()),
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
            versionAbbr,
          );

          return {
            id,
            createdAt,
            note,
            displayVerse: displayVerse ?? "",
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
        queryclient.invalidateQueries({ queryKey: ["references-details"] }),
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
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text max-w-[750px]">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
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
            <Link
              className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
              href={`/reader/references/add?book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}&version=${versionAbbr}`}
              hidden={isLoadingReferencesDetails}
            >
              <AddIcon width={30} height={30} />
            </Link>
            <button
              onClick={handlePrevious}
              className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
            >
              <ArrowLeftIcon width={30} height={30} />
            </button>
          </div>
        </div>
      </div>
      <hr className="mt-13 opacity-0" />

      {/* Loading verse */}
      {isLoadingVerse && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="w-10/12 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-3/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-2/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
            </div>
          ))}
        </div>
      )}

      {/* spacer */}
      <div
        ref={refSelectedVerse}
        className="h-1 w-full bg-background text-background"
        style={{
          height: !inViewSelectedVerse ? refVerse.current?.clientHeight : 0,
        }}
      />

      {/* Selected verse */}
      {selectedVerse && (
        <div
          ref={refVerse}
          className={
            inViewSelectedVerse
              ? "block"
              : "fixed left-0 top-16 px-7 z-50 w-full animate-show-from-top bg-background border-b border-b-border shadow-primary/10 shadow-lg"
          }
        >
          <div className="mb-1 text-text/95 w-full mt-1 text-lg select-none rounded-md px-1 py-[2px] bg-secondary/30 underline underline-offset-2 decoration-dashed decoration-primary relative">
            <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
              {bookAbbr} {chapterNumber}:{verseNumber}
            </sup>
            {` `}
            {selectedVerse}
          </div>
        </div>
      )}

      {/* References */}
      <div className="flex flex-col gap-2 py-2">
        {referencesDetails?.map(
          ({ id, displayVerse, text, note, linkToOpen }) => (
            <div
              key={id + displayVerse}
              className="text-text/95 bg-surface/10 w-full mt-1 border-t border-dashed border-t-border/70 pt-3 text-lg select-none rounded-md px-1 py-[2px] hide-buttons"
            >
              <sup
                className="font-bold border rounded-sm px-[2px] border-dashed border-gray-400 -mb-5"
                hidden={!displayVerse}
              >
                {displayVerse ?? "..."}
              </sup>{" "}
              <br hidden={!displayVerse} />
              {text}
              {note && (
                <>
                  <p
                    className={
                      displayVerse
                        ? "mt-1 text-[0.95rem] italic rounded text-text/80 ml-0.5"
                        : "mt-1 italic rounded text-text/80 ml-0.5"
                    }
                  >
                    {note}
                  </p>
                </>
              )}
              <div className="flex w-full pt-2 gap-1.5">
                <Link
                  className="text-[0.75rem] bg-surface-strong p-1 px-3 rounded hover:bg-info/30 cursor-pointer"
                  href={linkToOpen ?? "#"}
                  hidden={!displayVerse}
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
          ),
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
