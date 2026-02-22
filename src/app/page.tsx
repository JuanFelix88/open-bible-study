"use client";
import Image from "next/image";
import Link from "next/link";
import SearchIcon from "./components/icons/SearchIcon";
import BibleIcon from "./favicon.ico";
import CompareIcon from "./components/icons/CompareIcon";
import { useQuery } from "@tanstack/react-query";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { Version } from "@/entities/Version";
import { BookInfo } from "@/entities/BookInfo";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BookChapterPicker from "./components/BookChapterPicker";
import ReaderSearch from "./components/ReaderSearch";

const DEFAULT_VERSION = "KJA";

export default function Home() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  function handleOpenBook() {
    const savedPage = localStorage.getItem("o-poder-progress") || "1";
    router.push(`/reader/o-poder?page=${savedPage}`);
  }

  useQuery({
    queryKey: ["versions"],
    staleTime: 5_000,
    queryFn: async () => {
      const versionsResponse = await fetch("/api/versions");

      ThrowByResponse.throwsIfNotOk(versionsResponse);

      return (await versionsResponse.json()) as Version[];
    },
  });

  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");

      ThrowByResponse.throwsIfNotOk(booksResponse);

      return (await booksResponse.json()) as BookInfo[];
    },
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center py-18 px-12 sm:px-24 bg-background text-text">
      <style jsx global>{`
        @keyframes pulse-slow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.25;
          }
        }
        @keyframes pulse-slower {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.2;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 12s ease-in-out infinite;
        }
      `}</style>
      {/* Grid background with fade effect */}
      <div className="fixed inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Background color overlays to fade grid in corners */}
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-background) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute -bottom-40 -left-32 w-[450px] h-[450px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-background) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute top-1/4 -left-24 w-[350px] h-[350px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-background) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-1/4 -right-20 w-[300px] h-[300px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-background) 0%, transparent 60%)",
          }}
        />
        {/* Colored glow accents */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl animate-pulse-slow"
          style={{
            background:
              "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-48 -left-24 w-80 h-80 rounded-full blur-3xl animate-pulse-slower"
          style={{
            background:
              "radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)",
          }}
        />
      </div>
      <div className="relative flex justify-center items-center drop-shadow-xl drop-shadow-text/20 mb-2 w-16 h-16 overflow-hidden rounded-[14px]">
        <Image
          src={BibleIcon}
          alt="Bible Icon"
          width={64}
          height={64}
          className="relative z-10"
        />
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div
            className="absolute top-0 -left-[100%] w-[150%] h-full animate-shine mix-blend-overlay"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 30%, transparent), color-mix(in srgb, var(--color-secondary) 80%, transparent), color-mix(in srgb, var(--color-primary) 30%, transparent), transparent)",
              transform: "skewX(-20deg)",
            }}
          />
        </div>
      </div>
      <h1 className="text-4xl font-bold text-center">Bible Study</h1>
      <p className="mt-4 text-lg text-center">Explore texts in depth.</p>
      <p className="text-center text-text/50 text-sm">Open source project.</p>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex justify-center items-center rounded-md border bg-surface border-border p-2 mt-4 w-full hover:bg-surface/20 max-w-sm cursor-pointer"
      >
        <SearchIcon width={16} height={16} className="mr-1 text-text/80" />
        Search
      </button>
      <BookChapterPicker
        books={books}
        isLoading={isLoadingBooks}
        currentBookAbbr=""
        currentChapter={null}
        versionAbbr={DEFAULT_VERSION}
        bookName=""
        selectedVerse={null}
        fullscreen
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            className="flex justify-center items-center rounded-md border bg-surface border-border p-2 mt-1 w-full hover:bg-surface/20 max-w-sm cursor-pointer"
          >
            <CompareIcon width={16} height={16} className="mr-1 text-text/80" />
            Select chapter
          </button>
        )}
      />
      <button
        className="flex mt-5 justify-center items-center rounded-md border bg-surface/70 border-border/80 p-2 w-full hover:bg-surface/20 max-w-sm cursor-pointer"
        onClick={handleOpenBook}
      >
        O poder da Oração e do Jejum
      </button>

      <Link
        href="/mode/set-theme"
        className="fixed sm:relative bottom-4 sm:bottom-auto right-4 sm:right-auto sm:top-auto sm:mt-8 z-50 flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-2 text-sm font-semibold hover:bg-surface/90 active:scale-[0.98] transition"
        aria-label="Open theme selector"
      >
        <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
          <span
            className="absolute inset-0 opacity-90"
            style={{
              background:
                "conic-gradient(from 180deg, var(--color-primary), var(--color-secondary), var(--color-info), var(--color-warning), var(--color-primary))",
            }}
          />
          <span className="relative z-10 h-2.5 w-2.5 rounded-full bg-background border border-border" />
        </span>
        Theme
      </Link>

      <ReaderSearch
        versionAbbr={DEFAULT_VERSION}
        bookAbbr=""
        chapterNumber={null}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
