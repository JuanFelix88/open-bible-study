"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SearchIcon from "./icons/SearchIcon";
import CompareIcon from "./icons/CompareIcon";
import HomeIcon from "./icons/HomeIcon";
import ShareIcon from "./icons/ShareIcon";
import CheckIcon from "./icons/CheckIcon";
import LinkIcon from "./icons/LinkIcon";

interface ReaderMenuProps {
  versionAbbr: string;
  bookAbbr: string;
  chapterNumber: number | null;
  onSearchOpen?: () => void;
  onBooksOpen?: () => void;
  hideItems?: string[];
}

export default function ReaderMenu({
  versionAbbr,
  bookAbbr,
  chapterNumber,
  onSearchOpen,
  onBooksOpen,
  hideItems,
}: ReaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    function handleGlobalKeys(e: KeyboardEvent) {
      if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        if (onSearchOpen) {
          onSearchOpen();
        } else {
          router.push(`/search?version=${versionAbbr}`);
        }
      }
      if (e.ctrlKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        if (onBooksOpen) {
          onBooksOpen();
        } else {
          router.push("/select");
        }
      }
      if (e.ctrlKey && (e.key === "q" || e.key === "Q")) {
        e.preventDefault();
        router.push(
          `/reader/compare?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=1`,
        );
      }
      if (e.ctrlKey && e.key === ".") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }

    document.addEventListener("keydown", handleGlobalKeys);
    return () => document.removeEventListener("keydown", handleGlobalKeys);
  }, [onSearchOpen, onBooksOpen, router, bookAbbr, versionAbbr, chapterNumber]);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  const items: {
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    action: () => void;
  }[] = [
    {
      label: "Search",
      icon: <SearchIcon width={18} height={18} />,
      shortcut: "Ctrl + F",
      action: () => {
        setOpen(false);
        if (onSearchOpen) {
          onSearchOpen();
        } else {
          router.push(`/search?version=${versionAbbr}`);
        }
      },
    },
    {
      label: "Books",
      icon: <CompareIcon width={18} height={18} />,
      shortcut: "Ctrl + E",
      action: () => {
        if (onBooksOpen) {
          setOpen(false);
          onBooksOpen();
          return;
        }

        navigate("/select");
      },
    },
    {
      label: "Switch versions",
      icon: <LinkIcon width={18} height={18} />,
      shortcut: "Ctrl + Q",
      action: () =>
        navigate(
          `/reader/compare?book=${bookAbbr}&version=${versionAbbr}&chapter=${chapterNumber}&verse=1`,
        ),
    },
    {
      label: "Home",
      icon: <HomeIcon width={18} height={18} />,
      action: () => navigate("/"),
    },
    {
      label: "Switch theme",
      icon: (
        <span className="relative flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full border border-border bg-background">
          <span
            className="absolute inset-0 opacity-90"
            style={{
              background:
                "conic-gradient(from 180deg, var(--color-primary), var(--color-secondary), var(--color-info), var(--color-warning), var(--color-primary))",
            }}
          />
          <span className="relative z-10 h-2 w-2 rounded-full bg-background border border-border" />
        </span>
      ),
      action: () => navigate("/mode/set-theme"),
    },
    {
      label: "Share app",
      icon: <ShareIcon width={18} height={18} />,
      action: () => {
        const url = `${window.location.origin}/share/install`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setOpen(false);
        }, 1500);
      },
    },
  ];

  return (
    <div ref={menuRef} className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col justify-center items-center gap-[4.5px] w-10 h-10 rounded-lg hover:bg-surface active:scale-95 transition cursor-pointer"
        aria-label="Open menu"
        aria-expanded={open}
        title="Menu (Ctrl + .)"
      >
        <span
          className={`block h-[2px] w-5 rounded-full bg-text transition-all duration-200 ${open ? "translate-y-[6.5px] rotate-45" : ""}`}
        />
        <span
          className={`block h-[2px] w-5 rounded-full bg-text transition-all duration-200 ${open ? "opacity-0 scale-0" : ""}`}
        />
        <span
          className={`block h-[2px] w-5 rounded-full bg-text transition-all duration-200 ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-background/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="absolute top-12 right-0 z-[55] min-w-[250px] origin-top-right animate-fade-in-from-bottom">
            <div className="rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-lg shadow-background/40 overflow-hidden flex flex-col">
              {items
                .filter((item) => !hideItems?.includes(item.label))
                .map((item, i, arr) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-[15px] font-medium text-text hover:bg-primary/10 active:bg-primary/20 transition cursor-pointer ${
                      i < arr.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="opacity-80">
                        {copied && item.label === "Share app" ? (
                          <CheckIcon className="w-[18px] h-[18px] text-success" />
                        ) : (
                          item.icon
                        )}
                      </span>
                      <span>
                        {copied && item.label === "Share app"
                          ? "Link copied!"
                          : item.label}
                      </span>
                    </div>
                    {item.shortcut && (
                      <span className="text-[11px] font-mono text-text/40 opacity-70">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
