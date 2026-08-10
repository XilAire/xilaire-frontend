import "server-only";

import {
  getStripePriceId,
} from "@/lib/stripe/stripe-prices";

import {
  getStripeServer,
} from "@/lib/stripe/stripe-server";

import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

type PaidCaseBudgetPlan =
  Exclude<
    CaseBudgetPlan,
    "free"
  >;

export type ChangeStripeSubscriptionInput = {
  subscriptionId:
    string;

  userId:
    string;

  workspaceId?:
    string | null;

  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;
};

export type ChangeStripeSubscriptionResult = {
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
};

export type StripeSubscriptionSelection = {
  subscriptionId:
    string;

  subscriptionItemId:
    string;

  priceId:
    string;

  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;
};

export async function changeStripeSubscription({
  subscriptionId,
  userId,
  workspaceId,
  plan,
  interval,
}: ChangeStripeSubscriptionInput): Promise<ChangeStripeSubscriptionResult> {
  const normalizedSubscriptionId =
    normalizeRequiredValue(
      subscriptionId,
      "subscriptionId",
    );

  const normalizedUserId =
    normalizeRequiredValue(
      userId,
      "userId",
    );

  const normalizedWorkspaceId =
    normalizeOptionalValue(
      workspaceId,
    );

  const stripe =
    getStripeServer();

  const currentSubscription =
    await stripe
      .subscriptions
      .retrieve(
        normalizedSubscriptionId,
        {
          expand: [
            "items.data.price.product",
          ],
        },
      );

  validateSubscriptionOwnership({
    subscription:
      currentSubscription,

    userId:
      normalizedUserId,
  });

  const subscriptionItem =
    getPrimarySubscriptionItem(
      currentSubscription,
    );

  const previousPriceId =
    normalizeRequiredValue(
      subscriptionItem
        .price
        .id,
      "subscriptionItem.price.id",
    );

  const newPriceId =
    getStripePriceId({
      plan,
      interval,
    });

  if (
    previousPriceId ===
    newPriceId
  ) {
    return {
      subscriptionId:
        currentSubscription.id,

      subscriptionItemId:
        subscriptionItem.id,

      previousPriceId,

      newPriceId,

      plan,

      interval,

      status:
        currentSubscription.status,

      pendingUpdate:
        Boolean(
          currentSubscription
            .pending_update,
        ),
    };
  }

  const updatedSubscription =
    await stripe
      .subscriptions
      .update(
        currentSubscription.id,
        {
          /*
           * Replacing the existing item ID is critical.
           *
           * Omitting the item ID can cause Stripe to add another
           * subscription item instead of replacing the existing price.
           */
          items: [
            {
              id:
                subscriptionItem.id,

              price:
                newPriceId,

              quantity:
                1,
            },
          ],

          /*
           * CASE Budget applies paid plan changes immediately.
           *
           * Stripe creates the required proration invoice and attempts
           * payment immediately.
           */
          proration_behavior:
            "always_invoice",

          /*
           * Do not permanently apply a paid subscription update if
           * payment for the resulting invoice does not succeed.
           *
           * Stripe keeps the requested change as a pending update until
           * payment succeeds or the pending update expires.
           */
          payment_behavior:
            "pending_if_incomplete",

          metadata: {
            ...currentSubscription
              .metadata,

            app:
              "case-budget",

            user_id:
              normalizedUserId,

            workspace_id:
              normalizedWorkspaceId ??
              "",

            plan,

            billing_interval:
              interval,
          },
        },
      );

  return {
    subscriptionId:
      updatedSubscription.id,

    subscriptionItemId:
      subscriptionItem.id,

    previousPriceId,

    newPriceId,

    plan,

    interval,

    status:
      updatedSubscription.status,

    pendingUpdate:
      Boolean(
        updatedSubscription
          .pending_update,
      ),
  };
}

export async function getStripeSubscriptionSelection(
  subscriptionId:
    string,
): Promise<StripeSubscriptionSelection | null> {
  const normalizedSubscriptionId =
    normalizeRequiredValue(
      subscriptionId,
      "subscriptionId",
    );

  const stripe =
    getStripeServer();

  const subscription =
    await stripe
      .subscriptions
      .retrieve(
        normalizedSubscriptionId,
      );

  const item =
    getPrimarySubscriptionItem(
      subscription,
    );

  const priceId =
    normalizeRequiredValue(
      item.price.id,
      "subscriptionItem.price.id",
    );

  const mapping =
    getPlanAndIntervalFromPrice(
      priceId,
    );

  if (
    !mapping
  ) {
    return null;
  }

  return {
    subscriptionId:
      subscription.id,

    subscriptionItemId:
      item.id,

    priceId,

    plan:
      mapping.plan,

    interval:
      mapping.interval,
  };
}

function getPrimarySubscriptionItem(
  subscription:
    Awaited<
      ReturnType<
        ReturnType<
          typeof getStripeServer
        >["subscriptions"]["retrieve"]
      >
    >,
) {
  const item =
    subscription
      .items
      .data[0];

  if (
    !item
  ) {
    throw new Error(
      "Stripe subscription does not contain a subscription item.",
    );
  }

  return item;
}

function validateSubscriptionOwnership({
  subscription,
  userId,
}: {
  subscription:
    Awaited<
      ReturnType<
        ReturnType<
          typeof getStripeServer
        >["subscriptions"]["retrieve"]
      >
    >;

  userId:
    string;
}) {
  const metadataUserId =
    normalizeOptionalValue(
      subscription
        .metadata
        ?.user_id,
    );

  if (
    !metadataUserId
  ) {
    throw new Error(
      "Stripe subscription is missing CASE Budget user metadata.",
    );
  }

  if (
    metadataUserId !==
    userId
  ) {
    throw new Error(
      "Stripe subscription does not belong to the authenticated CASE Budget user.",
    );
  }
}

function getPlanAndIntervalFromPrice(
  priceId:
    string,
):
  | {
      plan:
        PaidCaseBudgetPlan;

      interval:
        CaseBudgetBillingInterval;
    }
  | null {
  const mappings:
    Array<{
      plan:
        PaidCaseBudgetPlan;

      interval:
        CaseBudgetBillingInterval;

      priceId:
        string | null;
    }> =
    [
      {
        plan:
          "plus",

        interval:
          "monthly",

        priceId:
          process.env
            .STRIPE_PLUS_MONTHLY_PRICE_ID_CASE_BUDGET
            ?.trim() ??
          null,
      },

      {
        plan:
          "plus",

        interval:
          "annual",

        priceId:
          process.env
            .STRIPE_PLUS_ANNUAL_PRICE_ID_CASE_BUDGET
            ?.trim() ??
          null,
      },

      {
        plan:
          "pro",

        interval:
          "monthly",

        priceId:
          process.env
            .STRIPE_PRO_MONTHLY_PRICE_ID_CASE_BUDGET
            ?.trim() ??
          null,
      },

      {
        plan:
          "pro",

        interval:
          "annual",

        priceId:
          process.env
            .STRIPE_PRO_ANNUAL_PRICE_ID_CASE_BUDGET
            ?.trim() ??
          null,
      },
    ];

  const mapping =
    mappings.find(
      (
        item,
      ) =>
        item.priceId ===
        priceId,
    );

  if (
    !mapping
  ) {
    return null;
  }

  return {
    plan:
      mapping.plan,

    interval:
      mapping.interval,
  };
}

function normalizeRequiredValue(
  value:
    string,
  fieldName:
    string,
) {
  const normalizedValue =
    value.trim();

  if (
    !normalizedValue
  ) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalValue(
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