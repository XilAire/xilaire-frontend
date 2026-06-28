"use client";

import { Moon, Sun } from "lucide-react";
import { useCaseTheme } from "@/components/providers/CaseThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useCaseTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        rounded-md p-2
        hover:bg-slate-200 dark:hover:bg-slate-700
        transition
      "
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-300" />
      )}
    </button>
  );
}
