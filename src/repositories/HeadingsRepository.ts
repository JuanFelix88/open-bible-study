import ptBrHeadingMetadata from "@/assets/versions/headings/pt-BR.json";
import type {
  HeadingMetadata,
  HeadingMetadataItem,
} from "@/entities/HeadingMetadata";
import { Language } from "@/entities/Language";
import { StaticClass } from "@/entities/StaticClass";

export class HeadingsRepository extends StaticClass {
  private static readonly metadataByLanguage = new Map<
    Language,
    HeadingMetadata[]
  >([[Language.PT_BR, ptBrHeadingMetadata as HeadingMetadata[]]]);

  public static getHeadings(
    bookAbbr: string,
    chapterNumber: number,
    language: Language,
  ): HeadingMetadataItem[] {
    const normalizedBookAbbr = bookAbbr.trim().toLowerCase();

    if (!normalizedBookAbbr || chapterNumber < 1) {
      return [];
    }

    const metadata = this.metadataByLanguage.get(language);

    if (!metadata) {
      return [];
    }

    const book = metadata.find(
      ({ abbrev }) => abbrev.toLowerCase() === normalizedBookAbbr,
    );

    return book?.chapters.at(chapterNumber - 1) ?? [];
  }
}
