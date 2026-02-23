import { AIIntegration } from "@/entities/AIIntegration";

export type CLIProxyAPIAuthMode =
  | { kind: "authorization" } // Authorization: Bearer
  | { kind: "x-goog-api-key" } // X-Goog-Api-Key
  | { kind: "x-api-key" } // X-Api-Key
  | { kind: "query-key" } // ?key=
  | { kind: "query-auth-token" }; // ?auth_token=

export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type OpenAIChatCompletionsRequest = {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  [key: string]: unknown;
};

export class CLIProxyAPIIntegration extends AIIntegration {
  apiUrl: string;
  apiKey: string;
  model?: string;
  userAgent?: string;
  extraHeaders?: Record<string, string>;
  authMode: CLIProxyAPIAuthMode;

  constructor(opts: {
    apiUrl: string;
    apiKey: string;
    model?: string;
    userAgent?: string;
    extraHeaders?: Record<string, string>;
    authMode?: CLIProxyAPIAuthMode;
  }) {
    super();

    this.apiUrl = (opts.apiUrl ?? "").trim().replace(/\/+$/, "");
    this.apiKey = (opts.apiKey ?? "").trim();
    this.model = opts.model?.trim() || undefined;
    this.userAgent = opts.userAgent?.trim() || undefined;
    this.extraHeaders = opts.extraHeaders;
    this.authMode = opts.authMode ?? { kind: "authorization" };

    if (!this.apiUrl) throw new Error("apiUrl é obrigatório");
    if (!this.apiKey) throw new Error("apiKey é obrigatório");
  }

  async processInput(
    input: string,
    requestModel: string | undefined = undefined,
  ): Promise<string> {
    const model = requestModel ?? (await this.resolveModel());

    const req: OpenAIChatCompletionsRequest = {
      model,
      stream: false,
      messages: [{ role: "user", content: input }],
    };

    const res = await this.fetchJson(this.buildUrl("/v1/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.buildAuthHeaders(),
      },
      body: JSON.stringify(req),
    });

    const content =
      res?.choices?.[0]?.message?.content ??
      res?.choices?.[0]?.text ??
      res?.output_text ??
      "";

    if (typeof content !== "string") {
      throw new Error(
        "Resposta inesperada de /v1/chat/completions (não-stream)",
      );
    }

    return content;
  }

  async *streamFrom(
    input: string,
    requestModel: string | undefined = undefined,
  ): AsyncIterable<string> {
    const model = requestModel ?? (await this.resolveModel());

    const req: OpenAIChatCompletionsRequest = {
      model,
      stream: true,
      messages: [{ role: "user", content: input }],
    };

    const url = this.buildUrl("/v1/chat/completions");
    const init: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...this.buildAuthHeaders(),
      },
      body: JSON.stringify(req),
    };

    const res = await fetch(url, this.withDefaultHeaders(init));
    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new Error(
        `HTTP ${res.status} em ${url}: ${bodyText || res.statusText}`,
      );
    }
    if (!res.body) {
      throw new Error(
        "Resposta sem body (streaming não disponível neste ambiente)",
      );
    }

    for await (const data of this.iterSSEDataLines(res.body)) {
      if (data === "[DONE]") {
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      const delta = extractDeltaText(parsed);
      if (delta) {
        yield delta;
      }

      if (parsed?.error?.message) {
        const msg = String(parsed.error.message);
        throw new Error(msg);
      }
    }
  }

  async listModels(): Promise<string[]> {
    const url = this.buildUrl("/v1/models");

    const res = await this.fetchJson(url, {
      method: "GET",
      headers: {
        ...this.buildAuthHeaders(),
      },
    });

    const data = res?.data;
    if (!Array.isArray(data)) return [];

    return data
      .map((m: any) => (typeof m?.id === "string" ? m.id : ""))
      .filter((id: string) => id.trim().length > 0);
  }

  async getStaticModelDefinitions(
    channel: string,
  ): Promise<{ channel: string; models: any[] }> {
    const ch = (channel ?? "").trim();
    if (!ch) throw new Error("channel é obrigatório");

    const url = this.buildUrl(
      `/v0/management/model-definitions/${encodeURIComponent(ch)}`,
    );
    const res = await this.fetchJson(url, {
      method: "GET",
      headers: {
        ...this.buildAuthHeaders(),
      },
    });

    return {
      channel: String(res?.channel ?? ch).toLowerCase(),
      models: Array.isArray(res?.models) ? res.models : [],
    };
  }

  // -------------------------
  // Internals
  // -------------------------

  private async resolveModel(): Promise<string> {
    if (this.model) return this.model;

    const models = await this.listModels();
    if (models.length === 0) {
      throw new Error(
        "Nenhum modelo disponível em /v1/models. Defina `model` no construtor ou configure o servidor.",
      );
    }

    this.model = models[0];
    return this.model;
  }

  private buildUrl(path: string): string {
    const p = (path ?? "").trim();

    const apiUrl = this.apiUrl.replace(/\/+$/, "");

    const isApiUrlV1 = /\/v1$/i.test(apiUrl);

    const normalizedPath = (() => {
      if (!p) return "";
      if (!p.startsWith("/")) return `/${p}`;
      return p;
    })();

    if (isApiUrlV1 && normalizedPath.startsWith("/v1/")) {
      return `${apiUrl}${normalizedPath.slice("/v1".length)}`;
    }

    if (!normalizedPath) return apiUrl;

    return `${apiUrl}${normalizedPath}`;
  }

  private buildAuthHeaders(): Record<string, string> {
    switch (this.authMode.kind) {
      case "authorization":
        return { Authorization: `Bearer ${this.apiKey}` };
      case "x-goog-api-key":
        return { "X-Goog-Api-Key": this.apiKey };
      case "x-api-key":
        return { "X-Api-Key": this.apiKey };
      case "query-key":
      case "query-auth-token":
        return {};
      default: {
        const _exhaustive: never = this.authMode;
        return _exhaustive;
      }
    }
  }

  private withDefaultHeaders(init: RequestInit): RequestInit {
    const headers = new Headers(init.headers ?? {});

    if (this.userAgent) {
      try {
        headers.set("User-Agent", this.userAgent);
      } catch {
        headers.set("X-User-Agent", this.userAgent);
      }
    }

    if (this.extraHeaders) {
      for (const [k, v] of Object.entries(this.extraHeaders)) {
        headers.set(k, v);
      }
    }

    if (
      this.authMode.kind === "query-key" ||
      this.authMode.kind === "query-auth-token"
    ) {
    }

    return { ...init, headers };
  }

  private async fetchJson(url: string, init: RequestInit): Promise<any> {
    const finalUrl = this.withAuthQuery(url);
    const res = await fetch(finalUrl, this.withDefaultHeaders(init));
    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new Error(
        `HTTP ${res.status} em ${finalUrl}: ${bodyText || res.statusText}`,
      );
    }

    const text = await res.text();
    if (!text.trim()) return null;

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Resposta não-JSON de ${finalUrl}: ${text.slice(0, 2000)}`,
      );
    }
  }

  private withAuthQuery(url: string): string {
    if (
      this.authMode.kind !== "query-key" &&
      this.authMode.kind !== "query-auth-token"
    ) {
      return url;
    }

    const u = new URL(url);
    if (this.authMode.kind === "query-key")
      u.searchParams.set("key", this.apiKey);
    if (this.authMode.kind === "query-auth-token")
      u.searchParams.set("auth_token", this.apiKey);
    return u.toString();
  }

  private async *iterSSEDataLines(
    body: ReadableStream<Uint8Array>,
  ): AsyncIterable<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const rawLine = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);

        const line = rawLine.replace(/\r$/, "");
        if (!line) continue;

        if (line.startsWith("data:")) {
          yield line.slice("data:".length).trim();
        }
      }
    }

    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      yield tail.slice("data:".length).trim();
    }
  }
}

function extractDeltaText(payload: any): string | null {
  const delta = payload?.choices?.[0]?.delta;
  const content = delta?.content;
  if (typeof content === "string" && content.length > 0) return content;

  const text = payload?.choices?.[0]?.text;
  if (typeof text === "string" && text.length > 0) return text;

  return null;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
