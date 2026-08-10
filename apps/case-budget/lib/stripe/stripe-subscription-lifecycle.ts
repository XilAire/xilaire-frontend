import "server-only";

import {
  getStripeServer,
} from "@/lib/stripe/stripe-server";

export type ScheduleStripeSubscriptionCancellationInput = {
  subscriptionId:
    string;

  userId:
    string;
};

export type ResumeStripeSubscriptionInput = {
  subscriptionId:
    string;

  userId:
    string;
};

export type StripeSubscriptionLifecycleResult = {
  subscriptionId:
    string;

  status:
    string;

  cancelAtPeriodEnd:
    boolean;

  canceledAt:
    string | null;

  currentPeriodEnd:
    string | null;
};

export async function scheduleStripeSubscriptionCancellation({
  subscriptionId,
  userId,
}: ScheduleStripeSubscriptionCancellationInput): Promise<StripeSubscriptionLifecycleResult> {
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

  const stripe =
    getStripeServer();

  const currentSubscription =
    await stripe
      .subscriptions
      .retrieve(
        normalizedSubscriptionId,
      );

  validateSubscriptionOwnership({
    subscription:
      currentSubscription,

    userId:
      normalizedUserId,
  });

  if (
    currentSubscription.status ===
      "canceled"
  ) {
    throw new Error(
      "This Stripe subscription has already been canceled and cannot be scheduled for cancellation.",
    );
  }

  if (
    currentSubscription.cancel_at_period_end
  ) {
    return mapLifecycleResult(
      currentSubscription,
    );
  }

  const updatedSubscription =
    await stripe
      .subscriptions
      .update(
        normalizedSubscriptionId,
        {
          /*
           * CASE Budget does not terminate paid access immediately.
           *
           * The member keeps access for the remainder of the billing
           * period that has already been paid for.
           */
          cancel_at_period_end:
            true,
        },
      );

  return mapLifecycleResult(
    updatedSubscription,
  );
}

export async function resumeStripeSubscription({
  subscriptionId,
  userId,
}: ResumeStripeSubscriptionInput): Promise<StripeSubscriptionLifecycleResult> {
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

  const stripe =
    getStripeServer();

  const currentSubscription =
    await stripe
      .subscriptions
      .retrieve(
        normalizedSubscriptionId,
      );

  validateSubscriptionOwnership({
    subscription:
      currentSubscription,

    userId:
      normalizedUserId,
  });

  if (
    currentSubscription.status ===
      "canceled"
  ) {
    throw new Error(
      "This Stripe subscription has already ended and can no longer be resumed.",
    );
  }

  if (
    !currentSubscription.cancel_at_period_end
  ) {
    return mapLifecycleResult(
      currentSubscription,
    );
  }

  const updatedSubscription =
    await stripe
      .subscriptions
      .update(
        normalizedSubscriptionId,
        {
          /*
           * Removing the scheduled cancellation keeps the existing
           * subscription active with the same Stripe subscription ID.
           */
          cancel_at_period_end:
            false,
        },
      );

  return mapLifecycleResult(
    updatedSubscription,
  );
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

function mapLifecycleResult(
  subscription:
    Awaited<
      ReturnType<
        ReturnType<
          typeof getStripeServer
        >["subscriptions"]["retrieve"]
      >
    >,
): StripeSubscriptionLifecycleResult {
  const periodEnd =
    getSubscriptionPeriodEnd(
      subscription,
    );

  return {
    subscriptionId:
      subscription.id,

    status:
      subscription.status,

    cancelAtPeriodEnd:
      Boolean(
        subscription
          .cancel_at_period_end,
      ),

    canceledAt:
      fromUnixTimestamp(
        subscription
          .canceled_at,
      ),

    currentPeriodEnd:
      periodEnd,
  };
}

function getSubscriptionPeriodEnd(
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
    return null;
  }

  return fromUnixTimestamp(
    item.current_period_end,
  );
}

function fromUnixTimestamp(
  value:
    number | null | undefined,
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return new Date(
    value *
      1_000,
  ).toISOString();
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