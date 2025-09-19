"use client";
import AddIcon from "@/assets/icons/add-icon.svg";
import ArrowLeftIconImage from "@/assets/icons/arrow-left.svg";
import DocRefIcon from "@/assets/icons/doc-ref.svg";
import EditIcon from "@/assets/icons/edit-icon.svg";
import { BookInfo } from "@/entities/BookInfo";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Reference } from "@/entities/Reference";
import { SearchResult } from "@/entities/SearchResult";
import { useDebounce } from "@/hooks/useDebounce";
import { Params, ParamType } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Payload as PostReferencePayload } from "@/app/api/references/route";
import type { Payload as PutReferecenPayload } from "@/app/api/references/details/[reference_id]/route";

export default function ReferenceMutation() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [editId] = Params.getParamFromSearchParams(
    "id",
    searchParams,
    ParamType.NUMBER
  );

  const [povBookAbbr] = Params.getParamFromSearchParams(
    "book",
    searchParams,
    ParamType.STRING
  );
  const [povVersionAbbr] = Params.getParamFromSearchParams(
    "version",
    searchParams,
    ParamType.STRING
  );
  const [povChapterNumber] = Params.getParamFromSearchParams(
    "chapter",
    searchParams,
    ParamType.NUMBER
  );
  const [povVerseNumber] = Params.getParamFromSearchParams(
    "verse",
    searchParams,
    ParamType.NUMBER
  );

  const [searchText, setSearchText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isSelectingVerse, setIsSelectingVerse] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<LinkToVerse | null>();
  const outSearchText = useDebounce(searchText, 200);

  const { data: books } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");

      await ThrowByResponse.throwsIfNotOk(booksResponse);

      const booksData = await booksResponse.json();

      return booksData as BookInfo[];
    },
  });

  const book = books?.find(
    ({ abbr }) => abbr.toLowerCase() === povBookAbbr?.toLowerCase()
  );

  const { data: searchResult, isLoading } = useQuery({
    queryKey: ["versions", povVersionAbbr, "search", outSearchText],
    queryFn: async () => {
      const searchResponse = await fetch(
        `/api/versions/${povVersionAbbr}/search?q=${encodeURIComponent(
          outSearchText
        )}`
      );

      await ThrowByResponse.throwsIfNotOk(searchResponse);

      return (await searchResponse.json()) as SearchResult[];
    },
  });

  const handleAddReference = useMutation({
    mutationFn: (data: PostReferencePayload) =>
      fetch(`/api/references`, {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => router.back(),
  });

  const handleUpdateReference = useMutation({
    mutationFn: async (data: PutReferecenPayload) => {
      const response = await fetch(`/api/references/details/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      ThrowByResponse.throwsIfNotOk(response);

      return response.json();
    },
    onSuccess: () => router.back(),
  });

  useEffect(() => {
    if (!editId) return;

    fetch(`/api/references/details/${editId}`)
      .then((res) => res.json())
      .then(({ note, verses }: Reference) => {
        setNoteText(note ?? "");

        const diffVerse = verses.find(
          (v) =>
            !(
              v.abbrev.toLowerCase() === povBookAbbr?.toLowerCase() &&
              v.numChapter === povChapterNumber &&
              v.numVerse === povVerseNumber
            )
        );

        if (diffVerse) {
          setSelectedVerse(diffVerse);
        }
      });
  }, [editId]);

  function handleSelectVerse(
    abbrev: string,
    numChapter: number,
    numVerse: number
  ) {
    setSelectedVerse({ abbrev, numChapter, numVerse });
    setIsSelectingVerse(false);
    setSearchText("");
  }

  function handleOpenEditSelectedVerse() {
    setIsSelectingVerse(true);
    setSearchText(
      selectedVerse
        ? `${selectedVerse.abbrev} ${selectedVerse.numChapter}:${selectedVerse.numVerse}`
        : ""
    );
  }

  const isEditMode = Boolean(editId);
  const title = isEditMode ? "Edit Reference" : "Add Reference";
  const displayBook = book ? book.name : "Unknown Book";
  const displayChapter = `Chapter ${povChapterNumber ?? "..."}`;
  const displayVerse = `Verse ${povVerseNumber ?? "..."}`;

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-backcolor">
      <div className="select-none fixed top-0 left-0 w-full bg-backcolor border-b border-gray-300 p-6 py-2 z-10 shadow">
        <div className="flex items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">{displayBook}</h1>
            <h2 className="text-sm font-bold opacity-70">{displayChapter}</h2>
            <h3 className="text-xs font-bold opacity-50">{displayVerse}</h3>
            <h4 className="text-xs font-bold opacity-70">{title}</h4>
          </div>
          <div className="flex ml-auto">
            <button
              className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-gray-300 opacity-80"
              onClick={() => router.back()}
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

      <hr className="opacity-0 mt-22" />

      {/* idle mode */}
      {!isSelectingVerse && (
        <>
          <span className="text-xl opacity-80">
            Basic information of reference
          </span>
          <button
            className="cursor-pointer text-[0.85rem] text-black/90 bg-gray-500/20 p-1 px-2 pr-4 rounded hover:bg-gray-500/40 w-fit mt-3"
            onClick={handleOpenEditSelectedVerse}
          >
            <Image
              width={13}
              height={13}
              alt="Icon delete to reference"
              src={EditIcon}
              className="inline -mt-0.5 mr-1"
            />
            {selectedVerse
              ? `${selectedVerse.abbrev} ${selectedVerse.numChapter}:${selectedVerse.numVerse} (verse reference - click to change)`
              : "click here to select verse"}
          </button>

          <textarea
            name=""
            onChange={(e) => setNoteText(e.target.value)}
            value={noteText}
            placeholder="Reference notes..."
            className="mt-5 p-2 border-2 bg-gray-100/60 border-gray-400 rounded-md"
          ></textarea>

          <button
            disabled={!selectedVerse}
            onClick={() =>
              !isEditMode
                ? handleAddReference.mutate({
                    references: [
                      {
                        abbr: povBookAbbr!,
                        chapterNumber: povChapterNumber!,
                        verseNumber: povVerseNumber!,
                      },
                      {
                        abbr: selectedVerse!.abbrev,
                        chapterNumber: selectedVerse!.numChapter,
                        verseNumber: selectedVerse!.numVerse,
                      },
                    ],
                    note: noteText || undefined,
                  })
                : handleUpdateReference.mutate({
                    id: editId!,
                    references: [
                      {
                        abbr: povBookAbbr!,
                        chapterNumber: povChapterNumber!,
                        verseNumber: povVerseNumber!,
                      },
                      {
                        abbr: selectedVerse!.abbrev,
                        chapterNumber: selectedVerse!.numChapter,
                        verseNumber: selectedVerse!.numVerse,
                      },
                    ],
                    note: noteText || undefined,
                  })
            }
            className="cursor-pointer text-sm bg-blue-500/20 text-gray/90 p-2 px-2 pr-4 rounded hover:bg-blue-500/40 w-fit mt-5"
          >
            {handleAddReference.isPending ||
              (handleUpdateReference.isPending && (
                <span className="animate-pulse opacity-70 mr-2">Saving...</span>
              ))}
            {!handleAddReference.isPending &&
              !handleUpdateReference.isPending &&
              "Save reference"}
          </button>
        </>
      )}

      {/* Search input mode */}
      {isSelectingVerse && (
        <>
          <span className="text-xl opacity-80">Select verse for reference</span>
          <input
            autoFocus
            type="text"
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
            placeholder='Search verse (e.g. "John 3:16")'
            className="mt-2 p-2 border-2 bg-gray-100/60 border-gray-400 rounded-md"
          />
          <div className="flex flex-col gap-2 mt-5">
            {isLoading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="w-10/12 h-8 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
                    <div className="w-full h-5 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
                    <div className="w-3/6 h-5 rounded-sm bg-slate-700/30 animate-pulse mb-1" />
                  </div>
                ))}
              </div>
            )}
            {!isLoading && searchResult?.length === 0 && (
              <span className="opacity-70 italic">No results</span>
            )}
            {searchResult?.map((result) => (
              <div
                key={`${result.bookAbbr}-${result.chapter}-${result.verse}`}
                className="flex select-none flex-col py-1 pl-3 px-2 border-l-4 border-gray-500/40 hover:border-slate-700/40 bg-gray-400/20 hover:bg-gray-500/20 rounded"
              >
                <div className="flex items-center">
                  <span className="font-bold opacity-80">
                    {result.bookName} {result.chapter}:{result.verse}
                  </span>
                  {result.exactMatch && (
                    <Image
                      width={16}
                      height={16}
                      src={DocRefIcon}
                      alt="Icon - document reference"
                      className="opacity-80 -mt-0.5 ml-1"
                    />
                  )}
                </div>
                <p className="text-lg">{result.text}</p>
                <div className="flex w-full pt-3 gap-1.5">
                  <button
                    className="cursor-pointer text-[0.75rem] bg-gray-500/20 p-1 px-2 rounded hover:bg-gray-500/40"
                    onClick={() =>
                      handleSelectVerse(
                        result.bookAbbr,
                        result.chapter,
                        result.verse
                      )
                    }
                  >
                    <Image
                      width={13}
                      height={13}
                      alt="Icon link to reference"
                      src={AddIcon}
                      className="inline -mt-0.5 mr-1"
                    />
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
