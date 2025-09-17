import { RawBibleVersionData } from '@/entities/RawBibleVersion';
import { Params } from "@/utils/Params";
import { ResponseError } from "@/utils/ResponseError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) {
  const params = await ctx.params;
  
  const [versionAbbr, versionAbbrError] = Params.getRequiredParam(
    "version_abbr",
    params
  );

  if (versionAbbrError) return ResponseError.asError(versionAbbrError);

  const data = (await import(
    `@/assets/versions/${versionAbbr.toUpperCase()}.json`
  ).catch(() => null)) as RawBibleVersionData | null;

  if (!data) {
    return ResponseError.asError(`Version ${versionAbbr} not found`, 404);
  }

  const sizeB = Buffer.byteLength(JSON.stringify(data), "utf8");
  const sizeKb = sizeB / 1024;
  const sizeMb = sizeKb / 1024;

  return NextResponse.json({ version: versionAbbr, sizeMb });
}
