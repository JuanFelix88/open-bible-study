## Open Bible Study — Regras para Agentes de Código

Resumo rápido para ser produtivo neste repo (Next.js 15, React 19, TS, Tailwind 4).

**Visão Geral**
- App Router em [src/app](src/app) com rotas server (`route.ts`) e páginas client (`page.tsx`).
- Dados bíblicos locais em JSON: [src/assets/versions](src/assets/versions) + partições geradas em [src/assets/versions/partitions](src/assets/versions/partitions).
- Domínios organizados por pastas: `entities/`, `definitions/`, `repositories/`, `services/`, `utils/`.

**Fluxos de Dev/Build**
- Use PNPM (recomendado). Scripts essenciais em [package.json](package.json):
  - `dev`: roda `parts` e `next dev --turbopack`.
  - `build`: roda `parts` e `next build`.
  - `parts`: gera partições via [scripts/versions-partition.mjs](scripts/versions-partition.mjs).
- Sempre garanta que `parts` rodou antes de usar endpoints que importam partições.

**Dados e Partições**
- Adição de versão bíblica: coloque `XYZ.json` em [src/assets/versions](src/assets/versions) e registre em [src/definitions/BibleVersions.ts](src/definitions/BibleVersions.ts) via `BibleVersion.from(...)`.
- `parts` cria: `partitions/<versao>/<livro>.json` + [meta.json](src/assets/versions/partitions/meta.json) com `{ name, abbr, numChapters }` para navegação.
- Repositório carrega dados com import dinâmico das partições (ver [BibleVersionsRepository.ts](src/repositories/BibleVersionsRepository.ts)).

**Padrão de Rotas API (Next.js)**
- Sempre validar params com [Params](src/utils/Params.ts) e responder erros com [ResponseError](src/utils/ResponseError.ts).
- Padronize promessas com [FnNormalizer](src/utils/FnNormalizer.ts) para obter `{ data, error }`.
- Exemplos:
  - Livros: [api/books/route.ts](src/app/api/books/route.ts) usa [BooksAndChapters](src/definitions/BooksAndChapters.ts) que lê [meta.json](src/assets/versions/partitions/meta.json).
  - Versões: [api/versions/route.ts](src/app/api/versions/route.ts) retorna [BibleVersions.versions](src/definitions/BibleVersions.ts).
  - Capítulo: [api/versions/[version_abbr]/[book_abbr]/[chapter_number]/route.ts](src/app/api/versions/%5Bversion_abbr%5D/%5Bbook_abbr%5D/%5Bchapter_number%5D/route.ts) usa `BibleVersionsRepository.getChapterWithVersion(...)`.
  - Comparar versos (todas versões): [api/versions/compare/[book_abbr]/[chapter_number]/[verse_number]/route.ts](src/app/api/versions/compare/%5Bbook_abbr%5D/%5Bchapter_number%5D/%5Bverse_number%5D/route.ts) e diffs com [StringCompare](src/utils/StringCompare.ts).

**Serviços Externos**
- IA: [IAService](src/services/IAService.ts) chama `POST ${AI_API_URL}/prompt` e retorna `{ response, agentName, ... }`. Necessário `AI_API_URL` no ambiente para rotas como [explain](src/app/api/versions/%5Bversion_abbr%5D/%5Bbook_abbr%5D/%5Bchapter_number%5D/%5Bverse_number%5D/explain/route.ts).
- Postgres: [PostgresService](src/services/PostgresService.ts) usa `pg`. Requer `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`. Atenção: o módulo lança erro ao importar se variáveis faltarem; evite acessar rotas de referências sem esses envs.

**Referências (DB)**
- Criar/listar/editar/excluir referências entre dois versículos em [src/app/api/references](src/app/api/references). Exemplos: criação em [references/route.ts](src/app/api/references/route.ts), detalhes em [references/details/[reference_id]/route.ts](src/app/api/references/details/%5Breference_id%5D/route.ts).
- Mapas de livros/capitulos via [BooksAndChapters](src/definitions/BooksAndChapters.ts) garantem índices consistentes ao gravar no DB.

**UI e Convenções**
- Páginas principais: Home [app/page.tsx](src/app/page.tsx), Leitor [reader/page.tsx](src/app/reader/page.tsx), Compare [reader/compare/page.tsx](src/app/reader/compare/page.tsx), Explain [reader/explain/page.tsx](src/app/reader/explain/page.tsx).
- Padrões de navegação: query params `version`, `book`, `chapter`, `verse`. O leitor pré-carrega capítulos anterior/próximo.
- Fetch no client via `@tanstack/react-query`; erros HTTP tratados com [ThrowByResponse](src/utils/ThrowByResponse.ts).
- Estilos: Tailwind 4 (classes utilitárias), temas em [src/app/mode/set-theme/page.tsx](src/app/mode/set-theme/page.tsx).

**Ao implementar novas rotas**
- Siga este esqueleto:
  1) extraia params com `Params.getRequiredParam(...)`;
  2) chame repositórios/serviços envoltos por `FnNormalizer.getFromPromise(...)`;
  3) retorne `NextResponse.json(data)`; em erro, use `ResponseError.asError(msg, status)`.

**Armadilhas comuns**
- Esquecer de rodar `parts`: causa import dinâmico falhar nas rotas que leem `partitions/`.
- Variáveis de ambiente ausentes: `IAService`/`PostgresService` falham; isole chamadas ao desenvolver sem esses serviços.
- Paths dinâmicos: sempre use minúsculas para `versionAbbr`/`bookAbbr` ao importar partições (ver repositório).

Se algo acima estiver ambíguo (ex.: formato exato de JSON de versões, contrato do endpoint de IA, ou setup do Postgres), diga o ponto específico e posso detalhar/ajustar as regras.

**Implementar componentes e páginas**
- Quebrar em componentes menores em src/app/components/.
- Usar hooks para lógica de estado e efeitos colaterais.
- Está em uso o TailwindCSS 4 com cores tematizadas no src/app/globals.css.
- Preferir utilizar as cores dentro do tema, não utilizar outras cores.
- Não esquecer de optar por uso de layout.tsx para layouts compartilhados entre páginas.
- Coesão nas rotas do Next.js.
