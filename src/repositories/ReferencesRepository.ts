import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { BookInfo } from "@/entities/BookInfo";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Nullable } from "@/entities/Nullable";
import { Reference } from "@/entities/Reference";
import { ReferenceIndices, ReferencePayload } from "@/entities/ReferencePayload";
import { PostgresService } from "@/services/PostgresService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { ResponseError } from "@/utils/ResponseError";

type ReferenceQueryRow = {
  id: number;
  note: Nullable<string>;
  a_verse_index: number;
  a_chapter_index: number;
  a_book_index: number;
  b_verse_index: number;
  b_book_index: number;
  b_chapter_index: number;
  created_at: Date;
  created_by_user_name: string;
};

const BASE_SELECT_QUERY = `
  select
    r.id,
    r.note,
    ri_a.verse_index as a_verse_index,
    ri_a.chapter_index as a_chapter_index,
    ri_a.book_index as a_book_index,
    ri_b.verse_index as b_verse_index,
    ri_b.chapter_index as b_chapter_index,
    ri_b.book_index as b_book_index,
    r.created_at,
    u.name as created_by_user_name
  from public."references" r 
    inner join reference_items ri_a on ri_a.id = r.ref_a_id 
    inner join reference_items ri_b on ri_b.id = r.ref_b_id 
    inner join "users" u on u.id = r.created_by_user_id
`;

export class ReferencesRepository {
  public static async getBooks(): Promise<BookInfo[]> {
    return BooksAndChapters.getBooks();
  }

  public static async getByBookAndChapter(
    bookIndex: number,
    chapterIndex: number
  ): Promise<Reference[]> {
    const { data, error } = await FnNormalizer.getFromPromise(
      PostgresService.query<ReferenceQueryRow>(
        `${BASE_SELECT_QUERY}
        where exists (
          select 1
          from reference_items ri 
          where ri.book_index = ($1) and ri.chapter_index = ($2)
        )`,
        [bookIndex, chapterIndex]
      )
    );

    if (error) {
      throw error;
    }

    const allBooks = await this.getBooks();
    return data.rows.map((row) => this.mapRowToReference(row, allBooks));
  }

  public static async getById(referenceId: number): Promise<Reference | null> {
    const { data, error } = await FnNormalizer.getFromPromise(
      PostgresService.query<ReferenceQueryRow>(
        `${BASE_SELECT_QUERY}
        where r.id = $1`,
        [referenceId]
      )
    );

    if (error) {
      throw error;
    }

    if (data.rowCount === 0) {
      return null;
    }

    const allBooks = await this.getBooks();
    return this.mapRowToReference(data.rows[0]!, allBooks);
  }

  public static async create(
    refA: ReferenceIndices,
    refB: ReferenceIndices,
    note?: string
  ): Promise<{ id: number; createdAt: Date }> {
    const { data, error } = await FnNormalizer.getFromPromise(
      PostgresService.query<{ id: number; created_at: Date }>(
        `--sql
        WITH 
          ref_a AS (
            INSERT INTO public.reference_items (book_index, chapter_index, verse_index)
            VALUES ($1,$2,$3)
            RETURNING id
          ),
          ref_b AS (
            INSERT INTO public.reference_items (book_index, chapter_index, verse_index)
            VALUES ($4,$5,$6)
            RETURNING id
          )
        INSERT INTO public."references" (ref_a_id, ref_b_id, note, created_by_user_id)
        SELECT ref_a.id, ref_b.id, $7, 1
        FROM ref_a, ref_b
        RETURNING id, created_at;`,
        [
          refA.bookIndex,
          refA.chapterIndex,
          refA.verseIndex,
          refB.bookIndex,
          refB.chapterIndex,
          refB.verseIndex,
          note?.trim() ?? null,
        ]
      )
    );

    if (error) {
      throw error;
    }

    return {
      id: data.rows[0]!.id,
      createdAt: data.rows[0]!.created_at,
    };
  }

  public static async update(
    referenceId: number,
    refA: ReferenceIndices,
    refB: ReferenceIndices,
    note?: string
  ): Promise<{ id: number; createdAt: Date; updatedAt: Date } | null> {
    const { data, error } = await FnNormalizer.getFromPromise(
      PostgresService.query<{ id: number; created_at: Date; updated_at: Date }>(
        `--sql
        WITH
          cleanup AS (
            DELETE FROM public.reference_items ri
            WHERE EXISTS (
              SELECT 1 FROM public."references" r
              WHERE r.id = $1 AND (r.ref_a_id = ri.id OR r.ref_b_id = ri.id)
            )
          ),
          ref_a AS (
            INSERT INTO public.reference_items (book_index, chapter_index, verse_index)
            VALUES ($3,$4,$5)
            RETURNING id
          ),
          ref_b AS (
            INSERT INTO public.reference_items (book_index, chapter_index, verse_index)
            VALUES ($6,$7,$8)
            RETURNING id
          )
        UPDATE public."references" r SET
          note = $2,
          ref_a_id = ref_a.id,
          ref_b_id = ref_b.id,
          updated_at = NOW()
        FROM ref_a, ref_b
        WHERE r.id = $1
        RETURNING r.id, r.created_at, r.updated_at;`,
        [
          referenceId,
          note ?? null,
          refA.bookIndex,
          refA.chapterIndex,
          refA.verseIndex,
          refB.bookIndex,
          refB.chapterIndex,
          refB.verseIndex,
        ]
      )
    );

    if (error) {
      throw error;
    }

    if (data.rowCount === 0) {
      return null;
    }

    return {
      id: data.rows[0]!.id,
      createdAt: data.rows[0]!.created_at,
      updatedAt: data.rows[0]!.updated_at,
    };
  }

  public static async delete(referenceId: number): Promise<boolean> {
    const { data, error } = await FnNormalizer.getFromPromise(
      PostgresService.query(
        `--sql
        delete from public."references" r
        where r.id = $1`,
        [referenceId]
      )
    );

    if (error) {
      throw error;
    }

    return (data.rowCount ?? 0) > 0;
  }

  public static async validateAndBuildReferences(
    payload: ReferencePayload
  ): Promise<{ refA: ReferenceIndices; refB: ReferenceIndices } | Response> {
    const allBooks = await this.getBooks();

    const refA: ReferenceIndices = {
      bookIndex: allBooks.findIndex(
        ({ abbr }) => abbr.toLowerCase() === payload.references.at(0)?.abbr.toLowerCase()
      ),
      chapterIndex: (payload.references.at(0)?.chapterNumber ?? 1) - 1,
      verseIndex: (payload.references.at(0)?.verseNumber ?? 1) - 1,
    };

    const refB: ReferenceIndices = {
      bookIndex: allBooks.findIndex(
        ({ abbr }) => abbr.toLowerCase() === payload.references.at(1)?.abbr.toLowerCase()
      ),
      chapterIndex: (payload.references.at(1)?.chapterNumber ?? 1) - 1,
      verseIndex: (payload.references.at(1)?.verseNumber ?? 1) - 1,
    };

    for (const ref of [refA, refB]) {
      if (ref.bookIndex === -1) {
        return ResponseError.asError(
          `Book abbreviation '${payload.references.at(0)?.abbr}' not found`
        );
      }
      if (ref.chapterIndex < 0) {
        return ResponseError.asError("Chapter number must be greater than 0");
      }
      if (ref.verseIndex < 0) {
        return ResponseError.asError("Verse number must be greater than 0");
      }
    }

    return { refA, refB };
  }

  private static mapRowToReference(
    row: ReferenceQueryRow,
    allBooks: BookInfo[]
  ): Reference {
    const verses: LinkToVerse[] = [
      {
        abbrev: allBooks[row.a_book_index]!.abbr.toUpperCase(),
        numChapter: row.a_chapter_index + 1,
        numVerse: row.a_verse_index + 1,
      },
      {
        abbrev: allBooks[row.b_book_index]!.abbr.toUpperCase(),
        numChapter: row.b_chapter_index + 1,
        numVerse: row.b_verse_index + 1,
      },
    ];

    return {
      id: row.id,
      note: row.note ?? undefined,
      createdAt: row.created_at,
      createdByUserName: row.created_by_user_name,
      verses,
    };
  }
}
