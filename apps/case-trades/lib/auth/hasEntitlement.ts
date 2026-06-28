import { createClient } from "@supabase/supabase-js";

type ProductKey = "signals" | "journal";

type EntitlementKey =
  | "signals"
  | "discord"
  | "options_signals"
  | "journal"
  | "stocks"
  | "options"
  | "ai_review"
  | "trade_grading"
  | "playbooks"
  | "exports";

export async function hasEntitlement(
  userId: string,
  productKey: ProductKey,
  entitlementKey: EntitlementKey
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!
  );

  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      status,
      plan:plans (
        id,
        key,
        plan_entitlements (
          product_key,
          access_level,
          limits
        )
      )
    `)
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .eq("plan.plan_entitlements.product_key", productKey);

  if (error) {
    console.error("hasEntitlement failed", error);
    return false;
  }

  return (
    data?.some((subscription: any) =>
      subscription.plan?.plan_entitlements?.some((entitlement: any) => {
        if (entitlement.product_key !== productKey) return false;

        const limits = entitlement.limits ?? {};

        return limits[entitlementKey] === true;
      })
    ) ?? false
  );
}