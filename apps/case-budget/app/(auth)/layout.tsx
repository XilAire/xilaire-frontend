import type {
  Metadata,
} from "next";
import type {
  ReactNode,
} from "react";

export const metadata: Metadata = {
  title: {
    default:
      "Account | CASE Budget",
    template:
      "%s | CASE Budget",
  },
  description:
    "Securely access and manage your CASE Budget account.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {children}
    </div>
  );
}