"use client";

import { BookInfo } from "@/entities/BookInfo";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BibleIcon from "../favicon.ico";
import Image from "next/image";
import Link from "next/link";
import { usePreferredBibleVersion } from "@/hooks/usePreferredBibleVersion";

export default function Welcome() {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const { preferredVersion } = usePreferredBibleVersion();
  const [, setSelectedChapter] = useState<number | null>(null);

  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const booksResponse = await fetch("/api/books");

      await ThrowByResponse.throwsIfNotOk(booksResponse);

      const booksData = await booksResponse.json();

      return booksData as BookInfo[];
    },
  });

  const selectedBookInfo = books?.find(
    (b) => b.abbr.toLowerCase() === selectedBook?.toLowerCase(),
  );

  const handleSelectBook = (bookAbbr: string) => {
    setSelectedBook(bookAbbr);
    setSelectedChapter(null);
  };

  const handleSelectChapter = (chapterNumber: number) => {
    if (!selectedBook) return;

    router.push(
      `/reader?book=${selectedBook}&version=${preferredVersion}&chapter=${chapterNumber}`,
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-18 pt-3 px-6 sm:px-24 bg-background text-text">
      {/* Back Button */}
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 text-text/70 hover:opacity-70 transition-opacity cursor-pointer"
      >
        <span>←</span>
        <span>Back to home</span>
      </Link>

      {/* Search text */}
      <div className="flex w-full max-w-2xl flex-wrap">
        <h2 className="text-[1.15rem] opacity-80 text-wrap">
          Select with <strong>Open Bible Study</strong>
        </h2>
        <Image
          src={BibleIcon}
          alt="Bible Icon"
          width={30}
          height={30}
          className="min-w-[30px] max-h-[30px]"
        />
      </div>

      {/* Browse Section */}
      <div className="mt-2 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4 opacity-80">Browse by Book</h2>

        {/* Books List */}
        {!selectedBook ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
            {isLoadingBooks
              ? Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-md bg-surface animate-pulse"
                  />
                ))
              : books?.map((book) => (
                  <button
                    key={book.abbr}
                    onClick={() => handleSelectBook(book.abbr)}
                    className="px-4 py-3 rounded-md border bg-surface border-border hover:bg-surface/80 hover:border-primary/50 cursor-pointer text-sm font-medium"
                  >
                    {book.name}
                  </button>
                ))}
          </div>
        ) : (
          <>
            {/* Back Button */}
            <button
              onClick={() => {
                setSelectedBook(null);
                setSelectedChapter(null);
              }}
              className="mb-4 flex items-center gap-2 text-primary hover:opacity-70 transition-opacity cursor-pointer"
            >
              <span>←</span>
              <span>Back to Books</span>
            </button>

            {/* Chapters for Selected Book */}
            <div>
              <h3 className="text-lg font-bold mb-3 opacity-80">
                {selectedBookInfo?.name} - Chapters
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Array.from({ length: selectedBookInfo?.numChapters || 0 }).map(
                  (_, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectChapter(index + 1)}
                      className="px-3 py-2 rounded-md border bg-surface border-border hover:bg-surface/80 hover:border-primary/50 cursor-pointer text-sm font-medium"
                    >
                      {index + 1}
                    </button>
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center text-text/60 text-sm max-w-2xl">
        <p>
          Reading from:{" "}
          <span className="text-primary font-semibold">{preferredVersion}</span>
        </p>
      </div>
    </div>
  );
}
