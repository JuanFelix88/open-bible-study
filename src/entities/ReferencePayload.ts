export interface ReferencePayload {
  references: Array<{
    abbr: string;
    chapterNumber: number;
    verseNumber: number;
  }>;
  note?: string;
}

export interface ReferenceIndices {
  bookIndex: number;
  chapterIndex: number;
  verseIndex: number;
}
