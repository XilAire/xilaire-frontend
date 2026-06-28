// apps/case-trades/app/layout.tsx

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CASE Trades",
    template: "%s | CASE Trades",
  },

  description:
    "CASE Trades — professional trading intelligence, signal automation, journaling, analytics, Discord distribution, and performance tracking.",

  applicationName: "CASE Trades",

  keywords: [
    "trading",
    "options",
    "stocks",
    "signals",
    "discord alerts",
    "trade journal",
    "performance analytics",
    "swing trading",
    "scalping",
    "leaps",
  ],

  authors: [
    {
      name: "XilAire Technologies",
    },
  ],

  creator: "XilAire Technologies",

  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      "https://app.casetrades.com"
  ),

  openGraph: {
    title: "CASE Trades",
    description:
      "Trade management, signal automation, journaling, analytics, and Discord integrations.",
    siteName: "CASE Trades",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "CASE Trades",
    description:
      "Professional trading intelligence platform.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="dark"
    >
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div id="root" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}