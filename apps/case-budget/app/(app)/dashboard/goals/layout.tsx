import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Goals | CASE Budget",
  description:
    "Create, track, and manage your CASE Budget savings goals, contributions, target amounts, and progress toward your financial priorities.",
};

type GoalsLayoutProps = {
  children:
    ReactNode;
};

export default function GoalsLayout({
  children,
}: GoalsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}