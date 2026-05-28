import { StaticClass } from "@/entities/StaticClass";

export class WordNormalizer extends StaticClass {
  public static normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/\p{Mark}/gu, "")
      .toLowerCase();
  }

  public static tokenize(value: string): string[] {
    return this.normalize(value).match(/[\p{Letter}\p{Number}]+/gu) ?? [];
  }

  public static getUniqueTokens(value: string): string[] {
    return Array.from(new Set(this.tokenize(value)));
  }

  public static containsAllTokens(text: string, tokens: string[]): boolean {
    const normalizedTokens = tokens.flatMap((token) => this.tokenize(token));
    if (normalizedTokens.length === 0) return false;

    const textTokens = new Set(this.tokenize(text));
    return normalizedTokens.every((token) => textTokens.has(token));
  }
}
