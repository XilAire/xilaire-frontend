"use client";

import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function AppThemeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider storageKey="app-theme" defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
}
