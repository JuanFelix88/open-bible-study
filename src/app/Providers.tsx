"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactNode } from "react";
import { DialogProvider } from "@/contexts/DialogContext";
import DialogToast from "./components/DialogToast";

const getWindow = () => {
  try {
    return window;
  } catch {
    return undefined;
  }
};

const localWindow = getWindow();

const queryClient = new QueryClient({});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: localWindow?.localStorage,
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <DialogProvider>
        {children}
        <DialogToast />
      </DialogProvider>
    </PersistQueryClientProvider>
  );
}
