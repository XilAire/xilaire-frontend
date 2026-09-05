import type { Metadata } from "next";
import Link from "next/link";

import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import PricingClient from "@/components/pricing/PricingClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUniversityBillingState } from "@/lib/university/billing-checkout";
import { getUniversityStripePublishableKey } from "@/lib/university/stripe-server";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare CASE University Free, Plus, and Pro learning plans.",
};

export const dynamic = "force-dynamic";

type PricingPageProps = {
  searchParams: Promise<{
    checkout?: string | string[];
    session_id?: string | string[];
  }>;
};

function single(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

const comparisonRows = [
  ["Public course catalog", true, true, true],
  ["Selected introductory lessons", true, true, true],
  ["Investing Foundations", false, true, true],
  ["Technical Analysis", false, true, true],
  ["Options Trading", false, false, true],
  ["Advanced Options Trading", false, false, true],
  ["Full progress tracking", false, true, true],
  ["Downloadable resources", false, true, true],
  ["Course certificates", false, true, true],
] as const;

export default async function PricingPage({
  searchParams,
}: PricingPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mode = getUniversityStripeMode();
  const publishableKey = getUniversityStripePublishableKey(mode);
  const billingState = user
    ? await getUniversityBillingState(user.id, mode)
    : null;

  const checkoutSessionId =
    single(params.checkout) === "return"
      ? single(params.session_id)
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <MarketingHeader isAuthenticated={Boolean(user)} />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[var(--border-subtle)] py-16 sm:py-20 lg:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--primary-soft),transparent_34%),radial-gradient(circle_at_85%_15%,var(--achievement-soft),transparent_25%)]"
          />
          <div className="relative mx-auto w-full max-w-[1600px] px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
                CASE University Plans
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
                Learn at your level.
                <br />
                <span className="text-[var(--primary)]">
                  Advance when you&apos;re ready.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">
                Start for free, then unlock the curriculum, practice tools,
                resources, and certificates that match your learning path.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface-muted)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <PricingClient
              isAuthenticated={Boolean(user)}
              publishableKey={publishableKey}
              initialBillingState={billingState}
              checkoutSessionId={checkoutSessionId}
            />
            <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-6 text-[var(--text-muted)]">
              Subscriptions renew automatically until canceled. Scheduled plan
              changes take effect at the end of the current paid billing period.
              Educational content is for informational purposes and is not
              personalized investment, tax, or legal advice.
            </p>
          </div>
        </section>

        <section className="border-y border-[var(--border-subtle)] bg-[var(--background)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
                Compare Plans
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
                Find the learning level that fits you.
              </h2>
            </div>

            <div className="mt-10 overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--surface-muted)]">
                      <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)] sm:px-6">
                        Feature
                      </th>
                      {["Free", "Plus", "Pro"].map((name) => (
                        <th
                          key={name}
                          className="px-5 py-4 text-center text-sm font-black text-[var(--text-primary)] sm:px-6"
                        >
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map(
                      ([feature, free, plus, pro], index) => (
                        <tr
                          key={feature}
                          className={
                            index < comparisonRows.length - 1
                              ? "border-b border-[var(--border-subtle)]"
                              : undefined
                          }
                        >
                          <td className="px-5 py-4 text-sm font-semibold text-[var(--text-secondary)] sm:px-6">
                            {feature}
                          </td>
                          {[free, plus, pro].map((included, i) => (
                            <td
                              key={i}
                              className={`px-5 py-4 text-center sm:px-6 ${
                                i === 1 ? "bg-[var(--primary-soft)]" : ""
                              }`}
                            >
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                  included
                                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                }`}
                                aria-label={included ? "Included" : "Not included"}
                              >
                                {included ? "✓" : "−"}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface-muted)] py-16 sm:py-20">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[var(--primary-border)] bg-[var(--surface-default)] p-6 text-center shadow-[var(--shadow-md)] sm:p-8 lg:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
                Not Sure Where To Start?
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Begin with Investing Foundations.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                Build the fundamentals first. You can decide how far you want to
                advance after you understand the market, financial statements,
                and company analysis.
              </p>
              <Link
                href="/courses/investing-foundations"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)]"
              >
                Explore Investing Foundations →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter isAuthenticated={Boolean(user)} />
    </div>
  );
}
