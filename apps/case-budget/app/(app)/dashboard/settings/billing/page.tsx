import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Crown,
  FileBarChart,
  Landmark,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import SubscriptionLifecycleActions from "@/components/subscriptions/SubscriptionLifecycleActions";
import SubscriptionPlanAction from "@/components/subscriptions/SubscriptionPlanAction";

import {
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  CASE_BUDGET_PLAN_ENTITLEMENTS,
  getCaseBudgetPlanEntitlements,
  type CaseBudgetBillingInterval,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import type {
  CaseBudgetSubscriptionStatus,
} from "@/types/subscription";

type BillingPageProps = {
  searchParams:
    Promise<{
      interval?:
        string;
    }>;
};

type PaidCaseBudgetPlan =
  Exclude<
    CaseBudgetPlan,
    "free"
  >;

type SubscriptionRow = {
  id:
    string;

  user_id:
    string;

  workspace_id:
    string | null;

  plan:
    string;

  billing_provider:
    string;

  billing_interval:
    string | null;

  status:
    string;

  provider_customer_id:
    string | null;

  provider_subscription_id:
    string | null;

  provider_price_id:
    string | null;

  provider_product_id:
    string | null;

  current_period_start:
    string | null;

  current_period_end:
    string | null;

  cancel_at_period_end:
    boolean;

  canceled_at:
    string | null;

  trial_start:
    string | null;

  trial_end:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type BillingSubscription = {
  id:
    string;

  workspaceId:
    string | null;

  plan:
    PaidCaseBudgetPlan;

  billingInterval:
    CaseBudgetBillingInterval | null;

  status:
    CaseBudgetSubscriptionStatus;

  providerCustomerId:
    string | null;

  providerSubscriptionId:
    string | null;

  providerPriceId:
    string | null;

  providerProductId:
    string | null;

  currentPeriodStart:
    string | null;

  currentPeriodEnd:
    string | null;

  cancelAtPeriodEnd:
    boolean;

  canceledAt:
    string | null;

  trialStart:
    string | null;

  trialEnd:
    string | null;
};

type PlanCardFeature = {
  label:
    string;

  icon:
    typeof Check;
};

const MANAGED_SUBSCRIPTION_STATUSES:
  CaseBudgetSubscriptionStatus[] =
  [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ];

export default async function BillingPage({
  searchParams,
}: BillingPageProps) {
  const auth =
    await requireCaseBudgetServerAuth();

  const params =
    await searchParams;

  const selectedInterval =
    parseBillingInterval(
      params.interval,
    ) ??
    "monthly";

  const subscription =
    await loadCurrentSubscription(
      auth.userId,
    );

  const currentPlan:
    CaseBudgetPlan =
    subscription
      ?.plan ??
    "free";

  const currentInterval =
    subscription
      ?.billingInterval ??
    null;

  const currentStatus =
    subscription
      ?.status ??
    null;

  const hasManagedSubscription =
    Boolean(
      subscription &&
      MANAGED_SUBSCRIPTION_STATUSES.includes(
        subscription.status,
      ) &&
      subscription.providerSubscriptionId,
    );

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <BillingHeader
        currentPlan={
          currentPlan
        }
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <CurrentSubscriptionCard
            subscription={
              subscription
            }
          />

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6 sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
                    Plans
                  </p>

                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    Choose the plan
                    that fits your
                    financial journey
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Start with manual
                    budgeting, unlock
                    complete financial
                    management with
                    Plus, or add bank
                    connections and AI
                    Coach with Pro.
                  </p>
                </div>

                <BillingIntervalToggle
                  selectedInterval={
                    selectedInterval
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-3">
              <FreePlanCard
                currentPlan={
                  currentPlan
                }
              />

              <PaidPlanCard
                plan="plus"
                interval={
                  selectedInterval
                }
                currentPlan={
                  currentPlan
                }
                currentInterval={
                  currentInterval
                }
                currentStatus={
                  currentStatus
                }
                hasManagedSubscription={
                  hasManagedSubscription
                }
              />

              <PaidPlanCard
                plan="pro"
                interval={
                  selectedInterval
                }
                currentPlan={
                  currentPlan
                }
                currentInterval={
                  currentInterval
                }
                currentStatus={
                  currentStatus
                }
                hasManagedSubscription={
                  hasManagedSubscription
                }
              />
            </div>
          </section>

          <PlanComparison />
        </div>

        <aside className="space-y-5">
          <BillingSummaryCard
            subscription={
              subscription
            }
            currentPlan={
              currentPlan
            }
          />

          {subscription &&
          hasManagedSubscription &&
          subscription
            .providerSubscriptionId ? (
            <SubscriptionManagementCard
              subscription={
                subscription
              }
            />
          ) : null}

          <SecureBillingCard />
        </aside>
      </div>
    </main>
  );
}

function BillingHeader({
  currentPlan,
}: {
  currentPlan:
    CaseBudgetPlan;
}) {
  const plan =
    getCaseBudgetPlanEntitlements(
      currentPlan,
    );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <CreditCard className="h-7 w-7" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
                Billing &
                subscription
              </p>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {plan.name}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Manage your CASE
              Budget plan
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Review your current
              subscription, compare
              plans, and manage how
              CASE Budget supports
              your finances.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Back to settings

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function CurrentSubscriptionCard({
  subscription,
}: {
  subscription:
    BillingSubscription | null;
}) {
  if (
    !subscription
  ) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <WalletCards className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Current plan
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                CASE Budget Free
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Manual monthly
                budgeting is enabled.
                Upgrade whenever you
                need more financial
                tools.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
            <CheckCircle2 className="h-4 w-4" />

            Free
          </span>
        </div>
      </section>
    );
  }

  const entitlements =
    getCaseBudgetPlanEntitlements(
      subscription.plan,
    );

  return (
    <section className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-violet-50 via-white to-white p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              {subscription.plan ===
              "pro" ? (
                <Crown className="h-6 w-6" />
              ) : (
                <BadgeCheck className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-600">
                  Current subscription
                </p>

                <SubscriptionStatusBadge
                  status={
                    subscription.status
                  }
                />
              </div>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                CASE Budget{" "}
                {
                  entitlements.name
                }
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {subscription.billingInterval ===
                "annual"
                  ? "Annual billing"
                  : "Monthly billing"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[390px]">
            <SubscriptionDetail
              label={
                subscription
                  .cancelAtPeriodEnd
                  ? "Access ends"
                  : "Next renewal"
              }
              value={
                formatDate(
                  subscription.currentPeriodEnd,
                ) ??
                "Not available"
              }
              icon={
                CalendarDays
              }
            />

            <SubscriptionDetail
              label="Billing status"
              value={
                formatSubscriptionStatus(
                  subscription.status,
                )
              }
              icon={
                ReceiptText
              }
            />
          </div>
        </div>

        {subscription.cancelAtPeriodEnd ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              Cancellation scheduled
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Your paid features
              remain available until
              the end of the current
              billing period.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PaidPlanCard({
  plan,
  interval,
  currentPlan,
  currentInterval,
  currentStatus,
  hasManagedSubscription,
}: {
  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;

  currentPlan:
    CaseBudgetPlan;

  currentInterval:
    CaseBudgetBillingInterval | null;

  currentStatus:
    CaseBudgetSubscriptionStatus | null;

  hasManagedSubscription:
    boolean;
}) {
  const entitlements =
    CASE_BUDGET_PLAN_ENTITLEMENTS[
      plan
    ];

  const price =
    entitlements
      .pricing[
        interval
      ];

  const annualSavings =
    interval ===
    "annual"
      ? Math.max(
          0,
          entitlements
            .pricing
            .monthly *
            12 -
            entitlements
              .pricing
              .annual,
        )
      : 0;

  const features =
    getPlanFeatures(
      plan,
    );

  const isPro =
    plan ===
    "pro";

  return (
    <article
      className={[
        "relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white",
        isPro
          ? "border-violet-300 shadow-[0_16px_45px_rgba(124,58,237,0.12)]"
          : "border-slate-200",
      ].join(
        " ",
      )}
    >
      {isPro ? (
        <div className="bg-violet-600 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-white">
          Best experience
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">
                CASE Budget{" "}
                {
                  entitlements.name
                }
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {
                  entitlements.description
                }
              </p>
            </div>

            <div
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                isPro
                  ? "bg-violet-100 text-violet-700"
                  : "bg-emerald-50 text-emerald-700",
              ].join(
                " ",
              )}
            >
              {isPro ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <BadgeCheck className="h-5 w-5" />
              )}
            </div>
          </div>

          <div className="mt-6">
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
              <div className="mt-2">
                <p className="text-sm font-semibold text-slate-600">
                  About{" "}
                  {formatCurrency(
                    price /
                      12,
                  )}{" "}
                  per month
                </p>

                {annualSavings >
                0 ? (
                  <p className="mt-1 text-sm font-bold text-emerald-700">
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
                Billed monthly
              </p>
            )}
          </div>
        </div>

        <ul className="mt-6 flex-1 space-y-3">
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
                    {
                      feature.label
                    }
                  </span>
                </li>
              );
            },
          )}
        </ul>

        <div className="mt-7">
          <SubscriptionPlanAction
            targetPlan={
              plan
            }
            targetInterval={
              interval
            }
            currentPlan={
              currentPlan
            }
            currentInterval={
              currentInterval
            }
            currentStatus={
              currentStatus
            }
            hasManagedSubscription={
              hasManagedSubscription
            }
          />
        </div>
      </div>
    </article>
  );
}

function FreePlanCard({
  currentPlan,
}: {
  currentPlan:
    CaseBudgetPlan;
}) {
  const isCurrent =
    currentPlan ===
    "free";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex flex-1 flex-col p-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">
                CASE Budget Free
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Simple manual
                monthly budgeting.
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <WalletCards className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tracking-tight text-slate-950">
                $0
              </span>

              <span className="pb-1 text-sm font-semibold text-slate-500">
                /month
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              No payment required
            </p>
          </div>
        </div>

        <ul className="mt-6 flex-1 space-y-3">
          <PlanFeature
            label="Manual monthly budgeting"
          />

          <PlanFeature
            label="Zero-based budget planning"
          />

          <PlanFeature
            label="Manual income planning"
          />

          <PlanFeature
            label="Reusable budget groups and items"
          />
        </ul>

        <div className="mt-7">
          {isCurrent ? (
            <div className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-700">
              <Check className="h-4 w-4" />

              Current plan
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-800">
                Want to return to
                Free?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Subscription
                cancellation will be
                managed separately so
                paid access can remain
                available through the
                end of the billing
                period.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function BillingIntervalToggle({
  selectedInterval,
}: {
  selectedInterval:
    CaseBudgetBillingInterval;
}) {
  return (
    <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 p-1">
      <Link
        href="/dashboard/settings/billing?interval=monthly"
        className={[
          "rounded-full px-4 py-2 text-sm font-bold transition",
          selectedInterval ===
          "monthly"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-900",
        ].join(
          " ",
        )}
      >
        Monthly
      </Link>

      <Link
        href="/dashboard/settings/billing?interval=annual"
        className={[
          "rounded-full px-4 py-2 text-sm font-bold transition",
          selectedInterval ===
          "annual"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-900",
        ].join(
          " ",
        )}
      >
        Annual
      </Link>
    </div>
  );
}

function BillingSummaryCard({
  subscription,
  currentPlan,
}: {
  subscription:
    BillingSubscription | null;

  currentPlan:
    CaseBudgetPlan;
}) {
  const entitlements =
    getCaseBudgetPlanEntitlements(
      currentPlan,
    );

  const price =
    subscription
      ?.billingInterval
      ? entitlements
          .pricing[
            subscription.billingInterval
          ]
      : 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <CircleDollarSign className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">
            Billing summary
          </p>

          <p className="text-xs text-slate-500">
            Current subscription
            details
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <SummaryRow
          label="Plan"
          value={
            `CASE Budget ${entitlements.name}`
          }
        />

        <SummaryRow
          label="Price"
          value={
            subscription
              ?.billingInterval
              ? `${formatCurrency(
                  price,
                )} / ${
                  subscription.billingInterval ===
                  "annual"
                    ? "year"
                    : "month"
                }`
              : "$0.00"
          }
        />

        <SummaryRow
          label="Status"
          value={
            subscription
              ? formatSubscriptionStatus(
                  subscription.status,
                )
              : "Free"
          }
        />

        <SummaryRow
          label={
            subscription
              ?.cancelAtPeriodEnd
              ? "Access ends"
              : "Renewal"
          }
          value={
            formatDate(
              subscription
                ?.currentPeriodEnd ??
                null,
            ) ??
            "—"
          }
        />
      </div>

      {subscription
        ?.providerSubscriptionId ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            Stripe subscription
          </p>

          <p className="mt-1 break-all font-mono text-xs text-slate-500">
            {
              subscription
                .providerSubscriptionId
            }
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SubscriptionManagementCard({
  subscription,
}: {
  subscription:
    BillingSubscription;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <ReceiptText className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">
            Manage subscription
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Control whether your
            current CASE Budget
            subscription renews at
            the end of this billing
            period.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <SubscriptionLifecycleActions
          cancelAtPeriodEnd={
            subscription
              .cancelAtPeriodEnd
          }
          currentPeriodEnd={
            subscription
              .currentPeriodEnd
          }
        />
      </div>
    </section>
  );
}

function SecureBillingCard() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
          <LockKeyhole className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">
            Secure billing
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Payments are securely
            processed by Stripe.
            CASE Budget does not
            store your raw card
            details.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <SecurityRow
          icon={
            ShieldCheck
          }
          text="Secure Stripe payment processing"
        />

        <SecurityRow
          icon={
            ReceiptText
          }
          text="Subscription lifecycle synchronized automatically"
        />

        <SecurityRow
          icon={
            CreditCard
          }
          text="One paid subscription per member"
        />
      </div>
    </section>
  );
}

function PlanComparison() {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
          Compare access
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          What each plan unlocks
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.08em] text-slate-400">
                Feature
              </th>

              <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                Free
              </th>

              <th className="px-5 py-4 text-center text-sm font-black text-slate-900">
                Plus
              </th>

              <th className="px-5 py-4 text-center text-sm font-black text-violet-700">
                Pro
              </th>
            </tr>
          </thead>

          <tbody>
            <ComparisonRow
              label="Monthly budget"
              free
              plus
              pro
            />

            <ComparisonRow
              label="Transactions"
              plus
              pro
            />

            <ComparisonRow
              label="Bills and calendar"
              plus
              pro
            />

            <ComparisonRow
              label="Savings goals"
              plus
              pro
            />

            <ComparisonRow
              label="Debt payoff"
              plus
              pro
            />

            <ComparisonRow
              label="Reports"
              plus
              pro
            />

            <ComparisonRow
              label="Manual accounts"
              plus
              pro
            />

            <ComparisonRow
              label="Net worth"
              plus
              pro
            />

            <ComparisonRow
              label="Investments"
              plus
              pro
            />

            <ComparisonRow
              label="Bank connections"
              pro
            />

            <ComparisonRow
              label="AI Coach"
              pro
            />

            <ComparisonRow
              label="Premium insights"
              pro
            />

            <ComparisonRow
              label="Premium automation"
              pro
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComparisonRow({
  label,
  free =
    false,
  plus =
    false,
  pro =
    false,
}: {
  label:
    string;

  free?:
    boolean;

  plus?:
    boolean;

  pro?:
    boolean;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
        {label}
      </td>

      <ComparisonCell
        enabled={
          free
        }
      />

      <ComparisonCell
        enabled={
          plus
        }
      />

      <ComparisonCell
        enabled={
          pro
        }
      />
    </tr>
  );
}

function ComparisonCell({
  enabled,
}: {
  enabled:
    boolean;
}) {
  return (
    <td className="px-5 py-4 text-center">
      {enabled ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="h-4 w-4" />
        </span>
      ) : (
        <span className="text-slate-300">
          —
        </span>
      )}
    </td>
  );
}

function PlanFeature({
  label,
}: {
  label:
    string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Check className="h-3.5 w-3.5" />
      </span>

      <span className="text-sm font-medium leading-6 text-slate-700">
        {label}
      </span>
    </li>
  );
}

function SubscriptionStatusBadge({
  status,
}: {
  status:
    CaseBudgetSubscriptionStatus;
}) {
  const styles =
    getStatusStyles(
      status,
    );

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        styles,
      ].join(
        " ",
      )}
    >
      {formatSubscriptionStatus(
        status,
      )}
    </span>
  );
}

function SubscriptionDetail({
  label,
  value,
  icon: Icon,
}: {
  label:
    string;

  value:
    string;

  icon:
    typeof CalendarDays;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-bold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function SecurityRow({
  icon: Icon,
  text,
}: {
  icon:
    typeof ShieldCheck;

  text:
    string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <Icon className="h-4 w-4 shrink-0 text-emerald-600" />

      <span>
        {text}
      </span>
    </div>
  );
}

function getPlanFeatures(
  plan:
    PaidCaseBudgetPlan,
): PlanCardFeature[] {
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
          Landmark,
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
          Banknote,
      },
    ];
  }

  return [
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
        "Savings goals and debt payoff",

      icon:
        Check,
    },

    {
      label:
        "Financial reports",

      icon:
        FileBarChart,
    },

    {
      label:
        "Manual accounts, net worth, and investments",

      icon:
        Landmark,
    },
  ];
}

async function loadCurrentSubscription(
  userId:
    string,
): Promise<BillingSubscription | null> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_subscriptions",
      )
      .select(
        `
          id,
          user_id,
          workspace_id,
          plan,
          billing_provider,
          billing_interval,
          status,
          provider_customer_id,
          provider_subscription_id,
          provider_price_id,
          provider_product_id,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          canceled_at,
          trial_start,
          trial_end,
          created_at,
          updated_at
        `,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "billing_provider",
        "stripe",
      )
      .neq(
        "plan",
        "free",
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Billing] Failed to load subscription.",
      {
        userId,

        code:
          error.code,

        message:
          error.message,
      },
    );

    throw new Error(
      "CASE Budget could not load billing information.",
    );
  }

  if (
    !data
  ) {
    return null;
  }

  return mapSubscriptionRow(
    data,
  );
}

function mapSubscriptionRow(
  row:
    SubscriptionRow,
): BillingSubscription {
  const plan =
    parsePaidPlan(
      row.plan,
    );

  if (
    !plan
  ) {
    throw new Error(
      `Unsupported CASE Budget plan "${row.plan}".`,
    );
  }

  const status =
    parseSubscriptionStatus(
      row.status,
    );

  if (
    !status
  ) {
    throw new Error(
      `Unsupported CASE Budget subscription status "${row.status}".`,
    );
  }

  return {
    id:
      row.id,

    workspaceId:
      normalizeOptionalString(
        row.workspace_id,
      ),

    plan,

    billingInterval:
      parseBillingInterval(
        row.billing_interval,
      ),

    status,

    providerCustomerId:
      normalizeOptionalString(
        row.provider_customer_id,
      ),

    providerSubscriptionId:
      normalizeOptionalString(
        row.provider_subscription_id,
      ),

    providerPriceId:
      normalizeOptionalString(
        row.provider_price_id,
      ),

    providerProductId:
      normalizeOptionalString(
        row.provider_product_id,
      ),

    currentPeriodStart:
      normalizeOptionalString(
        row.current_period_start,
      ),

    currentPeriodEnd:
      normalizeOptionalString(
        row.current_period_end,
      ),

    cancelAtPeriodEnd:
      Boolean(
        row.cancel_at_period_end,
      ),

    canceledAt:
      normalizeOptionalString(
        row.canceled_at,
      ),

    trialStart:
      normalizeOptionalString(
        row.trial_start,
      ),

    trialEnd:
      normalizeOptionalString(
        row.trial_end,
      ),
  };
}

function parsePaidPlan(
  value:
    string,
): PaidCaseBudgetPlan | null {
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

function parseBillingInterval(
  value:
    string | null | undefined,
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

function parseSubscriptionStatus(
  value:
    string,
): CaseBudgetSubscriptionStatus | null {
  if (
    value ===
      "active" ||
    value ===
      "trialing" ||
    value ===
      "past_due" ||
    value ===
      "unpaid" ||
    value ===
      "canceled" ||
    value ===
      "incomplete" ||
    value ===
      "incomplete_expired" ||
    value ===
      "paused" ||
    value ===
      "none"
  ) {
    return value;
  }

  return null;
}

function normalizeOptionalString(
  value:
    string | null | undefined,
) {
  const normalized =
    value
      ?.trim();

  return normalized ||
    null;
}

function formatSubscriptionStatus(
  status:
    CaseBudgetSubscriptionStatus,
) {
  switch (
    status
  ) {
    case "active":
      return "Active";

    case "trialing":
      return "Trial";

    case "past_due":
      return "Past due";

    case "unpaid":
      return "Unpaid";

    case "canceled":
      return "Canceled";

    case "incomplete":
      return "Incomplete";

    case "incomplete_expired":
      return "Expired";

    case "paused":
      return "Paused";

    case "none":
    default:
      return "None";
  }
}

function getStatusStyles(
  status:
    CaseBudgetSubscriptionStatus,
) {
  switch (
    status
  ) {
    case "active":
      return "bg-emerald-100 text-emerald-800";

    case "trialing":
      return "bg-blue-100 text-blue-800";

    case "past_due":
    case "incomplete":
      return "bg-amber-100 text-amber-800";

    case "unpaid":
    case "canceled":
    case "incomplete_expired":
      return "bg-rose-100 text-rose-800";

    case "paused":
      return "bg-slate-200 text-slate-700";

    case "none":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    date,
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