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

  const { data: chapter, error: chapterError } = await FnNormalizer.fun(
    BibleVersionsRepository.getChapterWithVersion(
      abbrVersion,
      bookAbbr,
      chapterNumber
    )
  );

  if (
    chapterError instanceof Error &&
    /not found/i.test(chapterError.message)
  ) {
    return ResponseError.asError(
      `Chapter [${bookAbbr.toUpperCase()} ${chapterNumber}] not found in version [${abbrVersion.toUpperCase()}].`,
      404
    );
  }

  if (!!chapterError) {
    return ResponseError.asError(
      `Error fetching chapter: ${
        chapterError?.message ?? "Unknown error"
      }`,
      400
    );
  }

  return NextResponse.json(chapter);
}
