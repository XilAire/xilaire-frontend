import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Net Worth | CASE Budget",
  description:
    "Track your CASE Budget net worth, assets, liabilities, account balances, and progress toward building long-term wealth.",
};

type NetWorthLayoutProps = {
  children:
    ReactNode;
};

export default function NetWorthLayout({
  children,
}: NetWorthLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}