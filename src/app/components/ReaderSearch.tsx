"use client";

import { SearchResult } from "@/entities/SearchResult";
import { useDebounce } from "@/hooks/useDebounce";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import SearchIcon from "./icons/SearchIcon";
import CloseIcon from "./icons/CloseIcon";

const displayVersionRegex =
  /^(?<book>[0-9]? ?[A-Za-zÀ-ÿ0-9]{1,}) (?<chapter>[0-9]{1,}):?(?<verse>[0-9]{1,})?$/;

interface ReaderSearchProps {
  versionAbbr: string;
  bookAbbr: string;
  chapterNumber: number | null;
  open: boolean;
  onClose: () => void;
}

function highlightTokens(text: string, query: string): ReactNode[] {
  if (!query.trim()) return [text];

  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (!tokens.length) return [text];

  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (regex.test(part)) {
      return (
        <mark
          key={i}
          className="bg-primary/25 text-text rounded-sm px-[1px] font-semibold"
        >
          {part}
        </mark>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function buildSnippet(text: string, query: string, maxLen = 100): string {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (!tokens.length) {
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  }

  const lower = text.toLowerCase();
  let firstIdx = text.length;
  for (const token of tokens) {
    const idx = lower.indexOf(token.toLowerCase());
    if (idx !== -1 && idx < firstIdx) firstIdx = idx;
  }

  const contextBefore = 30;
  let start = Math.max(0, firstIdx - contextBefore);
  const end = Math.min(text.length, start + maxLen);

  if (end - start < maxLen && start > 0) {
    start = Math.max(0, end - maxLen);
  }

  const snippet = text.slice(start, end);
  const prefix = start > 0 ? "… " : "";
  const suffix = end < text.length ? " …" : "";

  return prefix + snippet.trim() + suffix;
}

export default function ReaderSearch({
  versionAbbr,
  open,
  onClose,
}: ReaderSearchProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const debouncedSearchText = useDebounce(searchText, 180);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: results, isLoading: isLoadingQuery } = useQuery({
    queryKey: ["reader-search", versionAbbr, debouncedSearchText],
    staleTime: 5_000,
    enabled: !!debouncedSearchText && !!versionAbbr && open,
    queryFn: async () => {
      if (!debouncedSearchText || !versionAbbr) return [];

      const abbr = versionAbbr.toLowerCase();
      const isReference = displayVersionRegex.test(debouncedSearchText);

      const url = isReference
        ? `/api/versions/${abbr}/search?q=${encodeURIComponent(debouncedSearchText)}`
        : `/api/versions/${abbr}/search/deep?q=${encodeURIComponent(debouncedSearchText)}&count=40`;

      const response = await fetch(url);
      await ThrowByResponse.throwsIfNotOk(response);
      return (await response.json()) as SearchResult[];
    },
  });

  const isLoading =
    isLoadingQuery || (searchText !== debouncedSearchText && !!searchText);

  const handleNavigate = useCallback(
    (result: SearchResult) => {
      onClose();
      router.push(
        `/reader?version=${versionAbbr}&book=${result.bookAbbr}&chapter=${result.chapter}&verse=${result.verse}`,
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

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (!results?.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev === null) return 0;
          return Math.min(prev + 1, results.length - 1);
        });
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev === null || prev <= 0) return null;
          return prev - 1;
        });
      }

      if (e.key === "Enter" && selectedIndex !== null) {
        e.preventDefault();
        handleNavigate(results[selectedIndex]);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, results, selectedIndex, handleNavigate, onClose]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [debouncedSearchText]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[12vh]">
      <div
        className="absolute inset-0 bg-background/85"
        onClick={onClose}
      />

      <div
        ref={overlayRef}
        className="relative z-10 w-[95vw] max-w-lg flex flex-col max-h-[75vh] animate-fade-in-from-bottom"
      >
        <div className="flex items-center gap-2 rounded-t-2xl border border-border bg-surface px-4 py-3 shadow-xl shadow-background/40">
          <SearchIcon
            width={18}
            height={18}
            className="text-text/50 shrink-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Search verses…"
            className="flex-1 bg-transparent text-text text-base outline-none placeholder:text-text/40"
          />
          <button
            onClick={onClose}
            className="text-text/50 hover:text-text cursor-pointer p-1"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="overflow-y-auto rounded-b-2xl border border-t-0 border-border bg-surface shadow-xl shadow-background/40 reader-search-scroll">
          {!searchText && (
            <div className="px-4 py-8 text-center">
              <p className="text-text/40 text-sm">
                Type to search in{" "}
                <span className="font-semibold text-primary/80">
                  {versionAbbr.toUpperCase()}
                </span>
              </p>
            </div>
          )}

          {isLoading && !!searchText && (
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

          {!isLoading && !!searchText && results && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-text/50 text-sm">No results found</p>
            </div>
          )}

          {!isLoading && results && results.length > 0 && (
            <div className="flex flex-col gap-1.5 p-2">
              {results.map((result, idx) => {
                const isSelected = selectedIndex === idx;
                const snippet = buildSnippet(
                  result.text,
                  debouncedSearchText,
                  120,
                );

                return (
                  <button
                    key={`${result.bookAbbr}-${result.chapter}-${result.verse}`}
                    onClick={() => handleNavigate(result)}
                    className={`group w-full text-left rounded-xl p-3 cursor-pointer ${
                      isSelected
                        ? "bg-primary/15 ring-1 ring-primary/40"
                        : "bg-background/50 hover:bg-background/80"
                    }`}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-bold text-primary tracking-wide">
                        {result.bookName} {result.chapter}:{result.verse}
                      </span>
                      <span className="text-[0.6rem] text-text/40 uppercase tracking-widest">
                        {versionAbbr}
                      </span>
                    </div>
                    <p className="text-sm text-text/80 leading-relaxed line-clamp-2">
                      {highlightTokens(snippet, debouncedSearchText)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
