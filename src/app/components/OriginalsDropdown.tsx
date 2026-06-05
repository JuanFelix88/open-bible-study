"use client";

import { useEffect, useRef } from "react";
import AIIcon from "./icons/AIIcon";
import CopyIcon from "./icons/CopyIcon";

interface OriginalsDropdownProps {
  onAI: () => void;
  onTranslator: () => void;
  onClose: () => void;
  autoFocus?: boolean;
}

export default function OriginalsDropdown({
  onAI,
  onTranslator,
  onClose,
  autoFocus = false,
}: OriginalsDropdownProps) {
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
      } else if (focused === firstButtonRef.current) {
        secondButtonRef.current?.focus();
      } else {
        firstButtonRef.current?.focus();
      }
    }
  }

  return (
    <span
      ref={containerRef}
      role="menu"
      aria-label="Original study options"
      className="absolute left-0 top-full z-30 mt-1 flex min-w-[145px] animate-fade-in-from-bottom flex-col rounded-sm border border-dashed border-primary bg-background shadow-md"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={firstButtonRef}
        role="menuitem"
        className="flex w-full cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left text-sm hover:bg-surface focus:bg-surface focus:outline-none"
        onClick={onAI}
      >
        <AIIcon width={11} height={11} className="shrink-0 opacity-70" />
        AI
      </button>
      <button
        ref={secondButtonRef}
        role="menuitem"
        className="flex w-full cursor-pointer items-center gap-1.5 border-t border-dashed border-border px-2 py-1.5 text-left text-sm hover:bg-surface focus:bg-surface focus:outline-none"
        onClick={onTranslator}
      >
        <CopyIcon width={11} height={11} className="shrink-0 opacity-70" />
        Translator
      </button>
    </span>
  );
}
