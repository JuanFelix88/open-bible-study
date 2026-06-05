import { BibleVersions } from "@/definitions/BibleVersions";
import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { BibleVersion } from "@/entities/BibleVersion";
import { Chapter } from "@/entities/Chapter";
import { LinkToChapter } from "@/entities/LinkToChapter";
import { Nullable } from "@/entities/Nullable";
import { RawChapterVersion } from "@/entities/RawBibleVersion";
import { ParagraphsRepository } from "@/repositories/ParagraphsRepository";
import { StaticClass } from "@/entities/StaticClass";
import { Verse } from "@/entities/Verse";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { ResponseError } from "@/utils/ResponseError";
import { WordNormalizer } from "@/utils/WordNormalizer";

export class BibleVersionsRepository extends StaticClass {
  public static async getAllVersionsWithVerse(
    bookAbbr: string,
    chapterNumber: number,
    verseNumber: number,
  ): Promise<Chapter[]> {
    bookAbbr = bookAbbr.trim().toLowerCase();

    if (!bookAbbr) throw new Error("Book abbreviation is required.");
    if (chapterNumber < 1 || verseNumber < 1) {
      throw new Error("Chapter and verse numbers must be greater than 0.");
    }

    const versions = await Promise.all(
      BibleVersions.versions
        .filter((version) => !version.isOriginal)
        .map(async (version) => {
          return {
            raw: (await import(
              `@/assets/versions/partitions/${version.abbreviation.toLowerCase()}/${bookAbbr.toLowerCase()}.json`
            )) as RawChapterVersion,
            version,
          };
        }),
    );

    const hasVerseInBibleVersions = versions.some(
      (v) => !!v.raw.chapters.at(chapterNumber - 1)?.at(verseNumber - 1),
    );

    if (!hasVerseInBibleVersions) {
      throw new Error(
        `Verse [${bookAbbr.toUpperCase()} ${chapterNumber}:${verseNumber}] not found in one or more versions.`,
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
        }) satisfies Chapter,
    );

    return verseVersions;
  }

  public static async getBibleVersion(
    versionAbbr: string,
  ): Promise<RawChapterVersion[]> {
    versionAbbr = versionAbbr.trim().toLowerCase();

    if (!versionAbbr) throw new Error("Version abbreviation is required.");

    const bibleVersion = (await import(
      `@/assets/versions/${versionAbbr.toUpperCase()}.json`
    ).catch(() => null)) as RawChapterVersion[] | null;

    if (!bibleVersion) {
      throw new Error(`Version ${versionAbbr.toUpperCase()} not found.`);
    }

    return Array.from(bibleVersion);
  }

  public static async getBookWithVersion(
    versionAbbr: string,
    bookAbbr: string,
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
        `Book ${bookAbbr.toUpperCase()} not found in version ${versionAbbr.toUpperCase()}.`,
      );
    }

    return book;
  }

  public static async getChapterWithVersion(
    versionAbbr: string,
    bookAbbr: string,
    chapterNumber: number,
  ): Promise<Chapter> {
    versionAbbr = versionAbbr.trim().toLowerCase();
    bookAbbr = bookAbbr.trim().toLowerCase();

    if (!versionAbbr) throw new Error("Version abbreviation is required.");
    if (!bookAbbr) throw new Error("Book abbreviation is required.");
    if (chapterNumber < 1) {
      throw new Error("Chapter number must be greater than 0.");
    }

    const book = await this.getBookWithVersion(versionAbbr, bookAbbr);

    const allBooks = await BooksAndChapters.getBooks();

    const bookIndex = allBooks.findIndex(
      ({ abbr }) => abbr.toLowerCase() === bookAbbr,
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
          paragraphStarts: ParagraphsRepository.getParagraphStarts(
            book.abbrev,
            chapterNumber,
          ),
        },
      },
      previous,
      next,
    } satisfies Chapter;
  }

  public static async getChapterOrError(
    versionAbbr: string,
    bookAbbr: string,
    chapterNumber: number
  ): Promise<Chapter | Response> {
    const { data, error } = await FnNormalizer.getFromPromise(
      this.getChapterWithVersion(versionAbbr, bookAbbr, chapterNumber)
    );

    if (error instanceof Error && /not found/i.test(error.message)) {
      return ResponseError.asError(
        `Chapter [${bookAbbr.toUpperCase()} ${chapterNumber}] not found in version [${versionAbbr.toUpperCase()}].`,
        404
      );
    }

    if (error) {
      return ResponseError.asError(
        `Error fetching chapter: ${error?.message ?? "Unknown error"}`,
        400
      );
    }

    return data;
  }

  public static async getBookIndex(
    version: string,
    bookAbbr: string,
  ): Promise<number> {
    version = version?.trim();
    bookAbbr = bookAbbr?.trim();

    if (!version) throw new Error("Version abbreviation is required.");
    if (!bookAbbr) throw new Error("Book abbreviation is required.");

    const bibleVersion = await this.getBibleVersion(version);

    const index = bibleVersion.findIndex((b) => b.abbrev === bookAbbr);

    console.log({ index, bookAbbr, version });

    if (index === -1) {
      throw new Error(
        `Book ${bookAbbr.toUpperCase()} not found in version ${version.toUpperCase()}.`,
      );
    }

    return index;
  }

  public static async getOriginalText(
    version: string,
    bookAbbr: string,
    chapterNumber: number,
    verseNumber: number,
  ): Promise<{ chapter: Chapter; versionMeta: BibleVersion }> {
    version = version?.trim();
    bookAbbr = bookAbbr?.trim();

    if (!version) throw new Error("Version abbreviation is required.");
    if (!bookAbbr) throw new Error("Book abbreviation is required.");

    const bookIndex = await this.getBookIndex(version, bookAbbr);

    const originalVersion = BibleVersions.versions
      .filter((v) => v.isOriginal)
      .sort((a, b) => b.startsIn - a.startsIn)
      .find((v) => bookIndex >= v.startsIn);

    if (!originalVersion) {
      throw new Error(
        `Original version not found for book ${bookAbbr} (index ${bookIndex}).`,
      );
    }

    const bibleData = await this.getBibleVersion(originalVersion.abbreviation);
    const relativeIndex = bookIndex - originalVersion.startsIn;
    const rawBook = bibleData.at(relativeIndex);

    if (!rawBook) {
      throw new Error(
        `Book not found in original version ${originalVersion.abbreviation}.`,
      );
    }

    const verseText = rawBook.chapters
      .at(chapterNumber - 1)
      ?.at(verseNumber - 1);

    if (!verseText) {
      throw new Error(
        `Verse [${bookAbbr.toUpperCase()} ${chapterNumber}:${verseNumber}] not found in original version ${originalVersion.abbreviation}.`,
      );
    }

    return {
      chapter: {
        version: originalVersion.abbreviation,
        book: {
          abbrev: rawBook.abbrev,
          name: rawBook.name,
          chapter: {
            number: chapterNumber,
            verses: [verseText],
          },
        },
        previous: null,
        next: null,
      },
      versionMeta: originalVersion,
    };
  }

  public static async getRelativeVerses({
    word,
    versionAbbr,
    count = 50,
  }: {
    word: string;
    versionAbbr?: string;
    count?: number;
  }): Promise<Verse[]> {
    word = word.trim();

    if (!word) throw new Error("Word is required.");

    const searchTokens = WordNormalizer.getUniqueTokens(word);
    if (searchTokens.length === 0) return [];

    const versions = versionAbbr
      ? [await this.getVersionFromName(versionAbbr)]
      : BibleVersions.versions;
    const allBooks = await BooksAndChapters.getBooks();
    const safeCount = Math.max(1, count);
    const verses: Verse[] = [];

    for (const versionMeta of versions) {
      const bibleVersion = await this.getBibleVersion(versionMeta.abbreviation);

      for (const [bookIndex, book] of bibleVersion.entries()) {
        const canonicalBook = allBooks.at(versionMeta.startsIn + bookIndex);
        const bookAbbr = canonicalBook?.abbr ?? book.abbrev;
        const bookName = canonicalBook?.name ?? book.name;
        const displayBook = bookAbbr || bookName;

        for (const [chapterIndex, chapter] of book.chapters.entries()) {
          for (const [verseIndex, text] of chapter.entries()) {
            if (!WordNormalizer.containsAllTokens(text, searchTokens)) {
              continue;
            }

            const chapterNumber = chapterIndex + 1;
            const verseNumber = verseIndex + 1;

            verses.push({
              version: versionMeta.abbreviation,
              versionName: versionMeta.name,
              language: versionMeta.language,
              bookName,
              bookAbbr,
              chapter: chapterNumber,
              verse: verseNumber,
              text,
              displayText: `${displayBook} ${chapterNumber}:${verseNumber}`,
              matchedWords: searchTokens,
            });

            if (verses.length >= safeCount) {
              return verses;
            }
          }
        }
      }
    }

    return verses;
  }

  public static async getVersionFromName(name?: string): Promise<BibleVersion> {
    name = name?.trim();

    if (!name) throw new Error("Version name is required.");

    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

    const target = normalize(name);

    const version = BibleVersions.versions.find((v) => {
      const abbr = normalize(v.abbreviation ?? "");
      const vname = normalize(v.name ?? "");
      const path = normalize(v.path ?? "");
      return abbr === target || vname === target || path === target;
    });

    if (!version) {
      throw new Error(`Version ${name} not found.`);
    }

    return version;
  }
}
