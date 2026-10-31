"use client";
// Compatibility adapter: all legacy consumers share the single root theme context.
// storageKey/defaultTheme/global are accepted but no longer create separate stores.
import type { ReactNode } from "react";
import { useTheme as useGlobalTheme } from "@/components/providers/ThemeProvider";
export type Theme = "light" | "dark";
export function ThemeProvider({children}: {children: ReactNode; storageKey?: string; defaultTheme?: Theme; global?: boolean}) {
  return <>{children}</>;
}
export const useTheme = useGlobalTheme;
