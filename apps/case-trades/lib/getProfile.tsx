"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getCurrentOrganization } from "@/lib/orgs/getCurrentOrganization";

import type { UserOrganizationAccess } from "@/lib/orgs/types";

/**
 * AUTHORITATIVE PROFILE TYPE
 */
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string;
  theme: string;
  role_id: string;

  roles: {
    id: string;
    name: string;
    rank: number;
  }[];

  subscriptions: {
    id: string;
    status: string | null;
    plan_id: string | null;
    organization_id: string | null;
    current_period_end: string | null;
    plans:
      | {
          id: string;
          key: string;
          name: string | null;
        }
      | {
          id: string;
          key: string;
          name: string | null;
        }[]
      | null;
  }[];

  discord_accounts: {
    id: string;
    user_id: string;
    discord_user_id: string | null;
    discord_username: string | null;
    created_at: string | null;
  }[];

  organizations: UserOrganizationAccess[];

  current_organization: UserOrganizationAccess | null;
};

function getOrganizationAccessId(organization: UserOrganizationAccess) {
  return organization.organization_id;
}

function hasActiveSubscriptionForOrganization({
  organizationId,
  subscriptions,
}: {
  organizationId: string | null | undefined;
  subscriptions: Profile["subscriptions"];
}) {
  if (!organizationId) return false;

  return subscriptions.some(
    (subscription) =>
      subscription.organization_id === organizationId &&
      ["active", "trialing", "past_due"].includes(subscription.status ?? "")
  );
}

function enrichOrganizationAccess({
  organization,
  subscriptions,
  hasDiscordAccount,
}: {
  organization: UserOrganizationAccess;
  subscriptions: Profile["subscriptions"];
  hasDiscordAccount: boolean;
}): UserOrganizationAccess {
  const organizationId = getOrganizationAccessId(organization);

  const hasActiveSubscription = hasActiveSubscriptionForOrganization({
    organizationId,
    subscriptions,
  });

  const hasDiscordAccess = hasDiscordAccount && hasActiveSubscription;

  return {
    ...organization,
    has_active_subscription:
      organization.has_active_subscription || hasActiveSubscription,
    has_discord_access: organization.has_discord_access || hasDiscordAccess,
  };
}

export async function getProfile({
  organizationId,
  organizationSlug,
}: {
  organizationId?: string;
  organizationSlug?: string;
} = {}): Promise<Profile> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_TRADES!,
    {
      cookies: {
        getAll: () => cookies().getAll(),
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthenticated");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      status,
      theme,
      role_id,
      roles (
        id,
        name,
        rank
      )
    `
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profileData) {
    console.error("getProfile failed", profileError);
    throw new Error("Profile not found");
  }

  const { data: subscriptionsData, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      status,
      plan_id,
      organization_id,
      current_period_end,
      plans (
        id,
        key,
        name
      )
    `
    )
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false });

  if (subscriptionsError) {
    console.error("getProfile subscriptions failed", subscriptionsError);
  }

  const { data: discordAccountsData, error: discordAccountsError } =
    await supabase
      .from("discord_accounts")
      .select(
        `
        id,
        user_id,
        discord_user_id,
        discord_username,
        created_at
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

  if (discordAccountsError) {
    console.error("getProfile discord_accounts failed", discordAccountsError);
  }

  const subscriptions = (subscriptionsData ?? []) as Profile["subscriptions"];

  const discordAccounts = (discordAccountsData ??
    []) as Profile["discord_accounts"];

  const hasDiscordAccount = discordAccounts.some((account) =>
    Boolean(account.discord_user_id)
  );

  const { currentOrganization, organizations } = await getCurrentOrganization({
    userId: user.id,
    organizationId,
    organizationSlug,
  });

  const enrichedOrganizations = organizations.map((organization) =>
    enrichOrganizationAccess({
      organization,
      subscriptions,
      hasDiscordAccount,
    })
  );

  const enrichedCurrentOrganization = currentOrganization
    ? enrichOrganizationAccess({
        organization: currentOrganization,
        subscriptions,
        hasDiscordAccount,
      })
    : null;

  return {
    ...(profileData as Omit<
      Profile,
      | "subscriptions"
      | "discord_accounts"
      | "organizations"
      | "current_organization"
    >),

    subscriptions,

    discord_accounts: discordAccounts,

    organizations: enrichedOrganizations,

    current_organization: enrichedCurrentOrganization,
  };
}