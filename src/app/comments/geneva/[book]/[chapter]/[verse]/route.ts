import { GenevaStudyBibleService } from "@/services/GenevaStudyBibleService";
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
    const commentary = await GenevaStudyBibleService.getCommentary(
      book,
      chapter,
      verse,
      req.nextUrl.searchParams.get("version"),
    );

    return new NextResponse(commentary.markdown, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=604800, stale-while-revalidate=86400",
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Geneva-Source": commentary.sourceUrl,
        "X-Geneva-Reference": encodeURIComponent(commentary.reference),
        "X-Geneva-Language": commentary.language,
      },
    });
  } catch (error) {
    if (GenevaStudyBibleService.isNotFound(error)) {
      return ResponseError.asError((error as Error).message, 404);
    }

    return ResponseError.asError(
      `Error fetching Geneva Study Bible commentary: ${(error as Error)?.message ?? "Unknown error"}`,
      502,
    );
  }
}
