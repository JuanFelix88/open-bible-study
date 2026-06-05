import { Language } from "@/entities/Language";

export type OriginalTranslationSource = "direct" | "dictionary" | "alternative";

export interface OriginalTokenTranslationOption {
  text: string;
  source: OriginalTranslationSource;
  partOfSpeech?: string;
}

export interface OriginalTranslatorToken {
  token_index: number;
  token: string;
  transliteration?: string;
  translations: OriginalTokenTranslationOption[];
  error?: string;
}

export interface OriginalTranslatorResponse {
  text: string;
  version: string;
  language: Language;
  targetLanguage: string;
  tokens: OriginalTranslatorToken[];
}
