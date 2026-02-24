import { ReferencePayload } from "@/entities/ReferencePayload";
import { ReferencesRepository } from "@/repositories/ReferencesRepository";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ReferencePayload;

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

  const refsResult = await ReferencesRepository.validateAndBuildReferences(body);
  if (refsResult instanceof Response) {
    return refsResult;
  }

  const { refA, refB } = refsResult;

  try {
    const result = await ReferencesRepository.create(refA, refB, body.note);

    return NextResponse.json({
      id: result.id,
      createdAt: result.createdAt,
    });
  } catch {
    return ResponseError.asError("Database error");
  }
}
