import { RawBibleVersionData } from '@/types/RawBibleVersion';
import { ModArray } from "@/utils/ModArray";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

interface LinkToChapter {
  abbrev: string;
  numChapter: number;
}

export interface Chapter {
  version: string;
  book: {
    name: string;
    abbrev: string;
    chapter: {
      number: number;
      verses: string[];
    };
  };
  previous: LinkToChapter | null;
  next: LinkToChapter | null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;
  const [abbrVersion, abbrVersionError] = Params.getRequiredParam(
    "version_abbr",
    params
  );
  const [bookAbbr, bookAbbrError] = Params.getRequiredParam(
    "book_abbr",
    params
  );
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam(
    "chapter_number",
    params,
    ParamType.NUMBER
  );

  if (abbrVersionError) return ResponseError.asError(abbrVersionError);
  if (bookAbbrError) return ResponseError.asError(bookAbbrError);
  if (chapterNumberError) return ResponseError.asError(chapterNumberError);

  const data = (await import(
    `@/assets/versions/${abbrVersion.toUpperCase()}.json`
  ).catch(() => null)) as RawBibleVersionData | null;

  if (!data) {
    return ResponseError.asError(`Version ${abbrVersion} not found`, 404);
  }

  const book = ModArray.findFrom(
    data,
    (book: RawBibleVersionData[0]) =>
      book.abbrev.toUpperCase() === bookAbbr.toUpperCase()
  );

  if (!book) {
    return ResponseError.asError(`Book ${bookAbbr} not found`, 404);
  }

  const chapter = book.chapters[chapterNumber - 1];

  if (!chapter) {
    return ResponseError.asError(`Chapter ${chapterNumber} not found`, 404);
  }

  const bookIndex = ModArray.indexOfFrom(data, book);

  const isLastChapter = chapterNumber === book.chapters.length;
  const isFirstChapter = chapterNumber === 1;

  const previousBook = bookIndex > 0 ? data[bookIndex - 1] : null;
  const nextBook = bookIndex < data.length - 1 ? data[bookIndex + 1] : null;

  let previous: LinkToChapter | null = null;
  let next: LinkToChapter | null = null;

  if (isFirstChapter && previousBook) {
    previous = {
      abbrev: previousBook.abbrev,
      numChapter: previousBook.chapters.length,
    };
  } else if (!isFirstChapter) {
    previous = { abbrev: book.abbrev, numChapter: chapterNumber - 1 };
  }

  if (isLastChapter && nextBook) {
    next = { abbrev: nextBook.abbrev, numChapter: 1 };
  } else if (!isLastChapter) {
    next = { abbrev: book.abbrev, numChapter: chapterNumber + 1 };
  }

  return NextResponse.json({
    version: abbrVersion,
    book: {
      name: book.name,
      abbrev: book.abbrev,
      chapter: {
        number: chapterNumber,
        verses: chapter,
      },
    },
    previous,
    next,
  } satisfies Chapter);
}
