import { Language } from "@/entities/Language";

export interface Verse {
  version: string;
  versionName: string;
  language: Language;
  bookName: string;
  bookAbbr: string;
  chapter: number;
  verse: number;
  text: string;
  displayText: string;
  matchedWords: string[];
}
