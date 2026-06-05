"use client";
import { BookInfo } from "@/entities/BookInfo";
import type { Chapter } from "@/entities/Chapter";
import type { HeadingMetadataItem } from "@/entities/HeadingMetadata";
import { Reference } from "@/entities/Reference";
import { SingleEvent } from "@/entities/SingleEvent";
import { useDialog } from "@/hooks/useDialog";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import CommentsDropdown from "../components/CommentsDropdown";
import OriginalsDropdown from "../components/OriginalsDropdown";

const BibleRefChapterContext = dynamic(
  () => import("../components/BibleRefChapterContext"),
  { ssr: false },
);

interface VerseInParagraph {
  text: string;
  number: number;
}

interface VerseParagraph {
  key: string;
  verses: VerseInParagraph[];
}

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

function buildVerseParagraphs(
  verses: string[],
  paragraphStarts: number[] = [],
): VerseParagraph[] {
  const starts = new Set([1, ...paragraphStarts.filter((verse) => verse > 0)]);
  const paragraphs: VerseParagraph[] = [];

  verses.forEach((text, index) => {
    const number = index + 1;

    if (paragraphs.length === 0 || starts.has(number)) {
      paragraphs.push({ key: `paragraph-${number}`, verses: [] });
    }

    paragraphs[paragraphs.length - 1]?.verses.push({ text, number });
  });

  return paragraphs;
}

function buildHeadingsByVerse(headings: HeadingMetadataItem[] = []) {
  const headingsByVerse = new Map<number, HeadingMetadataItem[]>();

  for (const heading of headings) {
    const verseHeadings = headingsByVerse.get(heading.verse) ?? [];
    verseHeadings.push(heading);
    headingsByVerse.set(heading.verse, verseHeadings);
  }

  return headingsByVerse;
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      'input, textarea, select, button, [contenteditable="true"], [role="textbox"]',
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
  const refSelected = useRef<HTMLSpanElement>(null);
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
  const [commentsMenuVerse, setCommentsMenuVerse] = useState<number | null>(
    null,
  );
  const [commentsMenuAutoFocus, setCommentsMenuAutoFocus] = useState(false);
  const [originalsMenuVerse, setOriginalsMenuVerse] = useState<number | null>(
    null,
  );
  const [originalsMenuAutoFocus, setOriginalsMenuAutoFocus] = useState(false);

  const [candidateToMarker, setCandidateToMarker] = useState<number | null>(
    null,
  );
  const [readingMarkers, setReadingMarkers] = useState<ReadingMarker[]>([]);
  const [markerName, setMarkerName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [chapterTransition, setChapterTransition] = useState(false);
  const [currentHeadingTitle, setCurrentHeadingTitle] = useState<string | null>(
    null,
  );

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

  function handleSelectVerse(verseNumber: number) {
    setSelectedVerse(verseNumber);
    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`,
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
      `/reader/references?version=${versionAbbr}&book=${bookAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`,
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

  function handleOpenOriginalsAI(verseNumber: number) {
    startNavigation(() => {
      router.push(
        `/reader/explain?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`,
      );
    });
  }

  function handleOpenOriginalsTranslator(verseNumber: number) {
    startNavigation(() => {
      router.push(
        `/reader/originals/translator?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`,
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

  function handleOpenBibleRefComments(verseNumber: number) {
    startNavigation(() => {
      router.push(
        `/reader/comments/bibleref?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`,
      );
    });
  }

  function handleOpenEnduringWordComments(verseNumber: number) {
    startNavigation(() => {
      router.push(
        `/reader/comments/enduringword?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verseNumber}`,
      );
    });
  }

  function handleToggleShareMenu(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    setCommentsMenuVerse(null);
    setCommentsMenuAutoFocus(false);
    setOriginalsMenuVerse(null);
    setOriginalsMenuAutoFocus(false);
    setShareMenuVerse((prev) => {
      if (prev === verseNumber) return null;
      return verseNumber;
    });
    setShareMenuAutoFocus(false);
  }

  function handleToggleOriginalsMenu(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    setShareMenuVerse(null);
    setShareMenuAutoFocus(false);
    setCommentsMenuVerse(null);
    setCommentsMenuAutoFocus(false);
    setOriginalsMenuVerse((prev) => {
      if (prev === verseNumber) return null;
      return verseNumber;
    });
    setOriginalsMenuAutoFocus(false);
  }

  function handleToggleCommentsMenu(ev: SingleEvent, verseNumber: number) {
    ev.stopPropagation();
    setShareMenuVerse(null);
    setShareMenuAutoFocus(false);
    setOriginalsMenuVerse(null);
    setOriginalsMenuAutoFocus(false);
    setCommentsMenuVerse((prev) => {
      if (prev === verseNumber) return null;
      return verseNumber;
    });
    setCommentsMenuAutoFocus(false);
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
    setCommentsMenuVerse(null);
    setCommentsMenuAutoFocus(false);
  }, [selectedVerse]);

  useEffect(() => {
    if (selectedVerse === null) return;

    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${selectedVerse}`,
      { scroll: false },
    );
  }, [selectedVerse, chapter, bookAbbr, versionAbbr, chapterNumber, router]);

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
      if (isEditableKeyboardTarget(event.target)) return;

      const isCtrlOnly = event.ctrlKey && !event.metaKey && !event.altKey;

      if (event.key === "ArrowRight" && isCtrlOnly) {
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

      if (event.key === "ArrowLeft" && isCtrlOnly) {
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

      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
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
        setCommentsMenuVerse(null);
        setCommentsMenuAutoFocus(false);
        setOriginalsMenuVerse(null);
        setOriginalsMenuAutoFocus(false);
        setShareMenuVerse((prev) =>
          prev === currentSelected ? null : currentSelected,
        );
        setShareMenuAutoFocus(true);
        return;
      }

      if (event.key === "4") {
        event.preventDefault();
        setShareMenuVerse(null);
        setShareMenuAutoFocus(false);
        setCommentsMenuVerse(null);
        setCommentsMenuAutoFocus(false);
        setOriginalsMenuVerse((prev) =>
          prev === currentSelected ? null : currentSelected,
        );
        setOriginalsMenuAutoFocus(true);
        return;
      }

      if (event.key === "5") {
        event.preventDefault();
        router.push(
          `/reader/deep-analysis?book=${bookAbbrRef.current}&version=${versionAbbrRef.current}&chapter=${chapterNumberRef.current}&verse=${currentSelected}`,
        );
        return;
      }

      if (event.key === "6") {
        event.preventDefault();
        setShareMenuVerse(null);
        setShareMenuAutoFocus(false);
        setOriginalsMenuVerse(null);
        setOriginalsMenuAutoFocus(false);
        setCommentsMenuVerse((prev) =>
          prev === currentSelected ? null : currentSelected,
        );
        setCommentsMenuAutoFocus(true);
        return;
      }

      if (event.key === "7") {
        event.preventDefault();
        const marker = readingMarkers.find((m) =>
          m.compareTo(
            bookAbbrRef.current,
            chapterNumberRef.current,
            currentSelected,
          ),
        );

        setMarkerName(marker?.name ?? "");
        setCandidateToMarker((prev) =>
          prev === currentSelected ? null : currentSelected,
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
  }, [readingMarkers, router]);

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
  }, [chapter, router, versionAbbr]);

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
  const verseParagraphs = useMemo(
    () =>
      buildVerseParagraphs(
        chapter?.book.chapter.verses ?? [],
        chapter?.book.chapter.paragraphStarts ?? [],
      ),
    [chapter],
  );
  const headingsByVerse = useMemo(
    () => buildHeadingsByVerse(chapter?.book.chapter.headings ?? []),
    [chapter?.book.chapter.headings],
  );

  useEffect(() => {
    const headings = chapter?.book.chapter.headings ?? [];
    setCurrentHeadingTitle(headings.at(0)?.title ?? null);
  }, [chapter?.book.chapter.headings]);

  useEffect(() => {
    if (!chapter?.book.chapter.headings?.length) return;

    let animationFrame = 0;

    const updateCurrentHeading = () => {
      const headingElements = Array.from(
        document.querySelectorAll<HTMLHeadingElement>("[data-reader-heading]"),
      );

      if (headingElements.length === 0) return;

      const headerOffset = 96;
      const currentHeading =
        headingElements.findLast(
          (heading) => heading.getBoundingClientRect().top <= headerOffset,
        ) ?? headingElements[0];
      const title = currentHeading.dataset.readerHeadingTitle ?? null;

      setCurrentHeadingTitle((previousTitle) =>
        previousTitle === title ? previousTitle : title,
      );
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateCurrentHeading);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [chapter?.book.chapter.headings]);

  useEffect(() => {
    if (!bookName) return;
    if (!chapterText) return;
    document.title = `${bookName} ${chapterText}${selectedVerse ? ":" : ""}${
      selectedVerse ?? ""
    }`;
  }, [bookName, chapterText, selectedVerse]);

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
              {currentHeadingTitle && (
                <p className="mt-0.5 max-w-[min(68vw,560px)] truncate text-sm font-semibold italic leading-tight text-text/75">
                  {currentHeadingTitle}
                </p>
              )}
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
        <div className="mb-4">
          <BibleRefChapterContext
            bookAbbr={bookAbbr}
            chapterNumber={chapterNumber}
            enabled={Boolean(chapter && !isLoadingChapter)}
          />
        </div>
        {verseParagraphs.map((paragraph) => (
          <div
            key={paragraph.key}
            className="mb-5 text-lg leading-8 tracking-[0.015em] text-text/95 indent-8"
          >
            {paragraph.verses.map((verse, verseOffset) => {
              const verseNumber = verse.number;
              const verseIndex = verseNumber - 1;
              const marker = readingMarkers.find((m) =>
                m.compareTo(bookAbbr, chapterNumber, verseNumber),
              );
              const hasReferences = chapter
                ? referencesIncludesVerse(
                    references,
                    chapter.book.abbrev,
                    chapter.book.chapter.number,
                    verseNumber,
                  )
                : false;
              const isSelected = selectedVerse === verseNumber;
              const isFirstInParagraph = verseOffset === 0;
              const headings = headingsByVerse.get(verseNumber) ?? [];

              return (
                <Fragment key={verseNumber}>
                  {headings.map((heading, headingIndex) => (
                    <h2
                      key={`heading-${verseNumber}-${headingIndex}`}
                      data-reader-heading="true"
                      data-reader-heading-title={heading.title}
                      className={`indent-0 ${verseNumber === 1 && paragraph.key === "paragraph-1" ? "mt-0" : "mt-4"} mb-1 block text-xl font-bold italic leading-7 tracking-tight text-text`}
                    >
                      {heading.title}
                    </h2>
                  ))}
                  {marker && (
                    <span className="mx-1 inline-flex translate-y-[-1px] items-center gap-1 rounded-full border border-dashed border-primary/60 px-1.5 py-0.5 text-xs leading-none text-primary indent-0">
                      <MarkerIcon width={11} height={11} />
                      <span>{marker.name}</span>
                    </span>
                  )}
                  <span
                    id={verseNumber.toString()}
                    ref={isSelected ? refSelected : null}
                    className={
                      isSelected
                        ? "relative cursor-cell select-none rounded-md bg-secondary/30 px-1 py-[1px] text-text/95 underline decoration-primary decoration-dashed underline-offset-2 box-decoration-clone"
                        : "relative cursor-cell select-none rounded-md px-1 py-[1px] text-text/95 hover:bg-surface/70 box-decoration-clone"
                    }
                    onClick={() => handleSelectVerse(verseNumber)}
                  >
                    <sup className="mr-1 rounded-sm border border-dashed border-gray-400 px-[2px] text-[0.65em] font-bold leading-none">
                      {verseNumber}
                    </sup>
                    <span className={isFirstInParagraph ? "ml-1" : ""}>
                      {verse.text}
                    </span>
                  </span>
                  {hasReferences && (
                    <span
                      className={
                        isSelected
                          ? "mx-1 inline-flex translate-y-[2px] rounded-full text-primary indent-0"
                          : "mx-1 inline-flex translate-y-[2px] rounded-full text-text/60 indent-0"
                      }
                      title="Verse has references"
                      aria-label={`Verse ${verseNumber} has references`}
                    >
                      <DocumentIcon width={14} height={14} />
                    </span>
                  )}
                  {isSelected && (
                    <span className="control-buttons my-2 flex w-full max-w-full flex-wrap gap-2 rounded-sm border border-dashed border-primary bg-secondary p-1 indent-0 shadow-lg shadow-background/30">
                      <button
                        className="flex cursor-pointer items-center rounded-sm border border-dashed border-border bg-background px-[4px] py-0.5 text-sm hover:bg-background/70 sm:py-0"
                        onClick={(e) => handleOpenReferences(e, verseIndex)}
                      >
                        <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                          [1]
                        </span>
                        <RefIcon
                          className="mr-1 opacity-80 sm:hidden"
                          width={12}
                          height={12}
                        />
                        <span className="hidden sm:block">Refs</span>
                        <span className="sm:hidden">R.</span>
                      </button>
                      <button
                        className="flex cursor-pointer items-center rounded-sm border border-dashed border-border bg-background px-[4px] py-0.5 text-sm hover:bg-background/70 sm:py-0"
                        onClick={(e) => handleCompare(e, verseIndex)}
                      >
                        <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                          [2]
                        </span>
                        <CompareIcon
                          className="mr-1 opacity-80 sm:hidden"
                          width={12}
                          height={12}
                        />
                        <span className="hidden sm:block">Versions</span>
                        <span className="sm:hidden">V.</span>
                      </button>
                      <span className="relative inline-flex">
                        <button
                          className={`flex cursor-pointer items-center rounded-sm border border-dashed px-[4px] py-0.5 text-sm transition sm:py-0 ${shareMenuVerse === verseNumber ? "border-primary bg-primary/20 text-primary" : "border-border bg-background hover:bg-background/70"}`}
                          onClick={(e) => handleToggleShareMenu(e, verseNumber)}
                        >
                          <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                            [3]
                          </span>
                          <ShareIcon
                            className="mr-1 opacity-80 sm:hidden"
                            width={12}
                            height={12}
                          />
                          <span className="hidden sm:block">Share</span>
                          <span className="sm:hidden">S.</span>
                        </button>
                        {shareMenuVerse === verseNumber && (
                          <ShareDropdown
                            autoFocus={shareMenuAutoFocus}
                            onLinkOnly={() =>
                              handleShareLinkOnly(
                                { stopPropagation: () => {} } as SingleEvent,
                                verseNumber,
                              )
                            }
                            onLinkAndText={() =>
                              handleShareLinkAndText(
                                { stopPropagation: () => {} } as SingleEvent,
                                verseNumber,
                              )
                            }
                            onClose={() => setShareMenuVerse(null)}
                          />
                        )}
                      </span>
                      <span className="relative inline-flex">
                        <button
                          className={`flex cursor-pointer items-center rounded-sm border border-dashed px-[4px] py-0.5 text-sm transition sm:py-0 ${originalsMenuVerse === verseNumber ? "border-primary bg-primary/20 text-primary" : "border-border bg-background hover:bg-background/70"}`}
                          onClick={(e) =>
                            handleToggleOriginalsMenu(e, verseNumber)
                          }
                        >
                          <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                            [4]
                          </span>
                          <CopyIcon
                            className="mr-1 opacity-80 sm:hidden"
                            width={12}
                            height={12}
                          />
                          <span className="hidden sm:block">Originals</span>
                          <span className="sm:hidden">O.</span>
                        </button>
                        {originalsMenuVerse === verseNumber && (
                          <OriginalsDropdown
                            autoFocus={originalsMenuAutoFocus}
                            onAI={() => handleOpenOriginalsAI(verseNumber)}
                            onTranslator={() =>
                              handleOpenOriginalsTranslator(verseNumber)
                            }
                            onClose={() => setOriginalsMenuVerse(null)}
                          />
                        )}
                      </span>
                      <button
                        className="flex cursor-pointer items-center rounded-sm border border-dashed border-border bg-background px-[4px] py-0.5 text-sm hover:bg-background/70 sm:py-0"
                        onClick={(e) => handleDeepAnalysis(e, verseNumber)}
                      >
                        <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                          [5]
                        </span>
                        <AIIcon
                          className="mr-1 opacity-80 sm:hidden"
                          width={12}
                          height={12}
                        />
                        <span className="hidden sm:block">Deep</span>
                        <span className="sm:hidden">D.</span>
                      </button>
                      <span className="relative inline-flex">
                        <button
                          className={`flex cursor-pointer items-center rounded-sm border border-dashed px-[4px] py-0.5 text-sm transition sm:py-0 ${commentsMenuVerse === verseNumber ? "border-primary bg-primary/20 text-primary" : "border-border bg-background hover:bg-background/70"}`}
                          onClick={(e) =>
                            handleToggleCommentsMenu(e, verseNumber)
                          }
                        >
                          <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                            [6]
                          </span>
                          <DocumentIcon
                            className="mr-1 opacity-80 sm:hidden"
                            width={12}
                            height={12}
                          />
                          <span className="hidden sm:block">Comments</span>
                          <span className="sm:hidden">C.</span>
                        </button>
                        {commentsMenuVerse === verseNumber && (
                          <CommentsDropdown
                            autoFocus={commentsMenuAutoFocus}
                            onBibleRef={() =>
                              handleOpenBibleRefComments(verseNumber)
                            }
                            onEnduringWord={() =>
                              handleOpenEnduringWordComments(verseNumber)
                            }
                            onClose={() => setCommentsMenuVerse(null)}
                          />
                        )}
                      </span>
                      <button
                        className="flex cursor-pointer items-center rounded-sm border border-dashed border-border bg-background px-[4px] py-0.5 text-sm hover:bg-background/70 sm:py-0"
                        onClick={(e) => handleMarkerCandidate(e, verseNumber)}
                      >
                        <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                          [7]
                        </span>
                        <MarkerIcon
                          className="mr-1 opacity-80 sm:hidden"
                          width={12}
                          height={12}
                        />
                        <span className="hidden sm:block">Marker</span>
                        <span className="sm:hidden">M.</span>
                      </button>
                      <button
                        className="flex cursor-pointer items-center rounded-sm border border-dashed border-border bg-background px-[4px] py-0.5 text-sm hover:bg-background/70 sm:py-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVerse(null);
                        }}
                      >
                        <span className="mr-1 hidden text-[0.65rem] opacity-70 sm:inline">
                          [Esc]
                        </span>
                        <span className="hidden sm:inline">Unselect</span>
                        <span className="mx-1 sm:hidden">X</span>
                      </button>
                    </span>
                  )}
                  {isSelected && isSettingMarker && candidateToMarker === verseNumber && (
                    <span
                      className="control-buttons my-2 flex w-full max-w-full flex-col indent-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <span className="flex w-full flex-row gap-2 rounded-sm border border-dashed border-primary bg-secondary p-1">
                        <input
                          type="text"
                          autoFocus
                          value={markerName}
                          onChange={(e) => setMarkerName(e.target.value)}
                          placeholder="Marker name"
                          className="mt-1 w-full rounded-md border-2 border-border bg-background p-2 py-1 brightness-[1.13]"
                        />
                      </span>
                      <span className="mt-1 flex w-full flex-row gap-2 rounded-sm border border-dashed border-primary bg-secondary p-1">
                        <button
                          onClick={handleSaveMarker}
                          className="flex cursor-pointer items-center rounded-sm border border-dashed border-border bg-background px-[4px] py-0.5 text-sm hover:bg-background/70 sm:py-0"
                        >
                          <MarkerIcon
                            className="mr-1 opacity-80 sm:hidden"
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
                                verseNumber,
                              ),
                            )
                          }
                          onClick={() => handleRemoveMarker()}
                          className="flex cursor-pointer items-center rounded-sm border border-dashed border-border bg-background px-[4px] py-0.5 text-sm hover:bg-background/70 sm:py-0"
                        >
                          Remove marker
                        </button>
                      </span>
                    </span>
                  )}{" "}
                </Fragment>
              );
            })}
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
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
