"use client";

import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import LoadingIcon from "@/app/components/icons/LoadingIcon";
import { Chapter } from "@/entities/Chapter";
import { Params } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import Markdown from "react-markdown";

export default function ReaderBibleRefComments() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [version] = Params.getParamFromSearchParams("version", searchParams);
  const bookAbbr = searchParams.get("book") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const verseNumber = searchParams.get("verse")
    ? parseInt(searchParams.get("verse")!, 10)
    : null;

  const { data: chapter } = useQuery({
    queryKey: ["chapter", version, bookAbbr, chapterNumber],
    enabled: !!(version && bookAbbr && chapterNumber),
    queryFn: async () => {
      const chapterResponse = await fetch(
        `/api/versions/${version}/${bookAbbr}/${chapterNumber}`,
      );
      await ThrowByResponse.throwsIfNotOk(chapterResponse);
      return (await chapterResponse.json()) as Chapter;
    },
  });

  const {
    data: contextMarkdown,
    isLoading: isLoadingContext,
    isFetching: isFetchingContext,
    error: contextError,
  } = useQuery({
    queryKey: ["bibleref-context", bookAbbr, chapterNumber, verseNumber],
    enabled: !!(bookAbbr && chapterNumber && verseNumber),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 14,
    queryFn: async () => {
      const contextResponse = await fetch(
        `/context/${encodeURIComponent(bookAbbr)}/${chapterNumber}/${verseNumber}`,
      );
      await ThrowByResponse.throwsIfNotOk(contextResponse);
      return contextResponse.text();
    },
  });

  function handleOnPrevious() {
    router.back();
  }

  const handleOnKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    },
    [router],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleOnKeyDown);
    return () => window.removeEventListener("keydown", handleOnKeyDown);
  }, [handleOnKeyDown]);

  const chapterText = chapterNumber?.toString() ?? "...";
  const selectedVerseText = chapter?.book.chapter.verses.at(
    (verseNumber ?? 1) - 1,
  );
  const isLoading = isLoadingContext || isFetchingContext;

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text max-w-[750px] w-screen">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
          <div className="flex flex-col">
            <Link
              className="text-2xl font-bold hover:text-primary transition-colors"
              href={`/reader?version=${version ?? ""}&book=${bookAbbr}&chapter=${chapterNumber ?? ""}&verse=${verseNumber ?? ""}`}
            >
              {chapter?.book.name || "..."} {chapterText}:{verseNumber || "..."}
            </Link>
            <h4 className="text-xs font-bold opacity-70">
              Comments: BibleRef.com
            </h4>
          </div>
          <div className="flex ml-auto">
            <button
              onClick={handleOnPrevious}
              className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80"
              aria-label="Voltar"
            >
              <ArrowLeftIcon width={30} height={30} />
            </button>
          </div>
        </div>
      </div>
      <hr className="mt-13 opacity-0" />

      {selectedVerseText && (
        <div className="w-full block">
          <div className="mb-1 text-text/95 w-full mt-1 text-lg select-none rounded-md px-1 py-[2px] bg-secondary/30 underline underline-offset-2 decoration-dashed decoration-primary relative max-w-[750px]">
            <sup className="font-bold border rounded-sm px-[2px] border-dashed border-gray-400">
              {verseNumber}
            </sup>{" "}
            {selectedVerseText}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3 mt-5 animate-show-from-bottom-slow">
          <div className="flex items-center gap-2 text-sm text-text/50">
            <LoadingIcon
              width={16}
              height={16}
              className="animate-spin opacity-70"
            />
            <span>Fetching BibleRef, translating, and formatting...</span>
          </div>
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="w-10/12 h-5 rounded-sm bg-surface animate-pulse" />
              <div className="w-full h-5 rounded-sm bg-surface animate-pulse" />
              <div className="w-4/6 h-5 rounded-sm bg-surface animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {contextError && !isLoading && (
        <div className="mt-5 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-text/80 animate-show-from-bottom-slow">
          Não encontramos contexto histórico para este versículo no BibleRef.
        </div>
      )}

      {contextMarkdown && !isLoading && (
        <article className="mt-5 animate-show-from-bottom-slow">
          <Markdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-3 text-text">
                  {children}
                </h1>
              ),
              h2: ({ children }) => {
                const isFirstSection = children === "Comentário do versículo";

                return (
                  <h2
                    className={
                      isFirstSection
                        ? "mb-2 text-lg font-bold text-text"
                        : "mt-6 mb-2 text-lg font-bold text-text border-t border-dashed border-border/70 pt-4"
                    }
                  >
                    {children}
                  </h2>
                );
              },
              p: ({ children }) => (
                <p className="text-text/90 mb-3 leading-relaxed">{children}</p>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-info underline decoration-dashed underline-offset-4 hover:text-primary"
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-3 border-primary bg-surface rounded-r-md px-3 py-2 my-3 text-text/80 italic">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => (
                <strong className="text-primary font-bold">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-text/80 italic">{children}</em>
              ),
              hr: () => <hr className="my-6 border-dashed border-border" />,
            }}
          >
            {contextMarkdown}
          </Markdown>
        </article>
      )}
    </div>
  );
}
