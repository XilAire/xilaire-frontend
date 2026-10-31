"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";
type ThemeContextType = { theme: Theme; toggleTheme: () => void; setTheme: (theme: Theme) => void };
const ThemeContext = createContext<ThemeContextType | null>(null);
export const GLOBAL_THEME_KEY = "xilaire-theme";

function validTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    let selected: Theme = "light";
    try {
      const saved = localStorage.getItem(GLOBAL_THEME_KEY);
      // Migrate an existing selection without maintaining separate preferences.
      const previous = localStorage.getItem("marketing-theme") ?? localStorage.getItem("app-theme") ?? localStorage.getItem("theme");
      if (validTheme(saved)) selected = saved;
      else if (validTheme(previous)) selected = previous;
      localStorage.setItem(GLOBAL_THEME_KEY, selected);
    } catch { /* localStorage may be unavailable */ }
    setThemeState(selected);
    applyTheme(selected);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== GLOBAL_THEME_KEY || !validTheme(event.newValue)) return;
      setThemeState(event.newValue);
      applyTheme(event.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((selected: Theme) => {
    if (!validTheme(selected)) return;
    setThemeState(selected);
    applyTheme(selected);
    try { localStorage.setItem(GLOBAL_THEME_KEY, selected); } catch { /* storage unavailable */ }
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
