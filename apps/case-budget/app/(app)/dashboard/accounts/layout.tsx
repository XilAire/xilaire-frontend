import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Accounts | CASE Budget",
  description:
    "Manage your CASE Budget financial accounts, including checking, savings, credit cards, loans, investments, and other account balances.",
};

type AccountsLayoutProps = {
  children:
    ReactNode;
};

export default function AccountsLayout({
  children,
}: AccountsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}