import paragraphMetadata from "@/assets/versions/paragraphs/base.json";
import { ParagraphMetadata } from "@/entities/ParagraphMetadata";
import { StaticClass } from "@/entities/StaticClass";

export class ParagraphsRepository extends StaticClass {
  private static readonly metadata = paragraphMetadata as ParagraphMetadata[];

  public static getParagraphStarts(
    bookAbbr: string,
    chapterNumber: number,
  ): number[] {
    const normalizedBookAbbr = bookAbbr.trim().toLowerCase();

    if (!normalizedBookAbbr || chapterNumber < 1) {
      return [];
    }

    const book = this.metadata.find(
      ({ abbrev }) => abbrev.toLowerCase() === normalizedBookAbbr,
    );

    return book?.chapters.at(chapterNumber - 1) ?? [];
  }
}
