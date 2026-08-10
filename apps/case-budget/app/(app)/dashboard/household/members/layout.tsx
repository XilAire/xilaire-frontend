import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Household Members | CASE Budget",
  description:
    "Manage your CASE Budget household members, access, roles, and shared financial planning for your household.",
};

type HouseholdMembersLayoutProps = {
  children:
    ReactNode;
};

export default function HouseholdMembersLayout({
  children,
}: HouseholdMembersLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}