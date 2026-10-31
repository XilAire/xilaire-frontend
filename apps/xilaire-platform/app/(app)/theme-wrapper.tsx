"use client";

// Kept for import compatibility; the single global provider lives in app/layout.tsx.
export default function AppThemeWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
