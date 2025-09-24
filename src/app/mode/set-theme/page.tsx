"use client";

import { Themes } from "@/definitions/Themes";
import { useEffect, useState } from "react";

export default function DarkMode() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTheme(localStorage.getItem("theme"));
  }, []);

  function handleChangeMode(event: React.ChangeEvent<HTMLSelectElement>) {
    const theme = event.target.value;
    setSelectedTheme(theme);
    localStorage.setItem("theme", theme);
  }

  return (
    <div className="p-4 flex flex-col gap-4 bg-backcolor min-h-screen">
      <h1 className="text-xl font-bold">Set mode</h1>
      <select
        value={selectedTheme ?? Themes.Modes[0]}
        onChange={handleChangeMode}
        className="border border-gray-300 rounded p-2"
      >
        {Themes.Modes.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>

      <a
        href="/"
        className="text-blue-500 underline mt-2 bg-gray-200 p-2 rounded w-fit"
      >
        Go to home
      </a>
    </div>
  );
}
