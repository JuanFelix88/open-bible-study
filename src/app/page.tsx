"use client";
import Image from "next/image";
import Link from "next/link";
import SearchIcon from "./components/icons/SearchIcon";
import BibleIcon from "./favicon.ico";
import CompareIcon from './components/icons/CompareIcon';

export default function Home() {
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

      <Link
        className="flex justify-center items-center rounded-md border bg-surface border-border p-2 mt-4 w-full hover:bg-surface/20 max-w-sm"
        href="/search"
      >
        <SearchIcon width={16} height={16} className="mr-1 text-text/80" />
        Search
      </Link>
      <Link
        className="flex justify-center items-center rounded-md border bg-surface border-border p-2 mt-1 w-full hover:bg-surface/20 max-w-sm"
        href="/select"
      >
        <CompareIcon width={16} height={16} className="mr-1 text-text/80" />
        Select chapter
      </Link>

      <Link href="/mode/set-theme" className="flex text-center mt-3 underline">
        Set other theme
      </Link>
    </div>
  );
}
