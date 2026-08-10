import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "AI Coach | CASE Budget",
  description:
    "Get personalized financial guidance from the CASE Budget AI Coach, with insights on budgeting, spending, bills, savings, debt, and financial goals.",
};

type AiCoachLayoutProps = {
  children:
    ReactNode;
};

export default function AiCoachLayout({
  children,
}: AiCoachLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}