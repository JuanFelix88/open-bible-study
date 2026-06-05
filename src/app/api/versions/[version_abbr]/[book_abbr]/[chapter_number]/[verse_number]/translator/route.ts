import {
  OriginalTranslatorResponse,
  OriginalTranslatorToken,
} from "@/entities/OriginalsTranslator";
import { Language } from "@/entities/Language";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import {
  tokenizeOriginalVerse,
  translateOriginalToken,
  translateOriginalTokens,
} from "@/services/GoogleTranslateOriginalsService";
import {
  enrichOriginalTokenWithWiktionary,
  enrichOriginalTokensWithWiktionary,
} from "@/services/WiktionaryOriginalsService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { ResponseError } from "@/utils/ResponseError";
import { extractVerseParams } from "@/utils/RouteHelpers";
import { NextRequest, NextResponse } from "next/server";

const STREAM_CONCURRENCY = 4;

type TranslatorStreamMeta = Omit<OriginalTranslatorResponse, "tokens"> & {
  tokens: string[];
};

function createTranslatorStreamingResponse({
  meta,
  sourceLanguage,
}: {
  meta: TranslatorStreamMeta;
  sourceLanguage: Language;
}): Response {
  const encoder = new TextEncoder();

  function encodeEvent(event: string, data: unknown) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const readable = new ReadableStream({
    async start(controller) {
      let nextIndex = 0;

      controller.enqueue(encodeEvent("meta", meta));

      async function worker() {
        while (nextIndex < meta.tokens.length) {
          const tokenIndex = nextIndex;
          nextIndex += 1;

          try {
            const translatedToken = await translateOriginalToken({
              token: meta.tokens[tokenIndex],
              tokenIndex,
              sourceLanguage,
              targetLanguage: meta.targetLanguage,
            });
            const enrichedToken = await enrichOriginalTokenWithWiktionary({
              token: translatedToken,
              language: sourceLanguage,
              targetLanguage: meta.targetLanguage,
            });

            controller.enqueue(encodeEvent("token", enrichedToken));
          } catch (error) {
            const failedToken: OriginalTranslatorToken = {
              token_index: tokenIndex,
              token: meta.tokens[tokenIndex],
              translations: [],
              error: (error as Error)?.message ?? "Unable to translate token.",
            };
            controller.enqueue(encodeEvent("token", failedToken));
          }
        }
      }

      try {
        await Promise.all(
          Array.from(
            { length: Math.min(STREAM_CONCURRENCY, meta.tokens.length) },
            () => worker(),
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        controller.enqueue(
          encodeEvent("error", {
            message: (error as Error)?.message ?? "Unknown stream error.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  try {
    const paramsResult = await extractVerseParams(ctx);
    if (!paramsResult.ok) return paramsResult.error;

    const { versionAbbr, bookAbbr, chapterNumber, verseNumber } = paramsResult.data;
    const selectedVersion = await BibleVersionsRepository.getVersionFromName(versionAbbr);
    const targetLanguage = req.nextUrl.searchParams.get("tl") || selectedVersion.language;

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

    if (req.nextUrl.searchParams.get("stream") === "1") {
      return createTranslatorStreamingResponse({
        meta: {
          text: originalText,
          version: original.versionMeta.abbreviation,
          language: original.versionMeta.language,
          targetLanguage,
          tokens,
        },
        sourceLanguage: original.versionMeta.language,
      });
    }

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
