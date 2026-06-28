import { createClient } from "@supabase/supabase-js";

export type AccessibleOrganization = {
  id: string;
  slug: string;
  name: string;
  description: string | null;

  role?: string | null;
  role_name?: string | null;
  organization_role?: string | null;
  membership_role?: string | null;
  member_role?: string | null;
  access_role?: string | null;

  org_admin?: boolean | null;
  master_admin?: boolean | null;
  can_manage_organization?: boolean | null;

  /**
   * Multi-org access state
   */
  active?: boolean | null;

  subscription_status?: string | null;
  plan_id?: string | null;
  has_active_subscription?: boolean | null;

  discord_status?: string | null;
  discord_role_id?: string | null;
  has_discord_access?: boolean | null;

  is_master_admin?: boolean | null;
};

type Role = {
  name?: string | null;
  rank?: number | null;
};

type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active?: boolean | null;
};

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

function normalizeRole(roleValue: unknown): Role | null {
  if (Array.isArray(roleValue)) {
    return (roleValue[0] as Role) ?? null;
  }

  return (roleValue as Role) ?? null;
}

function normalizeJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isMasterAdminProfile(profile: any) {
  const role = normalizeRole(profile?.roles);

  return Boolean(
    role?.name === "master_admin" ||
      Number(role?.rank ?? 0) >= 4 ||
      String(profile?.email ?? "").toLowerCase() ===
        "csthilaire@xilairetechnologies.com"
  );
}

function isActiveSubscription(status?: string | null) {
  return status === "active" || status === "trialing";
}

function normalizeMembershipRole(role?: string | null) {
  return String(role ?? "member").toLowerCase();
}

function canManageMembershipRole(role?: string | null) {
  const normalizedRole = normalizeMembershipRole(role);

  return (
    normalizedRole === "owner" ||
    normalizedRole === "admin" ||
    normalizedRole === "org_admin" ||
    normalizedRole === "organization_admin" ||
    normalizedRole === "master_admin"
  );
}

function buildAccessibleOrganization({
  organization,
  role,
  masterAdmin = false,
  subscriptionStatus = null,
  planId = null,
  discordStatus = null,
  discordRoleId = null,
}: {
  organization: OrganizationRow;
  role: string;
  masterAdmin?: boolean;
  subscriptionStatus?: string | null;
  planId?: string | null;
  discordStatus?: string | null;
  discordRoleId?: string | null;
}): AccessibleOrganization {
  const normalizedRole = normalizeMembershipRole(role);
  const canManage =
    masterAdmin === true || canManageMembershipRole(normalizedRole);

  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    description: organization.description ?? null,

    role: normalizedRole,
    role_name: normalizedRole,
    organization_role: normalizedRole,
    membership_role: normalizedRole,
    member_role: normalizedRole,
    access_role: normalizedRole,

    org_admin: canManage,
    master_admin: masterAdmin,
    can_manage_organization: canManage,

    active: organization.active !== false,

    subscription_status: masterAdmin ? "master_admin" : subscriptionStatus,
    plan_id: masterAdmin ? null : planId,
    has_active_subscription:
      masterAdmin === true || isActiveSubscription(subscriptionStatus),

    discord_status: masterAdmin ? "master_admin" : discordStatus,
    discord_role_id: masterAdmin ? null : discordRoleId,
    has_discord_access: masterAdmin === true || discordStatus === "active",

    is_master_admin: masterAdmin,
  };
}

export async function getAccessibleOrganizations(
  userId: string
): Promise<AccessibleOrganization[]> {
  const supabase = createSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      role_id,
      roles:roles!profiles_role_id_fkey (
        name,
        rank
      )
    `
    )
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("Organization access profile lookup failed", profileError);
    return [];
  }

  const isMasterAdmin = isMasterAdminProfile(profile);

  if (isMasterAdmin) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, slug, name, description, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Master admin org lookup failed", error);
      return [];
    }

    return (data ?? []).map((organization) =>
      buildAccessibleOrganization({
        organization,
        role: "master_admin",
        masterAdmin: true,
      })
    );
  }

  const orgMap = new Map<string, AccessibleOrganization>();

  const { data: membershipRows, error: membershipError } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      active,
      organization:organizations (
        id,
        slug,
        name,
        description,
        active
      )
    `
    )
    .eq("user_id", userId)
    .eq("active", true);

  if (membershipError) {
    console.error("Organization membership lookup failed", membershipError);
  }

  for (const row of membershipRows ?? []) {
    const organization = normalizeJoinedRow<OrganizationRow>(
      (row as any).organization
    );

    if (!organization || organization.active !== true) {
      continue;
    }

    const membershipRole = normalizeMembershipRole((row as any).role);

    orgMap.set(
      organization.id,
      buildAccessibleOrganization({
        organization,
        role: membershipRole || "member",
        masterAdmin: false,
      })
    );
  }

  const organizationIds = Array.from(orgMap.keys());

  const { data: subscriptionRows, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select(
      `
      status,
      plan_id,
      organization_id,
      organization:organizations (
        id,
        slug,
        name,
        description,
        active
      )
    `
    )
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"]);

  if (subscriptionError) {
    console.error("Organization subscription lookup failed", subscriptionError);
  }

  for (const row of subscriptionRows ?? []) {
    const organization = normalizeJoinedRow<OrganizationRow>(
      (row as any).organization
    );

    if (!organization || organization.active !== true) {
      continue;
    }

    const existingOrganization = orgMap.get(organization.id);
    const subscriptionStatus = (row as any).status ?? null;
    const planId = (row as any).plan_id ?? null;

    if (existingOrganization) {
      orgMap.set(organization.id, {
        ...existingOrganization,
        subscription_status: subscriptionStatus,
        plan_id: planId,
        has_active_subscription: isActiveSubscription(subscriptionStatus),
      });

      continue;
    }

    orgMap.set(
      organization.id,
      buildAccessibleOrganization({
        organization,
        role: "subscriber",
        masterAdmin: false,
        subscriptionStatus,
        planId,
      })
    );
  }

  const allKnownOrganizationIds = Array.from(
    new Set([
      ...organizationIds,
      ...Array.from(orgMap.keys()),
    ])
  );

  if (allKnownOrganizationIds.length > 0) {
    const { data: discordRows, error: discordError } = await supabase
      .from("discord_org_access")
      .select("organization_id, status, discord_role_id")
      .eq("user_id", userId)
      .in("organization_id", allKnownOrganizationIds);

    if (discordError) {
      console.error("Organization Discord access lookup failed", discordError);
    }

    for (const row of discordRows ?? []) {
      const organizationId = (row as any).organization_id;
      const existingOrganization = orgMap.get(organizationId);

      if (!existingOrganization) {
        continue;
      }

      orgMap.set(organizationId, {
        ...existingOrganization,
        discord_status: (row as any).status ?? null,
        discord_role_id: (row as any).discord_role_id ?? null,
        has_discord_access: (row as any).status === "active",
      });
    }
  }

  return Array.from(orgMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}