import type { Metadata } from "next";

import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal Center | CASE University",
  description:
    "Review CASE University privacy, terms, disclosures, security practices, data rights, and company information.",
};

const sections = [
  {
    title: "Privacy & Data",
    description:
      "How CASE University handles information, cookies, security, and data-rights requests.",
    documents: [
      {
        href: "/legal/privacy",
        title: "Privacy Policy",
        description: "How information is collected, used, shared, and protected.",
      },
      {
        href: "/legal/cookies",
        title: "Cookie Policy",
        description: "How cookies and similar technologies may be used.",
      },
      {
        href: "/legal/security",
        title: "Security",
        description: "Our approach to protecting accounts and platform data.",
      },
      {
        href: "/legal/data-deletion",
        title: "Data Deletion",
        description: "How to request deletion of eligible account information.",
      },
    ],
  },
  {
    title: "Terms & Policies",
    description:
      "Rules governing access to CASE University and acceptable use of the learning platform.",
    documents: [
      {
        href: "/legal/terms",
        title: "Terms of Service",
        description: "The agreement governing your use of CASE University.",
      },
      {
        href: "/legal/acceptable-use",
        title: "Acceptable Use Policy",
        description: "Activities that are permitted and prohibited on the platform.",
      },
      {
        href: "/legal/disclaimer",
        title: "Educational & Investment Disclaimer",
        description:
          "Important disclosures about education, investing, trading, and financial risk.",
      },
    ],
  },
  {
    title: "Company & Disclosures",
    description:
      "Information about third-party materials, intellectual property, and contacting us.",
    documents: [
      {
        href: "/legal/licenses",
        title: "Licenses & Attributions",
        description: "Third-party software, content, trademarks, and attribution information.",
      },
      {
        href: "/legal/contact",
        title: "Legal Contact",
        description: "How to contact CASE University about legal or privacy matters.",
      },
    ],
  },
];

export default function LegalCenterPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
          Trust & Transparency
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          CASE University Legal Center
        </h1>

        <p className="mt-5 text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
          Find the policies, disclosures, privacy information, and data-rights
          resources that govern CASE University.
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-5">
              <h2 className="text-xl font-extrabold">{section.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                {section.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {section.documents.map((document) => (
                <Link
                  key={document.href}
                  href={document.href}
                  className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)] transition hover:border-[var(--primary)] hover:shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold group-hover:text-[var(--primary)]">
                        {document.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        {document.description}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-lg font-bold text-[var(--primary)]"
                    >
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 text-sm leading-6 text-[var(--text-secondary)]">
        CASE University is an educational platform. Nothing on the platform
        constitutes personalized investment, financial, legal, accounting, or
        tax advice. Review the Educational & Investment Disclaimer before
        relying on any educational material.
      </div>
    </div>
  );
}
