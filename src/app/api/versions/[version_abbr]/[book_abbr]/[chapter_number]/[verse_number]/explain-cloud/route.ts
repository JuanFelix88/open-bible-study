import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { IAService } from "@/services/IAService";
import { extractVerseParams } from "@/utils/RouteHelpers";
import { createStreamingResponse } from "@/utils/StreamingResponse";
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

## Formato de saída (OBRIGATÓRIO)

Sua resposta DEVE ser EXCLUSIVAMENTE um JSON válido. Nenhum texto, explicação, saudação ou bloco de código markdown deve aparecer antes ou depois do JSON.
- NÃO use \`\`\`json ... \`\`\` ao redor do JSON.
- NÃO inclua qualquer frase introdutória como "Aqui está..." ou "Segue a análise...".
- A resposta inteira deve começar com [ e terminar com ].

O JSON deve ser um array de arrays, onde cada elemento interno tem exatamente 2 strings: [token, explicação_em_markdown].
Certifique-se de que todas as strings internas usam escapes corretos para JSON (ex: \\n para quebra de linha, \\" para aspas dentro de strings).

Exemplo de formato (siga EXATAMENTE esta estrutura, apenas substitua o conteúdo):

[
  ["בְּרֵאשִׁית", "**Bereshit** — Significa *No princípio* ou *No começo*.\\n\\n- Vem da raiz hebraica **rosh** (cabeça, início).\\n- Indica o ponto de partida absoluto da criação.\\n\\n> Curiosidade: a palavra aparece apenas neste contexto de criação divina."],
  ["בָּרָא", "**Bará** — Verbo hebraico que significa *criou*.\\n\\n- Usado exclusivamente para a ação criadora de Deus, diferente de **asah** (fazer/formar).\\n- Transmite a ideia de criar algo do nada (*creatio ex nihilo*)."]
]
`.trim();

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

    const { chapter: originalVerseChapter, versionMeta: originalMeta } =
      await BibleVersionsRepository.getOriginalText(
        abbrVersion,
        bookAbbr,
        chapterNumber,
        verseNumber,
      );

    const destinyVersion =
      await BibleVersionsRepository.getVersionFromName(abbrVersion);

    const chapterOrError = await BibleVersionsRepository.getChapterOrError(
      abbrVersion,
      bookAbbr,
      chapterNumber,
    );

    if (chapterOrError instanceof Response) {
      return chapterOrError;
    }

    const chapter = chapterOrError;

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

    const model = process.env.AI_API_MODEL ?? "llama3.1";

    const meta = {
      model,
      language: originalMeta.language,
      version: `${originalMeta.abbreviation} - ${originalMeta.name}`,
    };

    return createStreamingResponse(
      meta,
      IAService.streamText(prompt, { model }),
    );
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
