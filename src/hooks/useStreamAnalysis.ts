import { Language } from "@/entities/Language";
import { VerseAnalysis } from "@/entities/VerseAnalysis";
import {
  parseStreamingTokensAsync,
  stripCodeFences,
} from "@/utils/StreamingJsonParser";
import { streamAnalysisCache } from "@/utils/StreamAnalysisCache";
import { useCallback, useEffect, useRef, useState } from "react";

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
  lastTokenIndex: number;
}

const BATCH_SIZE = 5;
const UPDATE_INTERVAL_MS = 100;

const yieldToMain: () => Promise<void> =
  "scheduler" in globalThis && "yield" in (globalThis as unknown as { scheduler: { yield: () => Promise<void> } }).scheduler
    ? () => (globalThis as unknown as { scheduler: { yield: () => Promise<void> } }).scheduler.yield()
    : () => new Promise((resolve) => setTimeout(resolve, 0));

export function useStreamAnalysis(
  url: string | null,
  cacheKey: string,
): StreamAnalysisResult {
  const [tokens, setTokens] = useState<VerseAnalysis[]>([]);
  const [meta, setMeta] = useState<StreamAnalysisMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastTokenIndex, setLastTokenIndex] = useState(-1);

  const pendingTokensRef = useRef<VerseAnalysis[]>([]);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const flushPendingTokens = useCallback(() => {
    const pending = pendingTokensRef.current;
    if (pending.length === 0) return;

    setTokens((prev) => {
      const combined = [...prev, ...pending];
      return combined;
    });
    setLastTokenIndex((prev) => prev + pending.length);
    pendingTokensRef.current = [];
    lastUpdateRef.current = performance.now();
  }, []);

  const scheduleUpdate = useCallback(() => {
    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    if (timeSinceLastUpdate >= UPDATE_INTERVAL_MS) {
      flushPendingTokens();
    } else {
      updateTimeoutRef.current = setTimeout(
        flushPendingTokens,
        UPDATE_INTERVAL_MS - timeSinceLastUpdate,
      );
    }
  }, [flushPendingTokens]);

  const addTokens = useCallback(
    (newTokens: VerseAnalysis[]) => {
      if (newTokens.length === 0) return;

      pendingTokensRef.current.push(...newTokens);

      if (pendingTokensRef.current.length >= BATCH_SIZE) {
        flushPendingTokens();
      } else {
        scheduleUpdate();
      }
    },
    [flushPendingTokens, scheduleUpdate],
  );

  useEffect(() => {
    if (!url) return;

    const cached = streamAnalysisCache.get(cacheKey);
    if (cached) {
      setTokens(cached.tokens);
      setMeta(cached.meta);
      setLastTokenIndex(cached.tokens.length - 1);
      setIsLoading(false);
      setIsStreaming(false);
      return;
    }

    let cancelled = false;
    setTokens([]);
    setMeta(null);
    setIsLoading(true);
    setIsStreaming(false);
    pendingTokensRef.current = [];
    lastUpdateRef.current = 0;

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
      let lastParsedLength = 0;

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
          
          await yieldToMain();
          
          if (cancelled) break;

          const result = await parseStreamingTokensAsync(clean, {
            yieldEvery: 30,
          });
          const newTokens = result.tokens.slice(lastParsedLength);
          lastParsedLength = result.tokens.length;

          if (newTokens.length > 0 && !cancelled) {
            addTokens(newTokens);
          }
        }

        await yieldToMain();
      }

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      if (!cancelled) {
        flushPendingTokens();

        const clean = stripCodeFences(accumulated).trim();
        const finalResult = await parseStreamingTokensAsync(clean);
        const finalTokens = finalResult.tokens;
        setTokens(finalTokens);
        setLastTokenIndex(finalTokens.length - 1);
        setIsStreaming(false);
        setIsLoading(false);

        if (parsedMeta && finalTokens.length > 0) {
          streamAnalysisCache.set(cacheKey, finalTokens, parsedMeta);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [url, cacheKey, addTokens, flushPendingTokens]);

  return { tokens, meta, isLoading, isStreaming, lastTokenIndex };
}
