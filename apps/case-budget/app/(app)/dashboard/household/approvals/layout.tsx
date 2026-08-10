import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Household Approvals | CASE Budget",
  description:
    "Review and manage CASE Budget household approvals, including pending financial actions, member requests, and shared household decisions.",
};

type HouseholdApprovalsLayoutProps = {
  children:
    ReactNode;
};

export default function HouseholdApprovalsLayout({
  children,
}: HouseholdApprovalsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}