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
} from "@/lib/subscriptions/subscription-storage";

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
   * Subscription access must always be resolved against the authenticated
   * member's active workspace.
   *
   * This is important because a CASE Budget user may:
   *
   * - own one workspace with their own subscription,
   * - belong to another workspace as an invited member,
   * - inherit the subscription assigned to that workspace,
   * - switch between workspaces with different subscription plans.
   *
   * requireCaseBudgetServerAuth() is the authoritative server-side source
   * for both the authenticated user and the currently active workspace.
   */
  const auth =
    await requireCaseBudgetServerAuth();

  const repository =
    getSupabaseSubscriptionRepository();

  /*
   * Resolve the subscription attached to the ACTIVE WORKSPACE.
   *
   * Passing workspaceId is critical.
   *
   * Without it, subscription resolution can fall back to a subscription
   * associated with the authenticated user instead of the workspace the
   * user is currently viewing.
   *
   * Example:
   *
   * User's personal workspace
   *   -> Free
   *
   * Invited household workspace
   *   -> Pro
   *
   * While the user is inside the invited household workspace, the
   * dashboard must resolve Pro from that workspace rather than Free from
   * the user's personal workspace.
   *
   * The inverse must also work:
   *
   * User's personal workspace
   *   -> Pro
   *
   * Invited household workspace
   *   -> Free
   *
   * Switching into the Free workspace must not carry the user's personal
   * Pro entitlement into that workspace.
   */
  const persistedSubscription =
    await repository.findSubscription({
      userId:
        auth.userId,

      workspaceId:
        auth.workspaceId,
    });

  /*
   * resolveCaseBudgetSubscriptionAccess() applies CASE Budget's existing
   * subscription-status and entitlement rules to the subscription resolved
   * for the active workspace.
   *
   * Examples:
   *
   * active Pro workspace subscription
   *   -> effective plan: pro
   *
   * active Plus workspace subscription
   *   -> effective plan: plus
   *
   * missing/inactive workspace subscription
   *   -> effective plan: free
   *
   * Invited members therefore inherit the active workspace's effective
   * subscription while they are operating inside that workspace.
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
