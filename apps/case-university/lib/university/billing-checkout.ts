import "server-only";

import type Stripe from "stripe";

import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";
import { getUniversityStripeClient } from "@/lib/university/stripe-server";
import {
  getUniversityStripeMode,
  type UniversityStripeMode,
} from "@/lib/university/stripe-mode";

export const UNIVERSITY_PLAN_KEYS = [
  "university_plus_monthly",
  "university_plus_annual",
  "university_pro_monthly",
  "university_pro_annual",
] as const;

export type UniversityPlanKey = (typeof UNIVERSITY_PLAN_KEYS)[number];

export type UniversityScheduledChange = {
  type: "downgrade" | "interval_change" | "plan_change" | "cancel_to_free" | string;
  effective_at: string | null;
  created_at: string | null;
  target_plan_id: string | null;
  target_plan_key: UniversityPlanKey | null;
  target_plan_name: string | null;
  target_price_display: string | null;
  target_interval: string | null;
  stripe_subscription_schedule_id: string | null;
};

export type UniversityBillingState = {
  stripe_mode: UniversityStripeMode;
  tier: "free" | "plus" | "pro";
  has_paid_subscription: boolean;
  subscription: null | {
    id: string;
    plan_id: string | null;
    plan_key: UniversityPlanKey | null;
    plan_name: string | null;
    price_display: string | null;
    interval: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_subscription_schedule_id: string | null;
    stripe_price_id: string | null;
    stripe_product_id: string | null;
    status: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    scheduled_change: UniversityScheduledChange | null;
  };
};

type PlanRow = {
  id: string;
  key: UniversityPlanKey;
  name: string;
  interval: "month" | "year";
  price_display: string;
  stripe_price_id: string | null;
  stripe_price_id_test: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  stripe_customer_id: string | null;
  stripe_customer_id_test: string | null;
};

export function isUniversityPlanKey(value: unknown): value is UniversityPlanKey {
  return (
    typeof value === "string" &&
    (UNIVERSITY_PLAN_KEYS as readonly string[]).includes(value)
  );
}

export async function getUniversityBillingState(
  userId: string,
  mode: UniversityStripeMode = getUniversityStripeMode(),
): Promise<UniversityBillingState> {
  const service = createSupabaseServerServiceClient();
  const { data, error } = await service.rpc(
    "get_university_user_billing_state",
    {
      p_user_id: userId,
      p_stripe_mode: mode,
    },
  );

  if (error) {
    throw new Error(
      `[CASE University] Unable to load billing state: ${error.message}`,
    );
  }

  return data as UniversityBillingState;
}

export async function getUniversityPlanForCheckout(
  planKey: UniversityPlanKey,
  mode: UniversityStripeMode = getUniversityStripeMode(),
): Promise<PlanRow & { stripePriceId: string }> {
  const service = createSupabaseServerServiceClient();
  const { data, error } = await service
    .from("plans")
    .select(
      "id,key,name,interval,price_display,stripe_price_id,stripe_price_id_test",
    )
    .eq("key", planKey)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CASE University] Unable to resolve checkout plan: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("The selected CASE University plan is not available.");
  }

  const plan = data as PlanRow;
  const stripePriceId =
    mode === "test" ? plan.stripe_price_id_test : plan.stripe_price_id;

  if (!stripePriceId) {
    throw new Error(
      `The selected CASE University plan is missing its ${mode.toUpperCase()} Stripe price.`,
    );
  }

  const { data: resolved, error: resolveError } = await service.rpc(
    "resolve_university_plan_by_stripe_price",
    {
      p_stripe_price_id: stripePriceId,
      p_stripe_mode: mode,
    },
  );

  if (resolveError || !resolved || resolved.plan_key !== planKey) {
    throw new Error(
      "The selected Stripe price is not mapped to the expected CASE University plan.",
    );
  }

  return {
    ...plan,
    stripePriceId,
  };
}

async function loadProfile(userId: string): Promise<ProfileRow> {
  const service = createSupabaseServerServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select(
      "id,email,full_name,stripe_customer_id,stripe_customer_id_test",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CASE University] Unable to load billing profile: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("CASE University profile was not found.");
  }

  return data as ProfileRow;
}

function customerIdForMode(
  profile: ProfileRow,
  mode: UniversityStripeMode,
): string | null {
  return mode === "test"
    ? profile.stripe_customer_id_test
    : profile.stripe_customer_id;
}

async function persistCustomerId(
  userId: string,
  mode: UniversityStripeMode,
  customerId: string,
): Promise<void> {
  const service = createSupabaseServerServiceClient();
  const { error } = await service.rpc("set_university_stripe_customer_id", {
    p_user_id: userId,
    p_stripe_mode: mode,
    p_stripe_customer_id: customerId,
  });

  if (error) {
    throw new Error(
      `[CASE University] Unable to persist Stripe customer: ${error.message}`,
    );
  }
}

export async function getOrCreateUniversityStripeCustomer(args: {
  userId: string;
  authEmail?: string | null;
  mode?: UniversityStripeMode;
}): Promise<Stripe.Customer> {
  const mode = args.mode ?? getUniversityStripeMode();
  const stripe = getUniversityStripeClient();
  const profile = await loadProfile(args.userId);
  const existingCustomerId = customerIdForMode(profile, mode);

  if (existingCustomerId) {
    const existing = await stripe.customers.retrieve(existingCustomerId);

    if (existing.deleted) {
      throw new Error(
        "The Stripe customer linked to this account was deleted. Billing support must reconcile the account before checkout can continue.",
      );
    }

    if (
      existing.metadata.case_university_user_id &&
      existing.metadata.case_university_user_id !== args.userId
    ) {
      throw new Error(
        "The Stripe customer linked to this account does not match the authenticated CASE University user.",
      );
    }

    if (!existing.metadata.case_university_user_id) {
      return stripe.customers.update(existing.id, {
        metadata: {
          ...existing.metadata,
          case_university_user_id: args.userId,
          app: "case_university",
          stripe_mode: mode,
        },
      });
    }

    return existing;
  }

  const customer = await stripe.customers.create({
    email: profile.email ?? args.authEmail ?? undefined,
    name: profile.full_name ?? undefined,
    metadata: {
      case_university_user_id: args.userId,
      app: "case_university",
      stripe_mode: mode,
    },
  });

  try {
    await persistCustomerId(args.userId, mode, customer.id);
  } catch (error) {
    try {
      await stripe.customers.del(customer.id);
    } catch {
      // Best-effort cleanup only. Preserve the original persistence error.
    }

    throw error;
  }

  return customer;
}
