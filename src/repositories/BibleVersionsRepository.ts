import { BibleVersions } from "@/definitions/BibleVersions";
import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { Chapter } from "@/entities/Chapter";
import { LinkToChapter } from "@/entities/LinkToChapter";
import { Nullable } from "@/entities/Nullable";
import { RawChapterVersion } from "@/entities/RawBibleVersion";
import { StaticClass } from "@/entities/StaticClass";

export class BibleVersionsRepository extends StaticClass {
  public static async getAllVersionsWithVerse(
    bookAbbr: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<Chapter[]> {
    bookAbbr = bookAbbr.trim().toLowerCase();

    if (!bookAbbr) throw new Error("Book abbreviation is required.");
    if (chapterNumber < 1 || verseNumber < 1) {
      throw new Error("Chapter and verse numbers must be greater than 0.");
    }

    const versions = await Promise.all(
      BibleVersions.versions.map(async (version) => {
        return {
          raw: (await import(
            `@/assets/versions/partitions/${version.abbreviation.toLowerCase()}/${bookAbbr.toLowerCase()}.json`
          )) as RawChapterVersion,
          version,
        };
      })
    );

    const hasVerseInBibleVersions = versions.some(
      (v) => !!v.raw.chapters.at(chapterNumber - 1)?.at(verseNumber - 1)
    );

    if (!hasVerseInBibleVersions) {
      throw new Error(
        `Verse [${bookAbbr.toUpperCase()} ${chapterNumber}:${verseNumber}] not found in one or more versions.`
      );
    }

    const verseVersions = versions.map(
      ({ raw, version }) =>
        ({
          version: version.abbreviation,
          book: {
            abbrev: raw.abbrev,
            name: raw.name,
            chapter: {
              number: chapterNumber,
              verses: [raw.chapters[chapterNumber - 1]!.at(verseNumber - 1)!],
            },
          },
          previous: null,
          next: null,
        } satisfies Chapter)
    );

    return verseVersions;
  }

  public static async getBookWithVersion(
    versionAbbr: string,
    bookAbbr: string
  ): Promise<RawChapterVersion> {
    versionAbbr = versionAbbr.trim().toLowerCase();
    bookAbbr = bookAbbr.trim().toLowerCase();

    if (!versionAbbr) throw new Error("Version abbreviation is required.");
    if (!bookAbbr) throw new Error("Book abbreviation is required.");

    const book = (await import(
      `@/assets/versions/partitions/${versionAbbr.toLowerCase()}/${bookAbbr.toLowerCase()}.json`
    ).catch(() => null)) as RawChapterVersion | null;

    if (!book) {
      throw new Error(
        `Book ${bookAbbr.toUpperCase()} not found in version ${versionAbbr.toUpperCase()}.`
      );
    }

    return book
  }

  public static async getChapterWithVersion(
    versionAbbr: string,
    bookAbbr: string,
    chapterNumber: number
  ): Promise<Chapter> {
    versionAbbr = versionAbbr.trim().toLowerCase();
    bookAbbr = bookAbbr.trim().toLowerCase();

    if (!versionAbbr) throw new Error("Version abbreviation is required.");
    if (!bookAbbr) throw new Error("Book abbreviation is required.");
    if (chapterNumber < 1) {
      throw new Error("Chapter number must be greater than 0.");
    }

    const book = await this.getBookWithVersion(versionAbbr, bookAbbr)

    const allBooks = await BooksAndChapters.getBooks();

    const bookIndex = allBooks.findIndex(
      ({ abbr }) => abbr.toLowerCase() === bookAbbr
    );
    const isLastChapter = chapterNumber === book.chapters.length;
    const isFirstChapter = chapterNumber === 1;
    const previousBook = bookIndex > 0 ? allBooks[bookIndex - 1] : null;
    const nextBook =
      bookIndex < allBooks.length - 1 ? allBooks[bookIndex + 1] : null;

    let previous: Nullable<LinkToChapter> = null;
    let next: Nullable<LinkToChapter> = null;

    if (isFirstChapter && previousBook) {
      previous = {
        abbrev: previousBook.abbr,
        numChapter: previousBook.numChapters,
      };
    } else if (!isFirstChapter) {
      previous = { abbrev: book.abbrev, numChapter: chapterNumber - 1 };
    }

    if (isLastChapter && nextBook) {
      next = { abbrev: nextBook.abbr, numChapter: 1 };
    } else if (!isLastChapter) {
      next = { abbrev: book.abbrev, numChapter: chapterNumber + 1 };
    }

    return {
      version: versionAbbr.toUpperCase(),
      book: {
        abbrev: book.abbrev,
        name: book.name,
        chapter: {
          number: chapterNumber,
          verses: book.chapters.at(chapterNumber - 1) ?? [],
        },
      },
      previous,
      next,
    } satisfies Chapter;
  }
}
