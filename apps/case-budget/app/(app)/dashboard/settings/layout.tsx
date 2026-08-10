import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Settings | CASE Budget",
  description:
    "Manage your CASE Budget account, workspace, preferences, notifications, security, and application settings.",
};

type SettingsLayoutProps = {
  children:
    ReactNode;
};

export default function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}