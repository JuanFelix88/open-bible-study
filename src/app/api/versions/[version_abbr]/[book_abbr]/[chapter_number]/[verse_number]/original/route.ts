import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { ResponseError } from "@/utils/ResponseError";
import { extractVerseParams } from "@/utils/RouteHelpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  try {
    const paramsResult = await extractVerseParams(ctx);
    if (!paramsResult.ok) return paramsResult.error;

    const { versionAbbr: abbrVersion, bookAbbr, chapterNumber, verseNumber } = paramsResult.data;

    const { data: original, error: originalError } =
      await FnNormalizer.getFromPromise(
        BibleVersionsRepository.getOriginalText(
          abbrVersion,
          bookAbbr,
          chapterNumber,
          verseNumber,
        ),
      );

    if (
      originalError instanceof Error &&
      /not found/i.test(originalError.message)
    ) {
      return ResponseError.asError(
        `Verse [${bookAbbr.toUpperCase()} ${chapterNumber}:${verseNumber}] not found.`,
        404,
      );
    }

    if (!!originalError) {
      return ResponseError.asError(
        `Error fetching original verse: ${originalError?.message ?? "Unknown error"}`,
        400,
      );
    }

    const originalText = original.chapter.book.chapter.verses.at(0) ?? "";
    return NextResponse.json({
      text: originalText,
      version: original.versionMeta.abbreviation,
      language: original.versionMeta.language,
    });
  } catch (err) {
    return ResponseError.asError(
      `Error fetching original verse: ${(err as Error)?.message ?? "Unknown error"}`,
      400,
    );
  }
}
