import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { IAService } from "@/services/IAService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

interface VerseAnalysis {
  token_index: number;
  explanation: string;
  token: string;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;
  const [abbrVersion, abbrVersionError] = Params.getRequiredParam(
    "version_abbr",
    params
  );
  const [bookAbbr, bookAbbrError] = Params.getRequiredParam(
    "book_abbr",
    params
  );
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam(
    "chapter_number",
    params,
    ParamType.NUMBER
  );
  const [verseNumber, verseNumberError] = Params.getRequiredParam(
    "verse_number",
    params,
    ParamType.NUMBER
  );

  if (abbrVersionError) return ResponseError.asError(abbrVersionError);
  if (bookAbbrError) return ResponseError.asError(bookAbbrError);
  if (chapterNumberError) return ResponseError.asError(chapterNumberError);
  if (verseNumberError) return ResponseError.asError(verseNumberError);

  const { data: chapter, error: chapterError } =
    await FnNormalizer.getFromPromise(
      BibleVersionsRepository.getChapterWithVersion(
        abbrVersion,
        bookAbbr,
        chapterNumber
      )
    );

  if (
    chapterError instanceof Error &&
    /not found/i.test(chapterError.message)
  ) {
    return ResponseError.asError(
      `Chapter [${bookAbbr.toUpperCase()} ${chapterNumber}] not found in version [${abbrVersion.toUpperCase()}].`,
      404
    );
  }

  if (!!chapterError) {
    return ResponseError.asError(
      `Error fetching chapter: ${chapterError?.message ?? "Unknown error"}`,
      400
    );
  }

  const rawResult = await IAService.request(
    `De acordo com o texto da bíblia ${chapter.book.name} ${chapter.book.chapter.number}:${verseNumber}, ` +
      `gere um retorno apenas em json no formato { token: string, token_index: number, explanation: string }[], explicando a tradução do texto original em relação` +
      ` ao texto traduzido. Responda-me somente no formato que mencionei. texto: "${chapter.book.chapter.verses.at(
        verseNumber - 1
      )}"`
  );

  const data: VerseAnalysis[] = JSON.parse(
    rawResult.split("Copy code").at(-1)?.trim() ?? "[]"
  );

  return NextResponse.json(data);
}
