import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Security | CASE Budget",
  description:
    "Manage your CASE Budget account security, multi-factor authentication, identity verification, and other security protections.",
};

type SecurityLayoutProps = {
  children:
    ReactNode;
};

export default function SecurityLayout({
  children,
}: SecurityLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}