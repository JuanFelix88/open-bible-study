import { Language } from "@/entities/Language";
import { VerseAnalysis } from "@/entities/VerseAnalysis";
import {
  parseStreamingTokens,
  stripCodeFences,
} from "@/utils/StreamingJsonParser";
import { useEffect, useRef, useState } from "react";

export interface StreamAnalysisMeta {
  modelName: string;
  language: Language;
  version: string;
}

export interface StreamAnalysisResult {
  tokens: VerseAnalysis[];
  meta: StreamAnalysisMeta | null;
  isLoading: boolean;
  isStreaming: boolean;
}

export function useStreamAnalysis(
  url: string | null,
  cacheKey: string,
): StreamAnalysisResult {
  const [tokens, setTokens] = useState<VerseAnalysis[]>([]);
  const [meta, setMeta] = useState<StreamAnalysisMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const cacheRef = useRef<
    Map<string, { tokens: VerseAnalysis[]; meta: StreamAnalysisMeta }>
  >(new Map());

  useEffect(() => {
    if (!url) return;

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setTokens(cached.tokens);
      setMeta(cached.meta);
      setIsLoading(false);
      setIsStreaming(false);
      return;
    }

    let cancelled = false;
    setTokens([]);
    setMeta(null);
    setIsLoading(true);
    setIsStreaming(false);

    (async () => {
      const response = await fetch(url);

      if (!response.ok || !response.body) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";
      let parsedMeta: StreamAnalysisMeta | null = null;

      if (!cancelled) setIsStreaming(true);

      while (true) {
        const { value, done } = await reader.read();
        if (done || cancelled) break;

        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const lines = block.split("\n");
          let eventType = "message";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            if (line.startsWith("data: ")) data = line.slice(6);
          }

          if (eventType === "meta") {
            try {
              const parsed = JSON.parse(data);
              parsedMeta = {
                modelName: parsed.model,
                language: parsed.language as Language,
                version: parsed.version,
              };
              if (!cancelled) setMeta(parsedMeta);
            } catch {
              // malformed meta — ignore
            }
            continue;
          }

          if (eventType === "error") continue;
          if (data === "[DONE]") break;

          try {
            accumulated += JSON.parse(data) as string;
          } catch {
            continue;
          }

          const clean = stripCodeFences(accumulated);
          const parsed = parseStreamingTokens(clean);
          if (parsed.length > 0 && !cancelled) {
            setTokens([...parsed]);
          }
        }
      }

      if (!cancelled) {
        const clean = stripCodeFences(accumulated).trim();
        const finalTokens = parseStreamingTokens(clean);
        setTokens(finalTokens);
        setIsStreaming(false);
        setIsLoading(false);

        if (parsedMeta && finalTokens.length > 0) {
          cacheRef.current.set(cacheKey, {
            tokens: finalTokens,
            meta: parsedMeta,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, cacheKey]);

  return { tokens, meta, isLoading, isStreaming };
}
