import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { ReferencesRepository } from "@/repositories/ReferencesRepository";
import { ResponseError } from "@/utils/ResponseError";
import { extractBookChapterVerseParams } from "@/utils/RouteHelpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const paramsResult = await extractBookChapterVerseParams(ctx);
  if (!paramsResult.ok) return paramsResult.error;

  const { bookAbbr, chapterNumber } = paramsResult.data;

  const allBooks = await BooksAndChapters.getBooks();

  const bookIndex = allBooks.findIndex(
    (b) => b.abbr.toLowerCase() === bookAbbr.toLowerCase()
  );

  if (bookIndex === -1) {
    return ResponseError.asError(`Book abbreviation '${bookAbbr}' not found`);
  }

  const chapterIndex = chapterNumber - 1;

  try {
    const references = await ReferencesRepository.getByBookAndChapter(bookIndex, chapterIndex);
    return NextResponse.json(references);
  } catch {
    return ResponseError.asError("Database error");
  }
}
