import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Pay Cycles | CASE Budget",
  description:
    "Manage your CASE Budget pay cycles, expected income, paycheck schedules, and bill-planning projections.",
};

type PayCyclesLayoutProps = {
  children:
    ReactNode;
};

export default function PayCyclesLayout({
  children,
}: PayCyclesLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}