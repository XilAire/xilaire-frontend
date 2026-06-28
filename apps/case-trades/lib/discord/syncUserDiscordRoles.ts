import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

type SyncResult = {
  added: string[];
  removed: string[];
  skipped: string[];
  updated_org_access: string[];
};

type DiscordRoleMapping = {
  product_key: string;
  plan_key: string;
  organization_id: string | null;
  discord_guild_id: string;
  discord_role_id: string;
  active: boolean;
};

type ActiveSubscription = {
  status: string | null;
  organization_id: string | null;
  plan_id: string | null;
  plan:
    | {
        id?: string | null;
        key?: string | null;
      }
    | {
        id?: string | null;
        key?: string | null;
      }[]
    | null;
};

function normalizeJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isEntitledSubscription(status?: string | null) {
  return status === "active" || status === "trialing";
}

export async function syncUserDiscordRoles(
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    added: [],
    removed: [],
    skipped: [],
    updated_org_access: [],
  };

  if (!DISCORD_BOT_TOKEN) {
    throw new Error("Missing DISCORD_BOT_TOKEN.");
  }

  const { data: discordAccount, error: discordError } = await supabase
    .from("discord_accounts")
    .select("discord_user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (discordError) {
    throw discordError;
  }

  if (!discordAccount?.discord_user_id) {
    result.skipped.push("No connected Discord account.");
    return result;
  }

  const { data: roleMappings, error: roleMappingError } = await supabase
    .from("organization_discord_roles")
    .select(
      `
      product_key,
      plan_key,
      organization_id,
      discord_guild_id,
      discord_role_id,
      active
    `
    )
    .eq("active", true);

  if (roleMappingError) {
    throw roleMappingError;
  }

  const mappings = (roleMappings ?? []) as DiscordRoleMapping[];

  if (mappings.length === 0) {
    result.skipped.push("No active Discord role mappings.");
    return result;
  }

  const { data: activeSubscriptions, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select(
      `
      status,
      organization_id,
      plan_id,
      plan:plans (
        id,
        key
      )
    `
    )
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due", "canceled", "expired"]);

  if (subscriptionError) {
    throw subscriptionError;
  }

  const subscriptions = (activeSubscriptions ?? []) as ActiveSubscription[];

  const entitledPlanKeys = new Set<string>();
  const entitledOrganizationIds = new Set<string>();
  const subscriptionByPlanKey = new Map<string, ActiveSubscription>();

  for (const subscription of subscriptions) {
    const plan = normalizeJoinedRow(subscription.plan);
    const planKey = plan?.key;

    if (!planKey) {
      continue;
    }

    subscriptionByPlanKey.set(planKey, subscription);

    if (isEntitledSubscription(subscription.status)) {
      entitledPlanKeys.add(planKey);

      if (subscription.organization_id) {
        entitledOrganizationIds.add(subscription.organization_id);
      }
    }
  }

  const mappingsByGuild = groupMappingsByGuild(mappings);

  for (const [guildId, guildMappings] of mappingsByGuild.entries()) {
    const member = await getDiscordMember({
      guildId,
      userId: discordAccount.discord_user_id,
    });

    if (!member) {
      result.skipped.push(`Discord member not found in guild ${guildId}.`);
      await markOrgAccessInactiveForGuild({
        userId,
        mappings: guildMappings,
        result,
      });
      continue;
    }

    const currentRoleIds = new Set<string>(member.roles ?? []);

    for (const mapping of guildMappings) {
      const shouldHaveRole = entitledPlanKeys.has(mapping.plan_key);
      const currentlyHasRole = currentRoleIds.has(mapping.discord_role_id);

      if (shouldHaveRole && !currentlyHasRole) {
        await addDiscordRole({
          guildId: mapping.discord_guild_id,
          userId: discordAccount.discord_user_id,
          roleId: mapping.discord_role_id,
        });

        result.added.push(mapping.plan_key);
        currentRoleIds.add(mapping.discord_role_id);
      }

      if (!shouldHaveRole && currentlyHasRole) {
        await removeDiscordRole({
          guildId: mapping.discord_guild_id,
          userId: discordAccount.discord_user_id,
          roleId: mapping.discord_role_id,
        });

        result.removed.push(mapping.plan_key);
        currentRoleIds.delete(mapping.discord_role_id);
      }

      await syncOrgAccessForMapping({
        userId,
        mapping,
        shouldHaveRole,
        result,
      });
    }
  }

  await ensureOrganizationMembershipForEntitlements({
    userId,
    organizationIds: Array.from(entitledOrganizationIds),
  });

  return result;
}

async function syncOrgAccessForMapping({
  userId,
  mapping,
  shouldHaveRole,
  result,
}: {
  userId: string;
  mapping: DiscordRoleMapping;
  shouldHaveRole: boolean;
  result: SyncResult;
}) {
  if (!mapping.organization_id) {
    result.skipped.push(
      `Role mapping ${mapping.plan_key} is missing organization_id.`
    );
    return;
  }

  const { error } = await supabase.from("discord_org_access").upsert(
    {
      user_id: userId,
      organization_id: mapping.organization_id,
      status: shouldHaveRole ? "active" : "inactive",
      discord_role_id: mapping.discord_role_id,
    },
    {
      onConflict: "user_id,organization_id",
    }
  );

  if (error) {
    throw error;
  }

  result.updated_org_access.push(
    `${mapping.organization_id}:${shouldHaveRole ? "active" : "inactive"}`
  );
}

async function markOrgAccessInactiveForGuild({
  userId,
  mappings,
  result,
}: {
  userId: string;
  mappings: DiscordRoleMapping[];
  result: SyncResult;
}) {
  const organizationIds = [
    ...new Set(
      mappings
        .map((mapping) => mapping.organization_id)
        .filter(Boolean) as string[]
    ),
  ];

  for (const organizationId of organizationIds) {
    const { error } = await supabase.from("discord_org_access").upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        status: "inactive",
        discord_role_id: null,
      },
      {
        onConflict: "user_id,organization_id",
      }
    );

    if (error) {
      throw error;
    }

    result.updated_org_access.push(`${organizationId}:inactive`);
  }
}

async function ensureOrganizationMembershipForEntitlements({
  userId,
  organizationIds,
}: {
  userId: string;
  organizationIds: string[];
}) {
  for (const organizationId of organizationIds) {
    const { error } = await supabase.from("organization_members").upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        role: "member",
        active: true,
      },
      {
        onConflict: "user_id,organization_id",
      }
    );

    if (error) {
      throw error;
    }
  }
}

function groupMappingsByGuild(mappings: DiscordRoleMapping[]) {
  const grouped = new Map<string, DiscordRoleMapping[]>();

  for (const mapping of mappings) {
    const existing = grouped.get(mapping.discord_guild_id) ?? [];
    existing.push(mapping);
    grouped.set(mapping.discord_guild_id, existing);
  }

  return grouped;
}

async function getDiscordMember({
  guildId,
  userId,
}: {
  guildId: string;
  userId: string;
}): Promise<{ roles?: string[] } | null> {
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    }
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch Discord member: ${res.status} ${text}`);
  }

  return res.json();
}

async function addDiscordRole({
  guildId,
  userId,
  roleId,
}: {
  guildId: string;
  userId: string;
  roleId: string;
}) {
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    }
  );

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to add Discord role: ${res.status} ${text}`);
  }
}

async function removeDiscordRole({
  guildId,
  userId,
  roleId,
}: {
  guildId: string;
  userId: string;
  roleId: string;
}) {
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    }
  );

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Failed to remove Discord role: ${res.status} ${text}`);
  }
}