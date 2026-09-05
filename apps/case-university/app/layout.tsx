import type {
  Metadata,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import type {
  ReactNode,
} from "react";

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

export const metadata: Metadata =
  {
    title: {
      default:
        "CASE University",
      template:
        "%s | CASE University",
    },

    description:
      "CASE University is an investing education platform for learning market fundamentals, technical analysis, and options trading.",

    applicationName:
      "CASE University",
  };

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        h-full
        antialiased
      `}
    >
      <body
        className="
          flex
          min-h-full
          flex-col
        "
      >
        {children}
      </body>
    </html>
  );
}