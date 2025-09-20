"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type DialogData = {
  title?: string;
  message?: string;
  ms?: number;
  fadeOut?: boolean;
};

export type DialogContextValue = {
  dialog: DialogData | null;
  setDialog: (data: DialogData | null) => void;
};

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, _setDialog] = useState<DialogData | null>(null);
  const timerHiddenRef = useRef<NodeJS.Timeout | null>(null);
  const timerFadeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setDialog = useCallback((data: DialogData | null) => {
    if (timerHiddenRef.current) {
      clearTimeout(timerHiddenRef.current);
      timerHiddenRef.current = null;
    }

    if (timerFadeoutRef.current) {
      clearTimeout(timerFadeoutRef.current);
      timerFadeoutRef.current = null;
    }

    _setDialog(data);

    if (data?.ms && data.ms > 0) {
      timerHiddenRef.current = setTimeout(() => {
        console.log("closed");
        _setDialog(null);
        timerHiddenRef.current = null;
      }, data.ms);
    }

    if (data?.ms && data.ms > 0) {
      timerFadeoutRef.current = setTimeout(() => {
        console.log("fading out");
        _setDialog((d) => (data ? { ...d, fadeOut: true } : null));
        timerFadeoutRef.current = null;
      }, data.ms - 1500);
    }
  }, []);

  const value = useMemo(() => ({ dialog, setDialog }), [dialog, setDialog]);

  return (
    <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
