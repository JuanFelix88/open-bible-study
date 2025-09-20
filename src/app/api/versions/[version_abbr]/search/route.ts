import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { SearchResult } from "@/entities/SearchResult";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { Params } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { StringCompare } from "@/utils/StringCompare";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;
  const url = req.nextUrl;
  const [queryText] = Params.getParamFromSearchParams("q", url.searchParams);

  const [versionAbbr, versionAbbrError] = Params.getRequiredParam(
    "version_abbr",
    params
  );

  if (versionAbbrError) return ResponseError.asError(versionAbbrError);
  if (!queryText) return NextResponse.json([]);

  const allBooks = await BooksAndChapters.getBooks();

  const result =
    /^(?<book>[0-9]? ?[A-Za-zÀ-ÿ0-9]{1,}) (?<chapter>[0-9]{1,}):?(?<verse>[0-9]{1,})?$/.exec(
      queryText
    );

  if (result) {
    const { book, chapter, verse } = result.groups || {};

    const chapterNumber = chapter ? Number(chapter || "0") : null;
    const verseNumber = verse ? Number(verse || "0") : null;

    let bookData = allBooks.find((b) =>
      StringCompare.isEqualIgnoreCaseAndDiacritics(b.abbr, book.trim())
    );

    bookData ||= allBooks.find(
      (b) =>
        StringCompare.containsIgnoreCaseAndDiacritics(b.name, book.trim())
    );

    if (!bookData) return NextResponse.json([]);

    const displayTextSearch = `${bookData.abbr} ${chapter ?? ""}${
      verse ? `:${verse}` : ""
    }`;

    const bookChapters = await BibleVersionsRepository.getBookWithVersion(
      versionAbbr,
      bookData.abbr
    );

    const results = bookChapters.chapters
      .flatMap((chapter, indexChapter) =>
        chapter.map((verse, indexVerse) => ({
          bookName: bookData.name,
          bookAbbr: bookData.abbr,
          chapter: indexChapter + 1,
          verse: indexVerse + 1,
          text: verse,
          displayText: `${bookData.abbr} ${indexChapter + 1}:${indexVerse + 1}`,
        }))
      )
      .filter(
        ({ chapter }) =>
          !chapterNumber ||
          StringCompare.containsIgnoreCaseAndDiacritics(chapter, chapterNumber)
      )
      .filter(
        ({ verse }) =>
          !verseNumber ||
          StringCompare.containsIgnoreCaseAndDiacritics(verse, verseNumber)
      )
      .map(
        ({ displayText, ...props }) =>
          ({
            ...props,
            displayText,
            exactMatch: StringCompare.isEqualIgnoreCaseAndDiacritics(
              displayText,
              displayTextSearch
            ),
          } satisfies SearchResult)
      )
      .sort((a, b) => (a.exactMatch && !b.exactMatch ? -1 : 0));

    return NextResponse.json(results.slice(0, 50));
  }

  return NextResponse.json([]);
}
