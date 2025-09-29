import { Chapter } from "./Chapter";

export interface ChapterWithDiffs extends Chapter {
  diffs: { token: string; level: number }[];
  diffenceScore: number;
}
