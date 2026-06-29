import type { Metadata } from "next";
import Link from "next/link";

import EnrollmentTokenPanel from "./EnrollmentTokenPanel";

export const metadata: Metadata = {
  title: "Agent Onboarding | XilAire Platform",
  description:
    "Securely onboard new devices and generate enrollment tokens for XilAire agents.",
};

export default function AgentOnboardingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            Agent onboarding
          </h1>
          <p className="text-sm text-slate-400">
            Generate enrollment tokens and onboard new endpoints into your
            XilAire monitoring environment.
          </p>
        </div>

        <Link
          href="/endpoints"
          className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Back to endpoints
        </Link>
      </header>

      {/* Enrollment Tokens */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-200">
            Enrollment tokens
          </h2>
          <p className="text-sm text-slate-400">
            Use enrollment tokens to securely register new devices. Tokens are
            scoped to your organization, time-limited, and auditable.
          </p>
        </div>

        <EnrollmentTokenPanel />
      </section>
    </div>
  );
}
