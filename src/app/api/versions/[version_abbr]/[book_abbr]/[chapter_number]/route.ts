import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { extractChapterParams } from "@/utils/RouteHelpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  const paramsResult = await extractChapterParams(ctx);
  if (!paramsResult.ok) return paramsResult.error;

  const { versionAbbr, bookAbbr, chapterNumber } = paramsResult.data;

  const chapterOrError = await BibleVersionsRepository.getChapterOrError(
    versionAbbr,
    bookAbbr,
    chapterNumber
  );

  if (chapterOrError instanceof Response) {
    return chapterOrError;
  }

  return NextResponse.json(chapterOrError);
}
