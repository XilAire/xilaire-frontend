import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VaultAuditLogRow = {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string | null;
  support_scope: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string | null;
  status: string | null;
  priority: string | null;
  deleted_at: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function getAccessOrgId(access: unknown): string {
  const record = access as Record<string, unknown> | null;

  const orgId =
    normalizeString(record?.orgId) ??
    normalizeString(record?.org_id) ??
    normalizeString(record?.targetOrgId) ??
    normalizeString(record?.target_org_id) ??
    normalizeString(
      record?.profile && typeof record.profile === "object"
        ? (record.profile as Record<string, unknown>).org_id
        : null
    ) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).org_id
        : null
    );

  if (!orgId) {
    throw new Error("Unable to resolve Vault org context from access object.");
  }

  return orgId;
}

function getActivityCategory(action: string | null) {
  const normalized = normalizeString(action)?.toLowerCase() ?? "";

  if (normalized.includes(".members.")) return "members";
  if (normalized.includes(".summary")) return "summary";
  if (normalized.includes(".search")) return "search";
  if (normalized.includes(".message")) return "message";
  if (normalized.includes(".hold")) return "hold";
  if (normalized.includes(".export")) return "export";
  if (normalized.includes(".delete")) return "case";
  if (normalized.includes(".update")) return "case";
  if (normalized.includes(".create")) return "case";

  return "general";
}

function getActivityLabel(action: string | null) {
  const normalized = normalizeString(action)?.toLowerCase() ?? "";

  if (normalized === "vault.case.members.list") return "Case members viewed";
  if (normalized === "vault.case.members.add") return "Case member added";
  if (normalized === "vault.case.members.add.failed") return "Case member add failed";
  if (normalized === "vault.case.members.add.validation_failed") {
    return "Case member validation failed";
  }
  if (normalized === "vault.case.members.update") return "Case member role updated";
  if (normalized === "vault.case.members.update.failed") {
    return "Case member role update failed";
  }
  if (normalized === "vault.case.members.remove") return "Case member removed";
  if (normalized === "vault.case.members.remove.failed") {
    return "Case member removal failed";
  }
  if (normalized === "vault.case.eligible_members") {
    return "Eligible case members loaded";
  }
  if (normalized === "vault.case.detail") return "Case detail viewed";
  if (normalized === "vault.case.update") return "Case updated";
  if (normalized === "vault.case.update.failed") return "Case update failed";
  if (normalized === "vault.case.delete") return "Case archived";
  if (normalized === "vault.case.delete.failed") return "Case archive failed";
  if (normalized === "vault.case.summary") return "Case summary viewed";
  if (normalized.includes("search")) return "Case search activity";
  if (normalized.includes("message")) return "Message activity";
  if (normalized.includes("hold")) return "Hold activity";
  if (normalized.includes("export")) return "Export activity";

  return action ?? "Vault activity";
}

function buildTimelineItem(row: VaultAuditLogRow) {
  const details =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? row.details
      : {};

  return {
    id: row.id,
    created_at: row.created_at,
    action: row.action,
    label: getActivityLabel(row.action),
    category: getActivityCategory(row.action),
    status: row.status ?? "unknown",
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    actor_user_id: row.actor_user_id,
    actor_email: row.actor_email,
    support_scope: row.support_scope,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    details,
  };
}

function actionMatchesCategory(action: string | null, category: string | null) {
  if (!category || category === "all") return true;
  return getActivityCategory(action) === category;
}

async function loadCaseOrError(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  caseId: string,
  orgId: string
) {
  const { data, error } = await supabase
    .from("vault_cases")
    .select("id, org_id, name, status, priority, deleted_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError("Failed to load Vault case.", 500, {
        details: error.message,
      }),
    };
  }

  if (!data) {
    return {
      ok: false as const,
      response: jsonError("Vault case was not found.", 404),
    };
  }

  if ((data as unknown as VaultCaseRow).deleted_at) {
    return {
      ok: false as const,
      response: jsonError("Vault case is deleted.", 409, {
        case: data,
      }),
    };
  }

  return {
    ok: true as const,
    caseRow: data as unknown as VaultCaseRow,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const supabase = await getVaultAdminClient();

    const url = new URL(request.url);
    const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
    const offset = Math.max(
      Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
      0
    );
    const category = normalizeString(url.searchParams.get("category")) ?? "all";
    const status = normalizeString(url.searchParams.get("status"));
    const q = normalizeString(url.searchParams.get("q"));

    const caseLookup = await loadCaseOrError(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    let auditQuery = supabase
      .from("vault_audit_logs")
      .select(
        [
          "id",
          "org_id",
          "actor_user_id",
          "actor_email",
          "action",
          "entity_type",
          "entity_id",
          "status",
          "support_scope",
          "details",
          "ip_address",
          "user_agent",
          "created_at",
        ].join(", "),
        { count: "exact" }
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    auditQuery = auditQuery.or(
      [
        `entity_id.eq.${caseId}`,
        `details->>case_id.eq.${caseId}`,
        `details->>caseId.eq.${caseId}`,
      ].join(",")
    );

    if (status) {
      auditQuery = auditQuery.eq("status", status);
    }

    const { data, error, count } = await auditQuery;

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.activity.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          error: error.message,
          limit,
          offset,
          category,
          status,
          q,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load Vault case activity.", 500, {
        details: error.message,
      });
    }

    let items = toRows<VaultAuditLogRow>(data)
      .map(buildTimelineItem)
      .filter((item) => actionMatchesCategory(item.action, category));

    if (q) {
      const needle = q.toLowerCase();

      items = items.filter((item) => {
        const detailsText = JSON.stringify(item.details ?? {}).toLowerCase();

        return [
          item.action,
          item.label,
          item.category,
          item.status,
          item.entity_type,
          item.entity_id,
          item.actor_email,
          item.support_scope,
          detailsText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }

    const summary = {
      totalCount: count ?? items.length,
      returnedCount: items.length,
      successCount: items.filter((item) => item.status === "success").length,
      warningCount: items.filter((item) => item.status === "warning").length,
      failureCount: items.filter((item) => item.status === "failure").length,
      categories: {
        case: items.filter((item) => item.category === "case").length,
        members: items.filter((item) => item.category === "members").length,
        search: items.filter((item) => item.category === "search").length,
        message: items.filter((item) => item.category === "message").length,
        hold: items.filter((item) => item.category === "hold").length,
        export: items.filter((item) => item.category === "export").length,
        summary: items.filter((item) => item.category === "summary").length,
        general: items.filter((item) => item.category === "general").length,
      },
    };

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.activity",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        returned_count: items.length,
        total_count: count ?? items.length,
        limit,
        offset,
        category,
        status,
        q,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseLookup.caseRow,
      items,
      summary,
      filters: {
        limit,
        offset,
        category,
        status,
        q,
      },
      paging: {
        limit,
        offset,
        returned: items.length,
        total: count ?? items.length,
        hasMore: typeof count === "number" ? offset + limit < count : false,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading Vault case activity.";

    return jsonError("Failed to load Vault case activity.", 500, {
      details: message,
    });
  }
}