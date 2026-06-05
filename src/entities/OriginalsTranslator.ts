import { Language } from "@/entities/Language";

export type OriginalTranslationSource = "direct" | "dictionary" | "alternative";

export interface OriginalTokenTranslationOption {
  text: string;
  source: OriginalTranslationSource;
  partOfSpeech?: string;
}

export type OriginalLexicalSemanticType =
  | "word"
  | "entity"
  | "person"
  | "place"
  | "concept";

export interface OriginalLexicalMorphologyItem {
  code: string;
  label: string;
  translatedLabel?: string;
}

export interface OriginalLexicalEntrySummary {
  title: string;
  url: string;
  partOfSpeech?: string;
  translatedPartOfSpeech?: string;
  semanticType?: OriginalLexicalSemanticType;
  translatedSemanticType?: string;
  transliteration?: string;
  definitions: string[];
  translatedDefinitions?: string[];
  etymology?: string;
  translatedEtymology?: string;
}

export interface OriginalLexicalInsight extends OriginalLexicalEntrySummary {
  found: boolean;
  query: string;
  resolvedFromSearch?: boolean;
  morphology: OriginalLexicalMorphologyItem[];
  lemma?: OriginalLexicalEntrySummary;
  error?: string;
}

export interface OriginalTranslatorToken {
  token_index: number;
  token: string;
  transliteration?: string;
  translations: OriginalTokenTranslationOption[];
  lexical?: OriginalLexicalInsight;
  error?: string;
}

export interface OriginalTranslatorResponse {
  text: string;
  version: string;
  language: Language;
  targetLanguage: string;
  tokens: OriginalTranslatorToken[];
}
