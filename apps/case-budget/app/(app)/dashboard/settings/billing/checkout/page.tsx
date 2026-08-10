import Link from "next/link";

import {
  ArrowLeft,
  BadgeCheck,
  Brain,
  Building2,
  CalendarDays,
  Check,
  CreditCard,
  LockKeyhole,
  Sparkles,
  WalletCards,
} from "lucide-react";

import EmbeddedStripeCheckout from "@/components/subscriptions/EmbeddedStripeCheckout";

import {
  getCaseBudgetPlanEntitlements,
  type CaseBudgetBillingInterval,
} from "@/lib/subscriptions/plan-entitlements";

type PaidPlan =
  | "plus"
  | "pro";

type BillingCheckoutPageProps = {
  searchParams:
    Promise<{
      plan?:
        string;

      interval?:
        string;

      workspaceId?:
        string;
    }>;
};

type PlanFeature = {
  label:
    string;

  icon:
    typeof Check;
};

export default async function BillingCheckoutPage({
  searchParams,
}: BillingCheckoutPageProps) {
  const params =
    await searchParams;

  const plan =
    normalizePlan(
      params.plan,
    );

  const interval =
    normalizeInterval(
      params.interval,
    );

  const workspaceId =
    normalizeOptionalText(
      params.workspaceId,
    );

  if (
    !plan ||
    !interval
  ) {
    return (
      <InvalidCheckoutSelection />
    );
  }

  const entitlements =
    getCaseBudgetPlanEntitlements(
      plan,
    );

  const price =
    entitlements
      .pricing[
        interval
      ];

  const monthlyEquivalent =
    interval ===
    "annual"
      ? price /
        12
      : price;

  const annualSavings =
    interval ===
    "annual"
      ? calculateAnnualSavings({
          plan,

          annualPrice:
            price,
        })
      : null;

  const features =
    getPlanFeatures(
      plan,
    );

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="mb-5">
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />

          Back to billing
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
            <LockKeyhole className="h-3.5 w-3.5" />

            Secure checkout
          </span>

          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            {interval ===
            "annual"
              ? "Annual billing"
              : "Monthly billing"}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Upgrade to CASE Budget{" "}
          {entitlements.name}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Complete your
          subscription without
          leaving CASE Budget.
          Your payment information
          is securely handled by
          Stripe.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-5 xl:sticky xl:top-6">
          <PlanSummaryCard
            plan={
              plan
            }
            interval={
              interval
            }
            price={
              price
            }
            monthlyEquivalent={
              monthlyEquivalent
            }
            annualSavings={
              annualSavings
            }
            features={
              features
            }
          />

          <SecurityCard />
        </aside>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-black tracking-tight text-slate-950">
              Payment information
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Enter your payment
              details below to
              activate CASE Budget{" "}
              {entitlements.name}.
            </p>
          </div>

          <EmbeddedStripeCheckout
            plan={
              plan
            }
            interval={
              interval
            }
            workspaceId={
              workspaceId
            }
          />
        </section>
      </div>
    </main>
  );
}

function PlanSummaryCard({
  plan,
  interval,
  price,
  monthlyEquivalent,
  annualSavings,
  features,
}: {
  plan:
    PaidPlan;

  interval:
    CaseBudgetBillingInterval;

  price:
    number;

  monthlyEquivalent:
    number;

  annualSavings:
    number | null;

  features:
    PlanFeature[];
}) {
  const planName =
    plan ===
    "pro"
      ? "CASE Budget Pro"
      : "CASE Budget Plus";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50 via-white to-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
              Selected plan
            </p>

            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
              {planName}
            </h2>
          </div>

          {plan ===
          "pro" ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">
              <Sparkles className="h-3.5 w-3.5" />

              Pro
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
              <BadgeCheck className="h-3.5 w-3.5" />

              Plus
            </span>
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight text-slate-950">
              {formatCurrency(
                price,
              )}
            </span>

            <span className="pb-1 text-sm font-semibold text-slate-500">
              /
              {interval ===
              "annual"
                ? "year"
                : "month"}
            </span>
          </div>

          {interval ===
          "annual" ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-semibold text-slate-600">
                About{" "}
                {formatCurrency(
                  monthlyEquivalent,
                )}{" "}
                per month
              </p>

              {annualSavings !==
              null ? (
                <p className="text-sm font-bold text-emerald-700">
                  Save{" "}
                  {formatCurrency(
                    annualSavings,
                  )}{" "}
                  per year
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Billed monthly. Cancel
              according to your
              subscription terms.
            </p>
          )}
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm font-black text-slate-900">
          Included with this plan
        </p>

        <ul className="mt-4 space-y-3">
          {features.map(
            (
              feature,
            ) => {
              const Icon =
                feature.icon;

              return (
                <li
                  key={
                    feature.label
                  }
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon className="h-3.5 w-3.5" />
                  </span>

                  <span className="text-sm font-medium leading-6 text-slate-700">
                    {feature.label}
                  </span>
                </li>
              );
            },
          )}
        </ul>
      </div>
    </div>
  );
}

function SecurityCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
          <LockKeyhole className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-black text-slate-900">
            Secure payment
            processing
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Payment details are
            collected and processed
            securely by Stripe.
            CASE Budget does not
            store your raw card
            number.
          </p>
        </div>
      </div>
    </div>
  );
}

function InvalidCheckoutSelection() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <CreditCard className="h-6 w-6" />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Choose a subscription
          first
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          CASE Budget needs a
          valid Plus or Pro plan
          and a monthly or annual
          billing interval before
          checkout can begin.
        </p>

        <Link
          href="/dashboard/settings/billing"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
        >
          <ArrowLeft className="h-4 w-4" />

          Return to billing
        </Link>
      </div>
    </main>
  );
}

function getPlanFeatures(
  plan:
    PaidPlan,
): PlanFeature[] {
  if (
    plan ===
    "pro"
  ) {
    return [
      {
        label:
          "Everything in CASE Budget Plus",

        icon:
          BadgeCheck,
      },

      {
        label:
          "Secure bank and account connections",

        icon:
          Building2,
      },

      {
        label:
          "AI Coach with 200 questions each month",

        icon:
          Brain,
      },

      {
        label:
          "Premium financial insights",

        icon:
          Sparkles,
      },

      {
        label:
          "Premium financial automation",

        icon:
          WalletCards,
      },
    ];
  }

  return [
    {
      label:
        "Zero-based monthly budgeting",

      icon:
        Check,
    },

    {
      label:
        "Transaction tracking",

      icon:
        WalletCards,
    },

    {
      label:
        "Bills and payment planning",

      icon:
        CalendarDays,
    },

    {
      label:
        "Savings goals and debt payoff planning",

      icon:
        Check,
    },

    {
      label:
        "Reports, net worth, and investment tracking",

      icon:
        Check,
    },

    {
      label:
        "Manual account tracking",

      icon:
        Check,
    },
  ];
}

function normalizePlan(
  value:
    string | undefined,
): PaidPlan | null {
  if (
    value ===
      "plus" ||
    value ===
      "pro"
  ) {
    return value;
  }

  return null;
}

function normalizeInterval(
  value:
    string | undefined,
): CaseBudgetBillingInterval | null {
  if (
    value ===
      "monthly" ||
    value ===
      "annual"
  ) {
    return value;
  }

  return null;
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value
      ?.trim();

  return (
    normalizedValue ||
    null
  );
}

function calculateAnnualSavings({
  plan,
  annualPrice,
}: {
  plan:
    PaidPlan;

  annualPrice:
    number;
}) {
  const entitlements =
    getCaseBudgetPlanEntitlements(
      plan,
    );

  const fullMonthlyCost =
    entitlements
      .pricing
      .monthly *
    12;

  return Math.max(
    0,
    fullMonthlyCost -
      annualPrice,
  );
}

function formatCurrency(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}