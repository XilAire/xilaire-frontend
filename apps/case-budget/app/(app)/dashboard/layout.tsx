import type {
  ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";

import {
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  resolveCaseBudgetSubscriptionAccess,
} from "@/lib/subscriptions/subscription-service";

import {
  getSupabaseSubscriptionRepository,
} from "@/lib/subscriptions/supabase-subscription-repository";

type DashboardLayoutProps = {
  children:
    ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  /*
   * The dashboard layout is the server-side subscription boundary for
   * CASE Budget.
   *
   * Every dashboard navigation surface receives the same trusted plan
   * resolved from the authenticated member's persisted subscription.
   */
  const auth =
    await requireCaseBudgetServerAuth();

  const repository =
    getSupabaseSubscriptionRepository();

  const persistedSubscription =
    await repository.findSubscription({
      userId:
        auth.userId,
    });

  /*
   * resolveCaseBudgetSubscriptionAccess() applies CASE Budget's existing
   * subscription-status rules.
   *
   * Examples:
   *
   * active Pro
   *   -> effective plan: pro
   *
   * active Plus
   *   -> effective plan: plus
   *
   * missing/inactive paid subscription
   *   -> effective plan: free
   */
  const subscriptionEntitlements =
    resolveCaseBudgetSubscriptionAccess({
      subscription:
        persistedSubscription,

      aiUsagePeriod:
        null,
    });

  const subscriptionPlan =
    subscriptionEntitlements
      .subscription
      .plan;

  return (
    <AppShell
      subscriptionPlan={
        subscriptionPlan
      }
      subscriptionEntitlements={
        subscriptionEntitlements
      }
    >
      {children}
    </AppShell>
  );
}