"use client";
import { BookInfo } from "@/entities/BookInfo";
import type { Chapter } from "@/entities/Chapter";
import { Reference } from "@/entities/Reference";
import { SingleEvent } from "@/entities/SingleEvent";
import { useDialog } from "@/hooks/useDialog";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { MouseEvent, useEffect, useRef, useState, useTransition } from "react";
import LoadingIcon from "../components/icons/LoadingIcon";
import { useInView } from "react-intersection-observer";
import ArrowLeftIcon from "../components/icons/ArrowLeftIcon";
import ArrowRightIcon from "../components/icons/ArrowRightIcon";
import CompareIcon from "../components/icons/CompareIcon";
import DocumentIcon from "../components/icons/DocumentIcon";
import RefIcon from "../components/icons/RefIcon";
import ShareIcon from "../components/icons/ShareIcon";
import { ReadingMarker } from "@/entities/ReadingMarker";
import AIIcon from "../components/icons/AIIcon";
import CopyIcon from "../components/icons/CopyIcon";
import MarkerIcon from "../components/icons/MarkerIcon";
import ReaderMenu from "../components/ReaderMenu";
import BookChapterPicker from "../components/BookChapterPicker";
import ReaderSearch from "../components/ReaderSearch";
import { StringCompare } from "@/utils/StringCompare";
import { Version } from "@/entities/Version";
import ShareDropdown from "../components/ShareDropdown";

function referencesIncludesVerse(
  references: Reference[] | undefined,
  bookAbbr: string,
  chapterNumber: number,
  verseNumber: number,
) {
  if (!references) return false;

  return references.some(({ verses }) =>
    verses.some(
      (v) =>
        v.numVerse === verseNumber &&
        v.numChapter === chapterNumber &&
        v.abbrev.toLowerCase() === bookAbbr.toLowerCase(),
    ),
  );
}

export default function Reader() {
  const { ref: refHeader, inView: inViewHeader } = useInView({});
  const pickerOpenRef = useRef<null | (() => void)>(null);
  const searchParams = useSearchParams();
  const bookAbbr = searchParams.get("book") || "";
  const selectedVerseParam = searchParams.get("verse");
  const versionAbbr = searchParams.get("version") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const refSelected = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setDialog } = useDialog();
  const [isNavigating, startNavigation] = useTransition();
  const selectedVerseRef = useRef<number | null>(null);
  const chapterRef = useRef<Chapter | null>(null);
  const bookAbbrRef = useRef(bookAbbr);
  const versionAbbrRef = useRef(versionAbbr);
  const chapterNumberRef = useRef(chapterNumber);

  const [shareMenuVerse, setShareMenuVerse] = useState<number | null>(null);
  const [shareMenuAutoFocus, setShareMenuAutoFocus] = useState(false);

  const [candidateToMarker, setCandidateToMarker] = useState<number | null>(
    null,
  );
  const [readingMarkers, setReadingMarkers] = useState<ReadingMarker[]>([]);
  const [markerName, setMarkerName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [chapterTransition, setChapterTransition] = useState(false);

  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");

      await ThrowByResponse.throwsIfNotOk(booksResponse);

      const booksData = await booksResponse.json();

      return booksData as BookInfo[];
    },
  });

  const { data: versions } = useQuery({
    queryKey: ["versions"],
    queryFn: async () => {
      const versionsResponse = await fetch("/api/versions");

      await ThrowByResponse.throwsIfNotOk(versionsResponse);

      const versionsData = await versionsResponse.json();

      return versionsData as Version[];
    },
  });

  const { data: chapter, isLoading: isLoadingChapter } = useQuery({
    queryKey: ["chapter", versionAbbr, bookAbbr, chapterNumber],
    queryFn: async () => {
      const chapterResponse = await fetch(
        `/api/versions/${versionAbbr}/${bookAbbr}/${chapterNumber}`,
      );

      await ThrowByResponse.throwsIfNotOk(chapterResponse);

      const chapterData = await chapterResponse.json();

      return chapterData as Chapter;
    },
  });

  useEffect(() => {
    selectedVerseRef.current = selectedVerse;
  }, [selectedVerse]);

  useEffect(() => {
    chapterRef.current = chapter ?? null;
  }, [chapter]);

  useEffect(() => {
    bookAbbrRef.current = bookAbbr;
    versionAbbrRef.current = versionAbbr;
    chapterNumberRef.current = chapterNumber;
  }, [bookAbbr, versionAbbr, chapterNumber]);

  const { data: references } = useQuery({
    queryKey: ["references", bookAbbr, chapterNumber],
    staleTime: 1_000 * 3,
    queryFn: async () => {
      const chapterReferences = await fetch(
        `/api/references/${bookAbbr}/${chapterNumber}`,
      );

      await ThrowByResponse.throwsIfNotOk(chapterReferences);

      const booksData = await chapterReferences.json();

      return booksData.map((r: Reference) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })) as Reference[];
    },
  });

  function handleClickVerse(
    ev: MouseEvent<HTMLParagraphElement, globalThis.MouseEvent>,
  ) {
    if (!(ev.target instanceof HTMLElement)) return;

    const newSelected = parseInt(ev.target.id, 10) || null;

    setSelectedVerse(newSelected);
    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${ev.target.id}`,
      {
        scroll: false,
      },
    );

    queueMicrotask(() =>
      refSelected.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      }),
    );

    router.prefetch(
      `/reader/references?version=${versionAbbr}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${ev.target.id}`,
    );
  }

  // function handleUnselectVerse() {
  //   setSelectedVerse(null);
  //   router.replace(
  //     `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}`,
  //     {
  //       scroll: false,
  //     },
  //   );
  // }

  function handlePreviousChapter() {
    if (chapter?.previous) {
      setSelectedVerse(null);
      setChapterTransition(true);
      router.push(
        `/reader?book=${chapter?.previous.abbrev}&version=${versionAbbr}&chapter=${chapter?.previous.numChapter}`,
      );
    }
  }

  function handleNextChapter() {
    if (chapter?.next) {
      setSelectedVerse(null);
      setChapterTransition(true);
      router.push(
        `/reader?book=${chapter?.next.abbrev}&version=${versionAbbr}&chapter=${chapter?.next.numChapter}`,
      );
    }
  }

  function handleCompare(ev: SingleEvent, verseIndex: number) {
    ev.stopPropagation();
    startNavigation(() => {
      router.push(
        `/reader/compare?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${
          verseIndex + 1
        }`,
      );
    });
  }

  function handleExplain(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    startNavigation(() => {
      router.push(
        `/reader/explain?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${
          verseNumber
        }`,
      );
    });
  }

  function handleDeepAnalysis(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    startNavigation(() => {
      router.push(
        `/reader/deep-analysis?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${
          verseNumber
        }`,
      );
    });
  }

  function handleToggleShareMenu(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    setShareMenuVerse((prev) => {
      if (prev === verseNumber) return null;
      return verseNumber;
    });
    setShareMenuAutoFocus(false);
  }

  function handleShareLinkOnly(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    const url = `${window.location.origin}/share?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`;
    navigator.clipboard.writeText(url);
    setShareMenuVerse(null);
    setShareMenuAutoFocus(false);
    setDialog({
      title: "Link copied!",
      message: `Verse ${verseNumber} ready to share.`,
      ms: 3500,
    });
  }

  function handleShareLinkAndText(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    const url = `${window.location.origin}/share?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`;
    const verseText = chapter?.book.chapter.verses.at(verseNumber - 1) ?? "";
    const text = `${bookName} ${chapterNumber}:${verseNumber}\n${verseText}\n\n${url}`;
    navigator.clipboard.writeText(text);
    setShareMenuVerse(null);
    setShareMenuAutoFocus(false);
    setDialog({
      title: "Link + text copied!",
      message: `Verse ${verseNumber} ready to share.`,
      ms: 3500,
    });
  }

  // function handleCopyVerse(ev: SingleEvent, verseNumber: number) {
  //   ev.stopPropagation();

  //   if (!selectedVerse) return;

  //   const verseText = chapter?.book.chapter.verses.at(selectedVerse - 1);
  //   const displayVerse = `${bookAbbr} ${chapterNumber}:${selectedVerse}\n${verseText}`;

  //   if (!verseText) return;

  //   navigator.clipboard.writeText(displayVerse);

  //   setDialog({
  //     title: "Verse copied!",
  //     message: `Verse ${verseNumber} copied to clipboard.`,
  //     ms: 3500,
  //   });
  // }

  function handleMarkerCandidate(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();

    if (!selectedVerse) return;
    if (!verseNumber) return;

    if (candidateToMarker === verseNumber) {
      setCandidateToMarker(null);
      return;
    }

    setMarkerName(
      readingMarkers.find((m) =>
        m.compareTo(bookAbbr, chapterNumber, verseNumber),
      )?.name || "",
    );
    setCandidateToMarker(verseNumber);
  }

  function handleSaveMarker() {
    if (!markerName.trim()) {
      setDialog({
        title: "Set a marker name!",
        message: `Please provide a name for the marker.`,
        ms: 2500,
      });
      return;
    }

    const newReadingMarkers = [
      ...readingMarkers.filter(
        (m) =>
          `${m.bookAbbr}-${m.chapter}-${m.verse}` !==
          `${bookAbbr}-${chapterNumber}-${candidateToMarker}`,
      ),
      new ReadingMarker(
        markerName,
        bookAbbr,
        chapterNumber!,
        candidateToMarker!,
      ),
    ];

    localStorage.setItem("markers", JSON.stringify(newReadingMarkers));
    setReadingMarkers(newReadingMarkers);

    setCandidateToMarker(null);
    setMarkerName("");
  }

  function handleRemoveMarker() {
    const updatedMarkers = readingMarkers.filter(
      (m) =>
        `${m.bookAbbr}-${m.chapter}-${m.verse}` !==
        `${bookAbbr}-${chapterNumber}-${candidateToMarker}`,
    );
    setReadingMarkers(updatedMarkers);
    localStorage.setItem("markers", JSON.stringify(updatedMarkers));
    setCandidateToMarker(null);
    setMarkerName("");
  }

  // function handleOnKeyDown(event: KeyboardEvent) {
  //   if (!chapter || isLoadingChapter) return;

  //   const selected = document.querySelector(
  //     "div:has(.control-buttons):not(.hidden-buttons)",
  //   );

  //   if (!selected) return;

  //   const verseNumber = parseInt(refSelected.current?.id ?? "", 10);
  //   if (!verseNumber || isNaN(verseNumber)) {
  //     if (event.key === "Escape") {
  //       event.preventDefault();
  //       handleUnselectVerse();
  //     }
  //     return;
  //   }

  //   if (event.key === "Escape") {
  //     event.preventDefault();
  //     handleUnselectVerse();
  //     return;
  //   }

  //   if (event.key === "1") {
  //     event.preventDefault();
  //     handleOpenReferences(event, verseNumber - 1);
  //     return;
  //   }

  //   if (event.key === "2") {
  //     event.preventDefault();
  //     handleCompare(event, verseNumber - 1);
  //     return;
  //   }

  //   if (event.key === "3") {
  //     event.preventDefault();
  //     handleShare(event, verseNumber);
  //     return;
  //   }

  //   if (event.key === "4") {
  //     event.preventDefault();
  //     handleExplain(event, verseNumber);
  //     return;
  //   }

  //   if (event.key === "5") {
  //     event.preventDefault();
  //     handleDeepAnalysis(event, verseNumber);
  //     return;
  //   }

  //   if (event.key === "6") {
  //     event.preventDefault();
  //     handleMarkerCandidate(event, verseNumber);
  //     return;
  //   }

  //   if (event.key === "ArrowUp") {
  //     event.preventDefault();
  //     handlePreviousVerse();
  //     return;
  //   }

  //   if (event.key === "ArrowDown") {
  //     event.preventDefault();
  //     handleNextVerse();
  //     return;
  //   }

  //   if (event.key === "ArrowRight" && event.ctrlKey) {
  //     event.preventDefault();
  //     handleNextChapter();
  //     return;
  //   }

  //   if (event.key === "ArrowLeft" && event.ctrlKey) {
  //     event.preventDefault();
  //     handlePreviousChapter();
  //     return;
  //   }
  // }

  function handleOpenReferences(event: SingleEvent, verseIndex: number) {
    event.stopPropagation();
    const verseNumber = verseIndex + 1;
    startNavigation(() => {
      router.push(
        `/reader/references?version=${versionAbbr}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`,
      );
    });
  }

  // function handlePreviousVerse() {
  //   setSelectedVerse((prev) => {
  //     if (prev === null) return null;
  //     if (prev <= 1) return prev;
  //     const previousVerse = prev - 1;
  //     queueMicrotask(() =>
  //       refSelected.current?.scrollIntoView({
  //         behavior: "smooth",
  //         block: "center",
  //       }),
  //     );
  //     return previousVerse;
  //   });
  // }

  // function handleNextVerse() {
  //   setSelectedVerse((prev) => {
  //     if (prev === null) prev = 0;
  //     if (prev >= chapter!.book.chapter.verses.length) return prev;
  //     const nextVerse = prev + 1;

  //     queueMicrotask(() =>
  //       refSelected.current?.scrollIntoView({
  //         behavior: "smooth",
  //         block: "center",
  //       }),
  //     );

  //     return nextVerse;
  //   });
  // }

  useEffect(() => {
    setShareMenuVerse(null);
    setShareMenuAutoFocus(false);
  }, [selectedVerse]);

  useEffect(() => {
    if (selectedVerse === null) return;

    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${selectedVerse}`,
      { scroll: false },
    );
  }, [selectedVerse, chapter, bookAbbr, versionAbbr, chapterNumber]);

  useEffect(() => {
    if (selectedVerse === null) return;
    queueMicrotask(() =>
      refSelected.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      }),
    );
  }, [selectedVerse, chapter]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentChapter = chapterRef.current;
      if (!currentChapter) return;

      if (event.key === "ArrowRight" && event.ctrlKey) {
        event.preventDefault();
        if (currentChapter.next) {
          setSelectedVerse(null);
          setChapterTransition(true);
          router.push(
            `/reader?book=${currentChapter.next.abbrev}&version=${versionAbbrRef.current}&chapter=${currentChapter.next.numChapter}`,
          );
        }
        return;
      }

      if (event.key === "ArrowLeft" && event.ctrlKey) {
        event.preventDefault();
        if (currentChapter.previous) {
          setSelectedVerse(null);
          setChapterTransition(true);
          router.push(
            `/reader?book=${currentChapter.previous.abbrev}&version=${versionAbbrRef.current}&chapter=${currentChapter.previous.numChapter}`,
          );
        }
        return;
      }

      if (event.key === "ArrowDown" && selectedVerseRef.current === null) {
        event.preventDefault();
        setSelectedVerse(1);
        return;
      }

      const currentSelected = selectedVerseRef.current;
      if (!currentSelected) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedVerse(null);
        router.replace(
          `/reader?book=${bookAbbrRef.current}&version=${versionAbbrRef.current}&chapter=${chapterNumberRef.current}`,
          { scroll: false },
        );
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        router.push(
          `/reader/references?version=${versionAbbrRef.current}&book=${bookAbbrRef.current}&chapter=${chapterNumberRef.current}&verse=${currentSelected}`,
        );
        return;
      }

      if (event.key === "2") {
        event.preventDefault();
        router.push(
          `/reader/compare?book=${bookAbbrRef.current}&version=${versionAbbrRef.current}&chapter=${chapterNumberRef.current}&verse=${currentSelected}`,
        );
        return;
      }

      if (event.key === "3") {
        event.preventDefault();
        setShareMenuVerse((prev) =>
          prev === currentSelected ? null : currentSelected,
        );
        setShareMenuAutoFocus(true);
        return;
      }

      if (event.key === "4") {
        event.preventDefault();
        router.push(
          `/reader/explain?book=${bookAbbrRef.current}&version=${versionAbbrRef.current}&chapter=${chapterNumberRef.current}&verse=${currentSelected}`,
        );
        return;
      }

      if (event.key === "5") {
        event.preventDefault();
        router.push(
          `/reader/deep-analysis?book=${bookAbbrRef.current}&version=${versionAbbrRef.current}&chapter=${chapterNumberRef.current}&verse=${currentSelected}`,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedVerse((prev) => {
          if (prev === null || prev <= 1) return prev;
          return prev - 1;
        });
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedVerse((prev) => {
          if (prev === null) return 1;
          if (prev >= currentChapter.book.chapter.verses.length) return prev;
          return prev + 1;
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, setDialog]);

  useEffect(() => {
    if (selectedVerseParam && /[0-9]+/.test(selectedVerseParam)) {
      setSelectedVerse(parseInt(selectedVerseParam, 10) || null);
    }
  }, [bookAbbr, chapterNumber, selectedVerseParam]);

  useEffect(() => {
    if (chapter?.previous) {
      router.prefetch(
        `/reader?book=${chapter.previous.abbrev}&version=${versionAbbr}&chapter=${chapter.previous.numChapter}`,
      );
    }

    if (chapter?.next) {
      router.prefetch(
        `/reader?book=${chapter.next.abbrev}&version=${versionAbbr}&chapter=${chapter.next.numChapter}`,
      );
    }
  }, [chapter]);

  useEffect(() => {
    const markersStr = localStorage.getItem("markers");

    if (!markersStr) return;

    const markers: ReadingMarker[] = JSON.parse(markersStr).map((m: any) =>
      ReadingMarker.fromObject(m),
    );

    setReadingMarkers(markers);
  }, []);

  useEffect(() => {
    if (chapterTransition && chapter) {
      const timer = setTimeout(() => setChapterTransition(false), 250);
      return () => clearTimeout(timer);
    }
  }, [chapterTransition, chapter]);

  const bookName =
    books?.find((b) => b.abbr.toLowerCase() === bookAbbr.toLowerCase())?.name ??
    "...";
  const chapterText = chapterNumber?.toString() ?? "...";
  const versionText = versionAbbr ?? "...";
  const isSettingMarker = candidateToMarker !== null;
  const versionLicense =
    versions?.find((v) =>
      StringCompare.isEqualIgnoringCase(v.abbreviation, versionAbbr),
    )?.license || "";

  useEffect(() => {
    if (!bookName) return;
    if (!chapterText) return;
    document.title = `${bookName} ${chapterText}${selectedVerse ? ":" : ""}${
      selectedVerse ?? ""
    }`;
  }, [bookName, chapterNumber, selectedVerse]);

  return (
    <div className="flex min-h-screen flex-col px-7 pr-2 py-5 sm:py-7 pb-16 sm:pb-36 bg-background relative text-text max-w-[750px] w-full">
      {/* Navigation loading overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 animate-nav-overlay">
          <div className="flex flex-col items-center gap-3 animate-nav-spinner">
            <LoadingIcon
              width={32}
              height={32}
              className="animate-spin text-text/60"
            />
            <span className="text-sm text-text/60 font-medium">Loading...</span>
          </div>
        </div>
      )}
      {!inViewHeader && (
        <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-40 shadow animate-show-from-top">
          <div className="flex items-center max-w-[750px] mx-auto">
            <div className="flex flex-col relative">
              {isLoadingBooks ? (
                <div className="w-10/12 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              ) : (
                <BookChapterPicker
                  books={books}
                  isLoading={isLoadingBooks}
                  currentBookAbbr={bookAbbr}
                  currentChapter={chapterNumber}
                  versionAbbr={versionAbbr}
                  bookName={bookName}
                  selectedVerse={selectedVerse}
                  trigger={(open) => {
                    pickerOpenRef.current = open;
                    return (
                      <button
                        type="button"
                        onClick={open}
                        className="text-left cursor-pointer hover:bg-surface/60 rounded-lg px-1 -mx-1 py-0.5"
                      >
                        <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
                          {bookName} {chapterText}
                          {selectedVerse !== null && (
                            <span className="text-text/80">
                              :{selectedVerse}
                            </span>
                          )}
                        </h1>
                      </button>
                    );
                  }}
                />
              )}
              <h3 className="text-xs font-bold text-text/50">{versionText}</h3>
            </div>
            <div className="flex ml-auto">
              <ReaderMenu
                versionAbbr={versionAbbr}
                bookAbbr={bookAbbr}
                chapterNumber={chapterNumber}
                onSearchOpen={() => setSearchOpen(true)}
                onBooksOpen={() => pickerOpenRef.current?.()}
              />
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center select-none">
        <div className="flex flex-col mb-2 relative">
          <div ref={refHeader}>
            <BookChapterPicker
              books={books}
              isLoading={isLoadingBooks}
              currentBookAbbr={bookAbbr}
              currentChapter={chapterNumber}
              versionAbbr={versionAbbr}
              bookName={bookName}
              selectedVerse={selectedVerse}
              trigger={(open) => {
                pickerOpenRef.current = open;
                return (
                  <button
                    type="button"
                    onClick={open}
                    className="text-left cursor-pointer hover:bg-surface/60 rounded-lg px-1 -mx-1 py-0.5"
                  >
                    <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
                      {bookName} {chapterText}
                      {selectedVerse !== null && (
                        <span className="text-text/80">:{selectedVerse}</span>
                      )}
                    </h1>
                  </button>
                );
              }}
            />
          </div>
          <h3 className="text-xs font-bold text-text/50">{versionText}</h3>
        </div>
        <div className="flex ml-auto pr-2">
          <ReaderMenu
            versionAbbr={versionAbbr}
            bookAbbr={bookAbbr}
            chapterNumber={chapterNumber}
            onSearchOpen={() => setSearchOpen(true)}
            onBooksOpen={() => pickerOpenRef.current?.()}
          />
        </div>
      </div>

      {/* Loading verses */}
      {isLoadingChapter && (
        <div className="flex flex-col gap-2 w-full max-w-[750px] min-w-fit">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1 w-full min-w-fit">
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-10/12 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-full h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-3/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-5/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-2/6 h-6 rounded-sm bg-surface animate-pulse mb-1" />
            </div>
          ))}
        </div>
      )}

      {/* Verses */}
      <div className={chapterTransition ? "animate-chapter-fade" : ""}>
        {chapter?.book.chapter.verses.map((verse, verseIndex) => (
          <div key={verseIndex} className="flex flex-col">
            {readingMarkers.some((m) =>
              m.compareTo(bookAbbr, chapterNumber, verseIndex + 1),
            ) && (
              <div className="flex flex-row w-full items-center mt-4 mb-1 -ml-2 pr-4">
                <MarkerIcon
                  className="sm:hidden opacity-80"
                  width={16}
                  height={16}
                />
                <span className="min-w-fit mr-2">
                  {
                    readingMarkers.find((m) =>
                      m.compareTo(bookAbbr, chapterNumber, verseIndex + 1),
                    )?.name
                  }
                </span>
                <hr className="border-b border-dashed border-b-primary w-full" />
              </div>
            )}
            <div className="flex flex-row ">
              <div
                key={verseIndex}
                id={(verseIndex + 1).toString()}
                ref={selectedVerse === verseIndex + 1 ? refSelected : null}
                className={
                  selectedVerse === verseIndex + 1
                    ? "cursor-cell text-text/95 w-full mt-1 text-lg select-none rounded-md px-1 py-[2px] bg-secondary/30 underline underline-offset-2 decoration-dashed decoration-primary relative"
                    : "cursor-cell text-text/95 w-full mt-1 text-lg hover:bg-surface select-none rounded-md px-1 py-[2px] hide-buttons"
                }
                onClick={handleClickVerse}
              >
                <sup className="font-bold border rounded-sm px-[2px]  border-dashed border-gray-400">
                  {verseIndex + 1}
                </sup>{" "}
                {verse}
                <div className="control-buttons absolute left-0 -bottom-9 z-20 rounded-sm bg-secondary border-primary border border-dashed p-1 w-full gap-2 flex flex-wrap">
                  <button
                    className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                    onClick={(e) => handleOpenReferences(e, verseIndex)}
                  >
                    <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                      [1]
                    </span>
                    <RefIcon
                      className="sm:hidden mr-1 opacity-80"
                      width={12}
                      height={12}
                    />
                    <span className="sm:block hidden">Refs</span>
                    <span className="sm:hidden">R.</span>
                  </button>
                  <button
                    className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                    onClick={(e) => handleCompare(e, verseIndex)}
                  >
                    <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                      [2]
                    </span>
                    <CompareIcon
                      className="sm:hidden mr-1 opacity-80"
                      width={12}
                      height={12}
                    />
                    <span className="sm:block hidden">Versions</span>
                    <span className="sm:hidden">V.</span>
                  </button>
                  <div className="relative">
                    <button
                      className={`border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed text-sm flex cursor-pointer transition ${shareMenuVerse === verseIndex + 1 ? "bg-primary/20 border-primary text-primary" : "border-border bg-background hover:bg-background/70"}`}
                      onClick={(e) => handleToggleShareMenu(e, verseIndex + 1)}
                    >
                      <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                        [3]
                      </span>
                      <ShareIcon
                        className="sm:hidden mr-1 opacity-80"
                        width={12}
                        height={12}
                      />
                      <span className="sm:block hidden">Share</span>
                      <span className="sm:hidden">S.</span>
                    </button>
                    {shareMenuVerse === verseIndex + 1 && (
                      <ShareDropdown
                        autoFocus={shareMenuAutoFocus}
                        onLinkOnly={() =>
                          handleShareLinkOnly(
                            { stopPropagation: () => {} } as SingleEvent,
                            verseIndex + 1,
                          )
                        }
                        onLinkAndText={() =>
                          handleShareLinkAndText(
                            { stopPropagation: () => {} } as SingleEvent,
                            verseIndex + 1,
                          )
                        }
                        onClose={() => setShareMenuVerse(null)}
                      />
                    )}
                  </div>
                  {/* <button
                  className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                  onClick={(e) => handleCopyVerse(e, verseIndex + 1)}
                >
                  <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                    [4]
                  </span>
                  <CopyIcon
                    className="sm:hidden mr-1 opacity-80"
                    width={12}
                    height={12}
                  />
                  Copy
                </button> */}
                  <button
                    className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                    onClick={(e) => handleExplain(e, verseIndex + 1)}
                  >
                    <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                      [4]
                    </span>
                    <CopyIcon
                      className="sm:hidden mr-1 opacity-80"
                      width={12}
                      height={12}
                    />
                    <span className="sm:block hidden">Original</span>
                    <span className="sm:hidden">O.</span>
                  </button>
                  <button
                    className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                    onClick={(e) => handleDeepAnalysis(e, verseIndex + 1)}
                  >
                    <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                      [5]
                    </span>
                    <AIIcon
                      className="sm:hidden mr-1 opacity-80"
                      width={12}
                      height={12}
                    />
                    <span className="sm:block hidden">Deep</span>
                    <span className="sm:hidden">D.</span>
                  </button>
                  <button
                    className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                    onClick={(e) => handleMarkerCandidate(e, verseIndex + 1)}
                  >
                    <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                      [6]
                    </span>
                    <MarkerIcon
                      className="sm:hidden mr-1 opacity-80"
                      width={12}
                      height={12}
                    />
                    <span className="sm:block hidden">Marker</span>
                    <span className="sm:hidden">M.</span>
                  </button>
                  <button
                    className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                    onClick={() => setSelectedVerse(null)}
                  >
                    <span className="opacity-70 hidden sm:inline mr-1 text-[0.65rem]">
                      [Esc]
                    </span>
                    <span className="hidden sm:inline">Unselect</span>
                    <span className="sm:hidden mx-1">X</span>
                  </button>
                </div>
                {isSettingMarker && candidateToMarker === verseIndex + 1 && (
                  <div
                    className="control-buttons absolute left-0 -bottom-33 z-20 flex-col w-full"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="rounded-sm bg-secondary border-primary border border-dashed p-1 w-full gap-2 flex flex-row">
                      <input
                        type="text"
                        autoFocus
                        value={markerName}
                        onChange={(e) => setMarkerName(e.target.value)}
                        placeholder="Marker name"
                        className="mt-1 w-full p-2 py-1 border-2 border-border bg-background brightness-[1.13] rounded-md"
                      />
                    </div>
                    <div className="rounded-sm bg-secondary border-primary border border-dashed p-1 w-full gap-2 flex flex-row mt-1">
                      <button
                        onClick={handleSaveMarker}
                        className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                      >
                        <MarkerIcon
                          className="sm:hidden mr-1 opacity-80"
                          width={12}
                          height={12}
                        />
                        Set marker
                      </button>
                      <button
                        hidden={
                          !readingMarkers.some((m) =>
                            m.compareTo(
                              bookAbbr,
                              chapterNumber,
                              verseIndex + 1,
                            ),
                          )
                        }
                        onClick={() => handleRemoveMarker()}
                        className="border rounded-sm py-0.5 sm:py-0 items-center px-[4px] border-dashed border-border text-sm bg-background flex cursor-pointer hover:bg-background/70"
                      >
                        Remove marker
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-start flex-col min-w-[20px] py-2 pl-1">
                {referencesIncludesVerse(
                  references,
                  chapter.book.abbrev,
                  chapter.book.chapter.number,
                  verseIndex + 1,
                ) && (
                  <div
                    className={
                      selectedVerse === verseIndex + 1
                        ? "flex rounded-full text-primary animate-fade-in-from-bottom"
                        : "flex rounded-full text-text/70 animate-fade-in-from-bottom"
                    }
                  >
                    <DocumentIcon width={16} height={16} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with license */}
      {versionLicense && (
        <footer className="mt-10 pt-6 pb-4 mr-6 border-t border-border/50">
          <p className="text-xs text-text/50 text-center">{versionLicense}</p>
        </footer>
      )}

      {/* Floating chapter navigation */}
      {chapter && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full border border-border bg-surface shadow-lg shadow-background/30 px-1.5 py-1.5">
          <button
            className="flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-background/60 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={handlePreviousChapter}
            disabled={!chapter.previous}
          >
            <ArrowLeftIcon width={22} height={22} />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <span className="text-xs text-text-muted font-semibold px-2 select-none">
            {chapterText}
          </span>
          <button
            className="flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-background/60 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={handleNextChapter}
            disabled={!chapter.next}
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRightIcon width={22} height={22} />
          </button>
        </div>
      )}

      <ReaderSearch
        versionAbbr={versionAbbr}
        bookAbbr={bookAbbr}
        chapterNumber={chapterNumber}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
