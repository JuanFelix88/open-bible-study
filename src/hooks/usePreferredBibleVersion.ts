"use client";

import {
  BIBLE_VERSION_COOKIE_MAX_AGE,
  BIBLE_VERSION_COOKIE_NAME,
  DEFAULT_VERSION,
  resolvePreferredBibleVersion,
} from "@/definitions/BibleVersionPreference";
import { useCallback, useEffect, useState } from "react";
import { parseCookies, setCookie } from "nookies";

export function usePreferredBibleVersion() {
  const [preferredVersion, setPreferredVersionState] =
    useState(DEFAULT_VERSION);

  useEffect(() => {
    const cookies = parseCookies();

    setPreferredVersionState(
      resolvePreferredBibleVersion(cookies[BIBLE_VERSION_COOKIE_NAME]),
    );
  }, []);

  const setPreferredVersion = useCallback((version: string) => {
    const normalizedVersion = resolvePreferredBibleVersion(version);

    setPreferredVersionState(normalizedVersion);
    setCookie(null, BIBLE_VERSION_COOKIE_NAME, normalizedVersion, {
      maxAge: BIBLE_VERSION_COOKIE_MAX_AGE,
      path: "/",
    });

    return normalizedVersion;
  }, []);

  return { preferredVersion, setPreferredVersion };
}
