import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Financial Health | CASE Budget",
  description:
    "Understand your overall financial health with CASE Budget insights across budgeting, spending, savings, debt, cash flow, and net worth.",
};

type FinancialHealthLayoutProps = {
  children:
    ReactNode;
};

export default function FinancialHealthLayout({
  children,
}: FinancialHealthLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}