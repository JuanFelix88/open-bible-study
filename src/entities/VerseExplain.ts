export interface VerseExplainToken {
  token: string;
  original: string;
  transliteration: string;
  meaning: string;
  context: string;
  theological: string;
  crossReferences: string[];
  curiosity?: string;
}

export interface VerseExplain {
  verse: string;
  reference: string;
  tokens: VerseExplainToken[];
}

export interface ChapterExplain {
  chapter: number;
  verses: VerseExplain[];
}

export interface BookExplain {
  abbrev: string;
  book: string;
  language: "he" | "gr";
  testament: "AT" | "NT";
  version: string;
  chapters: ChapterExplain[];
}
