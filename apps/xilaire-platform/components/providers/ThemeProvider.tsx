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
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

interface ProviderProps {
  children: React.ReactNode;
  storageKey?: string;        // independent storage key
  defaultTheme?: Theme;       // default for this layout
}

export function ThemeProvider({
  children,
  storageKey = "theme",
  defaultTheme = "light",
}: ProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Load theme early — prevents flashes
  useLayoutEffect(() => {
    const saved = (localStorage.getItem(storageKey) as Theme) || defaultTheme;

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

export const useTheme = () => useContext(ThemeContext);
