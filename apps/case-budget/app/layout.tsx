import type {
  Metadata,
  Viewport,
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

const CASE_BUDGET_APP_NAME =
  "CASE Budget";

const CASE_BUDGET_APP_TITLE =
  "CASE Budget | Take Control of Every Dollar";

const CASE_BUDGET_APP_DESCRIPTION =
  "CASE Budget is a personal financial management platform for budgeting, bills, transactions, savings goals, debt payoff, net worth, investments, financial insights, and more.";

const CASE_BUDGET_APP_URL =
  process.env
    .NEXT_PUBLIC_CASE_BUDGET_APP_URL ??
  "https://www.casebudgets.com";

const CASE_BUDGET_METADATA_BASE =
  getMetadataBase(
    CASE_BUDGET_APP_URL,
  );

export const metadata:
  Metadata =
{
  metadataBase:
    CASE_BUDGET_METADATA_BASE,

  applicationName:
    CASE_BUDGET_APP_NAME,

  title: {
    default:
      CASE_BUDGET_APP_TITLE,

    template:
      "%s | CASE Budget",
  },

  description:
    CASE_BUDGET_APP_DESCRIPTION,

  keywords: [
    "CASE Budget",
    "budgeting",
    "personal finance",
    "zero-based budget",
    "monthly budget",
    "financial planning",
    "bill tracking",
    "transaction tracking",
    "savings goals",
    "debt payoff",
    "net worth",
    "investments",
    "financial health",
  ],

  authors: [
    {
      name:
        "XilAire Technologies",
    },
  ],

  creator:
    "XilAire Technologies",

  publisher:
    "XilAire Technologies",

  category:
    "finance",

  formatDetection: {
    email:
      false,

    address:
      false,

    telephone:
      false,
  },

  icons: {
    icon: [
      {
        url:
          "/favicon.ico",

        type:
          "image/x-icon",
      },

      {
        url:
          "/icon-192.png",

        type:
          "image/png",

        sizes:
          "192x192",
      },

      {
        url:
          "/icon-512.png",

        type:
          "image/png",

        sizes:
          "512x512",
      },
    ],

    shortcut: [
      {
        url:
          "/favicon.ico",

        type:
          "image/x-icon",
      },
    ],

    apple: [
      {
        url:
          "/icon-192.png",

        type:
          "image/png",

        sizes:
          "192x192",
      },
    ],
  },

  openGraph: {
    type:
      "website",

    locale:
      "en_US",

    url:
      CASE_BUDGET_APP_URL,

    siteName:
      CASE_BUDGET_APP_NAME,

    title:
      CASE_BUDGET_APP_TITLE,

    description:
      CASE_BUDGET_APP_DESCRIPTION,

    images: [
      {
        url:
          "/case-budget-icon.png",

        width:
          512,

        height:
          512,

        alt:
          "CASE Budget",
      },
    ],
  },

  twitter: {
    card:
      "summary",

    title:
      CASE_BUDGET_APP_TITLE,

    description:
      CASE_BUDGET_APP_DESCRIPTION,

    images: [
      "/case-budget-icon.png",
    ],
  },

  robots: {
    index:
      true,

    follow:
      true,

    googleBot: {
      index:
        true,

      follow:
        true,

      "max-image-preview":
        "large",

      "max-snippet":
        -1,

      "max-video-preview":
        -1,
    },
  },

  alternates: {
    canonical:
      CASE_BUDGET_APP_URL,
  },
};

export const viewport:
  Viewport =
{
  width:
    "device-width",

  initialScale:
    1,

  maximumScale:
    5,

  viewportFit:
    "cover",

  themeColor: [
    {
      media:
        "(prefers-color-scheme: light)",

      color:
        "#ffffff",
    },

    {
      media:
        "(prefers-color-scheme: dark)",

      color:
        "#0f172a",
    },
  ],

  colorScheme:
    "light dark",
};

const themeInitializationScript = `
(function () {
  try {
    var storageKey =
      "case-budget-theme";

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

function getMetadataBase(
  value:
    string,
) {
  try {
    return new URL(
      value,
    );
  } catch {
    return new URL(
      "https://www.casebudgets.com",
    );
  }
}