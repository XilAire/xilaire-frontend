import type { Metadata } from "next";
import type { ReactNode } from "react";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Import Trades | CASE Trades",
  description:
    "Import trading history from supported brokers including Fidelity, Charles Schwab, Robinhood, Webull, Interactive Brokers, Tastytrade, E*TRADE, TradeStation, Thinkorswim, and generic CSV files into your CASE Trades journal.",
};

export default function JournalImportLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}