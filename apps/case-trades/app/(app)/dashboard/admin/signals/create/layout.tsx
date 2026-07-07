import type { Metadata } from "next";
import type { ReactNode } from "react";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Create Signal | CASE Trades",
  description:
    "Create and publish new trading signals for organizations, define trade parameters, assign strategies, configure execution details, and manage signal workflows within CASE Trades.",
};

export default function CreateSignalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}