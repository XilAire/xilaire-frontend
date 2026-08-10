import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Budget | CASE Budget",
  description:
    "Plan and manage your CASE Budget monthly budget, including income, spending categories, assigned amounts, and zero-based budgeting progress.",
};

type BudgetLayoutProps = {
  children:
    ReactNode;
};

export default function BudgetLayout({
  children,
}: BudgetLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}