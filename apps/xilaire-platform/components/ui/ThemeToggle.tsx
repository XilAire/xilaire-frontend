"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  storageKey?: string; // 🔥 Allow per-layout theme keys
}

export function ThemeToggle({ storageKey }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  const handleClick = () => {
    if (storageKey) {
      // Override storage key for isolated theme contexts (marketing/app/helpdesk)
      localStorage.setItem(storageKey, theme === "light" ? "dark" : "light");
    }
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-md p-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-slate-700" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-300" />
      )}
    </button>
  );
}
