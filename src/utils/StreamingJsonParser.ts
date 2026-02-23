import { VerseAnalysis } from "@/entities/VerseAnalysis";

export function parseStreamingTokens(text: string): VerseAnalysis[] {
  const tokens: VerseAnalysis[] = [];
  let i = 0;

  while (i < text.length && /\s/.test(text[i])) i++;
  if (i >= text.length || text[i] !== "[") return tokens;
  i++;

  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (i >= text.length || text[i] === "]") break;

    if (text[i] === "[") {
      const start = i;
      let depth = 0;
      let inString = false;
      let escaped = false;

      while (i < text.length) {
        const ch = text[i];
        if (escaped) {
          escaped = false;
          i++;
          continue;
        }
        if (ch === "\\" && inString) {
          escaped = true;
          i++;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          i++;
          continue;
        }
        if (!inString) {
          if (ch === "[") depth++;
          if (ch === "]") {
            depth--;
            if (depth === 0) {
              i++;
              const raw = text.slice(start, i);
              const sanitized = sanitizeJsonFragment(raw);
              try {
                const [token, explanation] = JSON.parse(sanitized);
                tokens.push({ token, explanation, token_index: tokens.length });
              } catch {
                // incomplete or malformed — skip
              }
              break;
            }
          }
        }
        i++;
      }

      if (depth > 0) break;
    } else {
      i++;
    }
  }

  return tokens;
}

function sanitizeJsonFragment(text: string): string {
  return text.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
    match
      .replaceAll("\n", "\\n")
      .replaceAll("\r", "\\r")
      .replaceAll("\t", "\\t"),
  );
}

export function stripCodeFences(text: string): string {
  let clean = text;
  if (clean.includes("```json")) {
    clean = clean.split("```json").at(-1) ?? "";
  }
  clean = clean.replace(/```$/, "");
  return clean;
}
