import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";

export type RouteContext = { params: Promise<Record<string, string>> };

type ExtractParamsResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: Response };

export async function extractChapterParams(
  ctx: RouteContext
): Promise<ExtractParamsResult<{ versionAbbr: string; bookAbbr: string; chapterNumber: number }>> {
  const params = await ctx.params;

  const [versionAbbr, versionAbbrError] = Params.getRequiredParam("version_abbr", params);
  const [bookAbbr, bookAbbrError] = Params.getRequiredParam("book_abbr", params);
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam("chapter_number", params, ParamType.NUMBER);

  const errors = [versionAbbrError, bookAbbrError, chapterNumberError].filter(Boolean);
  if (errors.length > 0) {
    return { ok: false, error: ResponseError.asError(errors[0]!) };
  }

  return { ok: true, data: { versionAbbr, bookAbbr, chapterNumber } };
}

export async function extractVerseParams(
  ctx: RouteContext
): Promise<ExtractParamsResult<{ versionAbbr: string; bookAbbr: string; chapterNumber: number; verseNumber: number }>> {
  const params = await ctx.params;

  const [versionAbbr, versionAbbrError] = Params.getRequiredParam("version_abbr", params);
  const [bookAbbr, bookAbbrError] = Params.getRequiredParam("book_abbr", params);
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam("chapter_number", params, ParamType.NUMBER);
  const [verseNumber, verseNumberError] = Params.getRequiredParam("verse_number", params, ParamType.NUMBER);

  const errors = [versionAbbrError, bookAbbrError, chapterNumberError, verseNumberError].filter(Boolean);
  if (errors.length > 0) {
    return { ok: false, error: ResponseError.asError(errors[0]!) };
  }

  return { ok: true, data: { versionAbbr, bookAbbr, chapterNumber, verseNumber } };
}

export async function extractBookChapterParams(
  ctx: RouteContext
): Promise<ExtractParamsResult<{ bookAbbr: string; chapterNumber: number }>> {
  const params = await ctx.params;

  const [bookAbbr, bookAbbrError] = Params.getRequiredParam("book_abbr", params, ParamType.STRING);
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam("chapter_number", params, ParamType.NUMBER);

  const errors = [bookAbbrError, chapterNumberError].filter(Boolean);
  if (errors.length > 0) {
    return { ok: false, error: ResponseError.asError(errors[0]!) };
  }

  if (chapterNumber < 1) {
    return { ok: false, error: ResponseError.asError("Chapter number must be greater than 0") };
  }

  return { ok: true, data: { bookAbbr, chapterNumber } };
}

export async function extractBookChapterVerseParams(
  ctx: RouteContext
): Promise<ExtractParamsResult<{ bookAbbr: string; chapterNumber: number; verseNumber: number }>> {
  const params = await ctx.params;

  const [bookAbbr, bookAbbrError] = Params.getRequiredParam("book_abbr", params, ParamType.STRING);
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam("chapter_number", params, ParamType.NUMBER);
  const [verseNumber, verseNumberError] = Params.getRequiredParam("verse_number", params, ParamType.NUMBER);

  const errors = [bookAbbrError, chapterNumberError, verseNumberError].filter(Boolean);
  if (errors.length > 0) {
    return { ok: false, error: ResponseError.asError(errors[0]!) };
  }

  if (chapterNumber < 1) {
    return { ok: false, error: ResponseError.asError("Chapter number must be greater than 0") };
  }

  return { ok: true, data: { bookAbbr, chapterNumber, verseNumber } };
}

export async function extractReferenceIdParam(
  ctx: RouteContext
): Promise<ExtractParamsResult<{ referenceId: number }>> {
  const params = await ctx.params;

  const [referenceId, referenceIdError] = Params.getRequiredParam("reference_id", params, ParamType.NUMBER);

  if (referenceIdError) {
    return { ok: false, error: ResponseError.asError(referenceIdError) };
  }

  if (referenceId < 1) {
    return { ok: false, error: ResponseError.asError("Is invalid reference ID") };
  }

  return { ok: true, data: { referenceId } };
}
