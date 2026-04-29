import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { IAService } from "@/services/IAService";
import { extractVerseParams } from "@/utils/RouteHelpers";
import { createStreamingResponse } from "@/utils/StreamingResponse";
import { NextRequest, NextResponse } from "next/server";

const PROMPT_TEMPLATE = `
Você é um especialista em estudos bíblicos com foco evangélico e protestante, com profundo conhecimento em hebraico, grego e aramaico.

# Tarefa

Analise o versículo abaixo (versão traduzida) e produza uma análise profunda, mapeando cada trecho de volta ao texto original (@OriginalLanguage), explorando significados profundos, contexto teológico e relações com outros versículos bíblicos.

## Versículo traduzido

"@Verse"
@DisplayVerse (@Version)

## Versículo original

"@OriginalVerse"
(@OriginalVersion)

## Idioma original do versículo

@OriginalLanguage

## Regras

1. Divida o versículo traduzido em tokens. Cada token é uma palavra ou grupo curto de palavras que formam uma unidade de sentido.
2. Para cada token, escreva uma explicação detalhada usando Markdown completo:
   - Palavra(s) correspondente(s) no idioma original (@OriginalLanguage) com transliteração.
   - Significado raiz e nuances semânticas no idioma original.
   - Contexto histórico e cultural comprovado da época.
   - Quando o token for um nome próprio, explique quem foi a pessoa na Bíblia.
   - Aplicação teológica protestante relevante.
   - **Referências cruzadas**: liste versículos relacionados que usam a mesma palavra, conceito ou tema. Formate cada referência como: **NomeDoLivro Capítulo:Versículo** (ex: **João 3:16**, **Gênesis 1:1**, **Romanos 8:28**). Não altere este formato.
   - Curiosidades teológicas e linguísticas relevantes.
3. Use formatação Markdown rica nas explicações: **negrito**, *itálico*, listas com - ou 1., e > para citações. Não use títulos com #.
4. Cada token deve preservar o texto exatamente como aparece no versículo traduzido, incluindo pontuação adjacente.
5. Priorize profundidade teológica e conexões entre versículos acima de tudo.

## Formato de saída (OBRIGATÓRIO)

Sua resposta DEVE ser EXCLUSIVAMENTE um JSON válido. Nenhum texto, explicação, saudação ou bloco de código markdown deve aparecer antes ou depois do JSON.
- NÃO use \`\`\`json ... \`\`\` ao redor do JSON.
- NÃO inclua qualquer frase introdutória como "Aqui está..." ou "Segue a análise...".
- A resposta inteira deve começar com [ e terminar com ].

O JSON é um array de arrays, onde cada elemento interno tem exatamente 2 strings: [token, explicação_em_markdown].
Certifique-se de que todas as strings internas usam escapes corretos para JSON (ex: \\n para quebra de linha, \\" para aspas dentro de strings).

Exemplo de formato (siga EXATAMENTE esta estrutura, apenas substitua o conteúdo):

[
  ["No princípio", "**Bereshit** (בְּרֵאשִׁית) — Significa *No princípio* ou *No começo*.\\n\\n- Vem da raiz hebraica **rosh** (cabeça, início).\\n- Indica o ponto de partida absoluto da criação.\\n- **Referências cruzadas**:\\n  - **João 1:1** — O Evangelho de João ecoa este mesmo conceito.\\n  - **Colossenses 1:17** — Cristo é antes de todas as coisas.\\n\\n> Curiosidade: a palavra aparece apenas neste contexto de criação divina."],
  ["criou", "**Bará** (בָּרָא) — Verbo hebraico que significa *criou*.\\n\\n- Usado exclusivamente para a ação criadora de Deus.\\n- **Referências cruzadas**:\\n  - **Isaías 45:18** — Deus formou a terra para ser habitada.\\n  - **Apocalipse 4:11** — Todas as coisas foram criadas pela vontade de Deus."]
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

    const translatedVerse =
      chapter.book.chapter.verses.at(verseNumber - 1) ?? "";
    const originalVerse = originalVerseChapter.book.chapter.verses.at(0) ?? "";

    const prompt = PROMPT_TEMPLATE.replace("@Verse", translatedVerse)
      .replace(
        "@DisplayVerse",
        `${chapter.book.name} ${chapter.book.chapter.number}:${verseNumber}`,
      )
      .replace("@Version", abbrVersion.toUpperCase())
      .replace("@OriginalVerse", originalVerse)
      .replace(
        "@OriginalVersion",
        `${originalMeta.abbreviation} - ${originalMeta.name}`,
      )
      .replaceAll(
        "@OriginalLanguage",
        destinyVersion.language === "he" ? "Hebraico" : "Grego",
      );

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
