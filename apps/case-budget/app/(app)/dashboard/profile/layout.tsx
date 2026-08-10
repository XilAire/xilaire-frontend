import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title:
    "Profile | CASE Budget",
  description:
    "Manage your CASE Budget profile, personal information, account details, and preferences.",
};

type ProfileLayoutProps = {
  children:
    ReactNode;
};

export default function ProfileLayout({
  children,
}: ProfileLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}