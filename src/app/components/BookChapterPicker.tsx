"use client";

import { BookInfo } from "@/entities/BookInfo";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ArrowLeftIcon from "./icons/ArrowLeftIcon";

interface BookChapterPickerProps {
  books: BookInfo[] | undefined;
  isLoading: boolean;
  currentBookAbbr: string;
  currentChapter: number | null;
  versionAbbr: string;
  bookName: string;
  selectedVerse: number | null;
  trigger?: (open: () => void) => ReactNode;
  fullscreen?: boolean;
}

export default function BookChapterPicker({
  books,
  isLoading,
  currentBookAbbr,
  currentChapter,
  versionAbbr,
  bookName,
  selectedVerse,
  trigger,
  fullscreen,
}: BookChapterPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [chapterQuery, setChapterQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const selectedBookInfo = books?.find(
    (b) => b.abbr.toLowerCase() === selectedBook?.toLowerCase(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(min-width: 640px)");
    setIsDesktop(media.matches);

    function onChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;

    setBookQuery("");
    setChapterQuery("");

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSelectedBook(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (selectedBook && chaptersRef.current) {
      chaptersRef.current.scrollTop = 0;
    }

    setChapterQuery("");
  }, [selectedBook]);

  function handleClose() {
    setOpen(false);
    setSelectedBook(null);
    setBookQuery("");
    setChapterQuery("");
  }

  function handleSelectBook(abbr: string) {
    setSelectedBook(abbr);
  }

  function handleSelectChapter(chapter: number) {
    if (!selectedBook) return;
    router.push(
      `/reader?book=${selectedBook}&version=${versionAbbr}&chapter=${chapter}`,
    );
    handleClose();
  }

  const normalizedBookQuery = bookQuery.trim().toLowerCase();
  const filteredBooks = normalizedBookQuery
    ? books?.filter((b) => {
        const name = b.name.toLowerCase();
        const abbr = b.abbr.toLowerCase();
        return (
          name.includes(normalizedBookQuery) ||
          abbr.includes(normalizedBookQuery)
        );
      })
    : books;

  const normalizedChapterQuery = chapterQuery.trim();
  const chapterNumbers = Array.from({
    length: selectedBookInfo?.numChapters || 0,
  })
    .map((_, index) => index + 1)
    .filter((chap) => {
      if (!normalizedChapterQuery) return true;
      return chap.toString().includes(normalizedChapterQuery);
    });

  const chapterText = currentChapter?.toString() ?? "...";
  const verseText = selectedVerse !== null ? `:${selectedVerse}` : "";

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-left cursor-pointer hover:bg-surface/60 rounded-lg px-1 -mx-1 py-0.5 transition active:scale-[0.98]"
        >
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
            {bookName} {chapterText}
            {verseText && <span className="text-text/80">{verseText}</span>}
          </h1>
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div
            ref={panelRef}
            className={
              fullscreen
                ? "fixed inset-0 z-[60] flex flex-col m-auto w-[92vw] h-[90vh] max-w-3xl rounded-xl animate-fade-in-from-bottom"
                : "fixed inset-x-0 top-0 z-[60] flex flex-col max-h-[85vh] sm:max-h-[70vh] sm:absolute sm:inset-x-auto sm:left-0 sm:top-12 sm:w-[380px] sm:rounded-xl animate-fade-in-from-bottom"
            }
          >
            <div className="flex flex-col h-full bg-surface/95 backdrop-blur-md border border-border sm:rounded-xl shadow-lg shadow-background/40 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
                {selectedBook ? (
                  <button
                    type="button"
                    onClick={() => setSelectedBook(null)}
                  className="obs-control obs-control-compact"
                  >
                    <ArrowLeftIcon width={16} height={16} />
                    Books
                  </button>
                ) : (
                  <span className="text-sm font-semibold">Select book</span>
                )}

                {selectedBook && (
                  <span className="text-sm font-semibold">
                    {selectedBookInfo?.name}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="obs-control obs-control-compact"
                >
                  Cancel
                </button>
              </div>

              {!selectedBook ? (
                <div className="overflow-y-auto overscroll-contain px-3 py-2 flex-1 reader-search-scroll [-webkit-overflow-scrolling:touch]">
                  <div className="hidden sm:block mb-2">
                    <input
                      autoFocus={open && isDesktop}
                      value={bookQuery}
                      onKeyDown={(e) => e.stopPropagation()}
                      onChange={(e) => setBookQuery(e.target.value)}
                      placeholder="Type a book name..."
                      className="obs-input"
                    />
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-11 rounded-lg bg-background/60 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className={
                        fullscreen
                          ? "grid grid-cols-2 sm:grid-cols-3 gap-2"
                          : "grid grid-cols-2 gap-1.5"
                      }
                    >
                      {filteredBooks?.map((book) => {
                        const isCurrent =
                          book.abbr.toLowerCase() ===
                          currentBookAbbr.toLowerCase();
                        return (
                          <button
                            key={book.abbr}
                            type="button"
                            onClick={() => handleSelectBook(book.abbr)}
                            className={`obs-tile ${
                              isCurrent
                                ? "obs-tile-active"
                                : ""
                            }`}
                          >
                            {book.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  ref={chaptersRef}
                  className="overflow-y-auto overscroll-contain px-3 py-2 flex-1 reader-search-scroll [-webkit-overflow-scrolling:touch]"
                >
                  <div className="hidden sm:block mb-2">
                    <input
                      inputMode="numeric"
                      value={chapterQuery}
                      onKeyDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setChapterQuery(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      autoFocus={open && isDesktop}
                      placeholder="Type a chapter number..."
                      className="obs-input"
                    />
                  </div>

                  <div
                    className={
                      fullscreen
                        ? "grid grid-cols-6 sm:grid-cols-8 gap-2"
                        : "grid grid-cols-5 sm:grid-cols-6 gap-1.5"
                    }
                  >
                    {chapterNumbers.map((chap) => {
                      const isCurrent =
                        selectedBook.toLowerCase() ===
                          currentBookAbbr.toLowerCase() &&
                        chap === currentChapter;
                      return (
                        <button
                          key={chap}
                          type="button"
                          onClick={() => handleSelectChapter(chap)}
                          className={`obs-tile obs-tile-center aspect-square ${
                            isCurrent
                              ? "obs-tile-active"
                              : ""
                          }`}
                        >
                          {chap}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
