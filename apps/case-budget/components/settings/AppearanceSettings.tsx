"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemePreference =
  | "light"
  | "dark"
  | "system";

type ResolvedTheme =
  | "light"
  | "dark";

const THEME_STORAGE_KEY =
  "case-budget-theme";

const themeOptions: {
  id:
    ThemePreference;

  label:
    string;

  description:
    string;

  icon:
    "sun" | "moon" | "system";
}[] = [
  {
    id:
      "light",

    label:
      "Light",

    description:
      "Always use the light CASE Budget theme.",

    icon:
      "sun",
  },
  {
    id:
      "dark",

    label:
      "Dark",

    description:
      "Always use the dark CASE Budget theme.",

    icon:
      "moon",
  },
  {
    id:
      "system",

    label:
      "System",

    description:
      "Automatically match your device appearance.",

    icon:
      "system",
  },
];

export default function AppearanceSettings() {
  const [
    selectedTheme,
    setSelectedTheme,
  ] =
    useState<ThemePreference>(
      "system",
    );

  const [
    resolvedTheme,
    setResolvedTheme,
  ] =
    useState<ResolvedTheme>(
      "light",
    );

  const [
    isReady,
    setIsReady,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      const storedTheme =
        readStoredTheme();

      const initialTheme =
        storedTheme ??
        readDocumentThemePreference() ??
        "system";

      setSelectedTheme(
        initialTheme,
      );

      setResolvedTheme(
        resolveTheme(
          initialTheme,
        ),
      );

      setIsReady(
        true,
      );
    },
    [],
  );

  useEffect(
    () => {
      if (
        !isReady ||
        selectedTheme !==
        "system"
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

        setResolvedTheme(
          nextResolvedTheme,
        );

        applyThemeToDocument({
          preference:
            "system",

          resolvedTheme:
            nextResolvedTheme,
        });
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
      isReady,
      selectedTheme,
    ],
  );

  const selectedThemeLabel =
    useMemo(
      () =>
        themeOptions.find(
          (
            option,
          ) =>
            option.id ===
            selectedTheme,
        )?.label ??
        "System",
      [
        selectedTheme,
      ],
    );

  function handleThemeChange(
    theme:
      ThemePreference,
  ) {
    const nextResolvedTheme =
      resolveTheme(
        theme,
      );

    setSelectedTheme(
      theme,
    );

    setResolvedTheme(
      nextResolvedTheme,
    );

    writeStoredTheme(
      theme,
    );

    applyThemeToDocument({
      preference:
        theme,

      resolvedTheme:
        nextResolvedTheme,
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {themeOptions.map(
          (
            option,
          ) => {
            const isSelected =
              selectedTheme ===
              option.id;

            return (
              <button
                key={
                  option.id
                }
                type="button"
                onClick={
                  () => {
                    handleThemeChange(
                      option.id,
                    );
                  }
                }
                aria-pressed={
                  isSelected
                }
                className={[
                  "group flex min-h-[148px] flex-col items-start rounded-xl border p-4 text-left outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                  isSelected
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-default))] shadow-sm"
                    : "border-[var(--border-subtle)] bg-[var(--surface-muted)] hover:border-[color-mix(in_srgb,var(--primary)_24%,var(--border-subtle))] hover:bg-[var(--surface-default)]",
                ].join(
                  " ",
                )}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]"
                        : "bg-[var(--surface-default)] text-[var(--text-muted)] group-hover:text-[var(--primary)]",
                    ].join(
                      " ",
                    )}
                  >
                    <ThemeIcon
                      name={
                        option.icon
                      }
                    />
                  </div>

                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-default)] text-transparent",
                    ].join(
                      " ",
                    )}
                    aria-hidden="true"
                  >
                    <CheckIcon />
                  </span>
                </div>

                <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">
                  {option.label}
                </p>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  {option.description}
                </p>
              </button>
            );
          },
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
              <PreviewIcon
                theme={
                  resolvedTheme
                }
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Current appearance
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                CASE Budget is using{" "}
                <strong className="font-bold text-[var(--text-primary)]">
                  {resolvedTheme ===
                  "dark"
                    ? "Dark"
                    : "Light"}
                </strong>{" "}
                mode.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 rounded-full bg-[var(--surface-default)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]">
            {selectedThemeLabel}
          </span>
        </div>
      </div>

      {selectedTheme ===
      "system" ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-[var(--primary)]">
              <SystemIcon />
            </span>

            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Following your device
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                CASE Budget will automatically switch between light and dark
                mode when your operating system appearance changes.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ThemeIcon({
  name,
}: {
  name:
    "sun" | "moon" | "system";
}) {
  if (
    name ===
    "moon"
  ) {
    return (
      <MoonIcon />
    );
  }

  if (
    name ===
    "system"
  ) {
    return (
      <SystemIcon />
    );
  }

  return (
    <SunIcon />
  );
}

function PreviewIcon({
  theme,
}: {
  theme:
    ResolvedTheme;
}) {
  if (
    theme ===
    "dark"
  ) {
    return (
      <MoonIcon />
    );
  }

  return (
    <SunIcon />
  );
}

function readStoredTheme():
  ThemePreference | null {
  try {
    const storedTheme =
      window.localStorage.getItem(
        THEME_STORAGE_KEY,
      );

    if (
      storedTheme ===
        "light" ||
      storedTheme ===
        "dark" ||
      storedTheme ===
        "system"
    ) {
      return storedTheme;
    }
  } catch {
    /*
     * Local storage may be unavailable in restricted
     * browser environments.
     */
  }

  return null;
}

function readDocumentThemePreference():
  ThemePreference | null {
  const preference =
    document.documentElement
      .dataset
      .themePreference;

  if (
    preference ===
      "light" ||
    preference ===
      "dark" ||
    preference ===
      "system"
  ) {
    return preference;
  }

  return null;
}

function writeStoredTheme(
  theme:
    ThemePreference,
) {
  try {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      theme,
    );
  } catch {
    /*
     * The theme still applies to the current page even
     * when local storage cannot persist the preference.
     */
  }
}

function resolveTheme(
  preference:
    ThemePreference,
): ResolvedTheme {
  if (
    preference ===
      "light" ||
    preference ===
      "dark"
  ) {
    return preference;
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
}

function applyThemeToDocument({
  preference,
  resolvedTheme,
}: {
  preference:
    ThemePreference;

  resolvedTheme:
    ResolvedTheme;
}) {
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
    preference;

  root.style.colorScheme =
    resolvedTheme;

  /*
   * Notify any other CASE Budget client components that
   * the theme preference changed.
   */
  window.dispatchEvent(
    new CustomEvent(
      "case-budget-theme-change",
      {
        detail: {
          preference,
          resolvedTheme,
        },
      },
    ),
  );
}

function SunIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="14"
        rx="2"
      />

      <path d="M8 22h8" />
      <path d="M12 18v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}