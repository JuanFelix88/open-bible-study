"use client";

import meta from "@/assets/versions/partitions/meta.json";
import Link from "next/link";
import { useMemo } from "react";

interface BookMeta {
  name: string;
  abbr: string;
}

const books = meta as BookMeta[];

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const bookEntries = books
  .map((book) => ({
    stripped: stripAccents(book.name),
    abbr: book.abbr,
  }))
  .sort((a, b) => b.stripped.length - a.stripped.length);

const bookNamesPattern = bookEntries
  .map((b) => {
    const pattern = escapeRegex(b.stripped);
    return pattern.replace(/^(\d) /, "$1\\s*");
  })
  .join("|");

const referenceRegex = new RegExp(
  `\\b(?:${bookNamesPattern})\\s+\\d+(?:[.:]\\d+(?:\\s*[-–]\\s*\\d+)?(?:\\s*,\\s*\\d+)*(?:ss)?)?`,
  "gi",
);

const abbrByKey = new Map<string, string>();
for (const entry of bookEntries) {
  abbrByKey.set(entry.stripped.toLowerCase().replace(/\s+/g, ""), entry.abbr);
}

function parseRef(
  stripped: string,
): { abbr: string; chapter: number; verse?: number } | null {
  const m = stripped.match(/^(.+?)\s+(\d+)(?:[.:](\d+))?/i);
  if (!m) return null;
  const key = m[1].toLowerCase().replace(/\s+/g, "");
  const abbr = abbrByKey.get(key);
  if (!abbr) return null;
  return {
    abbr,
    chapter: parseInt(m[2], 10),
    verse: m[3] ? parseInt(m[3], 10) : undefined,
  };
}

export default function BibleRefText({ children }: { children: string }) {
  const elements = useMemo(() => {
    const text = children.normalize("NFC");
    const stripped = stripAccents(text);
    const matches = [...stripped.matchAll(referenceRegex)];

    if (matches.length === 0) return [text];

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const start = match.index!;
      const end = start + match[0].length;
      const parsed = parseRef(match[0]);
      if (!parsed) continue;

      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      const href = `/reader?version=ACF&book=${parsed.abbr}&chapter=${parsed.chapter}${parsed.verse != null ? `&verse=${parsed.verse}` : ""}`;

      parts.push(
        <Link
          key={start}
          href={href}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {text.slice(start, end)}
        </Link>,
      );

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }, [children]);

  return <>{elements}</>;
}
