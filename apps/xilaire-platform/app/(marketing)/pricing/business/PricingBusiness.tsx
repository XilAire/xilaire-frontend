// apps/xilaire-platform/app/(marketing)/pricing/business/page.tsx

import { SERVICE_PAYMENT_LINKS } from "@/lib/servicePaymentLinks";

export default function PricingBusiness() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 space-y-10 text-foreground">
      <header>
        <h1 className="text-3xl font-bold">Business Pricing</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
          Per-user pricing aligned to Microsoft 365 licensing and organizational scale.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">

        {/* CORE */}
        <div className="rounded-2xl border border-border bg-surface text-foreground p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Core
          </h2>
          <p className="mt-2 text-3xl font-bold">
            $49
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              /user/mo
            </span>
          </p>

          <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>• Managed users & access</li>
            <li>• Helpdesk & ticketing</li>
            <li>• Microsoft 365 administration</li>
            <li>• Basic reporting</li>
          </ul>

          <a
            href={SERVICE_PAYMENT_LINKS.business_core}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-secondary px-4 py-2 text-sm font-medium"
          >
            Start Core
          </a>
        </div>

        {/* ADVANCED */}
        <div className="relative rounded-2xl border border-sky-300 bg-sky-50 text-slate-900 dark:border-sky-700 dark:bg-slate-800 dark:text-slate-100 p-6 shadow-md">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-1 text-xs text-white font-semibold">
            Requires Business Premium
          </span>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            Advanced
          </h2>
          <p className="mt-2 text-3xl font-bold">
            $89
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              /user/mo
            </span>
          </p>

          <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <li>• Everything in Core</li>
            <li>• Endpoint security & compliance</li>
            <li>• Automated onboarding</li>
            <li>• Alerting & remediation</li>
          </ul>

          <a
            href={SERVICE_PAYMENT_LINKS.business_advanced}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white"
          >
            Start Advanced
          </a>
        </div>

        {/* ENTERPRISE / CUSTOM */}
        <div className="rounded-2xl border border-border bg-surface text-foreground p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Enterprise
          </h2>
          <p className="mt-2 text-3xl font-bold">Custom</p>

          <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>• Everything in Advanced</li>
            <li>• Custom workflows & runbooks</li>
            <li>• SLA & policy enforcement</li>
            <li>• Executive dashboards</li>
          </ul>

          <a
            href="/contact"
            className="mt-6 inline-flex w-full justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-secondary px-4 py-2 text-sm font-medium"
          >
            Talk to sales
          </a>
        </div>

      </div>
    </section>
  );
}