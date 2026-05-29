import { SearchResult } from "@/entities/SearchResult";
import { Fragment, memo, type ReactNode, useMemo } from "react";

interface ReaderSearchResultItemProps {
  result: SearchResult;
  versionAbbr: string;
  query: string;
  isSelected: boolean;
  onNavigate: (result: SearchResult) => void;
}

const ReaderSearchResultItem = memo(function ReaderSearchResultItem({
  result,
  versionAbbr,
  query,
  isSelected,
  onNavigate,
}: ReaderSearchResultItemProps) {
  const tokens = useMemo(() => getSearchTokens(query), [query]);
  const highlightRegex = useMemo(() => createHighlightRegex(tokens), [tokens]);
  const snippet = useMemo(
    () => buildSnippet(result.text, tokens, 120),
    [result.text, tokens],
  );

  return (
    <button
      type="button"
      onClick={() => onNavigate(result)}
      className={`group w-full text-left rounded-xl p-3 cursor-pointer ${
        isSelected
          ? "bg-primary/15 ring-1 ring-primary/40"
          : "bg-background/50 hover:bg-background/80"
      }`}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-bold text-primary tracking-wide">
          {result.bookName} {result.chapter}:{result.verse}
        </span>
        <span className="text-[0.6rem] text-text/40 uppercase tracking-widest">
          {versionAbbr}
        </span>
      </div>
      <p className="text-sm text-text/80 leading-relaxed line-clamp-2">
        {highlightTokens(snippet, highlightRegex)}
      </p>
    </button>
  );
});

function getSearchTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function createHighlightRegex(tokens: string[]): RegExp | null {
  if (!tokens.length) return null;

  const escaped = tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(`(${escaped.join("|")})`, "gi");
}

function highlightTokens(text: string, regex: RegExp | null): ReactNode[] {
  if (!regex) return [text];

  const parts = text.split(regex);

  return parts.map((part, i) => {
    regex.lastIndex = 0;
    if (regex.test(part)) {
      return (
        <mark
          key={i}
          className="bg-primary/25 text-text rounded-sm px-[1px] font-semibold"
        >
          {part}
        </mark>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function buildSnippet(text: string, tokens: string[], maxLen = 100): string {
  if (!tokens.length) {
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  }

  const lower = text.toLowerCase();
  let firstIdx = text.length;
  for (const token of tokens) {
    const idx = lower.indexOf(token.toLowerCase());
    if (idx !== -1 && idx < firstIdx) firstIdx = idx;
  }

  if (firstIdx === text.length) {
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  }

  const contextBefore = 30;
  let start = Math.max(0, firstIdx - contextBefore);
  const end = Math.min(text.length, start + maxLen);

  if (end - start < maxLen && start > 0) {
    start = Math.max(0, end - maxLen);
  }

  const snippet = text.slice(start, end);
  const prefix = start > 0 ? "… " : "";
  const suffix = end < text.length ? " …" : "";

  return prefix + snippet.trim() + suffix;
}

export default ReaderSearchResultItem;
