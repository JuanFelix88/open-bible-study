"use client";

import ArrowLeftIcon from "@/app/components/icons/ArrowLeftIcon";
import LoadingIcon from "@/app/components/icons/LoadingIcon";
import { Chapter } from "@/entities/Chapter";
import { Params } from "@/utils/Params";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import Markdown from "react-markdown";

type EnduringWordCommentsData = {
  markdown: string;
  range: string;
};

type CommentRange = {
  label: string;
  startVerse: number;
  endVerse: number;
};

function cleanCommentaryHeading(children: ReactNode) {
  const text = Array.isArray(children)
    ? children.filter((child): child is string => typeof child === "string").join("")
    : typeof children === "string"
      ? children
      : null;

  if (!text) return children;

  return text.replace(/^\s*\d+\.\s*\(\d+(?:\s*[-–—]\s*\d+)?\)\s*/, "");
}

function parseCommentRange(
  range: string | undefined,
  fallbackChapter: number | null,
  fallbackVerse: number | null,
): CommentRange | null {
  if (range) {
    const match = range.match(/^(\d+):(\d+)(?:-(\d+))?$/);

    if (match) {
      const startVerse = parseInt(match[2] ?? "", 10);
      const endVerse = parseInt(match[3] ?? match[2] ?? "", 10);

      if (Number.isInteger(startVerse) && Number.isInteger(endVerse)) {
        return {
          label: range,
          startVerse,
          endVerse,
        };
      }
    }
  }

  if (!fallbackChapter || !fallbackVerse) return null;

  return {
    label: `${fallbackChapter}:${fallbackVerse}`,
    startVerse: fallbackVerse,
    endVerse: fallbackVerse,
  };
}

export default function ReaderEnduringWordComments() {
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

  const refArticle = useRef<HTMLElement>(null);

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
    data: commentsData,
    isLoading: isLoadingComments,
    isFetching: isFetchingComments,
    error: commentsError,
  } = useQuery({
    queryKey: ["enduringword-comments", bookAbbr, chapterNumber, verseNumber],
    enabled: !!(bookAbbr && chapterNumber && verseNumber),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 14,
    queryFn: async () => {
      const commentsResponse = await fetch(
        `/comments/enduringword/${encodeURIComponent(bookAbbr)}/${chapterNumber}/${verseNumber}`,
      );
      await ThrowByResponse.throwsIfNotOk(commentsResponse);
      return {
        markdown: await commentsResponse.text(),
        range: commentsResponse.headers.get("X-EnduringWord-Range") ?? "",
      } satisfies EnduringWordCommentsData;
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

  useEffect(() => {
    if (!commentsData?.markdown) return;

    queueMicrotask(() => {
      refArticle.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [commentsData?.markdown, verseNumber]);

  const chapterText = chapterNumber?.toString() ?? "...";
  const commentRange = useMemo(
    () => parseCommentRange(commentsData?.range, chapterNumber, verseNumber),
    [commentsData?.range, chapterNumber, verseNumber],
  );
  const referenceRangeText =
    commentRange?.label ?? `${chapterText}:${verseNumber || "..."}`;
  const commentedVerses = useMemo(() => {
    if (!chapter || !commentRange) return [];

    return chapter.book.chapter.verses
      .slice(commentRange.startVerse - 1, commentRange.endVerse)
      .map((text, index) => ({
        text,
        number: commentRange.startVerse + index,
      }));
  }, [chapter, commentRange]);
  const isLoading = isLoadingComments || isFetchingComments;

  return (
    <div className="flex min-h-screen flex-col px-7 py-7 pb-15 bg-background text-text max-w-[750px] w-screen">
      <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-10 shadow">
        <div className="flex items-center max-w-[750px] mx-auto">
          <div className="flex flex-col">
            <Link
              className="text-2xl font-bold hover:text-primary transition-colors"
              href={`/reader?version=${version ?? ""}&book=${bookAbbr}&chapter=${chapterNumber ?? ""}&verse=${verseNumber ?? ""}`}
            >
              {chapter?.book.name || "..."} {referenceRangeText}
            </Link>
            <h4 className="text-xs font-bold opacity-70">
              Comments: EnduringWord.com
            </h4>
          </div>
          <div className="flex ml-auto">
            <button
              onClick={handleOnPrevious}
              className="obs-icon-button ml-4 mt-1"
              aria-label="Voltar"
            >
              <ArrowLeftIcon width={30} height={30} />
            </button>
          </div>
        </div>
      </div>
      <hr className="mt-13 opacity-0" />

      {commentedVerses.length > 0 && (
        <div className="w-full block">
          <div className="mb-1 w-full mt-1 text-lg select-none relative max-w-[750px] flex flex-col gap-2">
            {commentedVerses.map((verse) => (
              <p
                key={verse.number}
                className="text-text/95 rounded-md px-1 py-[2px] bg-secondary/30 underline underline-offset-2 decoration-dashed decoration-primary"
              >
                <sup className="font-bold border rounded-sm px-[2px] border-dashed border-gray-400">
                  {verse.number}
                </sup>{" "}
                {verse.text}
              </p>
            ))}
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
            <span>Fetching Enduring Word, translating, and formatting...</span>
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

      {commentsError && !isLoading && (
        <div className="mt-5 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-text/80 animate-show-from-bottom-slow">
          Não encontramos comentários para este versículo no Enduring Word.
        </div>
      )}

      {commentsData?.markdown && !isLoading && (
        <article
          ref={refArticle}
          className="mt-3 animate-show-from-bottom-slow scroll-mt-32"
        >
          <Markdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-3 text-text">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mt-6 mb-2 text-lg font-bold text-text border-t border-dashed border-border/70 pt-4">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-2 mb-2 text-base font-bold italic text-text">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="mt-4 mb-2 text-base font-bold text-primary">
                  {cleanCommentaryHeading(children)}
                </h4>
              ),
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
              li: ({ children }) => (
                <li className="ml-5 list-disc text-text/90 mb-2 leading-relaxed">
                  {children}
                </li>
              ),
              hr: () => <hr className="my-6 border-dashed border-border" />,
            }}
          >
            {commentsData.markdown}
          </Markdown>
        </article>
      )}
    </div>
  );
}
