import { BooksAndChapters } from "@/definitions/BooksAndChapters";
import { NextResponse } from "next/server";

export async function GET() {
  const books = await BooksAndChapters.getBooks();

  return NextResponse.json(books);
}
