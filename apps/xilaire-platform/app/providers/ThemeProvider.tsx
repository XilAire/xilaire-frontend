"use client";

import {
  createContext,
  useContext,
  useEffect,
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

interface Props {
  children: React.ReactNode;
  storageKey: string;
  defaultTheme?: Theme;
  global?: boolean; // 🔥 NEW
}

export function ThemeProvider({
  children,
  storageKey,
  defaultTheme = "light",
  global = false, // 🔥 marketing will set this to FALSE
}: Props) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useLayoutEffect(() => {
    const saved = (localStorage.getItem(storageKey) as Theme) || defaultTheme;

    setThemeState(saved);

    if (global) {
      // ONLY app platform uses global html class
      document.documentElement.classList.toggle("dark", saved === "dark");
    }
  }, []);

  const setTheme = (value: Theme) => {
    setThemeState(value);
    localStorage.setItem(storageKey, value);

    if (global) {
      document.documentElement.classList.toggle("dark", value === "dark");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {/* 🔥 If NOT global, dark mode applies ONLY to this wrapper */}
      <div className={!global && theme === "dark" ? "dark" : ""}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
