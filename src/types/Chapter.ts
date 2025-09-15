import { LinkToChapter } from "@/types/LinkToChapter";
import { Nullable } from './Nullable';

export interface Chapter {
  version: string;
  book: {
    name: string;
    abbrev: string;
    chapter: {
      number: number;
      verses: string[];
    };
  };
  previous: Nullable<LinkToChapter>;
  next: Nullable<LinkToChapter>;
}
