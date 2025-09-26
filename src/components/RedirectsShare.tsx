"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function ProcessRedirectShareLink() {
  const searchParams = useSearchParams();
  const bookAbbr = searchParams.get("book") || "";
  const verse = searchParams.get("verse") || "";
  const versionAbbr = searchParams.get("version") || "";
  const chapterNumber = searchParams.get("chapter")
    ? parseInt(searchParams.get("chapter")!, 10)
    : null;
  const router = useRouter();

  useEffect(() => {
    router.replace(
      `/reader?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=${verse}`
    );
  }, []);

  return null;
}
