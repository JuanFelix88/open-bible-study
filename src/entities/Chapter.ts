import type { HeadingMetadataItem } from "@/entities/HeadingMetadata";
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
      headings?: HeadingMetadataItem[];
    };
  };
  previous: Nullable<LinkToChapter>;
  next: Nullable<LinkToChapter>;
}
