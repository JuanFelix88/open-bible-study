"use client";

import { Themes } from "@/definitions/Themes";
import CheckIcon from "@/app/components/icons/CheckIcon";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { parseCookies, setCookie } from "nookies";

export default function DarkMode() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const example = useMemo(
    () => ({
      title: "John 3:16",
      text: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
    }),
    [],
  );

  useEffect(() => {
    const cookies = parseCookies();

    setSelectedTheme(cookies["theme-preference"] ?? Themes.modes[0]);
  }, []);

  useEffect(() => {
    if (!selectedTheme) return;

    document.body.dataset.theme = selectedTheme;
  }, [selectedTheme]);

  function handleSelectTheme(theme: string) {
    setSelectedTheme(theme);

    setCookie(null, "theme-preference", theme, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  const currentTheme = selectedTheme ?? Themes.modes[0];

  return (
    <div className="p-4 flex flex-col gap-4 bg-background text-text min-h-screen max-w-[900px] w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">Set mode</h1>
          <p className="text-text-muted text-sm">
            Select a theme. Each card shows a preview using the theme colors.
          </p>
        </div>

        <Link
          href="/"
          className="text-text underline bg-surface p-2 rounded w-fit border border-border hover:bg-surface/60"
        >
          Go to home
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-surface/40 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Current:</span>
          <span className="text-sm font-semibold">{currentTheme}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Themes.modes.map((mode) => (
          <div
            key={mode}
            data-theme={mode}
            role="button"
            tabIndex={0}
            onClick={() => handleSelectTheme(mode)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelectTheme(mode);
              }
            }}
            className="group text-left rounded-xl border border-border bg-background hover:bg-surface text-text transition-colors overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className="p-3 flex items-center justify-between gap-3 border-b border-border/60">
              <div className="flex flex-col">
                <span className="font-semibold leading-tight">{mode}</span>
                <span className="text-xs text-text-muted">Preview</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectTheme(mode);
                }}
                className="flex cursor-pointer items-center gap-1 text-xs font-semibold rounded-full px-3 py-1.5 border border-border bg-background/60 hover:bg-background/90"
                aria-pressed={currentTheme === mode}
              >
                {currentTheme === mode ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Selected
                  </>
                ) : (
                  "Select theme"
                )}
              </button>
            </div>

            <div className="p-3">
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-text-muted">
                      {example.title}
                    </span>
                    <p className="mt-1 text-sm leading-relaxed line-clamp-3">
                      {example.text}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 min-w-[92px]">
                    <span className="text-[0.7rem] text-text-muted">
                      Accent
                    </span>
                    <div className="flex gap-1">
                      <span className="w-3 h-3 rounded-full bg-primary border border-border" />
                      <span className="w-3 h-3 rounded-full bg-info border border-border" />
                      <span className="w-3 h-3 rounded-full bg-warning border border-border" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-primary/15 border border-border">
                    Highlight
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-info/15 border border-border">
                    Info
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-success/15 border border-border">
                    Success
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-danger/15 border border-border">
                    Warning
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
