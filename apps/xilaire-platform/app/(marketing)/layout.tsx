import type { ReactNode } from "react";
import MarketingLayoutClient from "./MarketingLayoutClient";

export const metadata = {
  title: "XilAire Technologies",
  description: "Cloud, Managed IT, Cybersecurity, and AI automation.",
};

export default function MarketingRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  /**
   * ⚠ IMPORTANT
   * - Do NOT add <html> or <body> here.
   * - Root layout already controls the global document structure.
   * - Adding them here breaks hydration + theme persistence.
   */
  return (
    <>
      <MarketingLayoutClient>{children}</MarketingLayoutClient>
    </>
  );
}
