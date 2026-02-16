import { VerseAnalysis } from "@/entities/VerseAnalysis";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

const PROMPT_TEMPLATE = `
Você é um especialista em estudos bíblicos com foco evangélico e protestante.

# Tarefa

Analise o versículo abaixo na língua original e produza uma explicação detalhada, traduzindo e explicando cada trecho para o idioma destino.

## Versículo original

"@Verse"
@DisplayVerse

## Idioma destino

@DestinyLanguage

## Regras

1. Divida o versículo original em tokens. Cada token é uma palavra ou grupo curto de palavras que formam uma unidade de sentido para tradução.
2. Para cada token, escreva uma explicação no idioma destino contendo:
   - Tradução literal e possíveis sinônimos.
   - Significado no idioma original (hebraico, grego ou aramaico).
   - Contexto histórico e cultural comprovado da época.
   - Quando o token for um nome próprio, explique quem foi a pessoa na Bíblia.
   - Curiosidades teológicas relevantes ao contexto protestante.
3. Use apenas **texto** (dois asteriscos) para destacar palavras em negrito nas explicações. Não use outros formatos como *itálico*, __sublinhado__ ou # títulos.
4. Cada token deve preservar o texto exatamente como aparece no versículo original, incluindo pontuação adjacente.

## Formato de saída

Responda APENAS com um JSON válido, sem texto antes ou depois, sem blocos de código markdown.
O JSON deve ser um array de arrays, onde cada elemento interno tem exatamente 2 strings: [token, explicação].

Exemplo de formato (não copie o conteúdo, apenas a estrutura):

[
  ["בְּרֵאשִׁית", "**Bereshit** — Significa **No princípio** ou **No começo**. Vem da raiz hebraica **rosh** (cabeça, início). Indica o ponto de partida absoluto da criação."],
  ["בָּרָא", "**Bará** — Verbo hebraico que significa **criou**. Usado exclusivamente para a ação criadora de Deus, diferente de **asah** (fazer/formar)."]
]
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
        model: "glm-5:cloud",
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
          "Agent-AI": "glm-5:cloud",
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
