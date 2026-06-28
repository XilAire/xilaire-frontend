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

async function getMasterAdminStatus(userId: string) {
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

  return (
    profileRole?.name === "master_admin" ||
    profileRole?.rank === 4 ||
    String((profile as any)?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

export async function getUserOrganizations(
  userId: string
): Promise<UserOrganizationAccess[]> {
  const supabase = createSupabaseAdmin();
  const isMasterAdmin = await getMasterAdminStatus(userId);

  if (isMasterAdmin) {
    const { data: organizations, error } = await supabase
      .from("organizations")
      .select("id, slug, name, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("getUserOrganizations master admin failed", error);
      return [];
    }

    return (organizations ?? []).map((organization) => ({
      organization_id: organization.id,
      organization_slug: organization.slug,
      organization_name: organization.name,
      role: "owner",
      active: organization.active === true,

      subscription_status: "master_admin",
      plan_id: null,
      has_active_subscription: true,

      discord_status: "master_admin",
      discord_role_id: null,
      has_discord_access: true,

      is_master_admin: true,
    }));
  }

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      active,
      organizations (
        id,
        slug,
        name,
        active
      )
    `
    )
    .eq("user_id", userId)
    .eq("active", true);

  if (error) {
    console.error("getUserOrganizations failed", error);
    return [];
  }

  const organizationRows = (memberships ?? [])
    .map((membership: any) => {
      const organization = normalizeJoinedRow(membership.organizations);

      if (!organization || organization.active !== true) {
        return null;
      }

      return {
        membership,
        organization,
      };
    })
    .filter(Boolean) as Array<{
    membership: {
      role: OrganizationRole;
      active: boolean;
    };
    organization: {
      id: string;
      slug: string;
      name: string;
      active: boolean;
    };
  }>;

  const organizationIds = organizationRows.map((row) => row.organization.id);

  if (organizationIds.length === 0) {
    return [];
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("organization_id, status, plan_id")
    .eq("user_id", userId)
    .in("organization_id", organizationIds);

  const { data: discordAccessRows } = await supabase
    .from("discord_org_access")
    .select("organization_id, status, discord_role_id")
    .eq("user_id", userId)
    .in("organization_id", organizationIds);

  return organizationRows.map(({ membership, organization }) => {
    const subscription = subscriptions?.find(
      (row) => row.organization_id === organization.id
    );

    const discordAccess = discordAccessRows?.find(
      (row) => row.organization_id === organization.id
    );

    const subscriptionStatus = subscription?.status ?? null;
    const discordStatus = discordAccess?.status ?? null;

    return {
      organization_id: organization.id,
      organization_slug: organization.slug,
      organization_name: organization.name,
      role: membership.role,

      active: membership.active === true && organization.active === true,

      subscription_status: subscriptionStatus,
      plan_id: subscription?.plan_id ?? null,
      has_active_subscription: isActiveSubscription(subscriptionStatus),

      discord_status: discordStatus,
      discord_role_id: discordAccess?.discord_role_id ?? null,
      has_discord_access: discordStatus === "active",

      is_master_admin: false,
    };
  });
}