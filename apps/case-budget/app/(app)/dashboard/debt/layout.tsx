import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Debt | CASE Budget",
  description:
    "Track and manage your CASE Budget debts, balances, payments, interest rates, and progress toward becoming debt-free.",
};

type DebtLayoutProps = {
  children:
    ReactNode;
};

export default function DebtLayout({
  children,
}: DebtLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}