import { Chapter } from "@/entities/Chapter";
import { LinkToVerse } from "@/entities/LinkToVerse";

export type ReferenceVerseDetails = {
  text: string | null;
  displayVerse: string | null;
  bookName?: string;
  link: string | null;
};

export class ReferencesUtils {
  static getVerse(
    bookAbbr: string,
    chapterNumber: number,
    verseNumber: number,
    verses: LinkToVerse[],
    chapters: Chapter[],
    versionAbbr: string,
  ): ReferenceVerseDetails {
    const otherRelatedVerse = verses.find(
      (verse) =>
        `${verse.abbrev.toLowerCase()} ${verse.numChapter}:${verse.numVerse}` !==
        `${bookAbbr?.toLowerCase()} ${chapterNumber}:${verseNumber}`,
    );

    if (!otherRelatedVerse) {
      return ReferencesUtils.emptyVerseDetails();
    }

    const chapter = chapters.find(
      (c) =>
        `${c.book.abbrev.toLowerCase()} ${c.book.chapter.number}` ===
        `${otherRelatedVerse.abbrev.toLowerCase()} ${
          otherRelatedVerse.numChapter
        }`,
    );

    if (!chapter) {
      return ReferencesUtils.emptyVerseDetails();
    }

    return {
      text:
        chapter.book.chapter.verses.at(otherRelatedVerse.numVerse - 1) ?? null,
      displayVerse: `${chapter.book.name} ${otherRelatedVerse.numChapter}:${otherRelatedVerse.numVerse}`,
      bookName: chapter.book.name,
      link: `/reader?book=${otherRelatedVerse.abbrev}&version=${versionAbbr}&chapter=${otherRelatedVerse.numChapter}&verse=${otherRelatedVerse.numVerse}`,
    };
  }

  private static emptyVerseDetails(): ReferenceVerseDetails {
    return {
      text: null,
      displayVerse: null,
      link: null,
    };
  }
}
