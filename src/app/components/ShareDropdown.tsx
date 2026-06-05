"use client";

import { useEffect, useRef } from "react";
import LinkIcon from "./icons/LinkIcon";
import DocumentIcon from "./icons/DocumentIcon";

interface ShareDropdownProps {
  onLinkOnly: () => void;
  onLinkAndText: () => void;
  onClose: () => void;
  autoFocus?: boolean;
}

export default function ShareDropdown({
  onLinkOnly,
  onLinkAndText,
  onClose,
  autoFocus = false,
}: ShareDropdownProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const secondButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocus) {
      firstButtonRef.current?.focus();
    }
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLSpanElement>) {
    e.stopPropagation();

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const focused = document.activeElement;
      if (focused === firstButtonRef.current) {
        secondButtonRef.current?.focus();
      } else {
        firstButtonRef.current?.focus();
      }
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const focused = document.activeElement;
      if (e.shiftKey) {
        if (focused === firstButtonRef.current) {
          secondButtonRef.current?.focus();
        } else {
          firstButtonRef.current?.focus();
        }
      } else {
        if (focused === firstButtonRef.current) {
          secondButtonRef.current?.focus();
        } else {
          firstButtonRef.current?.focus();
        }
      }
      return;
    }
  }

  return (
    <span
      ref={containerRef}
      role="menu"
      aria-label="Share options"
      className="absolute left-0 top-full mt-1 z-30 flex min-w-[150px] flex-col rounded-sm border border-dashed border-primary bg-background shadow-md animate-fade-in-from-bottom"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={firstButtonRef}
        role="menuitem"
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-surface cursor-pointer text-left w-full focus:bg-surface focus:outline-none"
        onClick={onLinkOnly}
      >
        <LinkIcon width={11} height={11} className="opacity-70 shrink-0" />
        Link only
      </button>
      <button
        ref={secondButtonRef}
        role="menuitem"
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-surface cursor-pointer text-left w-full border-t border-dashed border-border focus:bg-surface focus:outline-none"
        onClick={onLinkAndText}
      >
        <DocumentIcon width={11} height={11} className="opacity-70 shrink-0" />
        Link + text
      </button>
    </span>
  );
}
