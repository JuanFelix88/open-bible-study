"use client";

import { SearchResult } from "@/entities/SearchResult";
import { useDebounce } from "@/hooks/useDebounce";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SearchIcon from "./icons/SearchIcon";
import CloseIcon from "./icons/CloseIcon";
import ReaderSearchResultItem from "./ReaderSearchResultItem";

const referenceQueryRegex =
  /^(?<book>[0-9]? ?[A-Za-zÀ-ÿ0-9]+(?:\s+[A-Za-zÀ-ÿ0-9]+)*)\s+(?<chapter>[0-9]+):?(?<verse>[0-9]+)?$/;

interface ReaderSearchProps {
  versionAbbr: string;
  open: boolean;
  onClose: () => void;
}

export default function ReaderSearch({
  versionAbbr,
  open,
  onClose,
}: ReaderSearchProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const debouncedSearchText = useDebounce(searchText, 180);
  const trimmedQuery = useMemo(
    () => debouncedSearchText.trim(),
    [debouncedSearchText],
  );
  const hasQuery = searchText.trim().length > 0;
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<SearchResult[]>([]);
  const selectedIndexRef = useRef<number | null>(null);
  const router = useRouter();

  const {
    data: results,
    isError,
    isLoading: isLoadingQuery,
  } = useQuery({
    queryKey: ["reader-search", versionAbbr, trimmedQuery],
    staleTime: 5_000,
    enabled: hasQuery && !!trimmedQuery && !!versionAbbr && open,
    queryFn: async ({ signal }) => {
      if (!trimmedQuery || !versionAbbr) return [];

      const abbr = versionAbbr.toLowerCase();
      const isReference = referenceQueryRegex.test(trimmedQuery);
      const params = new URLSearchParams({ q: trimmedQuery });

      const url = isReference
        ? `/api/versions/${abbr}/search?${params.toString()}`
        : `/api/versions/${abbr}/search/deep?${new URLSearchParams({
            q: trimmedQuery,
            count: "40",
          }).toString()}`;

      const response = await fetch(url, { signal });
      await ThrowByResponse.throwsIfNotOk(response);
      return (await response.json()) as SearchResult[];
    },
  });

  const isLoading =
    isLoadingQuery || (searchText !== debouncedSearchText && hasQuery);

  const handleNavigate = useCallback(
    (result: SearchResult) => {
      onClose();
      router.push(
        `/reader?${new URLSearchParams({
          version: versionAbbr,
          book: result.bookAbbr,
          chapter: String(result.chapter),
          verse: String(result.verse),
        }).toString()}`,
      );
    },
    [versionAbbr, onClose, router],
  );

  useEffect(() => {
    if (open) {
      setSearchText("");
      setSelectedIndex(null);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleDialogKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      const currentResults = resultsRef.current;
      if (!currentResults.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = selectedIndexRef.current;
        const next =
          currentIndex === null
            ? 0
            : Math.min(currentIndex + 1, currentResults.length - 1);
        selectedIndexRef.current = next;
        setSelectedIndex(next);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = selectedIndexRef.current;
        const next =
          currentIndex === null || currentIndex <= 0 ? null : currentIndex - 1;
        selectedIndexRef.current = next;
        setSelectedIndex(next);
        return;
      }

      if (e.key !== "Enter" || e.target instanceof HTMLButtonElement) return;

      const currentIndex = selectedIndexRef.current;
      if (currentIndex === null) return;

      const result = currentResults[currentIndex];
      if (!result) return;

      e.preventDefault();
      handleNavigate(result);
    },
    [handleNavigate, onClose],
  );

  useEffect(() => {
    resultsRef.current = results ?? [];
  }, [results]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    selectedIndexRef.current = null;
    setSelectedIndex(null);
    resultsScrollRef.current?.scrollTo({ top: 0 });
  }, [trimmedQuery]);

  useEffect(() => {
    if (selectedIndex === null) return;

    const scrollContainer = resultsScrollRef.current;
    const selectedElement = scrollContainer?.querySelector<HTMLElement>(
      `[data-reader-search-index="${selectedIndex}"]`,
    );

    if (!scrollContainer || !selectedElement) return;

    const animationFrame = requestAnimationFrame(() => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const selectedRect = selectedElement.getBoundingClientRect();
      const scrollPadding = 12;

      if (selectedRect.top < containerRect.top + scrollPadding) {
        scrollContainer.scrollTo({
          top:
            scrollContainer.scrollTop +
            selectedRect.top -
            containerRect.top -
            scrollPadding,
          behavior: "smooth",
        });
        return;
      }

      if (selectedRect.bottom > containerRect.bottom - scrollPadding) {
        scrollContainer.scrollTo({
          top:
            scrollContainer.scrollTop +
            selectedRect.bottom -
            containerRect.bottom +
            scrollPadding,
          behavior: "smooth",
        });
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [selectedIndex, results]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[12vh]">
      <div className="absolute inset-0 bg-background/85" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search verses"
        className="relative z-10 w-[95vw] max-w-lg flex flex-col max-h-[75vh] animate-fade-in-from-bottom"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="obs-search-shell obs-search-shell-connected">
          <SearchIcon
            width={18}
            height={18}
            className="text-text/50 shrink-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => {
              resultsRef.current = [];
              selectedIndexRef.current = null;
              setSelectedIndex(null);
              setSearchText(e.target.value);
            }}
            aria-label="Search verses"
            placeholder="Search verses…"
            className="obs-input flex-1"
          />
          <button
            aria-label="Close search"
            onClick={onClose}
            className="obs-icon-button obs-icon-button-compact"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div
          ref={resultsScrollRef}
          className="overflow-y-auto rounded-b-[20px] border border-t-0 border-border/70 bg-surface shadow-xl shadow-background/40 reader-search-scroll"
        >
          {!hasQuery && (
            <div className="px-4 py-8 text-center">
              <p className="text-text/40 text-sm">
                Type to search in{" "}
                <span className="font-semibold text-primary/80">
                  {versionAbbr.toUpperCase()}
                </span>
              </p>
            </div>
          )}

          {isLoading && hasQuery && (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-background/60 p-3 flex flex-col gap-2"
                >
                  <div className="flex gap-2 items-center">
                    <div className="w-16 h-4 rounded bg-text/15 animate-pulse" />
                    <div className="w-10 h-3 rounded bg-text/10 animate-pulse" />
                  </div>
                  <div className="w-full h-3 rounded bg-text/10 animate-pulse" />
                  <div className="w-9/12 h-3 rounded bg-text/10 animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && hasQuery && isError && (
            <div className="px-4 py-8 text-center">
              <p className="text-text/50 text-sm">
                Search failed. Please try again.
              </p>
            </div>
          )}

          {!isLoading &&
            hasQuery &&
            !isError &&
            results &&
            results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-text/50 text-sm">No results found</p>
              </div>
            )}

          {!isLoading &&
            hasQuery &&
            !isError &&
            results &&
            results.length > 0 && (
              <div className="flex flex-col gap-1.5 p-2">
                {results.map((result, idx) => (
                  <div
                    key={`${result.bookAbbr}-${result.chapter}-${result.verse}`}
                    data-reader-search-index={idx}
                  >
                    <ReaderSearchResultItem
                      result={result}
                      versionAbbr={versionAbbr}
                      query={trimmedQuery}
                      isSelected={selectedIndex === idx}
                      onNavigate={handleNavigate}
                    />
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
