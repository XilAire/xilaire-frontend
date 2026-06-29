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

type VaultCaseStatus =
  | "open"
  | "active"
  | "pending"
  | "closed"
  | "archived";

type VaultCasePriority =
  | "low"
  | "normal"
  | "medium"
  | "high"
  | "critical";

type CreateVaultCaseRequest = {
  name?: string;
  caseName?: string;
  description?: string | null;
  notes?: string | null;
  status?: VaultCaseStatus | null;
  priority?: VaultCasePriority | null;
  matterNumber?: string | null;
  externalReference?: string | null;
  ownerId?: string | null;
  holdId?: string | null;
  tags?: string[] | null;
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

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeStatus(value: unknown): VaultCaseStatus {
  const normalized = normalizeString(value)?.toLowerCase();

  switch (normalized) {
    case "open":
    case "active":
    case "pending":
    case "closed":
    case "archived":
      return normalized;
    default:
      return "open";
  }
}

function normalizePriority(value: unknown): VaultCasePriority {
  const normalized = normalizeString(value)?.toLowerCase();

  switch (normalized) {
    case "low":
    case "normal":
    case "medium":
    case "high":
    case "critical":
      return normalized;
    default:
      return "normal";
  }
}

function parseBooleanParam(value: string | null): boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
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

function toVaultCaseRows(value: unknown): VaultCaseRow[] {
  if (!Array.isArray(value)) return [];
  return value as VaultCaseRow[];
}

function toVaultCaseRow(value: unknown): VaultCaseRow | null {
  if (!value || typeof value !== "object") return null;
  return value as VaultCaseRow;
}

function buildCaseSearchFields(row: VaultCaseRow) {
  return [
    row.name ?? "",
    row.description ?? "",
    row.status ?? "",
    row.priority ?? "",
  ]
    .join(" ")
    .trim()
    .toLowerCase();
}

function matchesSearch(row: VaultCaseRow, q: string | null) {
  if (!q) return true;

  return buildCaseSearchFields(row).includes(q.toLowerCase());
}

function safeCaseName(row: VaultCaseRow) {
  return row.name ?? "Untitled Case";
}

function buildExtendedDescription(body: CreateVaultCaseRequest | null) {
  const description = normalizeString(body?.description);
  const notes = normalizeString(body?.notes);
  const matterNumber = normalizeString(body?.matterNumber);
  const externalReference = normalizeString(body?.externalReference);
  const ownerId = normalizeString(body?.ownerId);
  const holdId = normalizeString(body?.holdId);
  const tags = normalizeStringArray(body?.tags);

  const parts = [
    description,
    notes ? `Notes: ${notes}` : null,
    matterNumber ? `Matter Number: ${matterNumber}` : null,
    externalReference ? `External Reference: ${externalReference}` : null,
    ownerId ? `Owner ID: ${ownerId}` : null,
    holdId ? `Hold ID: ${holdId}` : null,
    tags.length ? `Tags: ${tags.join(", ")}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join("\n\n") : null;
}

function extractDescriptionValue(description: string | null, label: string) {
  if (!description) return null;

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedLabel}:\\s*(.+)`, "i");
  const match = description.match(pattern);

  return normalizeString(match?.[1] ?? null);
}

function deriveCasePayload(row: VaultCaseRow) {
  const description = row.description ?? null;

  return {
    id: row.id,
    org_id: row.org_id,
    name: safeCaseName(row),
    description,
    notes: extractDescriptionValue(description, "Notes"),
    status: row.status ?? "open",
    priority: row.priority ?? "normal",
    matter_number: extractDescriptionValue(description, "Matter Number"),
    external_reference: extractDescriptionValue(description, "External Reference"),
    owner_id: extractDescriptionValue(description, "Owner ID"),
    hold_id: extractDescriptionValue(description, "Hold ID"),
    hold_name: null,
    hold_status: null,
    hold_type: null,
    tags:
      extractDescriptionValue(description, "Tags")
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean) ?? [],
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    deleted_at: row.deleted_at ?? null,
    deleted_by: row.deleted_by ?? null,
    is_deleted: Boolean(row.deleted_at),
  };
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);

    const url = new URL(request.url);
    const q = normalizeString(url.searchParams.get("q"));
    const status = normalizeString(url.searchParams.get("status"));
    const priority = normalizeString(url.searchParams.get("priority"));
    const includeDeleted = parseBooleanParam(
      url.searchParams.get("includeDeleted")
    );
    const deletedOnly = parseBooleanParam(url.searchParams.get("deletedOnly"));
    const limit = parsePositiveInt(url.searchParams.get("limit"), 25, 200);
    const offset = Math.max(
      0,
      Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0
    );

    const supabase = await getVaultAdminClient();

    let query = supabase
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
        ].join(", "),
        { count: "exact" }
      )
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    if (deletedOnly) {
      query = query.not("deleted_at", "is", null);
    } else if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.list.failed",
        entityType: "vault_case",
        status: "failure",
        request,
        details: {
          q,
          status,
          priority,
          includeDeleted,
          deletedOnly,
          limit,
          offset,
          error: error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load Vault cases.", 500, {
        details: error.message,
      });
    }

    const rows = toVaultCaseRows(data).filter((row) => matchesSearch(row, q));
    const items = rows.map((row) => deriveCasePayload(row));

    const summary = {
      totalCount: count ?? items.length,
      returnedCount: items.length,
      activeCount: items.filter((item) => !item.is_deleted).length,
      deletedCount: items.filter((item) => item.is_deleted).length,
      openCount: items.filter((item) => item.status === "open").length,
      activeStatusCount: items.filter((item) => item.status === "active").length,
      pendingCount: items.filter((item) => item.status === "pending").length,
      closedCount: items.filter((item) => item.status === "closed").length,
      archivedCount: items.filter((item) => item.status === "archived").length,
      highPriorityCount: items.filter(
        (item) => item.priority === "high" || item.priority === "critical"
      ).length,
      withHoldCount: items.filter((item) => Boolean(item.hold_id)).length,
      uniqueOwnerCount: new Set(
        items.map((item) => item.owner_id).filter(Boolean)
      ).size,
    };

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.list",
      entityType: "vault_case",
      status: "success",
      request,
      details: {
        q,
        status,
        priority,
        includeDeleted,
        deletedOnly,
        limit,
        offset,
        returned_count: items.length,
        total_count: count ?? items.length,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      items,
      summary,
      pagination: {
        limit,
        offset,
        total: count ?? items.length,
        hasMore:
          typeof count === "number"
            ? offset + limit < count
            : items.length === limit,
      },
      filters: {
        q,
        status,
        priority,
        includeDeleted,
        deletedOnly,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading Vault cases.";

    return jsonError("Failed to load Vault cases.", 500, {
      details: message,
    });
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);

    const body =
      (await request.json().catch(() => null)) as CreateVaultCaseRequest | null;

    const name = normalizeString(body?.name) ?? normalizeString(body?.caseName);

    if (!name) {
      return jsonError("Case name is required.", 400);
    }

    const status = normalizeStatus(body?.status);
    const priority = normalizePriority(body?.priority);
    const description = buildExtendedDescription(body);

    const supabase = await getVaultAdminClient();

    const insertPayload = {
      org_id: orgId,
      name,
      description,
      status,
      priority,
      created_by: actorUserId,
      updated_by: actorUserId,
    };

    const { data, error } = await supabase
      .from("vault_cases")
      .insert(insertPayload)
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
      .single();

    if (error || !data) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.create.failed",
        entityType: "vault_case",
        status: "failure",
        request,
        details: {
          name,
          status,
          priority,
          error: error?.message ?? "No row returned",
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to create Vault case.", 500, {
        details: error?.message ?? "No row returned from insert.",
      });
    }

    const row = toVaultCaseRow(data);

    if (!row) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.create.failed",
        entityType: "vault_case",
        status: "failure",
        request,
        details: {
          name,
          status,
          priority,
          error: "Invalid row returned from insert.",
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to create Vault case.", 500, {
        details: "Invalid row returned from insert.",
      });
    }

    const item = deriveCasePayload(row);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.create",
      entityType: "vault_case",
      entityId: row.id,
      status: "success",
      request,
      details: {
        name: item.name,
        status: item.status,
        priority: item.priority,
        hold_id: item.hold_id,
        owner_id: item.owner_id,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk(
      {
        ok: true,
        item,
      },
      201
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error creating Vault case.";

    return jsonError("Failed to create Vault case.", 500, {
      details: message,
    });
  }
}