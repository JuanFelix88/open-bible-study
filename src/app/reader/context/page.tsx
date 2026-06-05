"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function ReaderContextRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    router.replace(
      `/reader/comments/bibleref${queryString ? `?${queryString}` : ""}`,
    );
  }, [router, searchParams]);

  return null;
}
