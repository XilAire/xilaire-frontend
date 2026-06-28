"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

interface CaseThemeProviderProps {
  children: React.ReactNode;
  storageKey?: string;
  defaultTheme?: Theme;
}

export function CaseThemeProvider({
  children,
  storageKey = "case-trades-theme",
  defaultTheme = "dark",
}: CaseThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // ---------------------------------------------------------------------------
  // Load theme early to prevent flash
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    const saved =
      (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme;

    setThemeState(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, [storageKey, defaultTheme]);

  const setTheme = (value: Theme) => {
    setThemeState(value);
    localStorage.setItem(storageKey, value);
    document.documentElement.classList.toggle("dark", value === "dark");
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCaseTheme() {
  return useContext(ThemeContext);
}
