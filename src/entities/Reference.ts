import { LinkToVerse } from "./LinkToVerse";

export interface Reference {
  id: number;
  createdAt: Date;
  createdByUserName: string;
  note?: string;
  verses: LinkToVerse[];
}
