import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import type { VaultRole } from "./types";

type SupportScope =
  | "metadata_only"
  | "vault_search_only"
  | "vault_read_only"
  | "export_management"
  | "billing_only"
  | "full_support_admin"
  | "break_glass_full";

type PlatformRole =
  | "super_global_admin"
  | "global_admin"
  | "support_admin"
  | "support_analyst"
  | "internal_billing_admin"
  | "internal_compliance_admin";

type VaultActor = {
  userId: string;
  orgId: string;
  email: string | null;
};

export type VaultAccessContext = {
  actorUserId: string;
  actorEmail: string | null;
  actorHomeOrgId: string;
  targetOrgId: string;
  accessPath: "org_role" | "support_grant";
  grantedVaultRoles: VaultRole[];
  grantedSupportScope: SupportScope | null;
  platformRoles: PlatformRole[];
  isPlatformAdmin: boolean;
  isSuperGlobalAdmin: boolean;
};

type RequireVaultAccessOptions = {
  requiredVaultRoles?: VaultRole[];
  supportScope?: SupportScope;
  targetOrgId?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Vault API is missing required Supabase environment variables.");
}

function normalizeId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

export function getVaultAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getVaultAuthClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function getBearerToken(request: NextRequest): string | null {
  const authHeader =
    request.headers.get("authorization") || request.headers.get("Authorization");

  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim();
}

export function getTargetOrgIdFromRequest(request: NextRequest): string | null {
  const headerOrgId =
    request.headers.get("x-org-id") ||
    request.headers.get("x-target-org-id") ||
    request.headers.get("X-Org-Id") ||
    request.headers.get("X-Target-Org-Id");

  if (headerOrgId?.trim()) {
    return normalizeId(headerOrgId);
  }

  const queryOrgId = request.nextUrl.searchParams.get("orgId");
  if (queryOrgId?.trim()) {
    return normalizeId(queryOrgId);
  }

  return null;
}

export async function requireVaultActor(request: NextRequest): Promise<VaultActor> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("Missing bearer token.");
  }

  const authClient = getVaultAuthClient(token);
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user?.id) {
    throw new Error("Unable to authenticate request.");
  }

  const adminClient = getVaultAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, org_id, email, status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.id) {
    throw new Error("Unable to resolve profile for authenticated user.");
  }

  const normalizedUserId = normalizeId(profile.id);
  const normalizedOrgId = normalizeId(profile.org_id);
  const normalizedEmail = normalizeEmail(profile.email ?? user.email ?? null);

  if (!normalizedUserId) {
    throw new Error("Authenticated profile is missing a valid id.");
  }

  if (!normalizedOrgId) {
    throw new Error("Authenticated profile is missing org_id.");
  }

  if (String(profile.status ?? "").toLowerCase() !== "active") {
    throw new Error("Authenticated profile is not active.");
  }

  return {
    userId: normalizedUserId,
    orgId: normalizedOrgId,
    email: normalizedEmail,
  };
}

async function getPlatformRoles(userId: string): Promise<PlatformRole[]> {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to resolve platform roles: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => String(row.role || "").trim())
    .filter(Boolean) as PlatformRole[];
}

async function getVaultRolesForOrg(orgId: string, userId: string): Promise<VaultRole[]> {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_user_roles")
    .select("role, org_id, user_id")
    .filter("org_id", "eq", orgId)
    .filter("user_id", "eq", userId);

  if (error) {
    throw new Error(`Unable to resolve Vault roles: ${error.message}`);
  }

  console.log("VAULT ROLE LOOKUP DEBUG", {
    input_org_id: orgId,
    input_user_id: userId,
    rows: data,
  });

  return (data ?? [])
    .map((row) => String(row.role || "").trim())
    .filter(Boolean) as VaultRole[];
}

async function getHighestSupportScope(
  orgId: string,
  userId: string
): Promise<SupportScope | null> {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient.rpc("get_highest_support_scope", {
    p_org_id: orgId,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Unable to resolve support scope: ${error.message}`);
  }

  return (data ?? null) as SupportScope | null;
}

async function supportScopeAllows(
  orgId: string,
  userId: string,
  requiredScope: SupportScope
): Promise<boolean> {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient.rpc("support_scope_allows", {
    p_org_id: orgId,
    p_user_id: userId,
    p_required_scope: requiredScope,
  });

  if (error) {
    throw new Error(`Support scope check failed: ${error.message}`);
  }

  return Boolean(data);
}

function arrayHasIntersection<T extends string>(source: T[], required: T[]): boolean {
  if (!required.length) return true;

  const sourceSet = new Set(source.map((value) => String(value).trim()));
  return required.some((value) => sourceSet.has(String(value).trim()));
}

export async function requireVaultRole(
  request: NextRequest,
  allowedRoles: VaultRole[]
): Promise<VaultActor> {
  const actor = await requireVaultActor(request);
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient.rpc("has_any_vault_role", {
    p_org_id: actor.orgId,
    p_user_id: actor.userId,
    p_roles: allowedRoles,
  });

  if (error) {
    throw new Error(`Vault role check failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      `Vault role check failed. user_id=${actor.userId} org_id=${actor.orgId} required_roles=${allowedRoles.join(",")}`
    );
  }

  return actor;
}

export async function requireVaultAccess(
  request: NextRequest,
  options: RequireVaultAccessOptions = {}
): Promise<VaultAccessContext> {
  const actor = await requireVaultActor(request);

  const targetOrgId =
    normalizeId(options.targetOrgId?.trim() || null) ||
    getTargetOrgIdFromRequest(request) ||
    actor.orgId;

  if (!targetOrgId) {
    throw new Error("Unable to determine target org for Vault access.");
  }

  const requiredVaultRoles = options.requiredVaultRoles ?? [];
  const requiredSupportScope = options.supportScope ?? null;

  const [platformRoles, vaultRolesForTargetOrg] = await Promise.all([
    getPlatformRoles(actor.userId),
    getVaultRolesForOrg(targetOrgId, actor.userId),
  ]);

  const isPlatformAdmin =
    platformRoles.includes("global_admin") ||
    platformRoles.includes("super_global_admin");

  const isSuperGlobalAdmin = platformRoles.includes("super_global_admin");

  const sameOrg = actor.orgId === targetOrgId;

  const orgRoleAllowed =
    sameOrg &&
    (
      requiredVaultRoles.length === 0 ||
      arrayHasIntersection(vaultRolesForTargetOrg, requiredVaultRoles)
    );

  if (orgRoleAllowed) {
    return {
      actorUserId: actor.userId,
      actorEmail: actor.email,
      actorHomeOrgId: actor.orgId,
      targetOrgId,
      accessPath: "org_role",
      grantedVaultRoles: vaultRolesForTargetOrg,
      grantedSupportScope: null,
      platformRoles,
      isPlatformAdmin,
      isSuperGlobalAdmin,
    };
  }

  const internalSupportEligible =
    platformRoles.includes("support_analyst") ||
    platformRoles.includes("support_admin") ||
    platformRoles.includes("internal_compliance_admin") ||
    platformRoles.includes("global_admin") ||
    platformRoles.includes("super_global_admin");

  if (!internalSupportEligible) {
    throw new Error(
      [
        "Vault access denied.",
        `actor_user_id=${actor.userId}`,
        `actor_email=${actor.email ?? "unknown"}`,
        `actor_org_id=${actor.orgId}`,
        `target_org_id=${targetOrgId}`,
        `same_org=${sameOrg}`,
        `granted_vault_roles=${vaultRolesForTargetOrg.join(",") || "none"}`,
        `required_vault_roles=${requiredVaultRoles.join(",") || "none"}`,
        `platform_roles=${platformRoles.join(",") || "none"}`,
      ].join(" ")
    );
  }

  if (!requiredSupportScope) {
    throw new Error("Support-scope enforcement is required for internal support access.");
  }

  const allowedBySupportScope = await supportScopeAllows(
    targetOrgId,
    actor.userId,
    requiredSupportScope
  );

  if (!allowedBySupportScope) {
    throw new Error(
      [
        "Vault support access denied.",
        `actor_user_id=${actor.userId}`,
        `actor_email=${actor.email ?? "unknown"}`,
        `actor_org_id=${actor.orgId}`,
        `target_org_id=${targetOrgId}`,
        `required_support_scope=${requiredSupportScope}`,
        `platform_roles=${platformRoles.join(",") || "none"}`,
      ].join(" ")
    );
  }

  const grantedSupportScope = await getHighestSupportScope(targetOrgId, actor.userId);

  return {
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorHomeOrgId: actor.orgId,
    targetOrgId,
    accessPath: "support_grant",
    grantedVaultRoles: vaultRolesForTargetOrg,
    grantedSupportScope,
    platformRoles,
    isPlatformAdmin,
    isSuperGlobalAdmin,
  };
}

export async function writeVaultAuditLog(params: {
  orgId: string;
  action: string;
  actorUserId: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId?: string | null;
  status?: "success" | "failure" | "warning";
  details?: Record<string, unknown>;
  request?: NextRequest;
}) {
  const adminClient = getVaultAdminClient();

  const forwardedFor = params.request?.headers.get("x-forwarded-for") || null;
  const userAgent = params.request?.headers.get("user-agent") || null;

  const { error } = await adminClient.rpc("vault_write_audit_log", {
    p_org_id: params.orgId,
    p_action: params.action,
    p_actor_user_id: params.actorUserId,
    p_actor_email: params.actorEmail,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId ?? null,
    p_status: params.status ?? "success",
    p_details: params.details ?? {},
    p_ip_address: forwardedFor,
    p_user_agent: userAgent,
  });

  if (error) {
    throw new Error(`Failed to write Vault audit log: ${error.message}`);
  }
}

export async function writeSupportAccessAuditLog(params: {
  orgId: string;
  sessionId?: string | null;
  grantId?: string | null;
  supportUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const adminClient = getVaultAdminClient();

  const { error } = await adminClient.rpc("write_support_access_audit_log", {
    p_org_id: params.orgId,
    p_session_id: params.sessionId ?? null,
    p_grant_id: params.grantId ?? null,
    p_support_user_id: params.supportUserId,
    p_action: params.action,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId ?? null,
    p_details: params.details ?? {},
  });

  if (error) {
    throw new Error(`Failed to write support access audit log: ${error.message}`);
  }
}

export async function writeUnifiedVaultAccessAuditLog(params: {
  access: VaultAccessContext;
  action: string;
  entityType: string;
  entityId?: string | null;
  status?: "success" | "failure" | "warning";
  details?: Record<string, unknown>;
  request?: NextRequest;
  supportSessionId?: string | null;
  supportGrantId?: string | null;
}) {
  await writeVaultAuditLog({
    orgId: params.access.targetOrgId,
    action: params.action,
    actorUserId: params.access.actorUserId,
    actorEmail: params.access.actorEmail,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    status: params.status ?? "success",
    details: {
      ...(params.details ?? {}),
      access_path: params.access.accessPath,
      actor_home_org_id: params.access.actorHomeOrgId,
      target_org_id: params.access.targetOrgId,
      platform_roles: params.access.platformRoles,
      granted_vault_roles: params.access.grantedVaultRoles,
      granted_support_scope: params.access.grantedSupportScope,
      is_platform_admin: params.access.isPlatformAdmin,
      is_super_global_admin: params.access.isSuperGlobalAdmin,
    },
    request: params.request,
  });

  if (params.access.accessPath === "support_grant") {
    await writeSupportAccessAuditLog({
      orgId: params.access.targetOrgId,
      sessionId: params.supportSessionId ?? null,
      grantId: params.supportGrantId ?? null,
      supportUserId: params.access.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      details: {
        ...(params.details ?? {}),
        actor_home_org_id: params.access.actorHomeOrgId,
        target_org_id: params.access.targetOrgId,
        platform_roles: params.access.platformRoles,
        granted_support_scope: params.access.grantedSupportScope,
      },
    });
  }
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json(
    {
      ok: false,
      error: message,
      ...(extra ?? {}),
    },
    { status }
  );
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return Response.json(
    {
      ok: true,
      ...data,
    },
    { status }
  );
}