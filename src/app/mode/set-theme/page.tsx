"use client";

import { Themes } from "@/definitions/Themes";
import { useEffect, useState } from "react";
import { parseCookies, setCookie } from "nookies";

export default function DarkMode() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  useEffect(() => {
    const cookies = parseCookies();

    setSelectedTheme(cookies["theme-preference"] ?? Themes.modes[0]);
  }, []);

  function handleChangeMode(event: React.ChangeEvent<HTMLSelectElement>) {
    const theme = event.target.value;
    setSelectedTheme(theme);

    setCookie(null, "theme-preference", theme, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  return (
    <div className="p-4 flex flex-col gap-4 bg-background text-text min-h-screen max-w-[550px] w-full">
      <h1 className="text-xl font-bold">Set mode</h1>
      <select
        value={selectedTheme ?? Themes.modes[0]}
        onChange={handleChangeMode}
        className="border border-border rounded p-2 brightness-[1.15] bg-background"
      >
        {Themes.modes.map((mode) => (
          <option key={mode} value={mode} className="bg-background">
            {mode}
          </option>
        ))}
      </select>

      <a
        href="/"
        className="text-text underline mt-2 bg-surface p-2 rounded w-fit"
      >
        Go to home
      </a>
    </div>
  );
}
