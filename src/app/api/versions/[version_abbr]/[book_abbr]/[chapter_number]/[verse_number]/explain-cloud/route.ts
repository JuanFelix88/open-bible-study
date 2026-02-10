import { VerseAnalysis } from "@/entities/VerseAnalysis";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

const PROMPT_TEMPLATE = `
Agora você é um especialista em estudos bíblicos;
Considere estudos evangélicos, protestantes e históricos (coesos);
Preciso que de acordo com o trecho bíblico abaixo você me forneça o seguinte JSON,
considerando que seja quebrado em palavras para tradução, pode ser agrupado por frase que faça mais sentido para a tradução, explique cada um em relação ao idioma destino, considerando o contexto histórico e cultural da época (com fatos históricos comprovados).
Considere também estudos profundos, significados da língua, curiosidades válidas para o contexto protestante, explicações teológicas, detalhes da tradução e quando for nome de pessoa explique quem foi a pessoa na bíblia.
Utilize unicamente ** para destacar textos ao invés de ** e afins, use apenas ** para formar bold;
Considere o seguinte trecho bíblico na língua original com destino:

"@Verse"
@DisplayVerse

Traduzir para: @DestinyLanguage

Resultado esperado em apenas em JSON:
Array<[
    string; // token, texto original, json válido (para ser usado para o clique do usuário, aqui é o texto que o usuário verá)
    string; // texto com a explicação/tradução/trazer múltiplos significados/sinônimos para tradução (gerado pela IA)
]>
`.trim();

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) {
  try {
    const params = await ctx.params;
    const [abbrVersion, abbrVersionError] = Params.getRequiredParam(
      "version_abbr",
      params,
    );
    const [bookAbbr, bookAbbrError] = Params.getRequiredParam(
      "book_abbr",
      params,
    );
    const [chapterNumber, chapterNumberError] = Params.getRequiredParam(
      "chapter_number",
      params,
      ParamType.NUMBER,
    );
    const [verseNumber, verseNumberError] = Params.getRequiredParam(
      "verse_number",
      params,
      ParamType.NUMBER,
    );

    if (abbrVersionError) return ResponseError.asError(abbrVersionError);
    if (bookAbbrError) return ResponseError.asError(bookAbbrError);
    if (chapterNumberError) return ResponseError.asError(chapterNumberError);
    if (verseNumberError) return ResponseError.asError(verseNumberError);

    const { chapter: originalVerseChapter, versionMeta: originalMeta } =
      await BibleVersionsRepository.getOriginalText(
        abbrVersion,
        bookAbbr,
        chapterNumber,
        verseNumber,
      );

    const destinyVersion =
      await BibleVersionsRepository.getVersionFromName(abbrVersion);

    const { data: chapter, error: chapterError } =
      await FnNormalizer.getFromPromise(
        BibleVersionsRepository.getChapterWithVersion(
          abbrVersion,
          bookAbbr,
          chapterNumber,
        ),
      );

    if (
      chapterError instanceof Error &&
      /not found/i.test(chapterError.message)
    ) {
      return ResponseError.asError(
        `Chapter [${bookAbbr.toUpperCase()} ${chapterNumber}] not found in version [${abbrVersion.toUpperCase()}].`,
        404,
      );
    }

    if (!!chapterError) {
      return ResponseError.asError(
        `Error fetching chapter: ${chapterError?.message ?? "Unknown error"}`,
        400,
      );
    }

    const response = await fetch("https://ollama.com/api/generate", {
      body: JSON.stringify({
        model: "gpt-oss:120b-cloud",
        prompt: PROMPT_TEMPLATE.replace(
          "@Verse",
          originalVerseChapter.book.chapter.verses.at(0) ?? "",
        )
          .replace(
            "@DisplayVerse",
            `${chapter.book.name} ${chapter.book.chapter.number}:${verseNumber}`,
          )
          .replace("@Version", abbrVersion.toUpperCase())
          .replace("@DestinyLanguage", destinyVersion.language),
        stream: false,
        think: "low",
      }),
      headers: {
        Authorization: `Bearer ${process.env.AI_OLLAMA_API_KEY}`,
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Unable to get result from OLLAMA api");
    }

    const { response: text }: { response: string } = await response.json();

    let textSanitized = text.split("```json").at(-1)?.trim() ?? "[]";
    textSanitized = textSanitized.replace(/```$/, "").trim();

    const data: string[][] = JSON.parse(textSanitized);

    return NextResponse.json(
      data.map(
        (item, index) =>
          ({
            token: item[0],
            explanation: item[1],
            token_index: index,
          }) as VerseAnalysis,
      ),
      {
        headers: {
          "Agent-AI": "gpt-oss:120b-cloud",
          language: originalMeta.language,
          version: `${originalMeta.abbreviation} - ${originalMeta.name}`,
        },
      },
    );
  } catch (error) {
    console.log(error);
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
