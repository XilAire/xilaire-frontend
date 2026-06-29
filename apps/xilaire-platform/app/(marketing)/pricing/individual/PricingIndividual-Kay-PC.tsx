import Link from "next/link";

export default function PricingIndividual() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Individual Pricing</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Professional IT support for individuals, freelancers, and households.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">

        {/* CORE */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Core
          </h2>
          <p className="mt-2 text-3xl font-bold">
            $29<span className="text-base font-normal text-slate-500">/user/mo</span>
          </p>

          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>• Microsoft 365 setup & support</li>
            <li>• Device monitoring</li>
            <li>• Backup & recovery guidance</li>
            <li>• Usage & health reporting</li>
          </ul>

          <Link
            href="/auth/signup"
            className="mt-6 inline-flex w-full justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            Start Core
          </Link>
        </div>

        {/* ADVANCED */}
        <div className="relative rounded-2xl border border-sky-300 bg-sky-50 p-6 shadow-md">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-3 py-1 text-xs text-white font-semibold">
            Requires Business Premium
          </span>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
            Advanced
          </h2>
          <p className="mt-2 text-3xl font-bold">
            $59<span className="text-base font-normal text-slate-500">/user/mo</span>
          </p>

          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>• Everything in Core</li>
            <li>• Identity & account security</li>
            <li>• Automated device onboarding</li>
            <li>• Security alerts & remediation</li>
          </ul>

          <Link
            href="/auth/signup"
            className="mt-6 inline-flex w-full justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white"
          >
            Start Advanced
          </Link>
        </div>

      </div>
    </section>
  );
}
