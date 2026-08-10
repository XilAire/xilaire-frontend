import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Household Activity | CASE Budget",
  description:
    "Review your CASE Budget household activity, including member actions, shared financial updates, and changes across your household workspace.",
};

type HouseholdActivityLayoutProps = {
  children:
    ReactNode;
};

export default function HouseholdActivityLayout({
  children,
}: HouseholdActivityLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}