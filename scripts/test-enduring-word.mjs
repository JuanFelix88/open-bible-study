import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { EnduringWordCommentaryService: service } = await jiti.import("../src/services/EnduringWordCommentaryService.ts");
const originalFetch = globalThis.fetch;
const originalError = console.error;
const html = `<div class="entry-content single-content"><!-- INSERT_GCP_COMMENTARY -->
<h3>Category</h3><h4 id="section-1">1. (36) Heading</h4>
<p class="ew-bible-text" data-ref="JHN-3-36">Bible text</p><p>Commentary text.</p>
</div><!-- .entry-content -->`;

async function withFetch(source, translate, run, portuguese = () => new Response("", { status: 404 })) {
  globalThis.fetch = async (url) => {
    const target = String(url);
    if (target.includes("translate.googleapis.com")) {
      assert.equal(new URL(target).searchParams.get("client"), "dict-chrome-ex");
      return translate();
    }
    if (target.includes("/bible-commentary/pt/")) return portuguese();
    return source();
  };
  console.error = () => {};
  try { await run(); } finally { globalThis.fetch = originalFetch; console.error = originalError; }
}

const source = () => new Response(html);

test("Portuguese source is preferred and accented entities are decoded", async () => {
  const pt = html.replace("Category", "Categoria").replace("Heading", "Salva&ccedil;&atilde;o de &Eacute;dipo").replace("Commentary text.", "Coment&aacute;rio em portugu&ecirc;s.");
  await withFetch(() => { throw new Error("English source should not be fetched"); }, () => { throw new Error("Translation should not be fetched"); }, async () => {
    const result = await service.getCommentary("Jo", 3, 36);
    assert.equal(result.translated, true);
    assert.match(result.markdown, /Salvação de Édipo/);
    assert.match(result.markdown, /Comentário em português/);
    assert.match(result.sourceUrl, /\/pt\/john-3\/\#section-1$/);
  }, () => new Response(pt));
});
test("John is validated independently of Job and translation succeeds", async () => {
  await withFetch(source, () => Response.json([[["Comentário traduzido", "text"]]]), async () => {
    const result = await service.getCommentary("Jo", 3, 36);
    assert.equal(result.range, "3:36");
    assert.equal(result.translated, true);
    assert.match(result.markdown, /Comentário traduzido/);
    assert.match(result.sourceUrl, /john-3\/\#section-1$/);
  });
});

test("translation failure returns original commentary with a warning", async () => {
  await withFetch(source, () => new Response("rate limited", { status: 429 }), async () => {
    const result = await service.getCommentary("Jo", 3, 36);
    assert.equal(result.translated, false);
    assert.match(result.markdown, /Tradução indisponível/);
    assert.match(result.markdown, /Commentary text/);
  });
});

test("invalid verse is not found and broken source markup is an upstream error", async () => {
  await withFetch(() => new Response("unexpected markup"), () => { throw new Error("unexpected translation"); }, async () => {
    await assert.rejects(service.getCommentary("Jo", 3, 999), (error) => service.isNotFound(error));
    await assert.rejects(service.getCommentary("Jo", 3, 36), (error) => !service.isNotFound(error) && /extract/.test(error.message));
  });
});
