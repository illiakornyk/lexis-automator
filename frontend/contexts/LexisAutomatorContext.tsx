"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLexisAutomator } from "@/hooks/useLexisAutomator";

type LexisAutomatorContextType = ReturnType<typeof useLexisAutomator>;

const LexisAutomatorContext = createContext<LexisAutomatorContextType | null>(null);

export function LexisAutomatorProvider({ children }: { children: ReactNode }) {
  const value = useLexisAutomator();
  return (
    <LexisAutomatorContext.Provider value={value}>
      {children}
    </LexisAutomatorContext.Provider>
  );
}

export function useLexisAutomatorContext(): LexisAutomatorContextType {
  const ctx = useContext(LexisAutomatorContext);
  if (!ctx) throw new Error("useLexisAutomatorContext must be used inside LexisAutomatorProvider");
  return ctx;
}
