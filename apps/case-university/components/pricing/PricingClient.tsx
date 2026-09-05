"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import type {
  UniversityBillingState,
  UniversityPlanKey,
} from "@/lib/university/billing-checkout";

type BillingCadence = "monthly" | "annual";
type PaidTier = "plus" | "pro";
type ManagementAction =
  | "checkout"
  | "change-plan"
  | "schedule-change"
  | "undo-scheduled-change"
  | "cancel"
  | "undo-cancel";

type PricingClientProps = {
  isAuthenticated: boolean;
  publishableKey: string;
  initialBillingState: UniversityBillingState | null;
  checkoutSessionId: string | null;
};

const planCopy = {
  plus: {
    name: "Plus",
    eyebrow: "Build Your Skills",
    description:
      "Unlock the core CASE University curriculum and progress from investing fundamentals into technical analysis.",
    monthly: "$14.99",
    annual: "$149.99",
    features: [
      "Everything included in Free",
      "Complete Investing Foundations course",
      "Complete Technical Analysis course",
      "Interactive practice and weak-area training",
      "Downloadable worksheets and course resources",
      "Full learning progress tracking",
      "Course completion certificates",
    ],
  },
  pro: {
    name: "Pro",
    eyebrow: "Complete The Path",
    description:
      "Access the complete CASE University learning path, including options and advanced options education.",
    monthly: "$29.99",
    annual: "$299.99",
    features: [
      "Everything included in CASE University Plus",
      "Complete Options Trading course",
      "Complete Advanced Options Trading course",
      "Advanced options, scalping, swing, and LEAPS education",
      "Earnings and advanced trade-management education",
      "Advanced practice, worksheets, and course certificates",
    ],
  },
} as const;

const paidPlanLabels: Record<UniversityPlanKey, string> = {
  university_plus_monthly: "Plus Monthly",
  university_plus_annual: "Plus Annual",
  university_pro_monthly: "Pro Monthly",
  university_pro_annual: "Pro Annual",
};

function planKeyFor(
  tier: PaidTier,
  cadence: BillingCadence,
): UniversityPlanKey {
  return `university_${tier}_${cadence === "monthly" ? "monthly" : "annual"}` as UniversityPlanKey;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "the end of your current billing period";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "the end of your current billing period";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isImmediateUpgrade(
  currentPlanKey: UniversityPlanKey | null,
  targetPlanKey: UniversityPlanKey,
): boolean {
  return (
    currentPlanKey === "university_plus_monthly" &&
    targetPlanKey === "university_pro_monthly"
  );
}

function isScheduledTransition(
  currentPlanKey: UniversityPlanKey | null,
  targetPlanKey: UniversityPlanKey,
): boolean {
  if (!currentPlanKey) return false;

  const allowed: Record<UniversityPlanKey, UniversityPlanKey[]> = {
    university_plus_monthly: ["university_plus_annual"],
    university_plus_annual: ["university_plus_monthly"],
    university_pro_monthly: [
      "university_plus_monthly",
      "university_pro_annual",
    ],
    university_pro_annual: [
      "university_plus_annual",
      "university_pro_monthly",
    ],
  };

  return allowed[currentPlanKey].includes(targetPlanKey);
}

function scheduledActionLabel(
  currentPlanKey: UniversityPlanKey,
  targetPlanKey: UniversityPlanKey,
): string {
  const isCurrentPro = currentPlanKey.includes("_pro_");
  const isTargetPlus = targetPlanKey.includes("_plus_");

  if (isCurrentPro && isTargetPlus) {
    return "Schedule Downgrade";
  }

  return targetPlanKey.endsWith("_annual")
    ? "Switch to Annual"
    : "Switch to Monthly";
}

export default function PricingClient({
  isAuthenticated,
  publishableKey,
  initialBillingState,
  checkoutSessionId,
}: PricingClientProps) {
  const router = useRouter();
  const initialCadence: BillingCadence =
    initialBillingState?.subscription?.interval === "year" ? "annual" : "monthly";
  const [cadence, setCadence] = useState<BillingCadence>(initialCadence);
  const [billingState, setBillingState] =
    useState<UniversityBillingState | null>(initialBillingState);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] =
    useState<UniversityPlanKey | null>(null);
  const [changingPlan, setChangingPlan] =
    useState<UniversityPlanKey | null>(null);
  const [managementAction, setManagementAction] =
    useState<ManagementAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnMessage, setReturnMessage] = useState<string | null>(null);
  const [managementMessage, setManagementMessage] =
    useState<string | null>(null);

  useEffect(() => {
    setBillingState(initialBillingState);

    if (initialBillingState?.subscription?.interval === "year") {
      setCadence("annual");
    } else if (initialBillingState?.subscription?.interval === "month") {
      setCadence("monthly");
    }
  }, [initialBillingState]);

  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  useEffect(() => {
    if (!checkoutSessionId) return;

    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts += 1;

      try {
        const response = await fetch(
          `/api/stripe/checkout/session-status?session_id=${encodeURIComponent(checkoutSessionId)}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setReturnMessage(data.message ?? "Unable to verify checkout yet.");
          return;
        }

        if (data.billingState) {
          setBillingState(data.billingState as UniversityBillingState);
        }

        if (data.billingState?.has_paid_subscription) {
          setReturnMessage("Your CASE University membership is active.");
          router.refresh();
          return;
        }

        if (data.checkoutStatus === "complete") {
          setReturnMessage(
            "Payment completed. We are finishing your membership activation.",
          );
        } else {
          setReturnMessage("Checkout was not completed.");
          return;
        }

        if (attempts < 8) {
          window.setTimeout(check, 1500);
        }
      } catch {
        if (!cancelled) {
          setReturnMessage(
            "Unable to verify checkout yet. Please refresh shortly.",
          );
        }
      }
    };

    void check();

    return () => {
      cancelled = true;
    };
  }, [checkoutSessionId, router]);

  const subscription = billingState?.subscription ?? null;
  const currentPlanKey =
    billingState?.has_paid_subscription && subscription
      ? subscription.plan_key
      : null;
  const scheduledChange = subscription?.scheduled_change ?? null;
  const cancellationScheduled = Boolean(subscription?.cancel_at_period_end);
  const planChangeScheduled = Boolean(
    scheduledChange && scheduledChange.type !== "cancel_to_free",
  );
  const hasPendingManagementChange =
    cancellationScheduled || planChangeScheduled;

  async function startCheckout(tier: PaidTier) {
    setError(null);
    setManagementMessage(null);

    const planKey = planKeyFor(tier, cadence);

    if (!isAuthenticated) {
      const redirect = `/pricing?checkout_plan=${encodeURIComponent(planKey)}`;
      window.location.assign(
        `/auth/signin?redirect=${encodeURIComponent(redirect)}`,
      );
      return;
    }

    if (billingState?.has_paid_subscription) {
      setError(
        "You already have a paid CASE University membership. Manage the existing membership instead of starting a second subscription.",
      );
      return;
    }

    setLoadingPlan(planKey);
    setManagementAction("checkout");

    try {
      const response = await fetch("/api/stripe/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planKey }),
      });

      const data = await response.json();

      if (response.status === 401) {
        const redirect = `/pricing?checkout_plan=${encodeURIComponent(planKey)}`;
        window.location.assign(
          `/auth/signin?redirect=${encodeURIComponent(redirect)}`,
        );
        return;
      }

      if (!response.ok || !data.clientSecret) {
        throw new Error(data.message ?? "Unable to start checkout.");
      }

      setClientSecret(data.clientSecret);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
    } finally {
      setLoadingPlan(null);
      setManagementAction(null);
    }
  }

  async function changePlanImmediately(targetPlanKey: UniversityPlanKey) {
    setError(null);
    setManagementMessage(null);
    setChangingPlan(targetPlanKey);
    setManagementAction("change-plan");

    try {
      const response = await fetch("/api/stripe/subscription/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetPlanKey }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.assign(
          `/auth/signin?redirect=${encodeURIComponent("/pricing")}`,
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ?? "Unable to change your CASE University plan.",
        );
      }

      if (data.billingState) {
        setBillingState(data.billingState as UniversityBillingState);
      }

      setManagementMessage(
        data.pendingUpdate
          ? "Stripe is waiting for the prorated upgrade payment to complete. Your current plan remains active until Stripe confirms the change."
          : "Upgrade submitted. We are synchronizing your Pro membership.",
      );

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await sleep(1200);
        router.refresh();
      }
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to change your CASE University plan.",
      );
    } finally {
      setChangingPlan(null);
      setManagementAction(null);
    }
  }

  async function schedulePlanChange(targetPlanKey: UniversityPlanKey) {
    setError(null);
    setManagementMessage(null);
    setChangingPlan(targetPlanKey);
    setManagementAction("schedule-change");

    try {
      const response = await fetch(
        "/api/stripe/subscription/schedule-change",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetPlanKey }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.assign(
          `/auth/signin?redirect=${encodeURIComponent("/pricing")}`,
        );
        return;
      }

      if (!response.ok || !data.billingState) {
        throw new Error(
          data.message ?? "Unable to schedule the CASE University plan change.",
        );
      }

      const nextState = data.billingState as UniversityBillingState;
      setBillingState(nextState);

      const effectiveDate = formatDate(
        nextState.subscription?.scheduled_change?.effective_at,
      );
      const targetLabel =
        nextState.subscription?.scheduled_change?.target_plan_key
          ? paidPlanLabels[
              nextState.subscription.scheduled_change.target_plan_key
            ]
          : "the selected plan";

      setManagementMessage(
        `${targetLabel} is scheduled for ${effectiveDate}. Your current ${nextState.subscription?.plan_name ?? "paid"} access remains active until then.`,
      );
      router.refresh();
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to schedule the CASE University plan change.",
      );
    } finally {
      setChangingPlan(null);
      setManagementAction(null);
    }
  }

  async function undoScheduledPlanChange() {
    setError(null);
    setManagementMessage(null);
    setManagementAction("undo-scheduled-change");

    try {
      const response = await fetch(
        "/api/stripe/subscription/undo-scheduled-change",
        { method: "POST" },
      );
      const data = await response.json();

      if (response.status === 401) {
        window.location.assign(
          `/auth/signin?redirect=${encodeURIComponent("/pricing")}`,
        );
        return;
      }

      if (!response.ok || !data.billingState) {
        throw new Error(
          data.message ?? "Unable to undo the scheduled plan change.",
        );
      }

      setBillingState(data.billingState as UniversityBillingState);
      setManagementMessage(
        "The scheduled plan change was removed. Your current membership will renew normally.",
      );
      router.refresh();
    } catch (undoError) {
      setError(
        undoError instanceof Error
          ? undoError.message
          : "Unable to undo the scheduled plan change.",
      );
    } finally {
      setManagementAction(null);
    }
  }

  async function cancelToFree() {
    setError(null);
    setManagementMessage(null);
    setManagementAction("cancel");

    try {
      const response = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
      });
      const data = await response.json();

      if (response.status === 401) {
        window.location.assign(
          `/auth/signin?redirect=${encodeURIComponent("/pricing")}`,
        );
        return;
      }

      if (!response.ok || !data.billingState) {
        throw new Error(
          data.message ?? "Unable to schedule cancellation.",
        );
      }

      const nextState = data.billingState as UniversityBillingState;
      setBillingState(nextState);
      setManagementMessage(
        `Cancellation is scheduled for ${formatDate(nextState.subscription?.current_period_end)}. Your paid access remains active until then, after which the account moves to Free.`,
      );
      router.refresh();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to schedule cancellation.",
      );
    } finally {
      setManagementAction(null);
    }
  }

  async function undoCancellation() {
    setError(null);
    setManagementMessage(null);
    setManagementAction("undo-cancel");

    try {
      const response = await fetch("/api/stripe/subscription/undo-cancel", {
        method: "POST",
      });
      const data = await response.json();

      if (response.status === 401) {
        window.location.assign(
          `/auth/signin?redirect=${encodeURIComponent("/pricing")}`,
        );
        return;
      }

      if (!response.ok || !data.billingState) {
        throw new Error(data.message ?? "Unable to undo cancellation.");
      }

      setBillingState(data.billingState as UniversityBillingState);
      setManagementMessage(
        "Cancellation was undone. Your current CASE University plan will renew normally.",
      );
      router.refresh();
    } catch (undoError) {
      setError(
        undoError instanceof Error
          ? undoError.message
          : "Unable to undo cancellation.",
      );
    } finally {
      setManagementAction(null);
    }
  }

  const managementBusy = managementAction !== null;
  const currentPlanLabel = currentPlanKey
    ? paidPlanLabels[currentPlanKey]
    : null;

  return (
    <>
      {billingState?.has_paid_subscription && subscription ? (
        <div className="mx-auto mb-8 max-w-4xl rounded-3xl border border-[var(--primary-border)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--primary)]">
                Your Membership
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                {currentPlanLabel ?? subscription.plan_name ?? "CASE University"}
              </h2>
              <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                {subscription.price_display ?? "Paid membership"}
                {subscription.current_period_end
                  ? ` · Current period ends ${formatDate(subscription.current_period_end)}`
                  : ""}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full border border-[var(--primary-border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--primary)]">
              {subscription.status === "trialing" ? "Trialing" : "Active"}
            </span>
          </div>

          {planChangeScheduled && scheduledChange ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 sm:p-5">
              <p className="text-sm font-black text-[var(--text-primary)]">
                Plan change scheduled
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Your current {currentPlanLabel ?? "paid plan"} access stays active through {formatDate(scheduledChange.effective_at)}. On that date, your membership will change to {scheduledChange.target_plan_key ? paidPlanLabels[scheduledChange.target_plan_key] : scheduledChange.target_plan_name ?? "the selected plan"}.
              </p>
              <button
                type="button"
                disabled={managementBusy}
                onClick={() => void undoScheduledPlanChange()}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {managementAction === "undo-scheduled-change"
                  ? "Undoing Change..."
                  : "Undo Scheduled Change"}
              </button>
            </div>
          ) : null}

          {cancellationScheduled ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 sm:p-5">
              <p className="text-sm font-black text-[var(--text-primary)]">
                Cancellation scheduled
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Your {currentPlanLabel ?? "paid membership"} remains active through {formatDate(scheduledChange?.effective_at ?? subscription.current_period_end)}. After that, the account will move to Free and will no longer renew as a paid membership.
              </p>
              <button
                type="button"
                disabled={managementBusy}
                onClick={() => void undoCancellation()}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {managementAction === "undo-cancel"
                  ? "Restoring Membership..."
                  : "Undo Cancellation"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] p-1 shadow-[var(--shadow-xs)]">
          <button
            type="button"
            onClick={() => setCadence("monthly")}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
              cadence === "monthly"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCadence("annual")}
            className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
              cadence === "annual"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Annual
          </button>
        </div>
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          Annual plans save about 16% compared with monthly billing.
        </p>
      </div>

      {returnMessage ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] px-5 py-4 text-center text-sm font-semibold text-[var(--text-primary)]">
          {returnMessage}
        </div>
      ) : null}

      {managementMessage ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] px-5 py-4 text-center text-sm font-semibold text-[var(--text-primary)]">
          {managementMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-[var(--danger-border,var(--border-default))] bg-[var(--surface-default)] px-5 py-4 text-center text-sm font-semibold text-[var(--text-primary)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch xl:gap-6">
        <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
          <div className="h-1.5 bg-[var(--border-strong)]" />
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--primary)]">
              Start Learning
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Free
            </h2>
            <p className="mt-4 min-h-[72px] text-sm leading-6 text-[var(--text-secondary)]">
              Explore CASE University and begin building your investing
              foundation at no cost.
            </p>
            <div className="mt-6 border-y border-[var(--border-subtle)] py-5">
              <p className="text-4xl font-black tracking-tight text-[var(--text-primary)]">
                $0
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                Free forever
              </p>
            </div>
            <div className="mt-6 grid gap-3 text-sm leading-6 text-[var(--text-secondary)]">
              {[
                "Selected introductory lessons",
                "Public course catalog",
                "Learning dashboard",
                "Basic progress tracking",
                "Public certificate verification",
              ].map((feature) => (
                <p key={feature} className="font-semibold">
                  ✓ {feature}
                </p>
              ))}
            </div>
            <div className="mt-auto pt-8">
              {billingState?.has_paid_subscription ? (
                <button
                  type="button"
                  disabled={managementBusy}
                  onClick={() => {
                    if (planChangeScheduled) {
                      void undoScheduledPlanChange();
                    } else if (cancellationScheduled) {
                      void undoCancellation();
                    } else {
                      void cancelToFree();
                    }
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--border-default)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {managementAction === "cancel"
                    ? "Scheduling Cancellation..."
                    : managementAction === "undo-cancel"
                      ? "Restoring Membership..."
                      : managementAction === "undo-scheduled-change"
                        ? "Undoing Plan Change..."
                        : planChangeScheduled
                          ? "Undo Scheduled Plan Change"
                          : cancellationScheduled
                            ? "Undo Cancellation"
                            : "Cancel to Free"}
                </button>
              ) : (
                <a
                  href="/courses"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--border-default)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                >
                  {billingState?.tier === "free" ? "Current Plan" : "Explore Free"}
                </a>
              )}
            </div>
          </div>
        </article>

        {(["plus", "pro"] as PaidTier[]).map((tier) => {
          const copy = planCopy[tier];
          const key = planKeyFor(tier, cadence);
          const isCurrent = currentPlanKey === key;
          const immediateUpgrade = isImmediateUpgrade(currentPlanKey, key);
          const scheduledTransition = isScheduledTransition(currentPlanKey, key);
          const featured = tier === "plus";
          const isScheduledTarget = Boolean(
            planChangeScheduled &&
              scheduledChange?.target_plan_key === key,
          );

          let buttonLabel = `Choose ${copy.name}`;

          if (isCurrent) {
            buttonLabel = "Current Plan";
          } else if (loadingPlan === key) {
            buttonLabel = "Opening Checkout...";
          } else if (changingPlan === key) {
            buttonLabel = immediateUpgrade
              ? "Upgrading..."
              : "Scheduling Change...";
          } else if (billingState?.has_paid_subscription) {
            if (isScheduledTarget) {
              buttonLabel =
                managementAction === "undo-scheduled-change"
                  ? "Undoing Change..."
                  : "Undo Scheduled Change";
            } else if (hasPendingManagementChange) {
              buttonLabel = "Pending Change Active";
            } else if (immediateUpgrade) {
              buttonLabel = "Upgrade to Pro";
            } else if (scheduledTransition && currentPlanKey) {
              buttonLabel = scheduledActionLabel(currentPlanKey, key);
            } else {
              buttonLabel = "Not Available From Current Plan";
            }
          }

          const canManageTarget =
            Boolean(billingState?.has_paid_subscription) &&
            !hasPendingManagementChange &&
            (immediateUpgrade || scheduledTransition);

          const disabled =
            Boolean(loadingPlan) ||
            Boolean(changingPlan) ||
            managementBusy ||
            isCurrent ||
            (Boolean(billingState?.has_paid_subscription) &&
              !canManageTarget &&
              !isScheduledTarget);

          return (
            <article
              key={tier}
              className={`relative flex h-full flex-col overflow-hidden rounded-3xl border bg-[var(--surface-default)] shadow-[var(--shadow-sm)] ${
                featured
                  ? "border-[var(--primary-border)] lg:-translate-y-2 lg:shadow-[var(--shadow-md)]"
                  : "border-[var(--border-default)]"
              }`}
            >
              <div
                className={`h-1.5 ${
                  featured
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border-strong)]"
                }`}
              />
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--primary)]">
                      {copy.eyebrow}
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
                      {copy.name}
                    </h2>
                  </div>
                  {featured ? (
                    <span className="rounded-full border border-[var(--primary-border)] bg-[var(--primary-soft)] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--primary)]">
                      Most Popular
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 min-h-[72px] text-sm leading-6 text-[var(--text-secondary)]">
                  {copy.description}
                </p>

                <div className="mt-6 border-y border-[var(--border-subtle)] py-5">
                  <p className="text-4xl font-black tracking-tight text-[var(--text-primary)]">
                    {cadence === "monthly" ? copy.monthly : copy.annual}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                    {cadence === "monthly" ? "per month" : "per year"}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {copy.features.map((feature) => (
                    <p key={feature} className="font-semibold">
                      ✓ {feature}
                    </p>
                  ))}
                </div>

                <div className="mt-auto pt-8">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (!billingState?.has_paid_subscription) {
                        void startCheckout(tier);
                        return;
                      }

                      if (isScheduledTarget) {
                        void undoScheduledPlanChange();
                        return;
                      }

                      if (immediateUpgrade) {
                        void changePlanImmediately(key);
                        return;
                      }

                      if (scheduledTransition) {
                        void schedulePlanChange(key);
                      }
                    }}
                    className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      featured
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] hover:bg-[var(--primary-hover)]"
                        : "border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {buttonLabel}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {clientSecret ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-[var(--surface-default)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4">
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">
                  CASE University Checkout
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Secure checkout powered by Stripe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClientSecret(null)}
                className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Close
              </button>
            </div>
            <div className="p-3 sm:p-5">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
