"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookInfo } from "@/entities/BookInfo";
import { Version } from "@/entities/Version";
import { usePreferredBibleVersion } from "@/hooks/usePreferredBibleVersion";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import AppActionButton from "./components/AppActionButton";
import BookChapterPicker from "./components/BookChapterPicker";
import ReaderSearch from "./components/ReaderSearch";
import CompareIcon from "./components/icons/CompareIcon";
import DocumentIcon from "./components/icons/DocumentIcon";
import SearchIcon from "./components/icons/SearchIcon";
import BibleIcon from "./favicon.ico";

export default function Home() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const { preferredVersion } = usePreferredBibleVersion();

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-16 text-text sm:px-24">
      <div className="pointer-events-none fixed inset-0">
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.035]"
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
      </div>

      <main className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="relative mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] border border-border/50 bg-surface shadow-lg shadow-text/10">
          <Image
            src={BibleIcon}
            alt="Bible Icon"
            width={64}
            height={64}
            className="h-full w-full"
          />
        </div>

        <h1 className="text-center text-[38px] font-bold tracking-[-0.035em]">
          Bible Study
        </h1>
        <p className="mt-2 text-center text-[17px] text-text-muted">
          Explore texts in depth.
        </p>
        <p className="mt-0.5 text-center text-[13px] text-text/45">
          Open source project.
        </p>

        <section
          aria-label="Main actions"
          className="mt-7 w-full rounded-[22px] border border-border/65 bg-surface/80 p-1.5 shadow-xl shadow-text/[0.06]"
        >
          <AppActionButton
            onClick={() => setSearchOpen(true)}
            icon={<SearchIcon width={19} height={19} />}
            title="Search"
            description="Find a word or passage"
          />

          <div className="ml-[58px] h-px bg-border/55" />

          <BookChapterPicker
            books={books}
            isLoading={isLoadingBooks}
            currentBookAbbr=""
            currentChapter={null}
            versionAbbr={preferredVersion}
            bookName=""
            selectedVerse={null}
            fullscreen
            trigger={(open) => (
              <AppActionButton
                onClick={open}
                icon={<CompareIcon width={19} height={19} />}
                title="Select chapter"
                description="Choose a book and chapter"
              />
            )}
          />
        </section>

        <section aria-label="Continue reading" className="mt-4 w-full">
          <p className="mb-2 pl-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-text/40">
            Continue reading
          </p>
          <div className="rounded-[22px] border border-border/65 bg-surface/55 p-1.5 shadow-lg shadow-text/[0.04]">
            <AppActionButton
              onClick={handleOpenBook}
              icon={<DocumentIcon width={19} height={19} />}
              title="O poder da Oração e do Jejum"
              description="Resume where you stopped"
            />
          </div>
        </section>

        <Link
          href="/mode/set-theme"
          className="fixed bottom-4 right-4 z-50 flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-surface px-3.5 py-2 text-[13px] font-semibold shadow-lg shadow-text/10 transition-[background-color,transform] hover:bg-surface-strong active:scale-95 sm:relative sm:bottom-auto sm:right-auto sm:mt-7"
          aria-label="Open theme selector"
        >
          <span
            className="relative flex h-5 w-5 overflow-hidden rounded-full border border-text/40 bg-background"
            aria-hidden="true"
          >
            <span className="h-full w-1/2 bg-text" />
          </span>
          Theme
        </Link>
      </main>

      <ReaderSearch
        versionAbbr={preferredVersion}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
