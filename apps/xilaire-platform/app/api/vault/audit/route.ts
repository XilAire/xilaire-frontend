import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

type VaultAuditStatus = "success" | "failure" | "warning";

function toInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function sanitizeLimit(value: number): number {
  if (value < 1) return 25;
  if (value > 200) return 200;
  return value;
}

function sanitizeOffset(value: number): number {
  if (value < 0) return 0;
  return value;
}

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, "\\$&");
}

function getSupportContext(request: NextRequest) {
  const supportSessionId =
    request.headers.get("x-support-session-id") ||
    request.headers.get("X-Support-Session-Id") ||
    request.nextUrl.searchParams.get("supportSessionId") ||
    null;

  const supportGrantId =
    request.headers.get("x-support-grant-id") ||
    request.headers.get("X-Support-Grant-Id") ||
    request.nextUrl.searchParams.get("supportGrantId") ||
    null;

  return {
    supportSessionId,
    supportGrantId,
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "full_support_admin",
    });

    const adminClient = getVaultAdminClient();
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const action = request.nextUrl.searchParams.get("action")?.trim() || null;
    const entityType = request.nextUrl.searchParams.get("entityType")?.trim() || null;
    const actorUserId = request.nextUrl.searchParams.get("actorUserId")?.trim() || null;
    const statusParam = request.nextUrl.searchParams.get("status")?.trim() || null;
    const dateFrom = request.nextUrl.searchParams.get("dateFrom")?.trim() || null;
    const dateTo = request.nextUrl.searchParams.get("dateTo")?.trim() || null;
    const q = request.nextUrl.searchParams.get("q")?.trim() || null;
    const limit = sanitizeLimit(toInt(request.nextUrl.searchParams.get("limit"), 50));
    const offset = sanitizeOffset(toInt(request.nextUrl.searchParams.get("offset"), 0));

    let query = adminClient
      .from("vault_audit_logs")
      .select(
        `
        id,
        org_id,
        action,
        actor_user_id,
        actor_email,
        entity_type,
        entity_id,
        status,
        details,
        ip_address,
        user_agent,
        created_at
        `,
        { count: "exact" }
      )
      .eq("org_id", access.targetOrgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq("action", action);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (actorUserId) {
      query = query.eq("actor_user_id", actorUserId);
    }

    if (statusParam) {
      query = query.eq("status", statusParam as VaultAuditStatus);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    if (q) {
      const safeQ = escapeLike(q);
      query = query.or(
        [
          `action.ilike.%${safeQ}%`,
          `entity_type.ilike.%${safeQ}%`,
          `actor_email.ilike.%${safeQ}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Vault audit lookup failed: ${error.message}`);
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.audit.list",
      entityType: "vault_audit_log",
      status: "success",
      details: {
        filters: {
          action,
          entityType,
          actorUserId,
          status: statusParam,
          dateFrom,
          dateTo,
          q,
          limit,
          offset,
        },
        result_count: count ?? 0,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      items: data ?? [],
      total: count ?? 0,
      limit,
      offset,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vault audit lookup failed.";

    const lower = message.toLowerCase();
    const status =
      lower.includes("permission") ||
      lower.includes("support grant") ||
      lower.includes("scope")
        ? 403
        : lower.includes("authenticate") || lower.includes("bearer token")
        ? 401
        : 400;

    return jsonError(message, status);
  }
}