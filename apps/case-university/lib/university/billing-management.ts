import "server-only";

import type Stripe from "stripe";

import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";
import {
  getUniversityBillingState,
  getUniversityPlanForCheckout,
  type UniversityBillingState,
  type UniversityPlanKey,
} from "@/lib/university/billing-checkout";
import { getUniversityStripeClient } from "@/lib/university/stripe-server";
import {
  getUniversityStripeMode,
  type UniversityStripeMode,
} from "@/lib/university/stripe-mode";

const UNIVERSITY_USER_METADATA_KEY = "case_university_user_id";

type ManagedSubscription = NonNullable<UniversityBillingState["subscription"]>;

function expandableId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function isoToUnix(value: string | null, label: string): number {
  if (!value) {
    throw new Error(`The CASE University subscription is missing ${label}.`);
  }

  const milliseconds = Date.parse(value);

  if (!Number.isFinite(milliseconds)) {
    throw new Error(`The CASE University subscription has an invalid ${label}.`);
  }

  return Math.floor(milliseconds / 1000);
}

function requireManagedSubscription(
  billingState: UniversityBillingState,
): ManagedSubscription {
  const subscription = billingState.subscription;

  if (
    !billingState.has_paid_subscription ||
    !subscription ||
    !subscription.stripe_subscription_id ||
    !subscription.stripe_customer_id ||
    !subscription.plan_key
  ) {
    throw new Error(
      "No manageable CASE University paid subscription was found for this account.",
    );
  }

  if (!["active", "trialing"].includes(subscription.status ?? "")) {
    throw new Error(
      `The CASE University subscription cannot be changed while its status is "${subscription.status ?? "unknown"}".`,
    );
  }

  return subscription;
}

function isImmediatePlusToProUpgrade(
  currentPlanKey: string,
  targetPlanKey: UniversityPlanKey,
): boolean {
  return (
    currentPlanKey === "university_plus_monthly" &&
    targetPlanKey === "university_pro_monthly"
  );
}

function isScheduledChangeAllowed(
  currentPlanKey: UniversityPlanKey,
  targetPlanKey: UniversityPlanKey,
): boolean {
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

function scheduledChangeType(
  currentPlanKey: UniversityPlanKey,
  targetPlanKey: UniversityPlanKey,
): "downgrade" | "interval_change" {
  const currentTier = currentPlanKey.includes("_pro_") ? "pro" : "plus";
  const targetTier = targetPlanKey.includes("_pro_") ? "pro" : "plus";

  return currentTier === "pro" && targetTier === "plus"
    ? "downgrade"
    : "interval_change";
}

async function retrieveOwnedStripeSubscription(args: {
  userId: string;
  mode: UniversityStripeMode;
  billingState: UniversityBillingState;
}): Promise<Stripe.Subscription> {
  const managed = requireManagedSubscription(args.billingState);
  const stripe = getUniversityStripeClient();

  const stripeSubscription = await stripe.subscriptions.retrieve(
    managed.stripe_subscription_id!,
    {
      expand: ["items.data.price.product"],
    },
  );

  if (stripeSubscription.livemode !== (args.mode === "live")) {
    throw new Error(
      "The Stripe subscription environment does not match CASE University.",
    );
  }

  const stripeCustomerId = expandableId(stripeSubscription.customer);

  if (!stripeCustomerId || stripeCustomerId !== managed.stripe_customer_id) {
    throw new Error(
      "The Stripe subscription customer does not match the CASE University billing record.",
    );
  }

  const metadataUserId =
    stripeSubscription.metadata[UNIVERSITY_USER_METADATA_KEY]?.trim();

  if (!metadataUserId || metadataUserId !== args.userId) {
    throw new Error(
      "The Stripe subscription does not belong to the authenticated CASE University user.",
    );
  }

  if (stripeSubscription.items.data.length !== 1) {
    throw new Error(
      "CASE University subscription management requires exactly one Stripe subscription item.",
    );
  }

  return stripeSubscription;
}

async function persistScheduledChange(args: {
  userId: string;
  mode: UniversityStripeMode;
  targetPlanId: string;
  changeType: "downgrade" | "interval_change";
  effectiveAt: string;
  scheduleId: string;
}): Promise<void> {
  const service = createSupabaseServerServiceClient();
  const { error } = await service.rpc(
    "set_university_subscription_scheduled_change",
    {
      p_user_id: args.userId,
      p_stripe_mode: args.mode,
      p_scheduled_plan_id: args.targetPlanId,
      p_change_type: args.changeType,
      p_effective_at: args.effectiveAt,
      p_stripe_subscription_schedule_id: args.scheduleId,
    },
  );

  if (error) {
    throw new Error(
      `[CASE University] Unable to persist scheduled plan change: ${error.message}`,
    );
  }
}

async function clearScheduledChange(args: {
  userId: string;
  mode: UniversityStripeMode;
}): Promise<void> {
  const service = createSupabaseServerServiceClient();
  const { error } = await service.rpc(
    "clear_university_subscription_scheduled_change",
    {
      p_user_id: args.userId,
      p_stripe_mode: args.mode,
    },
  );

  if (error) {
    throw new Error(
      `[CASE University] Unable to clear scheduled plan change: ${error.message}`,
    );
  }
}

export type ImmediateUniversityPlanChangeResult = {
  subscriptionId: string;
  targetPlanKey: UniversityPlanKey;
  stripeStatus: Stripe.Subscription.Status;
  pendingUpdate: boolean;
  billingState: UniversityBillingState;
};

export async function changeUniversityPlanImmediately(args: {
  userId: string;
  targetPlanKey: UniversityPlanKey;
  mode?: UniversityStripeMode;
}): Promise<ImmediateUniversityPlanChangeResult> {
  const mode = args.mode ?? getUniversityStripeMode();
  const billingState = await getUniversityBillingState(args.userId, mode);
  const managed = requireManagedSubscription(billingState);

  if (managed.cancel_at_period_end) {
    throw new Error(
      "Undo the scheduled cancellation before changing this CASE University plan.",
    );
  }

  if (managed.scheduled_change) {
    throw new Error(
      "Undo the scheduled plan change before starting a new CASE University plan change.",
    );
  }

  if (managed.plan_key === args.targetPlanKey) {
    throw new Error("That CASE University plan is already active.");
  }

  if (
    !isImmediatePlusToProUpgrade(managed.plan_key!, args.targetPlanKey)
  ) {
    throw new Error(
      "This CASE University plan change must be scheduled for the end of the current billing period.",
    );
  }

  const targetPlan = await getUniversityPlanForCheckout(
    args.targetPlanKey,
    mode,
  );

  const stripeSubscription = await retrieveOwnedStripeSubscription({
    userId: args.userId,
    mode,
    billingState,
  });

  const subscriptionItem = stripeSubscription.items.data[0];

  if (!subscriptionItem) {
    throw new Error("The Stripe subscription has no billable item.");
  }

  const stripe = getUniversityStripeClient();

  const updated = await stripe.subscriptions.update(stripeSubscription.id, {
    items: [
      {
        id: subscriptionItem.id,
        price: targetPlan.stripePriceId,
        quantity: 1,
      },
    ],
    proration_behavior: "always_invoice",
    payment_behavior: "pending_if_incomplete",
    metadata: {
      ...stripeSubscription.metadata,
      case_university_user_id: args.userId,
      app: "case_university",
      stripe_mode: mode,
      plan_key: targetPlan.key,
    },
  });

  const refreshedBillingState = await getUniversityBillingState(
    args.userId,
    mode,
  );

  return {
    subscriptionId: updated.id,
    targetPlanKey: targetPlan.key,
    stripeStatus: updated.status,
    pendingUpdate: Boolean(updated.pending_update),
    billingState: refreshedBillingState,
  };
}

export async function scheduleUniversityPlanChange(args: {
  userId: string;
  targetPlanKey: UniversityPlanKey;
  mode?: UniversityStripeMode;
}): Promise<UniversityBillingState> {
  const mode = args.mode ?? getUniversityStripeMode();
  const billingState = await getUniversityBillingState(args.userId, mode);
  const managed = requireManagedSubscription(billingState);

  if (managed.cancel_at_period_end) {
    throw new Error(
      "Undo the scheduled cancellation before scheduling a plan change.",
    );
  }

  if (managed.scheduled_change || managed.stripe_subscription_schedule_id) {
    throw new Error(
      "This membership already has a scheduled change. Undo it before scheduling another change.",
    );
  }

  if (!managed.plan_key || managed.plan_key === args.targetPlanKey) {
    throw new Error("Select a different CASE University plan.");
  }

  if (!isScheduledChangeAllowed(managed.plan_key, args.targetPlanKey)) {
    throw new Error(
      "That CASE University plan transition is not available as a scheduled change.",
    );
  }

  const targetPlan = await getUniversityPlanForCheckout(
    args.targetPlanKey,
    mode,
  );
  const stripeSubscription = await retrieveOwnedStripeSubscription({
    userId: args.userId,
    mode,
    billingState,
  });
  const item = stripeSubscription.items.data[0];

  if (!item) {
    throw new Error("The Stripe subscription has no billable item.");
  }

  const effectiveAtUnix = item.current_period_end;
  const effectiveAt = new Date(effectiveAtUnix * 1000).toISOString();
  const stripe = getUniversityStripeClient();

  let createdSchedule: Stripe.SubscriptionSchedule | null = null;

  try {
    createdSchedule = await stripe.subscriptionSchedules.create({
      from_subscription: stripeSubscription.id,
    });

    const currentPhaseStart =
      createdSchedule.current_phase?.start_date ?? item.current_period_start;

    await stripe.subscriptionSchedules.update(createdSchedule.id, {
      end_behavior: "release",
      metadata: {
        case_university_user_id: args.userId,
        app: "case_university",
        stripe_mode: mode,
        target_plan_key: targetPlan.key,
      },
      phases: [
        {
          start_date: currentPhaseStart,
          end_date: effectiveAtUnix,
          items: [
            {
              price: item.price.id,
              quantity: item.quantity ?? 1,
            },
          ],
          proration_behavior: "none",
        },
        {
          start_date: effectiveAtUnix,
          items: [
            {
              price: targetPlan.stripePriceId,
              quantity: item.quantity ?? 1,
            },
          ],
          proration_behavior: "none",
          metadata: {
            case_university_user_id: args.userId,
            app: "case_university",
            stripe_mode: mode,
            plan_key: targetPlan.key,
          },
        },
      ],
    });

    await persistScheduledChange({
      userId: args.userId,
      mode,
      targetPlanId: targetPlan.id,
      changeType: scheduledChangeType(managed.plan_key, targetPlan.key),
      effectiveAt,
      scheduleId: createdSchedule.id,
    });
  } catch (error) {
    if (createdSchedule) {
      try {
        await stripe.subscriptionSchedules.release(createdSchedule.id);
      } catch (cleanupError) {
        console.error(
          `[CASE University] Failed to release schedule ${createdSchedule.id} after scheduling error.`,
          cleanupError,
        );
      }
    }

    throw error;
  }

  return getUniversityBillingState(args.userId, mode);
}

export async function undoUniversityScheduledPlanChange(args: {
  userId: string;
  mode?: UniversityStripeMode;
}): Promise<UniversityBillingState> {
  const mode = args.mode ?? getUniversityStripeMode();
  const billingState = await getUniversityBillingState(args.userId, mode);
  const managed = requireManagedSubscription(billingState);
  const scheduleId =
    managed.stripe_subscription_schedule_id ??
    managed.scheduled_change?.stripe_subscription_schedule_id ??
    null;

  if (!managed.scheduled_change || !scheduleId) {
    throw new Error("No scheduled CASE University plan change was found.");
  }

  const stripe = getUniversityStripeClient();
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);

  if (schedule.livemode !== (mode === "live")) {
    throw new Error("The Stripe schedule environment does not match CASE University.");
  }

  const scheduleUserId =
    schedule.metadata?.[UNIVERSITY_USER_METADATA_KEY]?.trim();

  if (scheduleUserId && scheduleUserId !== args.userId) {
    throw new Error("The Stripe subscription schedule does not belong to this user.");
  }

  if (["not_started", "active"].includes(schedule.status)) {
    await stripe.subscriptionSchedules.release(schedule.id);
  } else if (schedule.status !== "released") {
    throw new Error(
      `The Stripe subscription schedule cannot be undone while its status is "${schedule.status}".`,
    );
  }

  await clearScheduledChange({ userId: args.userId, mode });
  return getUniversityBillingState(args.userId, mode);
}

export async function cancelUniversitySubscriptionAtPeriodEnd(args: {
  userId: string;
  mode?: UniversityStripeMode;
}): Promise<UniversityBillingState> {
  const mode = args.mode ?? getUniversityStripeMode();
  const billingState = await getUniversityBillingState(args.userId, mode);
  const managed = requireManagedSubscription(billingState);

  if (managed.scheduled_change || managed.stripe_subscription_schedule_id) {
    throw new Error(
      "Undo the scheduled plan change before canceling this membership.",
    );
  }

  if (managed.cancel_at_period_end) {
    throw new Error("This CASE University membership is already scheduled to cancel.");
  }

  const stripeSubscription = await retrieveOwnedStripeSubscription({
    userId: args.userId,
    mode,
    billingState,
  });
  const stripe = getUniversityStripeClient();

  await stripe.subscriptions.update(stripeSubscription.id, {
    cancel_at_period_end: true,
  });

  const service = createSupabaseServerServiceClient();
  const effectiveAt =
    managed.current_period_end ??
    new Date(stripeSubscription.items.data[0]!.current_period_end * 1000).toISOString();

  const { error } = await service.rpc(
    "set_university_subscription_cancel_to_free",
    {
      p_subscription_id: managed.id,
      p_user_id: args.userId,
      p_stripe_mode: mode,
      p_effective_at: effectiveAt,
    },
  );

  if (error) {
    try {
      await stripe.subscriptions.update(stripeSubscription.id, {
        cancel_at_period_end: false,
      });
    } catch (cleanupError) {
      console.error(
        "[CASE University] Failed to roll back Stripe cancellation after database error.",
        cleanupError,
      );
    }

    throw new Error(
      `[CASE University] Unable to persist cancellation intent: ${error.message}`,
    );
  }

  return getUniversityBillingState(args.userId, mode);
}

export async function undoUniversityCancellation(args: {
  userId: string;
  mode?: UniversityStripeMode;
}): Promise<UniversityBillingState> {
  const mode = args.mode ?? getUniversityStripeMode();
  const billingState = await getUniversityBillingState(args.userId, mode);
  const managed = requireManagedSubscription(billingState);

  if (!managed.cancel_at_period_end) {
    throw new Error("This CASE University membership is not scheduled to cancel.");
  }

  const stripeSubscription = await retrieveOwnedStripeSubscription({
    userId: args.userId,
    mode,
    billingState,
  });
  const stripe = getUniversityStripeClient();

  await stripe.subscriptions.update(stripeSubscription.id, {
    cancel_at_period_end: false,
  });

  await clearScheduledChange({ userId: args.userId, mode });

  return getUniversityBillingState(args.userId, mode);
}
