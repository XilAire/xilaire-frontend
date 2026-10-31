"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  storageKey?: string;
}

export function ThemeToggle({ storageKey: _storageKey }: ThemeToggleProps) {
  // The enclosing ThemeProvider owns persistence and its storage key.
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      {theme === "light" ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
