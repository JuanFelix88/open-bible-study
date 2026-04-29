import { StaticClass } from "@/entities/StaticClass";

export interface IIARequestOptions {
  model?: string;
  signal?: AbortSignal;
}

export interface IIAChunk {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
}

export interface IIAResponse extends IIAChunk {
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class IAService extends StaticClass {
  private static getBaseUrl(): string {
    const url = process.env.AI_API_URL?.trim().replace(/\/+$/, "");
    if (!url) throw new Error("AI_API_URL is not defined");
    return url;
  }

  private static buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const apiKey = process.env.AI_OLLAMA_API_KEY?.trim();
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  public static async request(
    prompt: string,
    options?: IIARequestOptions,
  ): Promise<IIAResponse> {
    const res = await fetch(`${this.getBaseUrl()}/api/generate`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: options?.model ?? "llama3.1",
        prompt,
        stream: false,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await safeReadText(res);
      throw new Error(
        `Failed to fetch from AI_API_URL: ${text || res.statusText}`,
      );
    }

    return res.json();
  }

  public static async *streamGenerate(
    prompt: string,
    options?: IIARequestOptions,
  ): AsyncIterable<IIAChunk> {
    const res = await fetch(`${this.getBaseUrl()}/api/generate`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: options?.model ?? "llama3.1",
        prompt,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await safeReadText(res);
      throw new Error(
        `Failed to stream from AI_API_URL: ${text || res.statusText}`,
      );
    }

    if (!res.body) {
      throw new Error("Response has no body (streaming not available)");
    }

    for await (const line of readNDJsonLines(res.body)) {
      const chunk: IIAChunk = JSON.parse(line);
      yield chunk;
      if (chunk.done) return;
    }
  }

  public static async *streamText(
    prompt: string,
    options?: IIARequestOptions,
  ): AsyncIterable<string> {
    for await (const chunk of this.streamGenerate(prompt, options)) {
      if (chunk.response) yield chunk.response;
    }
  }
}

async function* readNDJsonLines(
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
      if (line) yield line;
    }
  }

  const tail = buffer.trim();
  if (tail) yield tail;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
