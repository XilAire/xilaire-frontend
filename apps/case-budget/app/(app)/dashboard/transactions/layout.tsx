import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Transactions | CASE Budget",
  description:
    "View, add, categorize, and manage your CASE Budget transactions across your financial accounts.",
};

type TransactionsLayoutProps = {
  children:
    ReactNode;
};

export default function TransactionsLayout({
  children,
}: TransactionsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}