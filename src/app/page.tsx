"use client";
import Image from "next/image";
import Link from "next/link";
import SearchIcon from "./components/icons/SearchIcon";
import BibleIcon from "./favicon.ico";
import CompareIcon from "./components/icons/CompareIcon";
import { useQuery } from "@tanstack/react-query";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { Version } from "@/entities/Version";

export default function Home() {
  useQuery({
    queryKey: ["versions"],
    staleTime: 5_000,
    queryFn: async () => {
      const versionsResponse = await fetch("/api/versions");

      ThrowByResponse.throwsIfNotOk(versionsResponse);

      return (await versionsResponse.json()) as Version[];
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-18 px-12 sm:px-24 bg-background text-text">
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
