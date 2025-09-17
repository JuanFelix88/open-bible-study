import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { LinkToVerse } from "@/entities/LinkToVerse";
import { Nullable } from "@/entities/Nullable";
import { Reference } from "@/entities/Reference";
import { PostgresService } from "@/services/PostgresService";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  const params = await ctx.params;

  const [bookAbbr, bookAbbrError] = Params.getRequiredParam(
    "book_abbr",
    params,
    ParamType.STRING
  );
  const [chapterNumber, chapterNumberError] = Params.getRequiredParam(
    "chapter_number",
    params,
    ParamType.NUMBER
  );

  if (bookAbbrError) return ResponseError.asError(bookAbbrError);
  if (chapterNumberError) return ResponseError.asError(chapterNumberError);

  if (chapterNumber < 1) {
    return ResponseError.asError(`Chapter number must be greater than 0`);
  }

  const allBooks = await BooksAndChapters.getBooks();

  const bookIndex = allBooks.findIndex(
    (b) => b.abbr.toLowerCase() === bookAbbr.toLowerCase()
  );

  if (bookIndex === -1) {
    return ResponseError.asError(`Book abbreviation '${bookAbbr}' not found`);
  }

  const chapterIndex = chapterNumber - 1;

  console.time("Query");
  const referencesQueryPromise = PostgresService.query<{
    id: number;
    note: Nullable<string>;
    a_index: number;
    b_index: number;
    created_at: Date;
    created_by_user_name: string;
  }>(
    `--sql
    select
      r.id,
      r.note,
      ri_a.verse_index as a_index,
      ri_b.verse_index as b_index,
      r.created_at,
      u.name as created_by_user_name
    from public."references" r 
      inner join reference_items ri_a on ri_a.id = r.ref_a_id 
      inner join reference_items ri_b on ri_b.id = r.ref_b_id 
      inner join "users" u on u.id  = r.created_by_user_id 
    where exists (
      select 1
      from reference_items ri 
      where ri.book_index = ($1) and ri.chapter_index = ($2)
    )`,
    [bookIndex, chapterIndex]
  );

  const { data: references, error: referencesError } =
    await FnNormalizer.getFromPromise(referencesQueryPromise);

  console.timeEnd("Query");

  if (!!referencesError) {
    return ResponseError.asError("Database error");
  }

  return NextResponse.json(
    references.rows.map(
      ({
        id,
        note,
        a_index: aIndex,
        b_index: bIndex,
        created_at: createdAt,
        created_by_user_name: createdByUserName,
      }) => {
        const verses: LinkToVerse[] = [];

        // a:
        verses.push({
          abbrev: bookAbbr.toUpperCase(),
          numChapter: chapterNumber,
          numVerse: aIndex + 1,
        });

        // b:
        verses.push({
          abbrev: bookAbbr.toUpperCase(),
          numChapter: chapterNumber,
          numVerse: bIndex + 1,
        });

        return {
          id,
          note: note ?? undefined,
          createdAt,
          createdByUserName,
          verses,
        } satisfies Reference;
      }
    )
  );
}

// export async function POST(
//   req: NextRequest,
//   ctx: { params: Promise<Record<string, string>> }
// ) {
//   const params = await ctx.params;

//   const [bookAbbr, bookAbbrError] = Params.getRequiredParam(
//     "book_abbr",
//     params,
//     ParamType.STRING
//   );
//   const [chapterNumber, chapterNumberError] = Params.getRequiredParam(
//     "chapter_number",
//     params,
//     ParamType.NUMBER
//   );

//   if (bookAbbrError) return ResponseError.asError(bookAbbrError);
//   if (chapterNumberError) return ResponseError.asError(chapterNumberError);

//   if (chapterNumber < 1) {
//     return ResponseError.asError(`Chapter number must be greater than 0`);
//   }


//   if (!body || typeof body !== "object") {
//     return ResponseError.asError("Body is needed");
//   }



//   const allBooks = await BooksAndChapters.getBooks();

//   const bookIndex = allBooks.findIndex(
//     (b) => b.abbr.toLowerCase() === bookAbbr.toLowerCase()
//   );

//   if (bookIndex === -1) {
//     return ResponseError.asError(`Book abbreviation '${bookAbbr}' not found`);
//   }

//   const chapterIndex = chapterNumber - 1;

//   const referencesQueryPromise = PostgresService.query<{
//     id: number;
//     note: Nullable<string>;
//     a_index: number;
//     b_index: number;
//     created_at: Date;
//     created_by_user_name: string;
//   }>(
//     `--sql
//     select
//       r.id,
//       r.note,
//       ri_a.verse_index as a_index,
//       ri_b.verse_index as b_index,
//       r.created_at,
//       u.name as created_by_user_name
//     from public."references" r 
//       inner join reference_items ri_a on ri_a.id = r.ref_a_id 
//       inner join reference_items ri_b on ri_b.id = r.ref_b_id 
//       inner join "users" u on u.id  = r.created_by_user_id 
//     where exists (
//       select 1
//       from reference_items ri 
//       where ri.book_index = ($1) and ri.chapter_index = ($2)
//     )`,
//     [bookIndex, chapterIndex]
//   );

//   const { data: references, error: referencesError } =
//     await FnNormalizer.getFromPromise(referencesQueryPromise);

//   if (!!referencesError) {
//     return ResponseError.asError("Database error");
//   }

//   return NextResponse.json(
//     references.rows.map(
//       ({
//         id,
//         note,
//         a_index: aIndex,
//         b_index: bIndex,
//         created_at: createdAt,
//         created_by_user_name: createdByUserName,
//       }) => {
//         const verses: LinkToVerse[] = [];

//         // a:
//         verses.push({
//           abbrev: bookAbbr.toUpperCase(),
//           numChapter: chapterNumber,
//           numVerse: aIndex + 1,
//         });

//         // b:
//         verses.push({
//           abbrev: bookAbbr.toUpperCase(),
//           numChapter: chapterNumber,
//           numVerse: bIndex + 1,
//         });

//         return {
//           id,
//           note: note ?? undefined,
//           createdAt,
//           createdByUserName,
//           verses,
//         } satisfies Reference;
//       }
//     )
//   );
// }
