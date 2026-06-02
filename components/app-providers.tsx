"use client";

import { DraftProvider } from "@/contexts/draft-provider";
import { MaterialsProvider } from "@/contexts/materials-provider";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MaterialsProvider>
      <DraftProvider>{children}</DraftProvider>
    </MaterialsProvider>
  );
}
