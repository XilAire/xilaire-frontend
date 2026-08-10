import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Bills | CASE Budget",
  description:
    "Track and manage your CASE Budget bills, due dates, payment status, recurring payments, and upcoming expenses.",
};

type BillsLayoutProps = {
  children:
    ReactNode;
};

export default function BillsLayout({
  children,
}: BillsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}