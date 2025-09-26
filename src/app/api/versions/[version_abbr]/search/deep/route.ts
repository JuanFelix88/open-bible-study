import { SearchResult } from "@/entities/SearchResult";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { StringCompare } from "@/utils/StringCompare";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;
  const url = req.nextUrl;
  const [queryText] = Params.getParamFromSearchParams("q", url.searchParams);

  const [versionAbbr, versionAbbrError] = Params.getRequiredParam(
    "version_abbr",
    params
  );

  if (versionAbbrError) return ResponseError.asError(versionAbbrError);
  if (!queryText) return NextResponse.json([]);

  const bibleVersionPromise =
    BibleVersionsRepository.getBibleVersion(versionAbbr);

  const { data: version, error: versionError } =
    await FnNormalizer.getFromPromise(bibleVersionPromise);

  if (versionError) return ResponseError.asError(versionError);
  if (!version) return NextResponse.json([]);

  const tokens = queryText.split(/\s+/).filter((t) => t.trim().length > 0);
  if (tokens.length === 0) return NextResponse.json([]);

  const countTotalTokensSize = tokens.reduce(
    (prev, item) => prev + item.length,
    0
  );
  const matches: (SearchResult & {
    countMatches: number;
    allSizeMatches: number;
    percent: number;
  })[] = [];
  for (const book of version) {
    if (matches.length >= 10) break;
    for (const chapterNumber in book.chapters) {
      if (matches.length >= 10) break;
      for (const verseNumber in book.chapters[chapterNumber]) {
        if (matches.length >= 10) break;

        const tokensMatches = tokens.filter((token) =>
          StringCompare.containsIgnoreCaseAndDiacritics(
            book.chapters[chapterNumber][verseNumber],
            token
          )
        );

        const matchesSize = tokensMatches.reduce(
          (prev, item) => prev + item.length,
          0
        );

        const percent = matchesSize / countTotalTokensSize;

        if (percent >= 0.6) {
          matches.push({
            bookAbbr: book.abbrev,
            bookName: book.name,
            chapter: Number(chapterNumber) + 1,
            verse: Number(verseNumber) + 1,
            countMatches: matchesSize,
            allSizeMatches: countTotalTokensSize,
            exactMatch: false,
            displayText: `${book.abbrev} ${Number(chapterNumber) + 1}:${
              verseNumber + 1
            }`,
            text: book.chapters[chapterNumber][verseNumber],
            percent,
          });
        }
      }
    }
  }

  return NextResponse.json(
    matches.sort((a, b) => b.countMatches - a.countMatches)
  );
}
