import { Chapter } from "@/types/Chapter";
import { RawBibleVersionData } from "@/types/RawBibleVersion";
import { ModArray } from "@/utils/ModArray";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";
import { BibleVersions } from "@/definitions/BibleVersions";

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

  const versions  = await Promise.all(
    BibleVersions.versions.map(async (version) => {
      return {
        raw: (await import(`@/assets/versions/${version.abbreviation.toUpperCase()}.json`)) as RawBibleVersionData[],
        version
      }
    })
  );

  const verseVersions = versions.map(({ raw, version}) => {
    const book = ModArray.findFrom<RawBibleVersionData[never]>(raw, book => book.abbrev.toLowerCase() === bookAbbr.toLowerCase())

    if (!book) throw new Error(`Book with abbreviation ${bookAbbr} not found in version ${version}`)

    return {
      version: version.abbreviation,
      book: { 
        abbrev: book.abbrev,
        name: book.name,
        chapter: {
          number: chapterNumber,
          verses: [book.chapters[chapterNumber - 1]!.at(verseNumber - 1)!]
        }
      },
      previous: null,
      next: null
    } satisfies Chapter
  })

  return NextResponse.json(verseVersions);
}
