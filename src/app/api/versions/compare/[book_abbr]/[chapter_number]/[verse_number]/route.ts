import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;
  const [bookAbbr, bookAbbrError] = Params.getRequiredParam(
    "book_abbr",
    params
  );
  const [verseNumber, verseNumberError] = Params.getRequiredParam(
    "verse_number",
    params,
    ParamType.NUMBER
  );
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam(
    "chapter_number",
    params,
    ParamType.NUMBER
  );

  if (bookAbbrError) return ResponseError.asError(bookAbbrError);
  if (verseNumberError) return ResponseError.asError(verseNumberError);
  if (chapterNumberError) return ResponseError.asError(chapterNumberError);

  const { data, error } = await FnNormalizer.getFromPromise(
    BibleVersionsRepository.getAllVersionsWithVerse(
      bookAbbr,
      chapterNumber,
      verseNumber
    )
  );

  if (error instanceof Error && /not found/i.test(error.message)) {
    return ResponseError.asError("Verse not founded", 404);
  }

  if (error instanceof Error) {
    return ResponseError.asError(error.message);
  }

  if (!!error) {
    return ResponseError.asError("An unexpected error occurred", 500);
  }

  return NextResponse.json(data);
}
