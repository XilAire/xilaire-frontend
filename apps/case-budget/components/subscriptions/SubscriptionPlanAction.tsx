"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowRight,
  Check,
  LoaderCircle,
} from "lucide-react";

import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import type {
  CaseBudgetSubscriptionStatus,
} from "@/types/subscription";

type PaidCaseBudgetPlan =
  Exclude<
    CaseBudgetPlan,
    "free"
  >;

type SubscriptionPlanActionProps = {
  targetPlan:
    PaidCaseBudgetPlan;

  targetInterval:
    CaseBudgetBillingInterval;

  currentPlan?:
    CaseBudgetPlan | null;

  currentInterval?:
    CaseBudgetBillingInterval | null;

  currentStatus?:
    CaseBudgetSubscriptionStatus | null;

  hasManagedSubscription?:
    boolean;

  className?:
    string;

  fullWidth?:
    boolean;

  onChanged?:
    () => void;
};

type ChangeSubscriptionResponse =
  | {
      success:
        true;

      subscriptionId:
        string;

      subscriptionItemId:
        string;

      previousPriceId:
        string;

      newPriceId:
        string;

      plan:
        PaidCaseBudgetPlan;

      interval:
        CaseBudgetBillingInterval;

      status:
        string;

      pendingUpdate:
        boolean;
    }
  | {
      success:
        false;

      code?:
        string;

      error:
        string;
    };

export default function SubscriptionPlanAction({
  targetPlan,
  targetInterval,
  currentPlan =
    null,
  currentInterval =
    null,
  currentStatus =
    null,
  hasManagedSubscription =
    false,
  className,
  fullWidth =
    true,
  onChanged,
}: SubscriptionPlanActionProps) {
  const router =
    useRouter();

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const isCurrentSelection =
    currentPlan ===
      targetPlan &&
    currentInterval ===
      targetInterval &&
    hasManagedSubscription;

  const actionLabel =
    useMemo(
      () => {
        if (
          isCurrentSelection
        ) {
          return "Current plan";
        }

        if (
          !hasManagedSubscription
        ) {
          return targetPlan ===
            "pro"
            ? "Choose Pro"
            : "Choose Plus";
        }

        if (
          currentPlan ===
            "plus" &&
          targetPlan ===
            "pro"
        ) {
          return "Upgrade to Pro";
        }

        if (
          currentPlan ===
            "pro" &&
          targetPlan ===
            "plus"
        ) {
          return "Change to Plus";
        }

        if (
          currentInterval !==
          targetInterval
        ) {
          return targetInterval ===
            "annual"
            ? "Switch to annual"
            : "Switch to monthly";
        }

        return "Change plan";
      },
      [
        currentInterval,
        currentPlan,
        hasManagedSubscription,
        isCurrentSelection,
        targetInterval,
        targetPlan,
      ],
    );

  async function handleAction() {
    if (
      isSubmitting ||
      isCurrentSelection
    ) {
      return;
    }

    setErrorMessage(
      null,
    );

    setSuccessMessage(
      null,
    );

    /*
     * A customer without a managed paid subscription should
     * enter the normal Embedded Stripe Checkout flow.
     */
    if (
      !hasManagedSubscription
    ) {
      const checkoutUrl =
        new URL(
          "/dashboard/settings/billing/checkout",
          window.location.origin,
        );

      checkoutUrl
        .searchParams
        .set(
          "plan",
          targetPlan,
        );

      checkoutUrl
        .searchParams
        .set(
          "interval",
          targetInterval,
        );

      router.push(
        `${checkoutUrl.pathname}${checkoutUrl.search}`,
      );

      return;
    }

    /*
     * Existing paid subscribers must never create a second
     * Stripe subscription.
     *
     * Instead, update the existing Stripe subscription.
     */
    setIsSubmitting(
      true,
    );

    try {
      const response =
        await fetch(
          "/api/subscriptions/change",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                plan:
                  targetPlan,

                interval:
                  targetInterval,
              }),

            cache:
              "no-store",
          },
        );

      const payload =
        await readChangeResponse(
          response,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          payload &&
          payload.success ===
            false
            ? payload.error
            : "CASE Budget could not change your subscription.",
        );
      }

      if (
        !payload ||
        payload.success !==
          true
      ) {
        throw new Error(
          "CASE Budget received an invalid subscription response.",
        );
      }

      if (
        payload.pendingUpdate
      ) {
        setSuccessMessage(
          "Your subscription change is pending payment confirmation.",
        );
      } else {
        setSuccessMessage(
          getSuccessfulChangeMessage({
            plan:
              payload.plan,

            interval:
              payload.interval,
          }),
        );
      }

      /*
       * Stripe webhooks remain authoritative.
       *
       * Refresh the current route so server-rendered subscription
       * state can be re-read after the webhook synchronizes.
       */
      router.refresh();

      onChanged?.();
    } catch (
      error
    ) {
      setErrorMessage(
        getErrorMessage(
          error,
        ),
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <div
      className={
        fullWidth
          ? "w-full"
          : undefined
      }
    >
      <button
        type="button"
        onClick={
          handleAction
        }
        disabled={
          isSubmitting ||
          isCurrentSelection
        }
        className={[
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition",
          fullWidth
            ? "w-full"
            : "",
          isCurrentSelection
            ? "cursor-default border border-[color-mix(in_srgb,var(--success)_40%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_8%,var(--surface-default))] text-[var(--success)]"
            : targetPlan ===
                "pro"
              ? "bg-[var(--pro)] text-[var(--primary-foreground)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              : "border border-[var(--border-strong)] bg-[var(--surface-default)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60",
          className ??
            "",
        ]
          .filter(
            Boolean,
          )
          .join(
            " ",
          )}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />

            Updating...
          </>
        ) : isCurrentSelection ? (
          <>
            <Check className="h-4 w-4" />

            {actionLabel}
          </>
        ) : (
          <>
            {actionLabel}

            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {currentStatus ===
      "past_due" ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--warning)]">
          Your current subscription
          has a past-due payment.
          Billing may need attention
          before some plan changes
          can complete.
        </p>
      ) : null}

      {currentStatus ===
      "unpaid" ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--danger)]">
          Your current subscription
          is unpaid. Resolve the
          outstanding balance before
          relying on a plan change.
        </p>
      ) : null}

      {currentStatus ===
      "incomplete" ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--warning)]">
          Your subscription setup is
          incomplete. Stripe may
          require payment confirmation
          before this change can
          finish.
        </p>
      ) : null}

      {currentStatus ===
      "paused" ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--warning)]">
          Your subscription is
          currently paused.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface-default))] px-4 py-3 text-sm font-medium leading-6 text-[var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--success)_35%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface-default))] px-4 py-3 text-sm font-medium leading-6 text-[var(--success)]"
        >
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}

async function readChangeResponse(
  response:
    Response,
): Promise<ChangeSubscriptionResponse | null> {
  try {
    const value =
      await response.json();

    if (
      !isRecord(
        value,
      )
    ) {
      return null;
    }

    if (
      value.success ===
      true
    ) {
      const subscriptionId =
        getString(
          value.subscriptionId,
        );

      const subscriptionItemId =
        getString(
          value.subscriptionItemId,
        );

      const previousPriceId =
        getString(
          value.previousPriceId,
        );

      const newPriceId =
        getString(
          value.newPriceId,
        );

      const plan =
        getString(
          value.plan,
        );

      const interval =
        getString(
          value.interval,
        );

      const status =
        getString(
          value.status,
        );

      if (
        !subscriptionId ||
        !subscriptionItemId ||
        !previousPriceId ||
        !newPriceId ||
        !status ||
        (
          plan !==
            "plus" &&
          plan !==
            "pro"
        ) ||
        (
          interval !==
            "monthly" &&
          interval !==
            "annual"
        )
      ) {
        return null;
      }

      return {
        success:
          true,

        subscriptionId,

        subscriptionItemId,

        previousPriceId,

        newPriceId,

        plan,

        interval,

        status,

        pendingUpdate:
          value.pendingUpdate ===
          true,
      };
    }

    if (
      value.success ===
      false
    ) {
      return {
        success:
          false,

        code:
          getString(
            value.code,
          ) ??
          undefined,

        error:
          getString(
            value.error,
          ) ??
          "CASE Budget could not change your subscription.",
      };
    }

    return null;
  } catch {
    return null;
  }
}

function getSuccessfulChangeMessage({
  plan,
  interval,
}: {
  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;
}) {
  const planName =
    plan ===
    "pro"
      ? "Pro"
      : "Plus";

  const intervalName =
    interval ===
    "annual"
      ? "annual"
      : "monthly";

  return `Your CASE Budget ${planName} ${intervalName} subscription has been updated.`;
}

function getErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
      Error
  ) {
    const message =
      error.message
        .trim();

    if (
      message
    ) {
      return message;
    }
  }

  return "CASE Budget could not change your subscription. Please try again.";
}

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function getString(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}