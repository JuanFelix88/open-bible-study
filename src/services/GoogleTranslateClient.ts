// Unofficial Google Translate endpoint: availability and limits are not guaranteed.
const REQUEST_INTERVAL_MS = 300;
const COOLDOWN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

// Shared within this server instance, not across workers or deployments.
let queue: Promise<void> = Promise.resolve();
let nextRequestAt = 0;
let blockedUntil = 0;

function checkCooldown() {
  if (Date.now() < blockedUntil) {
    throw new Error("Google Translate returned 429; translation temporarily paused.");
  }
}

export async function fetchGoogleTranslation(url: URL, init: RequestInit = {}): Promise<unknown> {
  checkCooldown();
  const target = new URL(url);
  target.searchParams.set("client", "dict-chrome-ex");

  const request = queue.then(async () => {
    checkCooldown();
    const delay = nextRequestAt - Date.now();
    if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    checkCooldown();
    nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;

    const response = await fetch(target, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const retryAt = Number.isFinite(seconds)
        ? Date.now() + Math.max(0, seconds) * 1000
        : Date.parse(retryAfter ?? "");
      blockedUntil = Math.max(Date.now() + COOLDOWN_MS, Number.isFinite(retryAt) ? retryAt : 0);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Google Translate returned ${response.status}`);
    }
    return await response.json() as unknown;
  });

  // A rejected request must not poison the queue. Queued calls check the cooldown
  // before reaching the network; there are no automatic retries on a 429.
  queue = request.then(() => {}, () => {});
  return request;
}
