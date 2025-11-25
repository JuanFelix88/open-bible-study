"use client";

import BibleIcon from "@/app/favicon.ico";
import { SearchResult } from "@/entities/SearchResult";
import { Version } from "@/entities/Version";
import { useDebounce } from "@/hooks/useDebounce";
import { Params } from "@/utils/Params";
import { StringCompare } from "@/utils/StringCompare";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LinkIcon from "../components/icons/LinkIcon";

const displayVersionRegex =
  /^(?<book>[0-9]? ?[A-Za-zÀ-ÿ0-9]{1,}) (?<chapter>[0-9]{1,}):?(?<verse>[0-9]{1,})?$/;

export default function Search() {
  const searchParams = useSearchParams();
  const [versionAbbrParam] = Params.getParamFromSearchParams(
    "version",
    searchParams
  );

  const [isSelectingVersion, setIsSelectingVersion] = useState(
    !versionAbbrParam
  );
  const [searchVersionText, setSearchVersionText] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 150);
  const refSearchText = useRef<HTMLInputElement>(null);

  const { data: versions } = useQuery({
    queryKey: ["versions"],
    queryFn: async () => {
      const versionsResponse = await fetch("/api/versions");

      ThrowByResponse.throwsIfNotOk(versionsResponse);

      return (await versionsResponse.json()) as Version[];
    },
  });

  const { data: results, isLoading: isLoadingQueryResults } = useQuery({
    queryKey: ["search", selectedVersion, debouncedSearchText],
    staleTime: 5_000,
    queryFn: async () => {
      if (!debouncedSearchText || !selectedVersion) return [];

      const versionAbbr = selectedVersion.abbreviation.toLowerCase();

      const versionsResponse = displayVersionRegex.test(debouncedSearchText)
        ? await fetch(
            `/api/versions/${versionAbbr}/search?q=${encodeURIComponent(
              debouncedSearchText
            )}`
          )
        : await fetch(
            `/api/versions/${versionAbbr}/search/deep?q=${encodeURIComponent(
              debouncedSearchText
            )}&count=100`
          );

      ThrowByResponse.throwsIfNotOk(versionsResponse);

      return (await versionsResponse.json()) as SearchResult[];
    },
  });

  useEffect(() => {
    if (!versionAbbrParam || !versions) return;

    const matchedVersion = versions.find((v) =>
      StringCompare.isEqualIgnoringCase(v.abbreviation, versionAbbrParam)
    );

    setSelectedVersion(matchedVersion || null);
  }, [versionAbbrParam, versions]);

  useEffect(() => {
    if (!isSelectingVersion && selectedVersion) {
      refSearchText.current?.focus()
    }
  }, [isSelectingVersion, selectedVersion]);

  const filteredVersions = versions?.filter(
    (v) =>
      !searchVersionText ||
      StringCompare.containsIgnoreCaseAndDiacritics(
        v.name,
        searchVersionText
      ) ||
      StringCompare.containsIgnoreCaseAndDiacritics(
        v.abbreviation,
        searchVersionText
      )
  );

  const isLoadingResults =
    isLoadingQueryResults || searchText !== debouncedSearchText || !versions;

  return (
    <div className="flex min-h-screen w-full flex-col items-center px-7 py-7 sm:py-7 pb-15 bg-background relative text-text">
      <div className="flex flex-col max-w-md w-full items-center animate-show-from-top">
        <Image
          src={BibleIcon}
          alt="Bible Icon"
          width={64}
          height={64}
          className="mb-2"
        />
        <h1 className="text-4xl font-bold text-center">Open Bible Study</h1>
        <h2 className="text-xl opacity-80">Search texts</h2>

        {/* Selecting version */}
        {isSelectingVersion && (
          <>
            <input
              type="text"
              autoFocus
              placeholder='Search version (e.g. "ARA")'
              value={searchVersionText}
              onChange={(e) => setSearchVersionText(e.target.value)}
              className="mt-2 w-full p-2 border-2 border-border bg-background brightness-[1.13] rounded-md"
            />

            {filteredVersions?.map((version) => (
              <button
                key={version.abbreviation}
                className="mt-3 w-full items-center flex bg-surface rounded p-2 gap-1 hover:bg-info/30 active:scale-95 transition-[scale] border border-border/80 cursor-pointer"
                onClick={() => {
                  setSelectedVersion(version);
                  setIsSelectingVersion(false);
                }}
              >
                <span className="opacity-70 text-sm font-bold">
                  {version.abbreviation}
                </span>
                -
                <span className="text-start max-w-4/6 text-ellipsis flex">
                  {version.name}
                </span>
                <LinkIcon
                  width={16}
                  height={16}
                  className="-mt-1 ml-auto text-text/50"
                />
              </button>
            ))}
          </>
        )}

        {/* Search */}
        {!isSelectingVersion && (
          <>
            <button
              onClick={() => setIsSelectingVersion(true)}
              className="border border-border rounded-md p-2 mt-4 text-text bg-surface w-full hover:bg-surface-strong cursor-pointer select-none"
            >
              {selectedVersion ? (
                <span className="text-primary/90">
                  {selectedVersion.abbreviation} - {selectedVersion.name}
                </span>
              ) : (
                "Click to select a version"
              )}
            </button>

            <input
              hidden={!selectedVersion}
              ref={refSearchText}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              type="text"
              placeholder="Search texts..."
              className="mt-4 w-full p-2 border-2 border-border bg-background brightness-[1.13] rounded-md"
            />

            {!isLoadingResults && !!selectedVersion && !results?.length && (
              <div className="p-4 mt-2">
                <span className="text-text/70">No results found</span>
              </div>
            )}

            {isLoadingResults && (
              <div className="flex flex-col gap-2 mt-1 w-full">
                <div className="flex flex-col bg-surface/60 mt-3 p-2 gap-1 rounded">
                  <div className="w-22 h-5 rounded-sm bg-text/30 animate-pulse mb-2" />
                  <div className="w-full h-4 rounded-sm bg-text/25 animate-pulse" />
                  <div className="w-6/12 h-4 rounded-sm bg-text/25 animate-pulse" />
                </div>
                <div className="flex flex-col bg-surface/60 mt-3 p-2 gap-1 rounded">
                  <div className="w-14 h-5 rounded-sm bg-text/30 animate-pulse mb-2" />
                  <div className="w-10/12 h-4 rounded-sm bg-text/25 animate-pulse" />
                  <div className="w-8/12 h-4 rounded-sm bg-text/25 animate-pulse" />
                  <div className="w-3/12 h-4 rounded-sm bg-text/25 animate-pulse" />
                </div>
                <div className="flex flex-col bg-surface/60 mt-3 p-2 gap-1 rounded">
                  <div className="w-20 h-5 rounded-sm bg-text/30 animate-pulse mb-2" />
                  <div className="w-full h-4 rounded-sm bg-text/25 animate-pulse" />
                  <div className="w-7/12 h-4 rounded-sm bg-text/25 animate-pulse" />
                </div>
                <div className="flex flex-col bg-surface/60 mt-3 p-2 gap-1 rounded">
                  <div className="w-16 h-5 rounded-sm bg-text/30 animate-pulse mb-2" />
                  <div className="w-full h-4 rounded-sm bg-text/25 animate-pulse" />
                  <div className="w-7/12 h-4 rounded-sm bg-text/25 animate-pulse" />
                  <div className="w-8/12 h-4 rounded-sm bg-text/25 animate-pulse" />
                </div>
              </div>
            )}
            {results?.map((result) => (
              <Link
                key={result.displayText}
                href={`/reader?version=${selectedVersion?.abbreviation}&book=${result.bookAbbr}&chapter=${result.chapter}&verse=${result.verse}`}
                className="mt-3 w-full flex items-start flex-col bg-surface rounded p-2 gap-1 hover:bg-info/30 active:scale-[0.97] transition-[scale] border border-dashed border-border/80 cursor-pointer"
              >
                <div className="flex gap-1 items-center w-full">
                  <span className="items-start">
                    {result.bookName} {result.chapter}:{result.verse}
                  </span>
                  <LinkIcon
                    width={16}
                    height={16}
                    className="-mt-1 ml-auto text-text/50"
                  />
                </div>
                <span className="items-start text-start text-text/90 ">
                  {result.text}
                </span>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
