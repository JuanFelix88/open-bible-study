import { LinkToChapter } from "@/entities/LinkToChapter";
import { Nullable } from './Nullable';

export interface Chapter {
  version: string;
  book: {
    name: string;
    abbrev: string;
    chapter: {
      number: number;
      verses: string[];
      paragraphStarts?: number[];
    };
  };
  previous: Nullable<LinkToChapter>;
  next: Nullable<LinkToChapter>;
}
