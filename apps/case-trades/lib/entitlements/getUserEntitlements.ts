import { createClient } from "@supabase/supabase-js";

export type CaseEntitlements = {
  signals: {
    active: boolean;
    discord: boolean;
    options_signals: boolean;
  };

  journal: {
    active: boolean;
    stocks: boolean;
    options: boolean;
    ai_review: boolean;
    trade_grading: boolean;
    playbooks: boolean;
    exports: boolean;
    analytics: "none" | "basic" | "pro" | "elite";
    tier: "starter" | "pro" | "elite" | "admin" | null;
  };

  discord: {
    connected: boolean;
    active: boolean;
    username: string | null;
    user_id: string | null;
    role_ids: string[];
  };

  subscription: {
    active: boolean;
    status: string | null;
    plan_id: string | null;
    plan_key: string | null;
    plan_name: string | null;
    organization_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };

  organization: {
    id: string | null;
    active: boolean;
    member: boolean;
    role: string | null;
  };

  admin: {
    active: boolean;
    role_name: string | null;
    rank: number | null;
  };
};

type PlanRow = {
  id: string;
  key: string | null;
  name: string | null;
  active: boolean | null;
  organization_id: string | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string | null;
  organization_id: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  plans: PlanRow | PlanRow[] | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  status: string | null;
  role_id: string | null;
  discord_user_id?: string | null;
  discord_username?: string | null;
  discord_connected?: boolean | null;
  discord_roles?: string[] | null;
  roles:
    | {
        id: string;
        name: string;
        rank: number;
      }
    | {
        id: string;
        name: string;
        rank: number;
      }[]
    | null;
};

type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  active: boolean | null;
};

type OrganizationRow = {
  id: string;
  name: string | null;
  slug: string | null;
  has_active_subscription?: boolean | null;
  has_discord_access?: boolean | null;
};

type DiscordAccountRow = {
  id: string;
  user_id: string;
  discord_user_id: string | null;
  discord_username: string | null;
  created_at: string | null;
};

type DiscordOrgAccessRow = {
  status: string | null;
  discord_role_id: string | null;
};

function getSupabaseServiceClient() {
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

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function isActiveSubscription(subscription: SubscriptionRow) {
  return (
    ["active", "trialing", "past_due"].includes(subscription.status ?? "") ||
    Boolean(subscription.cancel_at_period_end)
  );
}

function textIncludes(value: string | null | undefined, needle: string) {
  return String(value ?? "").toLowerCase().includes(needle);
}

function subscriptionMatchesFeature(
  subscription: SubscriptionRow,
  feature: "signals" | "journal"
) {
  const plan = normalizeSingle(subscription.plans);

  return textIncludes(plan?.key, feature) || textIncludes(plan?.name, feature);
}

function getJournalTier(
  subscriptions: SubscriptionRow[],
  adminActive: boolean
): CaseEntitlements["journal"]["tier"] {
  if (adminActive) return "admin";

  const activeJournalPlans = subscriptions
    .filter(isActiveSubscription)
    .filter((subscription) => subscriptionMatchesFeature(subscription, "journal"))
    .map((subscription) => normalizeSingle(subscription.plans))
    .filter(Boolean);

  const keys = activeJournalPlans.map((plan) =>
    String(plan?.key ?? plan?.name ?? "").toLowerCase()
  );

  if (keys.some((key) => key.includes("elite"))) return "elite";
  if (keys.some((key) => key.includes("pro"))) return "pro";
  if (keys.some((key) => key.includes("starter"))) return "starter";

  return activeJournalPlans.length > 0 ? "starter" : null;
}

function getAnalyticsTier(
  tier: CaseEntitlements["journal"]["tier"]
): CaseEntitlements["journal"]["analytics"] {
  if (tier === "admin" || tier === "elite") return "elite";
  if (tier === "pro") return "pro";
  if (tier === "starter") return "basic";
  return "none";
}

function getPrimarySubscription(subscriptions: SubscriptionRow[]) {
  return subscriptions.find(isActiveSubscription) ?? subscriptions[0] ?? null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export async function getUserEntitlements(
  userId: string,
  organizationId?: string | null
): Promise<CaseEntitlements> {
  const supabase = getSupabaseServiceClient();

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      status,
      role_id,
      discord_user_id,
      discord_username,
      discord_connected,
      discord_roles,
      roles (
        id,
        name,
        rank
      )
    `
    )
    .eq("id", userId)
    .maybeSingle();

  const profile = profileData as ProfileRow | null;
  const role = normalizeSingle(profile?.roles);

  const adminActive =
    Boolean(role?.name) &&
    ["master_admin", "admin", "owner", "super_admin"].includes(
      String(role?.name).toLowerCase()
    );

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      user_id,
      plan_id,
      organization_id,
      status,
      current_period_end,
      cancel_at_period_end,
      plans (
        id,
        key,
        name,
        active,
        organization_id
      )
    `
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const allSubscriptions = (subscriptionData ?? []) as SubscriptionRow[];

  const activeSubscriptionOrgId =
    allSubscriptions.find(isActiveSubscription)?.organization_id ??
    normalizeSingle(allSubscriptions.find(isActiveSubscription)?.plans)
      ?.organization_id ??
    null;

  const fallbackSubscriptionOrgId =
    allSubscriptions[0]?.organization_id ??
    normalizeSingle(allSubscriptions[0]?.plans)?.organization_id ??
    null;

  const resolvedOrganizationId =
    organizationId ?? activeSubscriptionOrgId ?? fallbackSubscriptionOrgId ?? null;

  const subscriptions = resolvedOrganizationId
    ? allSubscriptions.filter((subscription) => {
        const plan = normalizeSingle(subscription.plans);

        return (
          subscription.organization_id === resolvedOrganizationId ||
          plan?.organization_id === resolvedOrganizationId ||
          (!subscription.organization_id && !plan?.organization_id)
        );
      })
    : allSubscriptions;

  const primarySubscription = getPrimarySubscription(subscriptions);
  const primaryPlan = normalizeSingle(primarySubscription?.plans);

  const { data: organizationMemberData } = resolvedOrganizationId
    ? await supabase
        .from("organization_members")
        .select("id, organization_id, user_id, role, active")
        .eq("user_id", userId)
        .eq("organization_id", resolvedOrganizationId)
        .maybeSingle()
    : { data: null };

  const organizationMember =
    organizationMemberData as OrganizationMemberRow | null;

  const { data: organizationData } = resolvedOrganizationId
    ? await supabase
        .from("organizations")
        .select("id, name, slug, has_active_subscription, has_discord_access")
        .eq("id", resolvedOrganizationId)
        .maybeSingle()
    : { data: null };

  const organization = organizationData as OrganizationRow | null;

  const hasActiveSubscription =
    subscriptions.some(isActiveSubscription) ||
    Boolean(organization?.has_active_subscription);

  const hasSignalsSubscription =
    subscriptions
      .filter(isActiveSubscription)
      .some((subscription) =>
        subscriptionMatchesFeature(subscription, "signals")
      ) || Boolean(organization?.has_active_subscription);

  const hasJournalSubscription = subscriptions
    .filter(isActiveSubscription)
    .some((subscription) => subscriptionMatchesFeature(subscription, "journal"));

  const { data: discordAccountData } = await supabase
    .from("discord_accounts")
    .select("id, user_id, discord_user_id, discord_username, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const discordAccount = discordAccountData as DiscordAccountRow | null;

  const { data: discordOrgAccessData } = resolvedOrganizationId
    ? await supabase
        .from("discord_org_access")
        .select("status, discord_role_id")
        .eq("user_id", userId)
        .eq("organization_id", resolvedOrganizationId)
    : { data: [] };

  const discordOrgAccess = (discordOrgAccessData ??
    []) as DiscordOrgAccessRow[];

  const discordRoleIds = uniqueStrings([
    ...(profile?.discord_roles ?? []),
    ...discordOrgAccess.map((row) => row.discord_role_id),
  ]);

  const discordUserId =
    discordAccount?.discord_user_id ?? profile?.discord_user_id ?? null;

  const discordUsername =
    discordAccount?.discord_username ?? profile?.discord_username ?? null;

  const discordConnected =
    Boolean(discordUserId) || Boolean(profile?.discord_connected);

  const hasDiscordOrgAccess =
    Boolean(organization?.has_discord_access) ||
    discordOrgAccess.some(
      (row) => String(row.status).toLowerCase() === "active"
    );

  const discordActive =
    discordConnected &&
    (hasSignalsSubscription ||
      hasActiveSubscription ||
      hasDiscordOrgAccess ||
      adminActive);

  const journalTier = getJournalTier(subscriptions, adminActive);
  const journalActive = adminActive || hasJournalSubscription;

  return {
    signals: {
      active: adminActive || hasSignalsSubscription,
      discord: adminActive || hasSignalsSubscription || hasDiscordOrgAccess,
      options_signals: adminActive || hasSignalsSubscription,
    },

    journal: {
      active: journalActive,
      stocks: journalActive,
      options: journalTier === "pro" || journalTier === "elite" || adminActive,
      ai_review: journalTier === "elite" || adminActive,
      trade_grading: journalTier === "elite" || adminActive,
      playbooks: journalTier === "elite" || adminActive,
      exports: journalTier === "elite" || adminActive,
      analytics: getAnalyticsTier(journalTier),
      tier: journalTier,
    },

    discord: {
      connected: discordConnected,
      active: discordActive,
      username: discordUsername,
      user_id: discordUserId,
      role_ids: discordRoleIds,
    },

    subscription: {
      active: hasActiveSubscription,
      status: primarySubscription?.status ?? null,
      plan_id: primarySubscription?.plan_id ?? null,
      plan_key: primaryPlan?.key ?? null,
      plan_name: primaryPlan?.name ?? null,
      organization_id: resolvedOrganizationId,
      current_period_end: primarySubscription?.current_period_end ?? null,
      cancel_at_period_end: Boolean(primarySubscription?.cancel_at_period_end),
    },

    organization: {
      id: resolvedOrganizationId,
      active: Boolean(organizationMember?.active),
      member: Boolean(organizationMember?.active),
      role: organizationMember?.role ?? null,
    },

    admin: {
      active: adminActive,
      role_name: role?.name ?? null,
      rank: role?.rank ?? null,
    },
  };
}