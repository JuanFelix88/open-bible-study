"use client";

import { useEffect } from "react";
import { useDialog } from "@/contexts/DialogContext";

export default function DialogToast() {
  const { dialog, setDialog } = useDialog();

  useEffect(() => {
    // close on ESC
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setDialog]);

  if (!dialog) return null;

  console.log(dialog);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mb-4 flex w-full justify-center px-4">
      <div
        className={
          dialog.fadeOut
            ? "pointer-events-auto max-w-xl w-full rounded-lg bg-backcolor/60 text-neutral-50 shadow-lg ring-1 ring-black/10 backdrop-blur p-4 animate-fade-out-from-bottom"
            : "pointer-events-auto max-w-xl w-full rounded-lg bg-backcolor/60 text-neutral-50 shadow-lg ring-1 ring-black/10 backdrop-blur p-4 animate-fade-in-from-bottom"
        }
      >
        {dialog.title && (
          <div className="text-sm font-semibold leading-5 mb-1 text-black/80">
            {dialog.title}
          </div>
        )}
        {dialog.message && (
          <div className="text-sm leading-5 opacity-90 text-black/70">
            {dialog.message}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => setDialog(null)}
            className="rounded-md bg-gray-500 hover:bg-neutral-700 text-neutral-100 text-xs px-3 py-1.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
