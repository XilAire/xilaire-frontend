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

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

type UpdateCaseRequest = {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStatus(value: unknown): string | null {
  const normalized = normalizeString(value)?.toLowerCase();

  if (!normalized) return null;

  if (
    normalized === "open" ||
    normalized === "active" ||
    normalized === "pending" ||
    normalized === "closed" ||
    normalized === "archived"
  ) {
    return normalized;
  }

  return null;
}

function normalizePriority(value: unknown): string | null {
  const normalized = normalizeString(value)?.toLowerCase();

  if (!normalized) return null;

  if (
    normalized === "low" ||
    normalized === "normal" ||
    normalized === "medium" ||
    normalized === "high" ||
    normalized === "critical"
  ) {
    return normalized;
  }

  return null;
}

function toVaultCaseRow(value: unknown): VaultCaseRow {
  return value as unknown as VaultCaseRow;
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

function getAccessUserId(access: unknown): string | null {
  const record = access as Record<string, unknown> | null;

  return (
    normalizeString(record?.userId) ??
    normalizeString(record?.user_id) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).id
        : null
    ) ??
    null
  );
}

async function loadCase(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  caseId: string,
  orgId: string
) {
  const { data, error } = await supabase
    .from("vault_cases")
    .select(
      [
        "id",
        "org_id",
        "name",
        "description",
        "status",
        "priority",
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
        "deleted_at",
        "deleted_by",
      ].join(", ")
    )
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

  return {
    ok: true as const,
    caseRow: toVaultCaseRow(data),
  };
}

async function loadCaseSummary(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  caseId: string,
  orgId: string
) {
  const [membersResult, holdLinksResult, exportItemsResult] =
    await Promise.all([
      supabase
        .from("vault_case_members")
        .select("id, assignable_type, role")
        .eq("org_id", orgId)
        .eq("case_id", caseId),

      supabase
        .from("vault_holds")
        .select("id, status")
        .eq("org_id", orgId)
        .eq("case_id", caseId),

      supabase
        .from("vault_exports")
        .select("id, status")
        .eq("org_id", orgId)
        .eq("case_id", caseId),
    ]);

  const memberRows = Array.isArray(membersResult.data)
    ? (membersResult.data as Array<{
        id: string;
        assignable_type: string | null;
        role: string | null;
      }>)
    : [];

  const holdRows = Array.isArray(holdLinksResult.data)
    ? (holdLinksResult.data as Array<{ id: string; status: string | null }>)
    : [];

  const exportRows = Array.isArray(exportItemsResult.data)
    ? (exportItemsResult.data as Array<{ id: string; status: string | null }>)
    : [];

  return {
    errors: [
      membersResult.error?.message,
      holdLinksResult.error?.message,
      exportItemsResult.error?.message,
    ].filter(Boolean),

    summary: {
      memberCount: memberRows.length,
      custodianCount: memberRows.filter(
        (row) => row.assignable_type === "custodian"
      ).length,
      adminCount: memberRows.filter((row) => row.assignable_type === "admin")
        .length,
      ownerCount: memberRows.filter((row) => row.role === "owner").length,
      reviewerCount: memberRows.filter((row) => row.role === "reviewer").length,
      holdCount: holdRows.length,
      activeHoldCount: holdRows.filter((row) => row.status === "active").length,
      exportCount: exportRows.length,
      completedExportCount: exportRows.filter(
        (row) => row.status === "completed"
      ).length,
    },
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

    const caseLookup = await loadCase(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    if (caseLookup.caseRow.deleted_at) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.detail.deleted_view",
        entityType: "vault_case",
        entityId: caseId,
        status: "warning",
        request,
        details: {
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Vault case is deleted.", 409, {
        case: caseLookup.caseRow,
      });
    }

    const summaryResult = await loadCaseSummary(supabase, caseId, orgId);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.detail",
      entityType: "vault_case",
      entityId: caseId,
      status: summaryResult.errors.length ? "warning" : "success",
      request,
      details: {
        summary_errors: summaryResult.errors,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      item: caseLookup.caseRow,
      case: caseLookup.caseRow,
      summary: summaryResult.summary,
      warnings: summaryResult.errors,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading Vault case.";

    return jsonError("Failed to load Vault case.", 500, {
      details: message,
    });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supabase = await getVaultAdminClient();

    const caseLookup = await loadCase(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    if (caseLookup.caseRow.deleted_at) {
      return jsonError("Vault case is deleted and cannot be updated.", 409, {
        case: caseLookup.caseRow,
      });
    }

    const body =
      (await request.json().catch(() => null)) as UpdateCaseRequest | null;

    if (!body || typeof body !== "object") {
      return jsonError("A valid request body is required.", 400);
    }

    const patch: Record<string, string | null> = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const name = normalizeString(body.name);

      if (!name) {
        return jsonError("Case name is required.", 400);
      }

      patch.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      patch.description = normalizeNullableString(body.description);
    }

    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      const status = normalizeStatus(body.status);

      if (!status) {
        return jsonError(
          "Invalid case status. Allowed values: open, active, pending, closed, archived.",
          400
        );
      }

      patch.status = status;
    }

    if (Object.prototype.hasOwnProperty.call(body, "priority")) {
      const priority = normalizePriority(body.priority);

      if (!priority) {
        return jsonError(
          "Invalid case priority. Allowed values: low, normal, medium, high, critical.",
          400
        );
      }

      patch.priority = priority;
    }

    if (!Object.keys(patch).length) {
      return jsonError("No valid case fields were provided for update.", 400);
    }

    patch.updated_by = actorUserId;

    const { data, error } = await supabase
      .from("vault_cases")
      .update(patch)
      .eq("id", caseId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select(
        [
          "id",
          "org_id",
          "name",
          "description",
          "status",
          "priority",
          "created_by",
          "updated_by",
          "created_at",
          "updated_at",
          "deleted_at",
          "deleted_by",
        ].join(", ")
      )
      .maybeSingle();

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.update.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          patch,
          error: error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to update Vault case.", 500, {
        details: error.message,
      });
    }

    if (!data) {
      return jsonError("Vault case was not found or is deleted.", 404);
    }

    const caseRow = toVaultCaseRow(data);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.update",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        patch,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      item: caseRow,
      case: caseRow,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error updating Vault case.";

    return jsonError("Failed to update Vault case.", 500, {
      details: message,
    });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supabase = await getVaultAdminClient();

    const caseLookup = await loadCase(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    if (caseLookup.caseRow.deleted_at) {
      return jsonOk({
        ok: true,
        deleted: true,
        alreadyDeleted: true,
        item: caseLookup.caseRow,
        case: caseLookup.caseRow,
      });
    }

    const { data, error } = await supabase
      .from("vault_cases")
      .update({
        status: "archived",
        deleted_at: new Date().toISOString(),
        deleted_by: actorUserId,
        updated_by: actorUserId,
      })
      .eq("id", caseId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select(
        [
          "id",
          "org_id",
          "name",
          "description",
          "status",
          "priority",
          "created_by",
          "updated_by",
          "created_at",
          "updated_at",
          "deleted_at",
          "deleted_by",
        ].join(", ")
      )
      .maybeSingle();

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.delete.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          error: error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to delete Vault case.", 500, {
        details: error.message,
      });
    }

    if (!data) {
      return jsonError("Vault case was not found or is already deleted.", 404);
    }

    const caseRow = toVaultCaseRow(data);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.delete",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        soft_deleted: true,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      deleted: true,
      item: caseRow,
      case: caseRow,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error deleting Vault case.";

    return jsonError("Failed to delete Vault case.", 500, {
      details: message,
    });
  }
}