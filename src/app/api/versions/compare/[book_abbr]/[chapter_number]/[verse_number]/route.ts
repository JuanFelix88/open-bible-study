import { ChapterWithDiffs } from '@/entities/ChapterWithDiffs';
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { StringCompare } from '@/utils/StringCompare';
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

  const dataWithDiffs: ChapterWithDiffs[] = data.map((version) => {
    const othersVersionsTokens = data
      .filter((v) => v.version !== version.version)
      .map((v) => v.book.chapter.verses.at(0)?.split(" ") || [])
      .flat()
      .map(token => token.toLowerCase())

    const diffs = version.book.chapter.verses
      .at(0)!.split(" ").map((token) => {
        const count = othersVersionsTokens.filter(ovt => StringCompare.isEqualIgnoringCaseAndAccents(ovt, token)).length

        if (count === 0) return { token, level: 0 };
        if (count === 1) return { token, level: 0}
        if (count === 2) return { token, level: 1 }
        if (count === 3) return { token, level: 2 }
        if (count > 3) return { token, level: 3 }

        return { token, level: 0 }
      });

    return {
      ...version,
      diffs,
      diffenceScore: diffs.reduce((acc, curr) => acc + (3 - curr.level), 0)
    }
  });

  return NextResponse.json(dataWithDiffs.sort((a, b) => a.diffenceScore - b.diffenceScore));
}
