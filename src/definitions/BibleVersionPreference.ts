export const DEFAULT_VERSION = "KJA";

export const BIBLE_VERSION_COOKIE_NAME = "bible-version-preference";

export const BIBLE_VERSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function resolvePreferredBibleVersion(version?: string | null): string {
  const normalizedVersion = version?.trim().toUpperCase();

  return normalizedVersion || DEFAULT_VERSION;
}
