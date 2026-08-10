import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  XCircle,
} from "lucide-react";

import {
  getStripeServer,
} from "@/lib/stripe/stripe-server";

import {
  getCaseBudgetPlanFromStripePriceId,
} from "@/lib/stripe/stripe-prices";

import {
  getCaseBudgetPlanEntitlements,
  type CaseBudgetBillingInterval,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

type PaidCaseBudgetPlan =
  Exclude<
    CaseBudgetPlan,
    "free"
  >;

type CheckoutReturnPageProps = {
  searchParams:
    Promise<{
      session_id?:
        string;

      plan?:
        string;

      interval?:
        string;

      workspaceId?:
        string;
    }>;
};

type CheckoutReturnState =
  | {
      status:
        "complete";

      sessionId:
        string;

      plan:
        PaidCaseBudgetPlan;

      interval:
        CaseBudgetBillingInterval;

      customerEmail:
        string | null;

      subscriptionId:
        string | null;
    }
  | {
      status:
        "processing";

      sessionId:
        string;

      plan:
        PaidCaseBudgetPlan | null;

      interval:
        CaseBudgetBillingInterval | null;
    }
  | {
      status:
        "failed";

      message:
        string;
    };

export default async function BillingCheckoutReturnPage({
  searchParams,
}: CheckoutReturnPageProps) {
  const params =
    await searchParams;

  const sessionId =
    normalizeOptionalText(
      params.session_id,
    );

  if (
    !sessionId
  ) {
    return (
      <CheckoutFailureCard
        message="Stripe did not return a Checkout Session ID."
      />
    );
  }

  const state =
    await resolveCheckoutReturnState(
      sessionId,
    );

  if (
    state.status ===
    "failed"
  ) {
    return (
      <CheckoutFailureCard
        message={
          state.message
        }
      />
    );
  }

  if (
    state.status ===
    "processing"
  ) {
    return (
      <CheckoutProcessingCard
        sessionId={
          state.sessionId
        }
        plan={
          state.plan
        }
        interval={
          state.interval
        }
      />
    );
  }

  return (
    <CheckoutCompleteCard
      state={
        state
      }
    />
  );
}

async function resolveCheckoutReturnState(
  sessionId:
    string,
): Promise<CheckoutReturnState> {
  try {
    const stripe =
      getStripeServer();

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId,
        {
          expand: [
            "line_items.data.price",
          ],
        },
      );

    const priceId =
      getCheckoutSessionPriceId(
        session,
      );

    const mappedPlan =
      priceId
        ? getCaseBudgetPlanFromStripePriceId(
            priceId,
          )
        : null;

    const metadataPlan =
      parsePaidPlan(
        session.metadata
          ?.plan,
      );

    const metadataInterval =
      parseBillingInterval(
        session.metadata
          ?.billing_interval,
      );

    const plan =
      mappedPlan
        ?.plan ??
      metadataPlan;

    const interval =
      mappedPlan
        ?.interval ??
      metadataInterval;

    const isPaid =
      session.payment_status ===
        "paid" ||
      session.payment_status ===
        "no_payment_required";

    const isComplete =
      session.status ===
        "complete";

    if (
      isComplete &&
      isPaid &&
      plan &&
      interval
    ) {
      return {
        status:
          "complete",

        sessionId:
          session.id,

        plan,

        interval,

        customerEmail:
          normalizeOptionalText(
            session.customer_details
              ?.email,
          ) ??
          normalizeOptionalText(
            session.customer_email,
          ),

        subscriptionId:
          getStripeReferenceId(
            session.subscription,
          ),
      };
    }

    if (
      session.status ===
        "open"
    ) {
      return {
        status:
          "processing",

        sessionId:
          session.id,

        plan:
          plan ??
          null,

        interval:
          interval ??
          null,
      };
    }

    if (
      isComplete &&
      !isPaid
    ) {
      return {
        status:
          "processing",

        sessionId:
          session.id,

        plan:
          plan ??
          null,

        interval:
          interval ??
          null,
      };
    }

    return {
      status:
        "failed",

      message:
        "Stripe did not confirm a completed CASE Budget subscription.",
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Stripe Checkout Return] Failed to verify checkout session.",
      error,
    );

    return {
      status:
        "failed",

      message:
        "CASE Budget could not verify the Stripe checkout session.",
    };
  }
}

function CheckoutCompleteCard({
  state,
}: {
  state:
    Extract<
      CheckoutReturnState,
      {
        status:
          "complete";
      }
    >;
}) {
  const entitlements =
    getCaseBudgetPlanEntitlements(
      state.plan,
    );

  const price =
    entitlements
      .pricing[
        state.interval
      ];

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Welcome to CASE Budget{" "}
            {entitlements.name}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Stripe confirmed your
            checkout successfully.
            Your subscription is now
            being synchronized with
            CASE Budget.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryItem
              label="Plan"
              value={`CASE Budget ${entitlements.name}`}
            />

            <SummaryItem
              label="Billing"
              value={
                state.interval ===
                "annual"
                  ? `${formatCurrency(price)} / year`
                  : `${formatCurrency(price)} / month`
              }
            />

            <SummaryItem
              label="Payment status"
              value="Confirmed"
            />

            <SummaryItem
              label="Stripe session"
              value={
                truncateIdentifier(
                  state.sessionId,
                )
              }
            />
          </div>

          {state.customerEmail ? (
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Stripe associated this
              checkout with{" "}
              <span className="font-semibold text-slate-700">
                {
                  state.customerEmail
                }
              </span>
              .
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <p className="text-sm font-bold text-violet-950">
              Subscription activation
            </p>

            <p className="mt-1 text-sm leading-6 text-violet-800">
              The Stripe webhook will
              update your CASE Budget
              subscription record and
              unlock the features
              included with your plan.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Continue to dashboard

              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard/settings/billing"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              View billing
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function CheckoutProcessingCard({
  sessionId,
  plan,
  interval,
}: {
  sessionId:
    string;

  plan:
    PaidCaseBudgetPlan | null;

  interval:
    CaseBudgetBillingInterval | null;
}) {
  const planName =
    plan
      ? getCaseBudgetPlanEntitlements(
          plan,
        ).name
      : null;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Your subscription is processing
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Stripe has not yet reported a
          fully completed payment state.
          CASE Budget will wait for the
          confirmed checkout and webhook
          before enabling paid features.
        </p>

        {planName ? (
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Selected: CASE Budget{" "}
            {planName}
            {interval
              ? ` · ${
                  interval ===
                  "annual"
                    ? "Annual"
                    : "Monthly"
                }`
              : ""}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-slate-400">
          Session:{" "}
          {truncateIdentifier(
            sessionId,
          )}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            <Clock3 className="h-4 w-4" />

            Check billing status
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function CheckoutFailureCard({
  message,
}: {
  message:
    string;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <XCircle className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          We could not verify checkout
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          {message}
        </p>

        <div className="mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <p className="text-sm leading-6 text-amber-800">
            Do not retry a payment if you
            believe Stripe already charged
            you. Check Billing first so a
            duplicate subscription is not
            created.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            <CreditCard className="h-4 w-4" />

            View billing
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function getCheckoutSessionPriceId(
  session:
    Awaited<
      ReturnType<
        ReturnType<
          typeof getStripeServer
        >["checkout"]["sessions"]["retrieve"]
      >
    >,
) {
  const lineItems =
    session.line_items
      ?.data;

  if (
    !lineItems ||
    lineItems.length ===
      0
  ) {
    return null;
  }

  const price =
    lineItems[0]
      ?.price;

  if (
    !price
  ) {
    return null;
  }

  if (
    typeof price ===
    "string"
  ) {
    return price;
  }

  return normalizeOptionalText(
    price.id,
  );
}

function getStripeReferenceId(
  value:
    string |
    {
      id:
        string;
    } |
    null,
) {
  if (
    !value
  ) {
    return null;
  }

  if (
    typeof value ===
    "string"
  ) {
    return normalizeOptionalText(
      value,
    );
  }

  return normalizeOptionalText(
    value.id,
  );
}

function parsePaidPlan(
  value:
    string | null | undefined,
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

function normalizeOptionalText(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value
      ?.trim();

  return (
    normalizedValue ||
    null
  );
}

function truncateIdentifier(
  value:
    string,
) {
  const normalizedValue =
    value.trim();

  if (
    normalizedValue.length <=
    22
  ) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(
    0,
    12,
  )}…${normalizedValue.slice(
    -7,
  )}`;
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