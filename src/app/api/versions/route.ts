import { BibleVersions } from "@/definitions/BibleVersions";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(BibleVersions.versions);
}
