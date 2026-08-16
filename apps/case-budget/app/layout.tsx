import type {
  Metadata,
  Viewport,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import CaseBudgetThemeProvider from "@/components/providers/CaseBudgetThemeProvider";

import {
  getCurrentUserPreferences,
} from "@/lib/preferences/user-preference-service";

import type {
  CaseBudgetUserPreferenceTheme,
} from "@/types/database";

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

function createThemeInitializationScript(
  selectedTheme:
    CaseBudgetUserPreferenceTheme,
) {
  return `
(function () {
  var selectedTheme =
    ${JSON.stringify(selectedTheme)};

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
})();
`;
}

async function resolveInitialTheme():
  Promise<CaseBudgetUserPreferenceTheme> {
  try {
    const preferences =
      await getCurrentUserPreferences();

    return preferences.theme;
  } catch {
    /**
     * RootLayout also renders public/authentication pages where an authenticated
     * CASE Budget user may not exist. In that case, use the non-persistent
     * system preference. Authenticated pages will use the stored database value.
     */
    return "system";
  }
}

type RootLayoutProps =
  Readonly<{
    children:
      React.ReactNode;
  }>;

export default async function RootLayout({
  children,
}: RootLayoutProps) {
  const initialTheme =
    await resolveInitialTheme();

  const themeInitializationScript =
    createThemeInitializationScript(
      initialTheme,
    );

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
        <CaseBudgetThemeProvider
          defaultTheme={
            initialTheme
          }
        >
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