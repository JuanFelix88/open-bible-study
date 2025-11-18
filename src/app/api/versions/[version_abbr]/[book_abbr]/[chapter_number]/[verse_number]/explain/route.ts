import { VerseAnalysis } from "@/entities/VerseAnalysis";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { IAService } from "@/services/IAService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  try {
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

    const iaResponse = await IAService.request(
      `De acordo com o texto da bíblia ${chapter.book.name} ${chapter.book.chapter.number}:${verseNumber}, ` +
        `gere um retorno apenas em json no formato { token: string, token_index: number, explanation: string }[] (token_index começa com 0), explicando a tradução do texto original em relação` +
        ` ao texto traduzido. Mencione o texto original em explanation, inclua o texto de referência em token, explique a lógica da tradução e mencione traduções alternativas se houver. Dê-me explicações mais profundas, significados aprofundados da palavra. Quando nome de pessoa, explique quem foi essa pessoa. Responda-me somente no formato que mencionei. texto: "${chapter.book.chapter.verses.at(
          verseNumber - 1
        )}"`
    );

    const rawResult = iaResponse.response;

    let textSanitized = rawResult.split("Copy code").at(-1)?.trim() ?? "[]";

    if (textSanitized.includes("JSONCopy")) {
      textSanitized = textSanitized.split("JSONCopy").at(-1)?.trim() ?? "[]";
    }

    const data: VerseAnalysis[] = JSON.parse(textSanitized);

    return NextResponse.json(data, {
      headers: {
        "Agent-AI": iaResponse.agentName,
      },
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: (error as Error).message || "Unknown error occurred",
      },
      {
        status: 400,
      }
    );
  }
}
