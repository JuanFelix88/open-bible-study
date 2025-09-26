"use client";
import type { BibleVersionObject } from "@/entities/BibleVersion";
import Image from "next/image";
import { useEffect, useState } from "react";
import BibleIcon from "./favicon.ico";
import Link from "next/link";

interface Book {
  abbr: string;
  name: string;
  numChapters: number;
}

export default function Home() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] =
    useState<BibleVersionObject | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [versions, setVersions] = useState<BibleVersionObject[]>([]);

  useEffect(() => {
    fetch("/api/books")
      .then((response) => response.json())
      .then((data) => setBooks(data))
      .catch((error) => console.error("Error fetching books:", error));

    fetch("/api/versions")
      .then((response) => response.json())
      .then((data) => setVersions(data))
      .catch((error) => console.error("Error fetching versions:", error));
  }, []);

  const bookName = selectedBook?.abbr || "";
  const version = selectedVersion?.abbreviation || "";

  const hrefStartReading = `/reader?book=${bookName}&version=${version}&chapter=${
    selectedChapter || ""
  }`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-18 px-12 sm:px-24 bg-background text-text">
      <Image
        src={BibleIcon}
        alt="Bible Icon"
        width={64}
        height={64}
        className="mb-2"
      />
      <h1 className="text-4xl font-bold text-center">Open Bible Study</h1>
      <p className="mt-4 text-lg text-center">Explore texts in depth.</p>

      <select
        autoFocus
        name="versions"
        id="versions"
        className="rounded-md border border-border brightness-[1.15] bg-background  p-2 mt-4 w-full max-w-sm text-text"
        value={selectedVersion?.abbreviation || ""}
        onChange={(e) => {
          const version =
            versions.find((v) => v.abbreviation === e.target.value) || null;
          setSelectedVersion(version);
        }}
      >
        <option value="" className='bg-background'>Select a version...</option>
        {versions.map((version) => (
          <option key={version.abbreviation} value={version.abbreviation} className='bg-background'>
            {version.abbreviation} - {version.name}
          </option>
        ))}
      </select>

      <select
        name="books"
        id="books"
        className="rounded-md border border-border brightness-[1.15] bg-background p-2 mt-4 w-full max-w-sm"
        value={selectedBook?.abbr || ""}
        onChange={(e) => {
          const book = books.find((b) => b.abbr === e.target.value) || null;
          setSelectedBook(book);
          setSelectedChapter(null);
        }}
      >
        <option value="" className='bg-background'>Select a book...</option>
        {books.map((book) => (
          <option key={book.abbr} value={book.abbr} className='bg-background'>
            {book.name} ({book.numChapters} chapters)
          </option>
        ))}
      </select>
      <select
        name="chapters"
        id="chapters"
        className="rounded-md border border-border brightness-[1.15] bg-background p-2 mt-4 w-full max-w-sm"
        onChange={(e) => {
          setSelectedChapter(parseInt(e.target.value, 10) || null);
        }}
        value={selectedChapter || ""}
        disabled={!selectedBook}
      >
        <option value="" className='bg-background'>Select a chapter...</option>
        {Array.from({ length: selectedBook?.numChapters || 0 }, (_, i) => (
          <option key={i} value={i + 1} className='bg-background'>
            {i + 1}
          </option>
        ))}
      </select>

      <Link
        className="flex justify-center items-center rounded-md border bg-surface border-border p-2 mt-4 w-full hover:bg-surface/20 max-w-sm"
        href={hrefStartReading}
      >
        Start reading
      </Link>

      <Link href="/mode/set-theme" className="flex text-center mt-3 underline">
        Set other theme
      </Link>
    </div>
  );
}
