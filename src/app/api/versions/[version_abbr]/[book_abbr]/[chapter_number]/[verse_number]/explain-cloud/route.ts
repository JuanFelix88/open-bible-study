import { VerseAnalysis } from "@/entities/VerseAnalysis";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { CLIProxyAPIIntegration } from "@/services/CLIProxyApi";
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
2. Para cada token, escreva uma explicação no idioma destino usando Markdown completo:
   - Tradução literal e possíveis sinônimos.
   - Significado no idioma original (hebraico, grego ou aramaico).
   - Contexto histórico e cultural comprovado da época.
   - Quando o token for um nome próprio, explique quem foi a pessoa na Bíblia.
   - Curiosidades teológicas relevantes ao contexto protestante.
3. Use formatação Markdown rica nas explicações: **negrito**, *itálico*, listas com - ou 1., e > para citações. Não use títulos com #.
4. Cada token deve preservar o texto exatamente como aparece no versículo original, incluindo pontuação adjacente.

## Formato de saída

Responda APENAS com um JSON válido, sem texto antes ou depois, sem blocos de código markdown.
O JSON deve ser um array de arrays, onde cada elemento interno tem exatamente 2 strings: [token, explicação_em_markdown].

Exemplo de formato (não copie o conteúdo, apenas a estrutura):

[
  ["בְּרֵאשִׁית", "**Bereshit** — Significa *No princípio* ou *No começo*.\n\n- Vem da raiz hebraica **rosh** (cabeça, início).\n- Indica o ponto de partida absoluto da criação.\n\n> Curiosidade: a palavra aparece apenas neste contexto de criação divina."],
  ["בָּרָא", "**Bará** — Verbo hebraico que significa *criou*.\n\n- Usado exclusivamente para a ação criadora de Deus, diferente de **asah** (fazer/formar).\n- Transmite a ideia de criar algo do nada (*creatio ex nihilo*)."]
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

    if (!process.env.CLI_PROXY_HOST) {
      return ResponseError.asError("CLI_PROXY_HOST is not defined", 400);
    }

    if (!process.env.CLI_PROXY_KEY) {
      return ResponseError.asError("CLI_PROXY_KEY is not defined", 400);
    }

    const integration = new CLIProxyAPIIntegration({
      apiUrl: process.env.CLI_PROXY_HOST,
      apiKey: process.env.CLI_PROXY_KEY,
      authMode: { kind: "authorization" },
    });

    const prompt = PROMPT_TEMPLATE.replace(
      "@Verse",
      originalVerseChapter.book.chapter.verses.at(0) ?? "",
    )
      .replace(
        "@DisplayVerse",
        `${chapter.book.name} ${chapter.book.chapter.number}:${verseNumber}`,
      )
      .replace("@Version", abbrVersion.toUpperCase())
      .replace("@DestinyLanguage", destinyVersion.language);

    const text = await integration.processInput(
      prompt,
      process.env.CLI_PROXY_MODEL,
    );

    let textSanitized = text.split("```json").at(-1)?.trim() ?? "[]";
    textSanitized = textSanitized.replace(/```$/, "").trim();
    textSanitized = textSanitized.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
      match
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r")
        .replaceAll("\t", "\\t"),
    );

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
          "Agent-AI": process.env.CLI_PROXY_MODEL ?? "cli-proxy",
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
