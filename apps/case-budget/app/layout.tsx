import type {
  Metadata,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import CaseBudgetThemeProvider from "@/components/providers/CaseBudgetThemeProvider";

import "./globals.css";

const geistSans =
  Geist({
    variable:
      "--font-geist-sans",

    subsets: [
      "latin",
    ],
  });

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",

    subsets: [
      "latin",
    ],
  });

const themeInitializationScript = `
(function () {
  try {
    var storageKey = "case-budget-theme";

    var storedTheme =
      window.localStorage.getItem(
        storageKey
      );

    var selectedTheme =
      storedTheme === "light" ||
      storedTheme === "dark" ||
      storedTheme === "system"
        ? storedTheme
        : "system";

    var prefersDark =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

    var resolvedTheme =
      selectedTheme === "system"
        ? prefersDark
          ? "dark"
          : "light"
        : selectedTheme;

    var root =
      document.documentElement;

    root.classList.remove(
      "light",
      "dark"
    );

    root.classList.add(
      resolvedTheme
    );

    root.dataset.theme =
      resolvedTheme;

    root.dataset.themePreference =
      selectedTheme;

    root.style.colorScheme =
      resolvedTheme;
  } catch (error) {
    var root =
      document.documentElement;

    root.classList.remove(
      "light",
      "dark"
    );

    root.classList.add(
      "light"
    );

    root.dataset.theme =
      "light";

    root.dataset.themePreference =
      "system";

    root.style.colorScheme =
      "light";
  }
})();
`;

type RootLayoutProps =
  Readonly<{
    children:
      React.ReactNode;
  }>;

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              themeInitializationScript,
          }}
        />
      </head>

      <body className="flex min-h-full flex-col bg-[var(--background)] font-sans text-[var(--text-primary)] antialiased transition-colors duration-300">
        <CaseBudgetThemeProvider>
          {children}
        </CaseBudgetThemeProvider>
      </body>
    </html>
  );
}