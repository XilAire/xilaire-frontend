import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Investments | CASE Budget",
  description:
    "Track and manage your CASE Budget investment accounts, balances, contributions, holdings, and progress toward your long-term wealth goals.",
};

type InvestmentsLayoutProps = {
  children:
    ReactNode;
};

export default function InvestmentsLayout({
  children,
}: InvestmentsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}