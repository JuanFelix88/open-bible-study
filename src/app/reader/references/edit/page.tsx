"use client";
import type { ReferencePayload } from "@/entities/ReferencePayload";
import AddIcon from "@/app/components/icons/AddIcon";
import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import DocumentIcon from "@/app/components/icons/DocumentIcon";
import EditIcon from "@/app/components/icons/EditIcon";
import { BookInfo } from "@/entities/BookInfo";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Reference } from "@/entities/Reference";
import { SearchResult } from "@/entities/SearchResult";
import { useDebounce } from "@/hooks/useDebounce";
import { Params, ParamType } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ReferenceMutation() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [editId] = Params.getParamFromSearchParams(
    "id",
    searchParams,
    ParamType.NUMBER,
  );

  const [povBookAbbr] = Params.getParamFromSearchParams(
    "book",
    searchParams,
    ParamType.STRING,
  );
  const [povVersionAbbr] = Params.getParamFromSearchParams(
    "version",
    searchParams,
    ParamType.STRING,
  );
  const [povChapterNumber] = Params.getParamFromSearchParams(
    "chapter",
    searchParams,
    ParamType.NUMBER,
  );
  const [povVerseNumber] = Params.getParamFromSearchParams(
    "verse",
    searchParams,
    ParamType.NUMBER,
  );

  const isEditMode = Boolean(editId);
  const [searchText, setSearchText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isSelectingVerse, setIsSelectingVerse] = useState(!isEditMode);
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
    ({ abbr }) => abbr.toLowerCase() === povBookAbbr?.toLowerCase(),
  );

  const { data: searchResult, isLoading } = useQuery({
    queryKey: ["versions", povVersionAbbr, "search", outSearchText],
    queryFn: async () => {
      const searchResponse = await fetch(
        `/api/versions/${povVersionAbbr}/search?q=${encodeURIComponent(
          outSearchText,
        )}`,
      );

      await ThrowByResponse.throwsIfNotOk(searchResponse);

      return (await searchResponse.json()) as SearchResult[];
    },
  });

  const handleAddReference = useMutation({
    mutationFn: (data: ReferencePayload) =>
      fetch(`/api/references`, {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => router.back(),
  });

  const handleUpdateReference = useMutation({
    mutationFn: async (data: ReferencePayload & { id: number }) => {
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
            ),
        );

        if (diffVerse) {
          setSelectedVerse(diffVerse);
        }
      });
  }, [editId]);

  function handleSelectVerse(
    abbrev: string,
    numChapter: number,
    numVerse: number,
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
        : "",
    );
  }

  function handleOnKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && isSelectingVerse) {
      setIsSelectingVerse(false);
      return;
    }

    if (e.key === "Escape") {
      router.back();
      return;
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, [isSelectingVerse]);

  const title = isEditMode ? "Edit Reference:" : "Add Reference:";
  const displayBook = book ? book.name : "Unknown Book";
  const displayChapter = `${povChapterNumber ?? "..."}`;
  const displayVerse = `${povVerseNumber ?? "..."}`;
  const isLoadingSendForm =
    handleAddReference.isPending || handleUpdateReference.isPending;

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text w-screen max-w-[750px]">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">
              {displayBook} {displayChapter}:{displayVerse}
            </h1>
            <h4 className="text-xs font-bold opacity-70">{title}</h4>
          </div>
          <div className="flex ml-auto">
            <button
              className="obs-icon-button ml-4 mt-1"
              onClick={() => router.back()}
            >
              <ArrowLeftIcon width={30} height={30} />
            </button>
          </div>
        </div>
      </div>

      <hr className="opacity-0 mt-14" />

      {/* idle mode */}
      {!isSelectingVerse && (
        <>
          <span className="text-xl opacity-80">
            Basic information of reference
          </span>
          <button
            className="obs-control mt-3 w-fit justify-start"
            onClick={handleOpenEditSelectedVerse}
          >
            <EditIcon width={13} height={13} className="inline -mt-0.5 mr-1" />
            {selectedVerse
              ? `${selectedVerse.abbrev} ${selectedVerse.numChapter}:${selectedVerse.numVerse} (verse reference - click to change)`
              : "click here to select verse"}
          </button>

          <textarea
            name=""
            onChange={(e) => setNoteText(e.target.value)}
            value={noteText}
            placeholder="Reference notes..."
            className="obs-input mt-5 min-h-28 resize-y"
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
            className="obs-control obs-control-primary mt-5 w-fit"
          >
            {isLoadingSendForm && (
              <span className="animate-pulse opacity-70 mr-2">Saving...</span>
            )}
            {!isLoadingSendForm && "Save reference"}
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
            className="obs-input mt-2"
          />
          <div className="flex flex-col gap-2 mt-5">
            {isLoading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="w-10/12 h-8 rounded-sm bg-surface animate-pulse mb-1" />
                    <div className="w-full h-5 rounded-sm bg-surface animate-pulse mb-1" />
                    <div className="w-3/6 h-5 rounded-sm bg-surface animate-pulse mb-1" />
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
                className="flex select-none flex-col py-1 pl-3 px-2 border-l-4 border-border bg-surface hover:opacity-95 rounded"
              >
                <div className="flex items-center">
                  <span className="font-bold opacity-80">
                    {result.bookName} {result.chapter}:{result.verse}
                  </span>
                  {result.exactMatch && (
                    <DocumentIcon
                      width={16}
                      height={16}
                      className="opacity-80 -mt-0.5 ml-1"
                    />
                  )}
                </div>
                <p className="text-lg">{result.text}</p>
                <div className="flex w-full pt-3 gap-1.5">
                  <button
                    className="obs-control obs-control-compact"
                    onClick={() =>
                      handleSelectVerse(
                        result.bookAbbr,
                        result.chapter,
                        result.verse,
                      )
                    }
                  >
                    <AddIcon
                      width={13}
                      height={13}
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
