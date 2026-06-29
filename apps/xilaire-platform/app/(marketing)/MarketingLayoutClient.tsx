"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function MarketingLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider storageKey="marketing-theme" defaultTheme="light">
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">

        <MarketingHeader />

        <main className="flex-1">
          {children}
        </main>

        <MarketingFooter />

      </div>
    </ThemeProvider>
  );
}
