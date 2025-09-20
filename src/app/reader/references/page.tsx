"use client";
import ArrowLeftIconImage from "@/assets/icons/arrow-left.svg";
import DocRefIcon from "@/assets/icons/doc-ref.svg";
import { BookInfo } from "@/entities/BookInfo";
import { Chapter } from "@/entities/Chapter";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Reference } from "@/entities/Reference";
import { Params, ParamType } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import LinkIcon from "@/assets/icons/link-icon.svg";
import DeleteIcon from "@/assets/icons/delete-icon.svg";
import EditIcon from "@/assets/icons/edit-icon.svg";
import LoadingIcon from "@/assets/icons/loading-icon.svg";
import AddIcon from "@/assets/icons/add-icon.svg";
import Link from "next/link";

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
      `${verse.abbrev.toLowerCase()} ${verse.numChapter}:${verseNumber}` !==
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

  const { data: books } = useQuery({
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
      gcTime: 1_000 * 5,
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

  const book = books?.find(
    ({ abbr }) => abbr.toLowerCase() === bookAbbr?.toLowerCase()
  );

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-backcolor">
      <div className="select-none fixed top-0 left-0 w-full bg-backcolor border-b border-gray-300 p-6 py-2 z-10 shadow">
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
        <div className="flex flex-row gap-2 animate-pulse my-2">
          <Image
            src={LoadingIcon}
            alt="Loading icon image"
            width={24}
            height={24}
            className="animate-spin"
          />
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
              className="flex select-none flex-col py-1 pl-3 px-2 border-l-4 border-gray-500/40 hover:border-slate-700/40 bg-gray-400/20 hover:bg-gray-500/20 rounded"
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
              {note && (
                <>
                  <hr className="opacity-20 border-dashed my-1 mr-1" />
                  <p className="mt-1 bg-slate-500/10 p-2 italic rounded">
                    {note}
                  </p>
                </>
              )}
              <div className="flex w-full pt-3 gap-1.5">
                <Link
                  className="text-[0.75rem] bg-gray-500/20 p-1 px-3 rounded hover:bg-gray-500/40"
                  href={linkToOpen ?? "#"}
                >
                  <Image
                    width={13}
                    height={13}
                    alt="Icon link to reference"
                    src={LinkIcon}
                    className="inline -mt-0.5 mr-1"
                  />
                  Open
                </Link>
                <Link
                  className="text-[0.75rem] bg-gray-500/20 p-1 px-3 rounded hover:bg-gray-500/40"
                  href={`/reader/references/edit?id=${id}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}&version=${versionAbbr}`}
                >
                  <Image
                    width={13}
                    height={13}
                    alt="Icon link to reference"
                    src={EditIcon}
                    className="inline -mt-0.5 mr-1"
                  />
                  Edit
                </Link>
                <button
                  className="text-[0.75rem] bg-gray-500/20 p-1 px-3 rounded hover:bg-gray-500/40 cursor-pointer"
                  onClick={() => handleRemove(id)}
                >
                  <Image
                    width={13}
                    height={13}
                    alt="Icon delete to reference"
                    src={DeleteIcon}
                    className="inline -mt-0.5 mr-1"
                  />
                  Remove
                </button>
              </div>
            </div>
          )
        )}
        <Link
          className="w-fit mt-2 text-[0.85rem] text-black/90 bg-gray-500/20 p-1 px-2 rounded hover:bg-gray-500/40"
          href={`/reader/references/add?book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}&version=${versionAbbr}`}
          hidden={isLoadingReferencesDetails}
        >
          <Image
            width={13}
            height={13}
            alt="Icon link to reference"
            src={AddIcon}
            className="inline -mt-0.5 mr-1"
          />
          Add new reference
        </Link>
      </div>
    </div>
  );
}
