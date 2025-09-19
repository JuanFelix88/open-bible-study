import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { PostgresService } from "@/services/PostgresService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export interface Payload {
  references: Array<{
    abbr: string;
    chapterNumber: number;
    verseNumber: number;
  }>;
  note?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Payload;

  if (!body || typeof body !== "object") {
    return ResponseError.asError("Body is needed");
  }

  if (!!body.note && typeof body.note !== "string") {
    return ResponseError.asError("Note must be a string");
  }

  if (
    body.references.some(
      ({ abbr, chapterNumber: chapter, verseNumber: verse }) =>
        !abbr && !chapter && !verse
    ) &&
    body.references.length !== 2
  ) {
    return ResponseError.asError(
      "The two references must be filled (abbr, chapter, verse)"
    );
  }

  const allBooks = await BooksAndChapters.getBooks();

  const refA = {
    bookIndex: allBooks.findIndex(
      ({ abbr }) =>
        abbr.toLowerCase() == body.references.at(0)?.abbr.toLowerCase()
    ),
    chapterIndex: (body.references.at(0)?.chapterNumber ?? 1) - 1,
    verseIndex: (body.references.at(0)?.verseNumber ?? 1) - 1,
  };

  const refB = {
    bookIndex: allBooks.findIndex(
      ({ abbr }) =>
        abbr.toLowerCase() == body.references.at(1)?.abbr.toLowerCase()
    ),
    chapterIndex: (body.references.at(1)?.chapterNumber ?? 1) - 1,
    verseIndex: (body.references.at(1)?.verseNumber ?? 1) - 1,
  };

  for (const ref of [refA, refB]) {
    if (ref.bookIndex === -1) {
      return ResponseError.asError(
        `Book abbreviation '${body.references.at(0)?.abbr}' not found`
      );
    }

    if (ref.chapterIndex < 0) {
      return ResponseError.asError(`Chapter number must be greater than 0`);
    }

    if (ref.verseIndex < 0) {
      return ResponseError.asError(`Verse number must be greater than 0`);
    }
  }

  const statementPromise = PostgresService.query<{
    id: number;
    created_at: Date;
  }>(
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
      RETURNING id, created_at;
  `,
    [
      refA.bookIndex,
      refA.chapterIndex,
      refA.verseIndex,
      refB.bookIndex,
      refB.chapterIndex,
      refB.verseIndex,
      body.note?.trim() ?? null,
    ]
  );

  const { data: refsInserted, error: refsInsertedError } =
    await FnNormalizer.getFromPromise(statementPromise);

  if (!!refsInsertedError) {
    console.log({refA, refB})
    console.log(refsInsertedError.message);
    console.log(refsInsertedError);
    return ResponseError.asError("Database error");
  }

  return NextResponse.json({
    id: refsInserted.rows.at(0)!.id,
    createdAt: refsInserted.rows.at(0)!.created_at,
  });
}
