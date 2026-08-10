import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Reports | CASE Budget",
  description:
    "Review your CASE Budget financial reports, spending trends, income, budget performance, cash flow, and progress toward your financial goals.",
};

type ReportsLayoutProps = {
  children:
    ReactNode;
};

export default function ReportsLayout({
  children,
}: ReportsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}