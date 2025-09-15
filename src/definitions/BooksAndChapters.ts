import { RawBibleVersionData } from '@/types/RawBibleVersion';
import { StaticClass } from '@/types/StaticClass';
import { ModArray } from "@/utils/ModArray";

export class BooksAndChapters extends StaticClass {
  private static defaultVersion = "NVI";
  public static async getBooks(): Promise<
    { abbr: string; name: string; numChapters: number }[]
  > {
    const data = (await import(
      `@/assets/versions/${this.defaultVersion.toUpperCase()}.json`
    ).catch(() => null)) as RawBibleVersionData | null;

    if (!data) {
      throw new Error(`Version ${this.defaultVersion} not found in get Books`);
    }

    return ModArray.mapFrom(data, (book: RawBibleVersionData[0]) => ({
      abbr: book.abbrev,
      name: book.name,
      numChapters: book.chapters?.length ?? 0,
    })).filter((book) => !!book.abbr);
  }

  public static async getChapters(bookAbbr: string): Promise<string[][]> {
    const data = (await import(
      `@/assets/versions/${this.defaultVersion.toUpperCase()}.json`
    ).catch(() => null)) as RawBibleVersionData | null;

    if (!data) {
      throw new Error(`Version ${this.defaultVersion} not found in get Books`);
    }

    const book = ModArray.findFrom(
      data,
      (book: RawBibleVersionData[0]) =>
        book.abbrev.toUpperCase() === bookAbbr.toUpperCase()
    );

    if (!book) {
      throw new Error(`Book ${bookAbbr} not found`);
    }

    return book.chapters;
  }
}
