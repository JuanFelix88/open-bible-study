import { Language } from "@/entities/Language";
import { VerseAnalysis } from "@/entities/VerseAnalysis";

export interface CacheEntry {
  tokens: VerseAnalysis[];
  meta: { modelName: string; language: Language; version: string };
  timestamp: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "bible-stream-analysis-cache";

export class StreamAnalysisCache {
  private memory: Map<string, CacheEntry>;
  private ttlMs: number;
  private useLocalStorage: boolean;

  constructor(config: { ttlMs?: number; useLocalStorage?: boolean } = {}) {
    this.memory = new Map();
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
    this.useLocalStorage = config.useLocalStorage ?? false;
    this.loadFromStorage();
  }

  static generateKey(
    version: string,
    book: string,
    chapter: number,
    verse: number,
    analysisType: string = "default",
  ): string {
    return `${version}:${book}:${chapter}:${verse}:${analysisType}`;
  }

  get(key: string): CacheEntry | null {
    const entry = this.memory.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.memory.delete(key);
      return null;
    }

    return entry;
  }

  set(
    key: string,
    tokens: VerseAnalysis[],
    meta: { modelName: string; language: Language; version: string },
  ): void {
    this.memory.set(key, { tokens, meta, timestamp: Date.now() });
    this.saveToStorage();
  }

  clear(): void {
    this.memory.clear();
    if (this.useLocalStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.memory.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.memory.delete(key);
      }
    }
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    if (!this.useLocalStorage || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored) as Record<string, CacheEntry>;
      for (const [key, entry] of Object.entries(data)) {
        this.memory.set(key, entry);
      }

      this.clearExpired();
    } catch {
      // Silently fail
    }
  }

  private saveToStorage(): void {
    if (!this.useLocalStorage || typeof window === "undefined") return;

    try {
      const data: Record<string, CacheEntry> = {};
      for (const [key, entry] of this.memory.entries()) {
        data[key] = entry;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Silently fail
    }
  }
}

export const streamAnalysisCache = new StreamAnalysisCache({
  ttlMs: DEFAULT_TTL_MS,
  useLocalStorage: true,
});
