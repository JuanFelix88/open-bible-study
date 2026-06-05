import { OriginalTranslatorResponse } from "@/entities/OriginalsTranslator";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import {
  tokenizeOriginalVerse,
  translateOriginalTokens,
} from "@/services/GoogleTranslateOriginalsService";
import { enrichOriginalTokensWithWiktionary } from "@/services/WiktionaryOriginalsService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { ResponseError } from "@/utils/ResponseError";
import { extractVerseParams } from "@/utils/RouteHelpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  try {
    const paramsResult = await extractVerseParams(ctx);
    if (!paramsResult.ok) return paramsResult.error;

    const { versionAbbr, bookAbbr, chapterNumber, verseNumber } = paramsResult.data;
    const targetLanguage = req.nextUrl.searchParams.get("tl") || "pt-BR";

    const { data: original, error: originalError } =
      await FnNormalizer.getFromPromise(
        BibleVersionsRepository.getOriginalText(
          versionAbbr,
          bookAbbr,
          chapterNumber,
          verseNumber,
        ),
      );

    if (
      originalError instanceof Error &&
      /not found/i.test(originalError.message)
    ) {
      return ResponseError.asError(
        `Verse [${bookAbbr.toUpperCase()} ${chapterNumber}:${verseNumber}] not found.`,
        404,
      );
    }

    if (originalError) {
      return ResponseError.asError(
        `Error fetching original verse: ${originalError?.message ?? "Unknown error"}`,
        400,
      );
    }

    const originalText = original.chapter.book.chapter.verses.at(0) ?? "";
    const tokens = tokenizeOriginalVerse(originalText);
    const translatedTokens = await translateOriginalTokens({
      tokens,
      sourceLanguage: original.versionMeta.language,
      targetLanguage,
    });
    const enrichedTokens = await enrichOriginalTokensWithWiktionary({
      tokens: translatedTokens,
      language: original.versionMeta.language,
      targetLanguage,
    });

    const payload: OriginalTranslatorResponse = {
      text: originalText,
      version: original.versionMeta.abbreviation,
      language: original.versionMeta.language,
      targetLanguage,
      tokens: enrichedTokens,
    };

    return NextResponse.json(payload);
  } catch (err) {
    return ResponseError.asError(
      `Error translating original verse: ${(err as Error)?.message ?? "Unknown error"}`,
      400,
    );
  }
}
