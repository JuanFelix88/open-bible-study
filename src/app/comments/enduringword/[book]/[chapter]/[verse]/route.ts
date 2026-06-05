import { EnduringWordCommentaryService } from "@/services/EnduringWordCommentaryService";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 604800;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  const params = await ctx.params;
  const [book, bookError] = Params.getRequiredParam("book", params);
  const [chapter, chapterError] = Params.getRequiredParam(
    "chapter",
    params,
    ParamType.NUMBER,
  );
  const [verse, verseError] = Params.getRequiredParam(
    "verse",
    params,
    ParamType.NUMBER,
  );

  const paramError = bookError ?? chapterError ?? verseError;
  if (paramError) return ResponseError.asError(paramError, 404);

  if (!Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return ResponseError.asError("Chapter and verse must be integers.", 404);
  }

  try {
    const commentary = await EnduringWordCommentaryService.getCommentary(
      book,
      chapter,
      verse,
    );

    return new NextResponse(commentary.markdown, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=604800, stale-while-revalidate=86400",
        "Content-Type": "text/markdown; charset=utf-8",
        "X-EnduringWord-Source": commentary.sourceUrl,
        "X-EnduringWord-Reference": encodeURIComponent(commentary.reference),
        "X-EnduringWord-Range": commentary.range,
        "X-EnduringWord-Section": commentary.sectionId,
      },
    });
  } catch (error) {
    if (EnduringWordCommentaryService.isNotFound(error)) {
      return ResponseError.asError((error as Error).message, 404);
    }

    return ResponseError.asError(
      `Error fetching Enduring Word commentary: ${(error as Error)?.message ?? "Unknown error"}`,
      502,
    );
  }
}
