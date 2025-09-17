export interface RawChapterVersion {
  name: string;
  abbrev: string;
  chapters: string[][];
}

export type RawBibleVersionData = RawChapterVersion[];