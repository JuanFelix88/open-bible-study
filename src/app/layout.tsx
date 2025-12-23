import { Themes } from "@/definitions/Themes";
import { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
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

export const metadata: Metadata = {
  title: "Open Bible Study",
  description: "A advanced Bible study app to explore texts in depth.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const selectedTheme =
    cookieStore.get("theme-preference")?.value ?? Themes.modes[0];

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased justify-center flex bg-background`}
        data-theme={selectedTheme}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
