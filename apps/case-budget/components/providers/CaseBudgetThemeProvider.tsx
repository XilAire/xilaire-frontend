"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CaseBudgetTheme =
  | "light"
  | "dark"
  | "system";

type ResolvedTheme =
  | "light"
  | "dark";

type CaseBudgetThemeContextValue = {
  theme: CaseBudgetTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (
    theme: CaseBudgetTheme,
  ) => void;
  toggleTheme: () => void;
};

type CaseBudgetThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: CaseBudgetTheme;
  storageKey?: string;
  showGlobalToggle?: boolean;
};

const DEFAULT_THEME: CaseBudgetTheme =
  "system";

const DEFAULT_STORAGE_KEY =
  "case-budget-theme";

const CaseBudgetThemeContext =
  createContext<
    CaseBudgetThemeContextValue | undefined
  >(undefined);

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window === "undefined"
  ) {
    return "light";
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
}

function resolveTheme(
  theme: CaseBudgetTheme,
): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }

  return theme;
}

function isValidTheme(
  value: string | null,
): value is CaseBudgetTheme {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system"
  );
}

function applyThemeToDocument(
  resolvedTheme: ResolvedTheme,
  selectedTheme: CaseBudgetTheme,
) {
  const root =
    document.documentElement;

  root.classList.remove(
    "light",
    "dark",
  );

  root.classList.add(
    resolvedTheme,
  );

  root.dataset.theme =
    resolvedTheme;

  root.dataset.themePreference =
    selectedTheme;

  root.style.colorScheme =
    resolvedTheme;
}

export function useCaseBudgetTheme() {
  const context =
    useContext(
      CaseBudgetThemeContext,
    );

  if (!context) {
    throw new Error(
      "useCaseBudgetTheme must be used within CaseBudgetThemeProvider.",
    );
  }

  return context;
}

export default function CaseBudgetThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = DEFAULT_STORAGE_KEY,
  showGlobalToggle = true,
}: CaseBudgetThemeProviderProps) {
  const [
    theme,
    setThemeState,
  ] = useState<CaseBudgetTheme>(
    defaultTheme,
  );

  const [
    resolvedTheme,
    setResolvedTheme,
  ] = useState<ResolvedTheme>(
    () =>
      resolveTheme(
        defaultTheme,
      ),
  );

  const [
    isMounted,
    setIsMounted,
  ] = useState(false);

  const updateResolvedTheme =
    useCallback(
      (
        selectedTheme:
          CaseBudgetTheme,
      ) => {
        const nextResolvedTheme =
          resolveTheme(
            selectedTheme,
          );

        setResolvedTheme(
          nextResolvedTheme,
        );

        applyThemeToDocument(
          nextResolvedTheme,
          selectedTheme,
        );
      },
      [],
    );

  const setTheme =
    useCallback(
      (
        nextTheme:
          CaseBudgetTheme,
      ) => {
        setThemeState(
          nextTheme,
        );

        window.localStorage.setItem(
          storageKey,
          nextTheme,
        );

        updateResolvedTheme(
          nextTheme,
        );
      },
      [
        storageKey,
        updateResolvedTheme,
      ],
    );

  const toggleTheme =
    useCallback(
      () => {
        setTheme(
          resolvedTheme === "dark"
            ? "light"
            : "dark",
        );
      },
      [
        resolvedTheme,
        setTheme,
      ],
    );

  useEffect(
    () => {
      const storedTheme =
        window.localStorage.getItem(
          storageKey,
        );

      const initialTheme =
        isValidTheme(
          storedTheme,
        )
          ? storedTheme
          : defaultTheme;

      setThemeState(
        initialTheme,
      );

      updateResolvedTheme(
        initialTheme,
      );

      setIsMounted(true);
    },
    [
      defaultTheme,
      storageKey,
      updateResolvedTheme,
    ],
  );

  useEffect(
    () => {
      const mediaQuery =
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        );

      function handleSystemThemeChange() {
        if (
          theme !== "system"
        ) {
          return;
        }

        updateResolvedTheme(
          "system",
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
      updateResolvedTheme,
    ],
  );

  const contextValue =
    useMemo<CaseBudgetThemeContextValue>(
      () => ({
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }),
      [
        resolvedTheme,
        setTheme,
        theme,
        toggleTheme,
      ],
    );

  return (
    <CaseBudgetThemeContext.Provider
      value={contextValue}
    >
      {children}

      {showGlobalToggle &&
      isMounted ? (
        <GlobalThemeSwitcher />
      ) : null}
    </CaseBudgetThemeContext.Provider>
  );
}

function GlobalThemeSwitcher() {
  const {
    theme,
    resolvedTheme,
    setTheme,
  } = useCaseBudgetTheme();

  return (
    <div className="fixed bottom-24 right-4 z-[70] lg:bottom-5 lg:right-5">
      <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <ThemeOptionButton
          label="Light"
          isActive={
            theme === "light"
          }
          onClick={() =>
            setTheme("light")
          }
        >
          <SunIcon />
        </ThemeOptionButton>

        <ThemeOptionButton
          label="Dark"
          isActive={
            theme === "dark"
          }
          onClick={() =>
            setTheme("dark")
          }
        >
          <MoonIcon />
        </ThemeOptionButton>

        <ThemeOptionButton
          label="System"
          description={`System is currently using ${resolvedTheme} mode`}
          isActive={
            theme === "system"
          }
          onClick={() =>
            setTheme("system")
          }
        >
          <SystemIcon />
        </ThemeOptionButton>
      </div>
    </div>
  );
}

type ThemeOptionButtonProps = {
  children: ReactNode;
  label: string;
  description?: string;
  isActive: boolean;
  onClick: () => void;
};

function ThemeOptionButton({
  children,
  label,
  description,
  isActive,
  onClick,
}: ThemeOptionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      title={
        description ?? label
      }
      onClick={onClick}
      className={[
        "inline-flex h-10 w-10 items-center justify-center rounded-xl outline-none transition-[background-color,color,box-shadow]",
        "focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        isActive
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
      />

      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.42 1.42" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
      />

      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}