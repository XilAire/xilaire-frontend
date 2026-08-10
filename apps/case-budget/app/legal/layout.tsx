import type {
  ReactNode,
} from "react";

export type LegalLayoutProps = {
  children: ReactNode;
};

export default function LegalLayout({
  children,
}: LegalLayoutProps) {
  return children;
}