import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_COUNT = 50;
const MAX_COUNT = 200;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  const params = await ctx.params;
  const [versionAbbr, versionAbbrError] = Params.getRequiredParam(
    "version_abbr",
    params,
  );
  const [word] = Params.getParamFromSearchParams(
    "word",
    req.nextUrl.searchParams,
  );
  const [count, countError] = Params.getParamFromSearchParams(
    "count",
    req.nextUrl.searchParams,
    ParamType.NUMBER,
  );

  if (versionAbbrError) return ResponseError.asError(versionAbbrError);
  if (countError) return ResponseError.asError(countError);

  const normalizedWord = word?.trim();
  const parsedCount = count ?? DEFAULT_COUNT;

  if (!normalizedWord) return ResponseError.asError("Query param word is needed");
  if (!Number.isInteger(parsedCount)) {
    return ResponseError.asError("Query param count must be an integer");
  }

  const safeCount = Math.min(Math.max(parsedCount, 1), MAX_COUNT);
  const { data, error } = await FnNormalizer.getFromPromise(
    BibleVersionsRepository.getRelativeVerses({
      word: normalizedWord,
      versionAbbr,
      count: safeCount,
    }),
  );

  if (error instanceof Error && /not found/i.test(error.message)) {
    return ResponseError.asError(error.message, 404);
  }

  if (error) return ResponseError.asError(error);

  return NextResponse.json(data);
}
