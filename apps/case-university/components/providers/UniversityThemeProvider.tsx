"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UniversityTheme =
  | "light"
  | "dark"
  | "system";

type ResolvedTheme =
  | "light"
  | "dark";

type UniversityThemeContextValue = {
  theme: UniversityTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: UniversityTheme) => void;
  toggleTheme: () => ResolvedTheme;
};

const UniversityThemeContext =
  createContext<UniversityThemeContextValue | null>(
    null,
  );

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
  ) {
    return "dark";
  }

  return "light";
}

function resolveTheme(
  theme: UniversityTheme,
): ResolvedTheme {
  return theme === "system"
    ? getSystemTheme()
    : theme;
}

function applyDocumentTheme(
  resolvedTheme: ResolvedTheme,
) {
  if (typeof document === "undefined") {
    return;
  }

  const root =
    document.documentElement;

  root.classList.toggle(
    "dark",
    resolvedTheme === "dark",
  );

  root.classList.toggle(
    "light",
    resolvedTheme === "light",
  );

  root.dataset.theme =
    resolvedTheme;

  root.style.colorScheme =
    resolvedTheme;
}

export default function UniversityThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: ReactNode;
  initialTheme?: UniversityTheme;
}) {
  const [
    theme,
    setThemeState,
  ] =
    useState<UniversityTheme>(
      initialTheme,
    );

  const [
    resolvedTheme,
    setResolvedTheme,
  ] =
    useState<ResolvedTheme>(() =>
      initialTheme === "dark"
        ? "dark"
        : "light",
    );

  const applyTheme = useCallback(
    (
      nextTheme: UniversityTheme,
    ) => {
      const nextResolvedTheme =
        resolveTheme(
          nextTheme,
        );

      applyDocumentTheme(
        nextResolvedTheme,
      );

      setThemeState(
        nextTheme,
      );

      setResolvedTheme(
        nextResolvedTheme,
      );

      return nextResolvedTheme;
    },
    [],
  );

  useEffect(
    () => {
      applyTheme(
        initialTheme,
      );
    },
    [
      initialTheme,
      applyTheme,
    ],
  );

  useEffect(
    () => {
      if (
        theme !== "system"
      ) {
        return;
      }

      const mediaQuery =
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        );

      function handleSystemThemeChange() {
        const nextResolvedTheme =
          mediaQuery.matches
            ? "dark"
            : "light";

        applyDocumentTheme(
          nextResolvedTheme,
        );

        setResolvedTheme(
          nextResolvedTheme,
        );
      }

      mediaQuery.addEventListener(
        "change",
        handleSystemThemeChange,
      );

      return () => {
        mediaQuery.removeEventListener(
          "change",
          handleSystemThemeChange,
        );
      };
    },
    [
      theme,
    ],
  );

  const setTheme = useCallback(
    (
      nextTheme: UniversityTheme,
    ) => {
      applyTheme(
        nextTheme,
      );
    },
    [
      applyTheme,
    ],
  );

  const toggleTheme =
    useCallback(
      () => {
        const nextTheme: ResolvedTheme =
          resolvedTheme === "dark"
            ? "light"
            : "dark";

        applyTheme(
          nextTheme,
        );

        return nextTheme;
      },
      [
        resolvedTheme,
        applyTheme,
      ],
    );

  const value =
    useMemo<UniversityThemeContextValue>(
      () => ({
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }),
      [
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      ],
    );

  return (
    <UniversityThemeContext.Provider
      value={value}
    >
      {children}
    </UniversityThemeContext.Provider>
  );
}

export function useUniversityTheme() {
  const context =
    useContext(
      UniversityThemeContext,
    );

  if (!context) {
    throw new Error(
      "useUniversityTheme must be used inside UniversityThemeProvider.",
    );
  }

  return context;
}
