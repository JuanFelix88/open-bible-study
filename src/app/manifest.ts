import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Open Bible Study",
    short_name: "BibleStudy",
    description: "An advanced Bible study app to explore texts in depth.",
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "portrait-primary",
    background_color: "#f4ece8",
    theme_color: "#f4ece8",
    categories: ["books", "education", "utilities"],
    shortcuts: [
      { name: "Reader", short_name: "Reader", url: "/reader" },
    ],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      // TIP: For best installability, add PNG icons below and update paths:
      { src: "/manifest-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/manifest-icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
