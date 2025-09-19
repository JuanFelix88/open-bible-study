import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Nullable } from "@/entities/Nullable";
import { Reference } from "@/entities/Reference";
import { PostgresService } from "@/services/PostgresService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;

  const [referenceId, referenceIdError] = Params.getRequiredParam(
    "reference_id",
    params,
    ParamType.NUMBER
  );

  if (referenceIdError) return ResponseError.asError(referenceIdError);

  if (referenceId < 1) {
    return ResponseError.asError(`Is invalid reference ID`);
  }

  const allBooks = await BooksAndChapters.getBooks();

  console.time("Query");
  const referencesQueryPromise = PostgresService.query<{
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
  }>(
    `--sql
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
      inner join "users" u on u.id  = r.created_by_user_id 
    where r.id = $1`,
    [referenceId]
  );

  const { data: references, error: referencesError } =
    await FnNormalizer.getFromPromise(referencesQueryPromise);

  console.timeEnd("Query");

  if (!!referencesError) {
    return ResponseError.asError("Database error");
  }

  if (references.rowCount === 0) {
    return ResponseError.asError(`Reference ID '${referenceId}' not found`);
  }

  const {
    id,
    note,
    a_book_index: aBookIndex,
    a_chapter_index: aChapterIndex,
    a_verse_index: aVerseIndex,
    b_book_index: bBookIndex,
    b_chapter_index: bChapterIndex,
    b_verse_index: bVerseIndex,
    created_at: createdAt,
    created_by_user_name: createdByUserName,
  } = references.rows.at(0)!;

  const verses: LinkToVerse[] = [];

  // a:
  verses.push({
    abbrev: allBooks.at(aBookIndex)!.abbr.toUpperCase(),
    numChapter: aChapterIndex + 1,
    numVerse: aVerseIndex + 1,
  });

  // b:
  verses.push({
    abbrev: allBooks.at(bBookIndex)!.abbr.toUpperCase(),
    numChapter: bChapterIndex + 1,
    numVerse: bVerseIndex + 1,
  });

  return NextResponse.json({
    id,
    note: note ?? undefined,
    createdAt,
    createdByUserName,
    verses,
  } satisfies Reference);
}

export interface Payload {
  id: number
  references: Array<{
    abbr: string;
    chapterNumber: number;
    verseNumber: number;
  }>;
  note?: string;
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;

  const [referenceId, referenceIdError] = Params.getRequiredParam(
    "reference_id",
    params,
    ParamType.NUMBER
  );

  if (referenceIdError) return ResponseError.asError(referenceIdError);

  if (referenceId < 1) {
    return ResponseError.asError(`Is invalid reference ID`);
  }

  const body = (await req.json().catch(() => null)) as {
    references: Array<{
      abbr: string;
      chapterNumber: number;
      verseNumber: number;
    }>;
    note?: string;
  };

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

  console.time("Query");
  const statementPromise = PostgresService.query<{
    id: number;
    created_at: Date;
    updated_at: Date;
  }>(
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
      body.note ?? null,
      refA.bookIndex,
      refA.chapterIndex,
      refA.verseIndex,
      refB.bookIndex,
      refB.chapterIndex,
      refB.verseIndex,
    ]
  );

  const { data: refsChanged, error: refsChangedError } =
    await FnNormalizer.getFromPromise(statementPromise);
  console.timeEnd("Query");

  if (!!refsChangedError) {
    return ResponseError.asError("Database error");
  }

  if (refsChanged.rowCount === 0) {
    return ResponseError.asError(`Reference ID '${referenceId}' not found`);
  }

  return NextResponse.json({
    id: refsChanged.rows.at(0)!.id,
    createdAt: refsChanged.rows.at(0)!.created_at,
    updatedAt: refsChanged.rows.at(0)!.updated_at,
  });
}

export async function DELETE(
  _: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;

  const [referenceId, referenceIdError] = Params.getRequiredParam(
    "reference_id",
    params,
    ParamType.NUMBER
  );

  if (referenceIdError) return ResponseError.asError(referenceIdError);

  if (referenceId < 1) {
    return ResponseError.asError(`Is invalid reference ID`);
  }

  console.time("Query");
  const deleteRefQueryPromise = PostgresService.query(
    `--sql
    delete from public."references" r
    where r.id = $1`,
    [referenceId]
  );

  const { data: resultDelete, error: referencesError } =
    await FnNormalizer.getFromPromise(deleteRefQueryPromise);

  console.timeEnd("Query");

  if (!!referencesError) {
    return ResponseError.asError("Database error");
  }

  if (resultDelete.rowCount === 0) {
    return ResponseError.asError(`No reference found to delete`);
  }

  return NextResponse.json({
    message: "Reference deleted successfully",
  });
}
