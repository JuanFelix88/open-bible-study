---
name: web-context-bridge
description: Workflow para criar pontes sólidas entre conteúdo de websites externos e a aplicação investigar padrões de URL/endpoints, capturar HTML, destilar conteúdo relevante, traduzir com Google Translate não oficial e devolver markdown limpo. Use quando implementar integrações semelhantes ao BibleRef/contexto histórico.
---

# Web Context Bridge

Use esta skill quando precisar transformar páginas de websites externos em conteúdo consumível pela aplicação, especialmente quando o fluxo envolver:

- investigar um site público e descobrir seu padrão de URL;
- mapear nomes/códigos internos da aplicação para slugs externos;
- buscar HTML remoto;
- extrair apenas o conteúdo útil;
- converter HTML em Markdown;
- traduzir via endpoint não oficial do Google Translate;
- expor resultado em endpoint ou página interna.

## Processo recomendado

### 1. Investigue o website antes de implementar

1. Abra a home e exemplos reais com `fetch` ou browser/headless.
2. Compare URLs de diferentes casos:
   - item comum;
   - item com nome composto;
   - item numerado;
   - exceções conhecidas.
3. Valide também casos inválidos para entender `404`, redirects ou páginas fallback.
4. Prefira inferir um padrão mínimo e explícito, não scraping genérico demais.

Exemplo de descoberta no BibleRef:

```txt
/John/3/John-3-16.html
/Genesis/1/Genesis-1-1.html
/1-Samuel/1/1-Samuel-1-1.html
/Song-of-Solomon/1/Song-of-Solomon-1-1.html
/Psalms/23/Psalm-23-1.html   # exceção: path Psalms, verse slug Psalm
```

### 2. Faça de/para hardcoded quando a origem externa for estável

Quando os nomes internos diferem dos nomes externos, crie um mapeamento explícito no serviço/endpoint.

Inclua no mapeamento:

- abreviação interna;
- nome interno;
- título externo;
- slug/path externo;
- slug especial por verso, se houver;
- aliases apenas quando não gerarem ambiguidade.

Nuance importante: abreviações podem colidir depois de normalizadas. Exemplo: `Jo` pode significar João, enquanto `Jó` normalizado também vira `jo`. Resolva primeiro por abreviação exata/case-insensitive antes de usar normalização sem acentos.

### 3. Valide localmente antes de chamar o site externo

Antes de fazer rede:

1. Resolva livro/slug.
2. Verifique capítulo e verso usando os dados internos da aplicação.
3. Retorne `404` cedo para referência inválida.

Isso evita requests externos inúteis e impede falso positivo em páginas fallback do site.

### 4. Capture HTML com fetch controlado

Use `fetch` server-side com headers simples:

```ts
await fetch(sourceUrl, {
  headers: { "User-Agent": "Mozilla/5.0 AppContextBridge/1.0" },
  next: { revalidate: 60 * 60 * 24 * 7 },
});
```

Cuidados:

- trate `404` como não encontrado real;
- trate outros status não-OK como erro de upstream (`502` costuma ser adequado);
- não dependa do HTML renderizado pelo browser se o conteúdo necessário já está no HTML bruto;
- se o site injeta conteúdo por `<script src=...>`, busque esses scripts separadamente e faça parse explícito.

### 5. Extraia somente o conteúdo útil

Não converta a página inteira. Primeiro delimite blocos estáveis.

Estratégias:

- procurar container com `id`/`class` estável;
- recortar entre início/fim conhecidos;
- remover SVGs, scripts, estilos, navs, botões, anúncios e links decorativos;
- preservar títulos, parágrafos, `strong`, `em`, listas e quebras.

Para páginas BibleRef, o conteúdo útil estava em:

```txt
<div class="content-commentary" id="content-commentary"> ...
```

E os summaries vinham por scripts:

```txt
summaries/John-3-16thru3-21-context.js
summaries/John-chapter-3.js
```

### 6. HTML → Markdown

Faça uma conversão simples e previsível quando o HTML é conhecido:

- `<h1>`, `<h2>`, `<h3>` → headings Markdown;
- `<br>` e `</p>` → linha em branco;
- `<strong>/<b>` → `**texto**`;
- `<em>/<i>` → `*texto*`;
- `<li>` → `- item`;
- demais tags → espaço;
- decode de entidades HTML (`&mdash;`, `&ndash;`, `&apos;`, `&#...;`).

Evite adicionar dependências se o projeto já não usa parser HTML. Para HTML estável e pequeno, parse por delimitadores + regex controlado é aceitável.

### 7. Tradução via Google Translate não oficial

Use o endpoint interno:

```txt
https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=...
```

Implementação típica:

```ts
const url = new URL("https://translate.googleapis.com/translate_a/single");
url.searchParams.set("client", "gtx");
url.searchParams.set("sl", "en");
url.searchParams.set("tl", "pt");
url.searchParams.set("dt", "t");
url.searchParams.set("q", chunk);
```

Nuances:

- dividir markdown/texto em chunks por parágrafo para reduzir risco de limite;
- preservar linhas em branco entre chunks;
- validar se a resposta tem formato esperado (`data[0][i][0]`);
- manter cache/revalidate, pois tradução remota é lenta;
- deixar claro na UI/rodapé que a fonte é externa quando necessário;
- não prometer tradução oficial.

### 8. Resposta de endpoint

Para endpoint que devolve markdown:

- `200`: `Content-Type: text/markdown; charset=utf-8`;
- `404`: referência inexistente ou conteúdo externo não encontrado;
- `502`: falha de upstream/parsing/tradução;
- inclua headers úteis como URL da fonte quando fizer sentido.

Exemplo de formato final:

```md
## Comentário do versículo

...

## Resumo do contexto

...

## Resumo do capítulo

...

---
Reference [BibleRef.com](https://www.bibleref.com/John/3/John-3-16.html).
```

### 9. UI

Ao criar página de leitura:

- siga o layout já usado por páginas irmãs (`Original`, `Deep`, `Compare`, etc.);
- preserve link de volta para `/reader` com os mesmos query params;
- use loading skeleton se tradução/captura for lenta;
- renderize Markdown com `react-markdown`;
- mantenha títulos na cor padrão de texto, salvo se o padrão do projeto indicar destaque;
- evite separador antes do primeiro bloco de conteúdo;
- deixe separadores apenas entre seções.

### 10. Testes manuais obrigatórios

Teste pelo menos:

- referência comum com retorno `200`;
- referência inválida com retorno `404`;
- livro com slug composto;
- livro numerado;
- exceção conhecida do padrão;
- possível colisão de alias/abreviação.

No caso BibleRef, bons exemplos:

```txt
/context/Jo/3/16       # João, valida colisão com Jó
/context/Gn/1/1
/context/1Sm/1/1
/context/Ct/1/1
/context/Sl/23/1       # exceção Psalm/Psalms
/context/Jo/3/999      # 404
```

## Checklist rápido

- [ ] Website investigado com exemplos múltiplos.
- [ ] Padrão de URL documentado em código ou skill.
- [ ] De/para hardcoded criado com exceções.
- [ ] Validação local antes de request externo.
- [ ] HTML bruto capturado server-side.
- [ ] Blocos úteis extraídos sem nav/anúncios.
- [ ] HTML convertido para Markdown.
- [ ] Tradução feita em chunks pelo Google Translate não oficial.
- [ ] Endpoint retorna `text/markdown`.
- [ ] `200`, `404` e falhas upstream tratados separadamente.
- [ ] UI segue padrão do projeto.
- [ ] Build/typecheck executado quando aplicável.
