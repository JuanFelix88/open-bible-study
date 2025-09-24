"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { useEffect, useState } from "react";
import "./globals.css";
import { Providers } from "./Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

// export const metadata: Metadata = {
//   title: "Open Bible Study",
//   description: "A advanced Bible study app to explore texts in depth.",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [themeMode, setThemeMode] = useState<string | null>(null);

  useEffect(() => {
    setThemeMode(localStorage.getItem("theme"));
  }, []);

  const selectedTheme = themeMode ?? "normal";

  let classMode = "";

  if (selectedTheme === "dark") {
    classMode = "mode-dark";
  }

  if (selectedTheme === "ventura") {
    classMode = "mode-ventura";
  }

  if (selectedTheme === "clean") {
    classMode = "mode-clean";
  }

  return (
    <html lang="pt-br">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        ></meta>
        <title>Open Bible Study</title>
        <meta
          name="description"
          content="A advanced Bible study app to explore texts in depth."
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ${classMode}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
