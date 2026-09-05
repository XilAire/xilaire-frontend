import type { ReactNode } from "react";

import Link from "next/link";

export const LEGAL_LAST_UPDATED = "August 30, 2026";

export function LegalDocument({
  eyebrow = "CASE University Legal",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8">
        <Link
          href="/legal"
          className="text-sm font-bold text-[var(--primary)] hover:underline"
        >
          ← Legal Center
        </Link>

        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
          {eyebrow}
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
          {description}
        </p>

        <p className="mt-4 text-sm font-semibold text-[var(--text-muted)]">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
      </div>

      <article className="space-y-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-sm)] sm:p-8">
        {children}
      </article>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
        {children}
      </div>
    </section>
  );
}

export function LegalList({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {children}
    </ul>
  );
}

export function LegalNotice({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 font-medium text-[var(--text-secondary)]">
      {children}
    </div>
  );
}
