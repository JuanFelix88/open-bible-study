import { BibleRefContextService } from "@/services/BibleRefContextService";
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

  const paramError = bookError ?? chapterError;
  if (paramError) return ResponseError.asError(paramError, 404);

  if (!Number.isInteger(chapter)) {
    return ResponseError.asError("Chapter must be an integer.", 404);
  }

  try {
    const context = await BibleRefContextService.getChapterContext(
      book,
      chapter,
    );

    return new NextResponse(context.markdown, {
      status: 200,
      headers: {
        "Cache-Control": "s-maxage=604800, stale-while-revalidate=86400",
        "Content-Type": "text/markdown; charset=utf-8",
        "X-BibleRef-Source": context.sourceUrl,
        "X-BibleRef-Reference": encodeURIComponent(context.reference),
      },
    });
  } catch (error) {
    if (BibleRefContextService.isNotFound(error)) {
      return ResponseError.asError((error as Error).message, 404);
    }

    return ResponseError.asError(
      `Error fetching BibleRef chapter context: ${(error as Error)?.message ?? "Unknown error"}`,
      502,
    );
  }
}
