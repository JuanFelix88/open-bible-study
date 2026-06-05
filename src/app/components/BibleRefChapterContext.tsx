"use client";

import ChevronDownIcon from "@/app/components/icons/ChevronDownIcon";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

interface BibleRefChapterContextProps {
  bookAbbr: string;
  chapterNumber: number | null;
  enabled?: boolean;
}

function splitMarkdownBody(markdown: string) {
  return markdown.split(/\n---\n/)[0]?.trim() ?? "";
}

function getParagraphs(markdown: string) {
  return splitMarkdownBody(markdown)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function BibleRefChapterContext({
  bookAbbr,
  chapterNumber,
  enabled = true,
}: BibleRefChapterContextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data } = useQuery({
    queryKey: ["bibleref-chapter-context", bookAbbr, chapterNumber],
    enabled: Boolean(enabled && bookAbbr && chapterNumber),
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60 * 24 * 14,
    queryFn: async () => {
      if (!chapterNumber) throw new Error("Missing chapter number.");

      const contextResponse = await fetch(
        `/context/${encodeURIComponent(bookAbbr)}/${chapterNumber}`,
      );
      await ThrowByResponse.throwsIfNotOk(contextResponse);

      return {
        markdown: await contextResponse.text(),
        sourceUrl: contextResponse.headers.get("X-BibleRef-Source"),
      };
    },
  });
  const paragraphs = useMemo(
    () => (data?.markdown ? getParagraphs(data.markdown) : []),
    [data?.markdown],
  );

  const hasContext = Boolean(data && paragraphs.length > 0);

  return (
    <section className={`indent-0 mr-5 ${hasContext ? "animate-show-from-bottom-slow" : ""}`}>
      <button
        type="button"
        aria-expanded={hasContext ? isExpanded : false}
        disabled={!hasContext}
        onClick={() => setIsExpanded((current) => !current)}
        className={`inline-flex select-none items-center gap-1 py-1 text-left text-sm italic text-text-muted transition ${hasContext ? "cursor-pointer hover:text-text/70" : "invisible cursor-default"}`}
      >
        <span>Chapter context</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {hasContext && isExpanded && (
        <article className="mt-2 pl-[5px] text-sm leading-relaxed text-text/70">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
          {data?.sourceUrl && (
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-xs font-semibold text-info underline decoration-dashed underline-offset-4 hover:text-primary"
            >
              BibleRef.com
            </a>
          )}
        </article>
      )}
    </section>
  );
}
