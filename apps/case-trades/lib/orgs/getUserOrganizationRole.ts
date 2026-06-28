import { createClient } from "@supabase/supabase-js";

import type {
  OrganizationRole,
  UserOrganizationAccess,
} from "./types";

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function normalizeJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isActiveSubscription(status?: string | null) {
  return status === "active" || status === "trialing";
}

export async function getUserOrganizationRole({
  userId,
  organizationSlug,
}: {
  userId: string;
  organizationSlug: string;
}): Promise<UserOrganizationAccess | null> {
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      roles:roles!profiles_role_id_fkey (
        name,
        rank
      )
    `
    )
    .eq("id", userId)
    .single();

  const profileRole = normalizeJoinedRow((profile as any)?.roles);

  const isMasterAdmin =
    profileRole?.name === "master_admin" ||
    profileRole?.rank === 4 ||
    String((profile as any)?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com";

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, slug, name, active")
    .eq("slug", organizationSlug)
    .single();

  if (orgError || !organization || organization.active !== true) {
    return null;
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan_id")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: discordAccess } = await supabase
    .from("discord_org_access")
    .select("status, discord_role_id")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .maybeSingle();

  const subscriptionStatus = subscription?.status ?? null;
  const discordStatus = discordAccess?.status ?? null;

  if (isMasterAdmin) {
    return {
      organization_id: organization.id,
      organization_slug: organization.slug,
      organization_name: organization.name,
      role: "owner",
      active: true,

      subscription_status: subscriptionStatus,
      plan_id: subscription?.plan_id ?? null,
      has_active_subscription: true,

      discord_status: discordStatus,
      discord_role_id: discordAccess?.discord_role_id ?? null,
      has_discord_access: true,

      is_master_admin: true,
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role, active")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .single();

  if (membershipError || !membership || membership.active !== true) {
    return null;
  }

  return {
    organization_id: organization.id,
    organization_slug: organization.slug,
    organization_name: organization.name,
    role: membership.role as OrganizationRole,
    active: membership.active,

    subscription_status: subscriptionStatus,
    plan_id: subscription?.plan_id ?? null,
    has_active_subscription: isActiveSubscription(subscriptionStatus),

    discord_status: discordStatus,
    discord_role_id: discordAccess?.discord_role_id ?? null,
    has_discord_access: discordStatus === "active",

    is_master_admin: false,
  };
}

export function canManageOrganization(role: OrganizationRole) {
  return role === "owner" || role === "admin";
}

export function canManageOrganizationSignals(role: OrganizationRole) {
  return role === "owner" || role === "admin" || role === "analyst";
}

export function canManageOrganizationBilling(role: OrganizationRole) {
  return role === "owner";
}

export function canViewOrganizationSignals(
  access: UserOrganizationAccess | null
) {
  if (!access || access.active !== true) {
    return false;
  }

  if (access.is_master_admin) {
    return true;
  }

  return access.has_active_subscription && access.has_discord_access;
}