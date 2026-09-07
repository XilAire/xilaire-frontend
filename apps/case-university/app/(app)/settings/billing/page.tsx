import Link from "next/link";
import { redirect } from "next/navigation";

import PricingClient from "@/components/pricing/PricingClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUniversityBillingState,
  type UniversityPlanKey,
} from "@/lib/university/billing-checkout";
import { getUniversityStripePublishableKey } from "@/lib/university/stripe-server";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BillingPageProps = {
  searchParams: Promise<{
    plan?: string | string[];
  }>;
};

const paidPlanLabels: Record<UniversityPlanKey, string> = {
  university_plus_monthly: "Plus Monthly",
  university_plus_annual: "Plus Annual",
  university_pro_monthly: "Pro Monthly",
  university_pro_annual: "Pro Annual",
};

function single(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function normalizePlan(value: string | null): UniversityPlanKey | null {
  if (!value) return null;

  return Object.prototype.hasOwnProperty.call(paidPlanLabels, value)
    ? (value as UniversityPlanKey)
    : null;
}

export default async function BillingPage({
  searchParams,
}: BillingPageProps) {
  const params = await searchParams;
  const requestedPlan = normalizePlan(single(params.plan));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectTarget = requestedPlan
      ? `/settings/billing?plan=${encodeURIComponent(requestedPlan)}`
      : "/settings/billing";

    redirect(
      `/auth/signin?redirect=${encodeURIComponent(redirectTarget)}`,
    );
  }

  const mode = getUniversityStripeMode();
  const publishableKey = getUniversityStripePublishableKey(mode);
  const billingState = await getUniversityBillingState(user.id, mode);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
          Account
        </p>

        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Plans & Billing
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Review your current CASE University membership, change an eligible
              paid plan, schedule a billing change, undo a pending change, or
              cancel to Free.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            >
              Account Settings
            </Link>

            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary-foreground)] transition hover:opacity-90"
            >
              View Public Pricing
            </Link>
          </div>
        </div>

        {requestedPlan ? (
          <div className="mt-6 rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4 text-sm text-[var(--text-primary)]">
            You selected{" "}
            <span className="font-black">
              {paidPlanLabels[requestedPlan]}
            </span>
            . Review the available membership actions below.
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <PricingClient
          isAuthenticated
          publishableKey={publishableKey}
          initialBillingState={billingState}
          checkoutSessionId={null}
        />
      </section>
    </main>
  );
}