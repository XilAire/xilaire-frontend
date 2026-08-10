"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";

import {
  getStripeClient,
} from "@/lib/stripe/stripe-client";

import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

type PaidCaseBudgetPlan =
  Exclude<
    CaseBudgetPlan,
    "free"
  >;

export type EmbeddedStripeCheckoutProps = {
  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;

  workspaceId?:
    string | null;

  className?:
    string;
};

type CheckoutApiResponse =
  | {
      success:
        true;

      sessionId:
        string;

      clientSecret:
        string;

      plan:
        PaidCaseBudgetPlan;

      interval:
        CaseBudgetBillingInterval;

      priceId:
        string;
    }
  | {
      success:
        false;

      error:
        string;
    };

const stripePromise =
  getStripeClient();

export default function EmbeddedStripeCheckout({
  plan,
  interval,
  workspaceId,
  className,
}: EmbeddedStripeCheckoutProps) {
  const [
    checkoutError,
    setCheckoutError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    isCreatingCheckout,
    setIsCreatingCheckout,
  ] =
    useState(
      true,
    );

  const fetchClientSecret =
    useCallback(
      async () => {
        setCheckoutError(
          null,
        );

        setIsCreatingCheckout(
          true,
        );

        try {
          const response =
            await fetch(
              "/api/subscriptions/checkout",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    plan,

                    interval,

                    workspaceId:
                      workspaceId ??
                      null,
                  }),

                cache:
                  "no-store",
              },
            );

          const payload =
            await readCheckoutResponse(
              response,
            );

          if (
            !response.ok
          ) {
            const errorMessage =
              payload &&
              payload.success ===
                false
                ? payload.error
                : "CASE Budget could not start checkout.";

            throw new Error(
              errorMessage,
            );
          }

          if (
            !payload ||
            payload.success !==
              true
          ) {
            throw new Error(
              "CASE Budget received an invalid checkout response.",
            );
          }

          const clientSecret =
            payload.clientSecret
              .trim();

          if (
            !clientSecret
          ) {
            throw new Error(
              "Stripe did not return a checkout client secret.",
            );
          }

          setIsCreatingCheckout(
            false,
          );

          return clientSecret;
        } catch (
          error
        ) {
          const message =
            getErrorMessage(
              error,
            );

          setCheckoutError(
            message,
          );

          setIsCreatingCheckout(
            false,
          );

          throw error;
        }
      },
      [
        interval,
        plan,
        workspaceId,
      ],
    );

  const options =
    useMemo(
      () => ({
        fetchClientSecret,
      }),
      [
        fetchClientSecret,
      ],
    );

  return (
    <div
      className={
        className
      }
    >
      {checkoutError ? (
        <CheckoutErrorCard
          message={
            checkoutError
          }
          plan={
            plan
          }
          interval={
            interval
          }
        />
      ) : null}

      {isCreatingCheckout &&
      !checkoutError ? (
        <CheckoutLoadingCard />
      ) : null}

      <div
        className={[
          "overflow-hidden rounded-3xl border border-slate-200 bg-white",
          checkoutError
            ? "hidden"
            : "",
        ].join(
          " ",
        )}
      >
        <EmbeddedCheckoutProvider
          stripe={
            stripePromise
          }
          options={
            options
          }
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

function CheckoutLoadingCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-50">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-900">
            Preparing secure checkout
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            CASE Budget is creating your secure Stripe payment session.
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckoutErrorCard({
  message,
  plan,
  interval,
}: {
  message:
    string;

  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;
}) {
  const planName =
    plan ===
    "pro"
      ? "CASE Budget Pro"
      : "CASE Budget Plus";

  const intervalLabel =
    interval ===
    "annual"
      ? "annual"
      : "monthly";

  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
      <p className="text-sm font-bold text-rose-900">
        Checkout could not be started
      </p>

      <p className="mt-2 text-sm leading-6 text-rose-800">
        {message}
      </p>

      <p className="mt-3 text-xs leading-5 text-rose-700">
        Your {planName} {intervalLabel} subscription has not been created or charged.
      </p>
    </div>
  );
}

async function readCheckoutResponse(
  response:
    Response,
): Promise<CheckoutApiResponse | null> {
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
      const sessionId =
        getString(
          value.sessionId,
        );

      const clientSecret =
        getString(
          value.clientSecret,
        );

      const plan =
        getString(
          value.plan,
        );

      const interval =
        getString(
          value.interval,
        );

      const priceId =
        getString(
          value.priceId,
        );

      if (
        !sessionId ||
        !clientSecret ||
        !priceId ||
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

        sessionId,

        clientSecret,

        plan,

        interval,

        priceId,
      };
    }

    if (
      value.success ===
      false
    ) {
      return {
        success:
          false,

        error:
          getString(
            value.error,
          ) ??
          "CASE Budget could not start checkout.",
      };
    }

    return null;
  } catch {
    return null;
  }
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

  return "CASE Budget could not start checkout. Please try again.";
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