import type { Metadata } from "next";
import type { ReactNode } from "react";

import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal Center | CASE University",
  description:
    "Privacy, terms, disclosures, security, data rights, and other legal information for CASE University.",
};

const legalLinks = [
  { href: "/legal", label: "Legal Center" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/disclaimer", label: "Disclosures" },
  { href: "/legal/security", label: "Security" },
];

export default function LegalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-default)]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-black text-[var(--primary-foreground)] shadow-[var(--shadow-primary)]">
              CU
            </span>

            <span>
              <span className="block text-sm font-extrabold tracking-tight">
                CASE University
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Legal Center
              </span>
            </span>
          </Link>

          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--text-secondary)]"
          >
            {legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-[var(--primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-default)]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm text-[var(--text-muted)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} CASE University. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="hover:text-[var(--primary)]">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-[var(--primary)]">
              Terms
            </Link>
            <Link href="/legal/disclaimer" className="hover:text-[var(--primary)]">
              Disclosures
            </Link>
            <Link href="/legal/contact" className="hover:text-[var(--primary)]">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
