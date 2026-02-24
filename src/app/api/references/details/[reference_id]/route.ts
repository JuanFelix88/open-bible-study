import { ReferencePayload } from "@/entities/ReferencePayload";
import { ReferencesRepository } from "@/repositories/ReferencesRepository";
import { ResponseError } from "@/utils/ResponseError";
import { extractReferenceIdParam } from "@/utils/RouteHelpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const paramsResult = await extractReferenceIdParam(ctx);
  if (!paramsResult.ok) return paramsResult.error;

  const { referenceId } = paramsResult.data;

  try {
    const reference = await ReferencesRepository.getById(referenceId);
    
    if (!reference) {
      return ResponseError.asError(`Reference ID '${referenceId}' not found`);
    }

    return NextResponse.json(reference);
  } catch {
    return ResponseError.asError("Database error");
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const paramsResult = await extractReferenceIdParam(ctx);
  if (!paramsResult.ok) return paramsResult.error;

  const { referenceId } = paramsResult.data;

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
    const result = await ReferencesRepository.update(referenceId, refA, refB, body.note);

    if (!result) {
      return ResponseError.asError(`Reference ID '${referenceId}' not found`);
    }

    return NextResponse.json({
      id: result.id,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  } catch {
    return ResponseError.asError("Database error");
  }
}

export async function DELETE(
  _: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const paramsResult = await extractReferenceIdParam(ctx);
  if (!paramsResult.ok) return paramsResult.error;

  const { referenceId } = paramsResult.data;

  try {
    const deleted = await ReferencesRepository.delete(referenceId);

    if (!deleted) {
      return ResponseError.asError(`No reference found to delete`);
    }

    return NextResponse.json({
      message: "Reference deleted successfully",
    });
  } catch {
    return ResponseError.asError("Database error");
  }
}
