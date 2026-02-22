import { NextRequest, NextResponse } from "next/server";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import pagesData from "@/assets/o-poder/pages.json";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const [page, pageError] = Params.getParamFromSearchParams(
    "page",
    searchParams,
    ParamType.NUMBER,
  );

  if (page !== null && page !== undefined) {
    if (pageError) return ResponseError.asError(pageError);

    const pageIndex = page - 1;

    if (pageIndex < 0 || pageIndex >= pagesData.pages.length) {
      return ResponseError.asError("Page not found", 404);
    }

    return NextResponse.json({
      title: pagesData.title,
      totalPages: pagesData.totalPages,
      page,
      content: pagesData.pages[pageIndex],
    });
  }

  return NextResponse.json({
    title: pagesData.title,
    totalPages: pagesData.totalPages,
  });
}
