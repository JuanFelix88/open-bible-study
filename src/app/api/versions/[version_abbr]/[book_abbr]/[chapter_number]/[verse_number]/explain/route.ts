import { VerseAnalysis } from "@/entities/VerseAnalysis";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { IAService } from "@/services/IAService";
import { extractVerseParams } from "@/utils/RouteHelpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  try {
    const paramsResult = await extractVerseParams(ctx);
    if (!paramsResult.ok) return paramsResult.error;

    const {
      versionAbbr: abbrVersion,
      bookAbbr,
      chapterNumber,
      verseNumber,
    } = paramsResult.data;

    const chapterOrError = await BibleVersionsRepository.getChapterOrError(
      abbrVersion,
      bookAbbr,
      chapterNumber,
    );

    if (chapterOrError instanceof Response) {
      return chapterOrError;
    }

    const chapter = chapterOrError;

    const iaResponse = await IAService.request(
      `De acordo com o texto da bíblia ${chapter.book.name} ${chapter.book.chapter.number}:${verseNumber}, ` +
        `gere um retorno apenas em json no formato { token: string, token_index: number, explanation: string }[] (token_index começa com 0), explicando a tradução do texto original em relação` +
        ` ao texto traduzido. Mencione o texto original em explanation, inclua o texto de referência em token, explique a lógica da tradução e mencione traduções alternativas se houver. Dê-me explicações mais profundas, significados aprofundados da palavra. Quando nome de pessoa, explique quem foi essa pessoa. Responda-me somente no formato que mencionei. texto: "${chapter.book.chapter.verses.at(
          verseNumber - 1,
        )}"`,
    );

    const rawResult = iaResponse.response;

    let textSanitized = rawResult.split("Copy code").at(-1)?.trim() ?? "[]";

    if (textSanitized.includes("JSONCopy")) {
      textSanitized = textSanitized.split("JSONCopy").at(-1)?.trim() ?? "[]";
    }

    const data: VerseAnalysis[] = JSON.parse(textSanitized);

    return NextResponse.json(data, {
      headers: {
        "Agent-AI": iaResponse.model,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message || "Unknown error occurred",
      },
      {
        status: 400,
      },
    );
  }
}
