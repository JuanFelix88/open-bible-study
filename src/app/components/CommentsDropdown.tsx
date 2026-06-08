"use client";

import { useEffect, useRef } from "react";
import DocumentIcon from "./icons/DocumentIcon";
import LinkIcon from "./icons/LinkIcon";

interface CommentsDropdownProps {
  onBibleRef: () => void;
  onEnduringWord: () => void;
  onGenevaStudyBible: () => void;
  onClose: () => void;
  autoFocus?: boolean;
}

export default function CommentsDropdown({
  onBibleRef,
  onEnduringWord,
  onGenevaStudyBible,
  onClose,
  autoFocus = false,
}: CommentsDropdownProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const secondButtonRef = useRef<HTMLButtonElement>(null);
  const thirdButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRefs = [firstButtonRef, secondButtonRef, thirdButtonRef];

  useEffect(() => {
    if (autoFocus) {
      firstButtonRef.current?.focus();
    }
  }, [autoFocus]);

  function focusAdjacentButton(direction: 1 | -1) {
    const currentIndex = buttonRefs.findIndex(
      (buttonRef) => buttonRef.current === document.activeElement,
    );
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + buttonRefs.length) % buttonRefs.length;

    buttonRefs[nextIndex]?.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLSpanElement>) {
    e.stopPropagation();

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusAdjacentButton(1);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusAdjacentButton(-1);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      focusAdjacentButton(e.shiftKey ? -1 : 1);
    }
  }

  return (
    <span
      ref={containerRef}
      role="menu"
      aria-label="Commentary sources"
      className="absolute left-0 top-full mt-1 z-30 flex min-w-[190px] flex-col rounded-sm border border-dashed border-primary bg-background shadow-md animate-fade-in-from-bottom"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={firstButtonRef}
        role="menuitem"
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-surface cursor-pointer text-left w-full focus:bg-surface focus:outline-none"
        onClick={onBibleRef}
      >
        <LinkIcon width={11} height={11} className="opacity-70 shrink-0" />
        BibleRef.com
      </button>
      <button
        ref={secondButtonRef}
        role="menuitem"
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-surface cursor-pointer text-left w-full border-t border-dashed border-border focus:bg-surface focus:outline-none"
        onClick={onEnduringWord}
      >
        <DocumentIcon width={11} height={11} className="opacity-70 shrink-0" />
        EnduringWord.com
      </button>
      <button
        ref={thirdButtonRef}
        role="menuitem"
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-surface cursor-pointer text-left w-full border-t border-dashed border-border focus:bg-surface focus:outline-none"
        onClick={onGenevaStudyBible}
      >
        <DocumentIcon width={11} height={11} className="opacity-70 shrink-0" />
        Geneva Study Bible
      </button>
    </span>
  );
}
