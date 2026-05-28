# Formato de Explains — Contrato de Serialização

## Visão Geral

Cada livro bíblico gera um arquivo `.md` em `src/assets/versions/explains/acf/<abbrev>.md`.

O formato usa comentários HTML delimitadores para permitir extração programática para JSON,
seguindo a interface `BookExplain` em `src/entities/VerseExplain.ts`.

---

## Estrutura do Documento

```
<!-- META: {"abbrev":"Gn","book":"Gênesis","language":"he","testament":"AT","version":"ACF"} -->

# Gênesis — Análise Verso a Verso (ACF)

## Capítulo 1

### Gênesis 1:1

> "NO princípio criou Deus os céus e a terra."

<!-- TOKEN: {"token":"NO princípio","ref":"Gn 1:1"} -->
**בְּרֵאשִׁית (Bereshit)** — *"No princípio"*

- **Original**: בְּרֵאשִׁית (hebraico) — transliterado *Bereshit*
- **Significado**: Vem da raiz **rosh** (רֹאשׁ), "cabeça, início, começo"...
- **Contexto histórico**: ...
- **Aplicação teológica**: ...
- **Referências cruzadas**: **João 1:1**, **Colossenses 1:17**, **Hebreus 1:10**
- **Curiosidade**: ...
<!-- /TOKEN -->

<!-- TOKEN: {"token":"criou","ref":"Gn 1:1"} -->
**בָּרָא (Bará)** — *"criou"*

- **Original**: בָּרָא (hebraico) — transliterado *Bará*
- **Significado**: Verbo exclusivo para criação divina; implica criação *ex nihilo*...
...
<!-- /TOKEN -->

---
```

---

## Regras de Formatação

1. `<!-- META: {...} -->` — objeto JSON na linha 1 com metadados do livro.
2. `## Capítulo N` — cabeçalho H2 para cada capítulo.
3. `### Livro C:V` — cabeçalho H3 para cada versículo.
4. `> "texto do versículo"` — blockquote com o texto exact do versículo (ACF).
5. `<!-- TOKEN: {"token":"...","ref":"..."} --> ... <!-- /TOKEN -->` — envolvendo cada token.
6. Dentro do token, usar listas Markdown com os campos:
   - **Original**, **Significado**, **Contexto histórico**, **Aplicação teológica**,
     **Referências cruzadas**, **Curiosidade** (opcional).
7. Referências cruzadas sempre no formato `**Livro C:V**` separadas por vírgula.
8. Separador `---` entre versículos.

---

## Extração para JSON

O parser lê:
1. `META` → `BookExplain` raiz
2. `## Capítulo N` → `ChapterExplain.chapter`
3. `### Ref` + blockquote → `VerseExplain.reference` + `VerseExplain.verse`
4. Pares `<!-- TOKEN -->...<!-- /TOKEN -->` → `VerseExplainToken[]`
