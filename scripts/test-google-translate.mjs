import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { fetchGoogleTranslation } = await jiti.import("../src/services/GoogleTranslateClient.ts");
const { translatePlainText, translateOriginalTokens } = await jiti.import("../src/services/GoogleTranslateOriginalsService.ts");
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let clock = Date.now();
const url = () => new URL("https://translate.googleapis.com/translate_a/single?sl=en&tl=pt&dt=t&q=Hello");
const translated = () => Response.json([[["Olá", "Hello"]]]);

beforeEach(() => {
  clock += 86_400_000;
  Date.now = () => clock;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
});

test("uses the new client, preserves parameters and caching, and sets a timeout", async () => {
  globalThis.fetch = async (target, init) => {
    assert.equal(target.searchParams.get("client"), "dict-chrome-ex");
    assert.equal(target.searchParams.get("q"), "Hello");
    assert.deepEqual(target.searchParams.getAll("dt"), ["t", "bd"]);
    assert.equal(init.next.revalidate, 3600);
    assert.equal(init.headers["User-Agent"], "test");
    assert.ok(init.signal instanceof AbortSignal);
    return translated();
  };
  const target = url();
  target.searchParams.append("dt", "bd");
  const data = await fetchGoogleTranslation(target, { next: { revalidate: 3600 }, headers: { "User-Agent": "test" } });
  assert.equal(data[0][0][0], "Olá");
  assert.equal(target.searchParams.has("client"), false);
});

test("serializes requests including body consumption and spaces request starts", async () => {
  let active = 0;
  let maxActive = 0;
  const starts = [];
  Date.now = originalNow;
  // Move past the previous test's synthetic time for this real-time spacing check.
  const offset = clock - originalNow();
  Date.now = () => originalNow() + offset;
  globalThis.fetch = async () => {
    starts.push(originalNow());
    maxActive = Math.max(maxActive, ++active);
    return {
      ok: true, status: 200,
      json: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        active--;
        return [];
      },
    };
  };
  await Promise.all([fetchGoogleTranslation(url()), fetchGoogleTranslation(url()), fetchGoogleTranslation(url())]);
  assert.equal(maxActive, 1);
  assert.ok(starts[1] - starts[0] >= 280);
  assert.ok(starts[2] - starts[1] >= 280);
});

for (const retryAfter of [null, "invalid", "120", "date"]) {
  test(`429 stops queued/new requests and recovers after cooldown (Retry-After: ${retryAfter})`, async () => {
    let calls = 0;
    const duration = retryAfter === "120" ? 120_000 : retryAfter === "date" ? 180_000 : 60_000;
    globalThis.fetch = async () => {
      calls++;
      const headers = retryAfter === null ? {} : { "retry-after": retryAfter === "date" ? new Date(clock + duration).toUTCString() : retryAfter };
      return new Response("blocked", { status: 429, headers });
    };
    const results = await Promise.allSettled([fetchGoogleTranslation(url()), fetchGoogleTranslation(url()), fetchGoogleTranslation(url())]);
    assert.ok(results.every((result) => result.status === "rejected" && /429/.test(result.reason.message)));
    assert.equal(calls, 1);
    clock += duration - 2000;
    await assert.rejects(fetchGoogleTranslation(url()), /429/);
    assert.equal(calls, 1);
    clock += 3000;
    globalThis.fetch = async () => { calls++; return translated(); };
    assert.equal((await fetchGoogleTranslation(url()))[0][0][0], "Olá");
    assert.equal(calls, 2);
  });
}

test("HTTP, JSON and network failures do not poison the queue", async () => {
  for (const failure of [() => new Response("unavailable", { status: 503 }), () => new Response("not json"), () => { throw new Error("network failure"); }]) {
    globalThis.fetch = async () => failure();
    await assert.rejects(fetchGoogleTranslation(url()));
    clock += 1000;
    globalThis.fetch = async () => translated();
    assert.equal((await fetchGoogleTranslation(url()))[0][0][0], "Olá");
    clock += 1000;
  }
});

test("originals retain transliteration/alternatives and plain text deduplicates requests", async () => {
  let calls = 0;
  globalThis.fetch = async (target) => {
    calls++;
    clock += 1000;
    assert.equal(target.searchParams.get("client"), "dict-chrome-ex");
    if (target.searchParams.get("sl") === "he") {
      assert.deepEqual(target.searchParams.getAll("dt"), ["t", "bd", "at", "rm"]);
      return Response.json([[["paz", "שלום"], [null, null, null, "shalom"]], null, "iw", null, null, [["שלום", null, [["tranquilidade"]]]]]);
    }
    return translated();
  };
  const tokens = await translateOriginalTokens({ tokens: ["שלום"], sourceLanguage: "he" });
  assert.equal(tokens[0].transliteration, "shalom");
  assert.deepEqual(tokens[0].translations.map((item) => item.text), ["paz", "tranquilidade"]);
  const values = await Promise.all([translatePlainText({ text: "Hello" }), translatePlainText({ text: "Hello" })]);
  assert.deepEqual(values, ["Olá", "Olá"]);
  assert.equal(calls, 2);
});
