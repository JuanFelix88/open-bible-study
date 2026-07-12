"use client";

import React, { useEffect, useState } from "react";
import CloseIcon from "./icons/CloseIcon";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: "left" | "right";
}

export default function Sidebar({
  isOpen,
  onClose,
  title,
  children,
  position = "right",
}: SidebarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed inset-y-0 z-50 w-full max-w-md bg-background shadow-xl ring-1 ring-border transition-transform duration-200 ease-in-out ${
          position === "right" ? "right-0" : "left-0"
        } ${isOpen ? "translate-x-0" : position === "right" ? "translate-x-full" : "-translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="obs-icon-button"
              aria-label="Close sidebar"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 text-text">{children}</div>
        </div>
      </div>
    </>
  );
}
