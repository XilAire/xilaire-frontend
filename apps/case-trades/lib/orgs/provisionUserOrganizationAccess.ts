"use server";

import { createClient } from "@supabase/supabase-js";

export type ProvisionOrganizationRole =
  | "owner"
  | "admin"
  | "analyst"
  | "member";

export type ProvisionDiscordStatus =
  | "active"
  | "inactive"
  | "pending"
  | "removed";

export type ProvisionSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired"
  | "inactive";

export type ProvisionUserOrganizationAccessInput = {
  userId: string;
  organizationId: string;

  role?: ProvisionOrganizationRole;

  subscriptionStatus?: ProvisionSubscriptionStatus;
  planId?: string | null;

  discordStatus?: ProvisionDiscordStatus;
  discordRoleId?: string | null;
};

export type ProvisionUserOrganizationAccessResult =
  | {
      success: true;
      user_id: string;
      organization_id: string;
    }
  | {
      success: false;
      error: string;
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

export async function provisionUserOrganizationAccess({
  userId,
  organizationId,
  role = "member",
  subscriptionStatus = "inactive",
  planId = null,
  discordStatus = "inactive",
  discordRoleId = null,
}: ProvisionUserOrganizationAccessInput): Promise<ProvisionUserOrganizationAccessResult> {
  if (!userId) {
    return {
      success: false,
      error: "Missing userId.",
    };
  }

  if (!organizationId) {
    return {
      success: false,
      error: "Missing organizationId.",
    };
  }

  const supabase = createSupabaseAdmin();

  const { error: membershipError } = await supabase
    .from("organization_members")
    .upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        role,
        active: true,
      },
      {
        onConflict: "user_id,organization_id",
      }
    );

  if (membershipError) {
    console.error("provisionUserOrganizationAccess membership failed", {
      userId,
      organizationId,
      error: membershipError,
    });

    return {
      success: false,
      error: "Failed to provision organization membership.",
    };
  }

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        status: subscriptionStatus,
        plan_id: planId,
      },
      {
        onConflict: "user_id,organization_id",
      }
    );

  if (subscriptionError) {
    console.error("provisionUserOrganizationAccess subscription failed", {
      userId,
      organizationId,
      error: subscriptionError,
    });

    return {
      success: false,
      error: "Organization membership was created, but subscription provisioning failed.",
    };
  }

  const { error: discordError } = await supabase
    .from("discord_org_access")
    .upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        status: discordStatus,
        discord_role_id: discordRoleId,
      },
      {
        onConflict: "user_id,organization_id",
      }
    );

  if (discordError) {
    console.error("provisionUserOrganizationAccess discord access failed", {
      userId,
      organizationId,
      error: discordError,
    });

    return {
      success: false,
      error: "Membership and subscription were created, but Discord access provisioning failed.",
    };
  }

  return {
    success: true,
    user_id: userId,
    organization_id: organizationId,
  };
}