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
    reviewSetId: string;
  }>;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string | null;
  status: string | null;
  priority: string | null;
  deleted_at: string | null;
};

type VaultReviewSetRow = {
  id: string;
  org_id: string;
  case_id: string;
  name: string;
  description: string | null;
  status: string | null;
  assigned_to: string | null;
  item_count: number | null;
  reviewed_count: number | null;
  tagged_count: number | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type VaultReviewSetItemRow = {
  id: string;
  org_id: string;
  case_id: string;
  review_set_id: string;
  message_id: string | null;
  export_item_id: string | null;
  evidence_type: string | null;
  review_status: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  tags: string[] | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type UpdateReviewSetRequest = {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  assignedTo?: string | null;
  assigned_to?: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== "string") {
    throw new Error("Invalid string value.");
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStatus(value: unknown): string | undefined {
  if (value === undefined) return undefined;

  const normalized = normalizeString(value)?.toLowerCase();

  if (
    normalized === "not_started" ||
    normalized === "in_review" ||
    normalized === "completed" ||
    normalized === "on_hold"
  ) {
    return normalized;
  }

  throw new Error(
    "Review set status must be one of: not_started, in_review, completed, on_hold."
  );
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

function buildReviewSetPayload(row: VaultReviewSetRow) {
  return {
    id: row.id,
    org_id: row.org_id,
    case_id: row.case_id,
    name: row.name,
    description: row.description,
    status: row.status ?? "not_started",
    assigned_to: row.assigned_to,
    assignedTo: row.assigned_to,
    item_count: row.item_count ?? 0,
    itemCount: row.item_count ?? 0,
    reviewed_count: row.reviewed_count ?? 0,
    reviewedCount: row.reviewed_count ?? 0,
    tagged_count: row.tagged_count ?? 0,
    taggedCount: row.tagged_count ?? 0,
    created_by: row.created_by,
    updated_by: row.updated_by,
    deleted_by: row.deleted_by,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

function buildReviewSetItemPayload(row: VaultReviewSetItemRow) {
  return {
    id: row.id,
    org_id: row.org_id,
    case_id: row.case_id,
    review_set_id: row.review_set_id,
    reviewSetId: row.review_set_id,
    message_id: row.message_id,
    messageId: row.message_id,
    export_item_id: row.export_item_id,
    exportItemId: row.export_item_id,
    evidence_type: row.evidence_type ?? "message",
    evidenceType: row.evidence_type ?? "message",
    review_status: row.review_status ?? "unreviewed",
    reviewStatus: row.review_status ?? "unreviewed",
    reviewer_id: row.reviewer_id,
    reviewerId: row.reviewer_id,
    reviewed_at: row.reviewed_at,
    reviewedAt: row.reviewed_at,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes,
    metadata: row.metadata ?? {},
    created_by: row.created_by,
    updated_by: row.updated_by,
    deleted_by: row.deleted_by,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
    deleted_at: row.deleted_at,
  };
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

  if ((data as VaultCaseRow).deleted_at) {
    return {
      ok: false as const,
      response: jsonError("Vault case is deleted.", 409),
    };
  }

  return {
    ok: true as const,
    caseRow: data as VaultCaseRow,
  };
}

async function loadReviewSetOrError(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  caseId: string,
  reviewSetId: string,
  includeDeleted = false
) {
  let query = supabase
    .from("vault_review_sets")
    .select(
      "id, org_id, case_id, name, description, status, assigned_to, item_count, reviewed_count, tagged_count, created_by, updated_by, deleted_by, created_at, updated_at, deleted_at"
    )
    .eq("id", reviewSetId)
    .eq("org_id", orgId)
    .eq("case_id", caseId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError("Failed to load review set.", 500, {
        details: error.message,
      }),
    };
  }

  if (!data) {
    return {
      ok: false as const,
      response: jsonError("Review set was not found.", 404),
    };
  }

  return {
    ok: true as const,
    reviewSet: data as VaultReviewSetRow,
  };
}

async function loadReviewSetItems(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  caseId: string,
  reviewSetId: string,
  includeDeleted: boolean
) {
  let query = supabase
    .from("vault_review_set_items")
    .select(
      "id, org_id, case_id, review_set_id, message_id, export_item_id, evidence_type, review_status, reviewer_id, reviewed_at, tags, notes, metadata, created_by, updated_by, deleted_by, created_at, updated_at, deleted_at"
    )
    .eq("org_id", orgId)
    .eq("case_id", caseId)
    .eq("review_set_id", reviewSetId)
    .order("created_at", { ascending: false });

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return toRows<VaultReviewSetItemRow>(data);
}

function buildItemSummary(items: ReturnType<typeof buildReviewSetItemPayload>[]) {
  return {
    totalCount: items.length,
    unreviewedCount: items.filter((item) => item.review_status === "unreviewed")
      .length,
    reviewedCount: items.filter((item) => item.review_status === "reviewed").length,
    needsAttentionCount: items.filter(
      (item) => item.review_status === "needs_attention"
    ).length,
    privilegedCount: items.filter((item) => item.review_status === "privileged")
      .length,
    exportReadyCount: items.filter((item) => item.review_status === "export_ready")
      .length,
    taggedCount: items.filter((item) => item.tags.length > 0).length,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId, reviewSetId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const supabase = await getVaultAdminClient();

    const includeDeleted =
      request.nextUrl.searchParams.get("includeDeleted") === "true";

    const caseLookup = await loadCaseOrError(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    const reviewSetLookup = await loadReviewSetOrError(
      supabase,
      orgId,
      caseId,
      reviewSetId,
      includeDeleted
    );

    if (!reviewSetLookup.ok) {
      return reviewSetLookup.response;
    }

    const itemRows = await loadReviewSetItems(
      supabase,
      orgId,
      caseId,
      reviewSetId,
      includeDeleted
    );

    const items = itemRows.map(buildReviewSetItemPayload);
    const summary = buildItemSummary(items);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.review_set.read",
      entityType: "vault_review_set",
      entityId: reviewSetId,
      status: "success",
      request,
      details: {
        case_id: caseId,
        include_deleted: includeDeleted,
        item_count: items.length,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseLookup.caseRow,
      item: buildReviewSetPayload(reviewSetLookup.reviewSet),
      items,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading review set.";

    return jsonError("Failed to load review set.", 500, {
      details: message,
    });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId, reviewSetId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "export_management",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supabase = await getVaultAdminClient();

    const caseLookup = await loadCaseOrError(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    const reviewSetLookup = await loadReviewSetOrError(
      supabase,
      orgId,
      caseId,
      reviewSetId
    );

    if (!reviewSetLookup.ok) {
      return reviewSetLookup.response;
    }

    const body =
      (await request.json().catch(() => null)) as UpdateReviewSetRequest | null;

    if (!body || typeof body !== "object") {
      return jsonError("A valid review set update payload is required.", 400);
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: actorUserId,
    };

    if ("name" in body) {
      const name = normalizeNullableString(body.name);

      if (!name) {
        return jsonError("Review set name cannot be empty.", 400);
      }

      updatePayload.name = name;
    }

    if ("description" in body) {
      updatePayload.description = normalizeNullableString(body.description);
    }

    if ("status" in body) {
      updatePayload.status = normalizeStatus(body.status);
    }

    if ("assignedTo" in body || "assigned_to" in body) {
      updatePayload.assigned_to =
        normalizeNullableString(body.assignedTo) ??
        normalizeNullableString(body.assigned_to) ??
        null;
    }

    if (Object.keys(updatePayload).length <= 1) {
      return jsonError("No valid review set fields were provided.", 400);
    }

    const { data, error } = await supabase
      .from("vault_review_sets")
      .update(updatePayload)
      .eq("id", reviewSetId)
      .eq("org_id", orgId)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .select(
        "id, org_id, case_id, name, description, status, assigned_to, item_count, reviewed_count, tagged_count, created_by, updated_by, deleted_by, created_at, updated_at, deleted_at"
      )
      .single();

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.review_set.update.failed",
        entityType: "vault_review_set",
        entityId: reviewSetId,
        status: "failure",
        request,
        details: {
          case_id: caseId,
          error: error.message,
          update_fields: Object.keys(updatePayload),
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to update review set.", 500, {
        details: error.message,
      });
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.review_set.update",
      entityType: "vault_review_set",
      entityId: reviewSetId,
      status: "success",
      request,
      details: {
        case_id: caseId,
        update_fields: Object.keys(updatePayload),
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseLookup.caseRow,
      item: buildReviewSetPayload(data as VaultReviewSetRow),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error updating review set.";

    return jsonError("Failed to update review set.", 500, {
      details: message,
    });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId, reviewSetId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "export_management",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supabase = await getVaultAdminClient();

    const caseLookup = await loadCaseOrError(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    const reviewSetLookup = await loadReviewSetOrError(
      supabase,
      orgId,
      caseId,
      reviewSetId
    );

    if (!reviewSetLookup.ok) {
      return reviewSetLookup.response;
    }

    const deletedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("vault_review_sets")
      .update({
        deleted_at: deletedAt,
        deleted_by: actorUserId,
        updated_by: actorUserId,
      })
      .eq("id", reviewSetId)
      .eq("org_id", orgId)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .select(
        "id, org_id, case_id, name, description, status, assigned_to, item_count, reviewed_count, tagged_count, created_by, updated_by, deleted_by, created_at, updated_at, deleted_at"
      )
      .single();

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.review_set.delete.failed",
        entityType: "vault_review_set",
        entityId: reviewSetId,
        status: "failure",
        request,
        details: {
          case_id: caseId,
          error: error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to delete review set.", 500, {
        details: error.message,
      });
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.review_set.delete",
      entityType: "vault_review_set",
      entityId: reviewSetId,
      status: "success",
      request,
      details: {
        case_id: caseId,
        deleted_at: deletedAt,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      deleted: true,
      case: caseLookup.caseRow,
      item: buildReviewSetPayload(data as VaultReviewSetRow),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error deleting review set.";

    return jsonError("Failed to delete review set.", 500, {
      details: message,
    });
  }
}