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
  status: string | null;
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

type AddReviewSetItemsRequest = {
  messageIds?: string[];
  message_ids?: string[];
  exportItemIds?: string[];
  export_item_ids?: string[];
  evidenceType?: string | null;
  evidence_type?: string | null;
  reviewStatus?: string | null;
  review_status?: string | null;
  reviewerId?: string | null;
  reviewer_id?: string | null;
  tags?: string[];
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

type UpdateReviewSetItemsRequest = {
  ids?: string[];
  itemIds?: string[];
  item_ids?: string[];
  reviewStatus?: string | null;
  review_status?: string | null;
  reviewerId?: string | null;
  reviewer_id?: string | null;
  tags?: string[];
  notes?: string | null;
  metadata?: Record<string, unknown>;
  clearReviewer?: boolean;
  clear_reviewer?: boolean;
  clearTags?: boolean;
  clear_tags?: boolean;
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => normalizeString(item))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function normalizeEvidenceType(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase();

  if (
    normalized === "message" ||
    normalized === "email" ||
    normalized === "attachment" ||
    normalized === "document" ||
    normalized === "chat" ||
    normalized === "manual_upload"
  ) {
    return normalized;
  }

  return "message";
}

function normalizeReviewStatus(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase();

  if (
    normalized === "unreviewed" ||
    normalized === "reviewed" ||
    normalized === "needs_attention" ||
    normalized === "privileged" ||
    normalized === "export_ready"
  ) {
    return normalized;
  }

  return "unreviewed";
}

function normalizeReviewStatusForUpdate(value: unknown): string | undefined {
  if (value === undefined) return undefined;

  const normalized = normalizeString(value)?.toLowerCase();

  if (
    normalized === "unreviewed" ||
    normalized === "reviewed" ||
    normalized === "needs_attention" ||
    normalized === "privileged" ||
    normalized === "export_ready"
  ) {
    return normalized;
  }

  throw new Error(
    "Review status must be one of: unreviewed, reviewed, needs_attention, privileged, export_ready."
  );
}

function normalizeTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("tags must be an array of strings.");
  }

  return Array.from(
    new Set(
      value
        .map((item) => normalizeString(item))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function normalizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("metadata must be an object.");
  }

  return value as Record<string, unknown>;
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
  reviewSetId: string
) {
  const { data, error } = await supabase
    .from("vault_review_sets")
    .select("id, org_id, case_id, name, status, deleted_at")
    .eq("id", reviewSetId)
    .eq("org_id", orgId)
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

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

async function loadItems(
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

  return toRows<VaultReviewSetItemRow>(data).map(buildReviewSetItemPayload);
}

async function validateMessageIds(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  messageIds: string[]
) {
  if (!messageIds.length) {
    return {
      ok: true as const,
      missingIds: [] as string[],
    };
  }

  const { data, error } = await supabase
    .from("vault_messages")
    .select("id")
    .eq("org_id", orgId)
    .in("id", messageIds);

  if (error) {
    throw new Error(`Failed to validate message ids: ${error.message}`);
  }

  const found = new Set(toRows<{ id: string }>(data).map((row) => row.id));
  const missingIds = messageIds.filter((id) => !found.has(id));

  return {
    ok: missingIds.length === 0,
    missingIds,
  };
}

async function validateExportItemIds(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  exportItemIds: string[]
) {
  if (!exportItemIds.length) {
    return {
      ok: true as const,
      missingIds: [] as string[],
    };
  }

  const { data, error } = await supabase
    .from("vault_export_items")
    .select("id")
    .eq("org_id", orgId)
    .in("id", exportItemIds);

  if (error) {
    throw new Error(`Failed to validate export item ids: ${error.message}`);
  }

  const found = new Set(toRows<{ id: string }>(data).map((row) => row.id));
  const missingIds = exportItemIds.filter((id) => !found.has(id));

  return {
    ok: missingIds.length === 0,
    missingIds,
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
      reviewSetId
    );

    if (!reviewSetLookup.ok) {
      return reviewSetLookup.response;
    }

    const items = await loadItems(
      supabase,
      orgId,
      caseId,
      reviewSetId,
      includeDeleted
    );

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.review_set.items.list",
      entityType: "vault_review_set",
      entityId: reviewSetId,
      status: "success",
      request,
      details: {
        case_id: caseId,
        include_deleted: includeDeleted,
        returned_count: items.length,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseLookup.caseRow,
      reviewSet: reviewSetLookup.reviewSet,
      items,
      summary: buildItemSummary(items),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading review set items.";

    return jsonError("Failed to load review set items.", 500, {
      details: message,
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
      (await request.json().catch(() => null)) as AddReviewSetItemsRequest | null;

    if (!body || typeof body !== "object") {
      return jsonError("A valid review set item payload is required.", 400);
    }

    const messageIds = normalizeStringArray(body.messageIds ?? body.message_ids);
    const exportItemIds = normalizeStringArray(
      body.exportItemIds ?? body.export_item_ids
    );

    if (!messageIds.length && !exportItemIds.length) {
      return jsonError(
        "At least one message id or export item id is required.",
        400
      );
    }

    const messageValidation = await validateMessageIds(supabase, orgId, messageIds);

    if (!messageValidation.ok) {
      return jsonError("One or more message ids were not found.", 400, {
        missingIds: messageValidation.missingIds,
      });
    }

    const exportItemValidation = await validateExportItemIds(
      supabase,
      orgId,
      exportItemIds
    );

    if (!exportItemValidation.ok) {
      return jsonError("One or more export item ids were not found.", 400, {
        missingIds: exportItemValidation.missingIds,
      });
    }

    const evidenceType = normalizeEvidenceType(body.evidenceType ?? body.evidence_type);
    const reviewStatus = normalizeReviewStatus(
      body.reviewStatus ?? body.review_status
    );
    const reviewerId =
      normalizeNullableString(body.reviewerId) ??
      normalizeNullableString(body.reviewer_id) ??
      null;
    const tags = normalizeTags(body.tags) ?? [];
    const notes = normalizeNullableString(body.notes) ?? null;
    const metadata = normalizeMetadata(body.metadata) ?? {};

    const insertPayload = [
      ...messageIds.map((messageId) => ({
        org_id: orgId,
        case_id: caseId,
        review_set_id: reviewSetId,
        message_id: messageId,
        export_item_id: null,
        evidence_type: evidenceType,
        review_status: reviewStatus,
        reviewer_id: reviewerId,
        reviewed_at: reviewStatus === "unreviewed" ? null : new Date().toISOString(),
        tags,
        notes,
        metadata,
        created_by: actorUserId,
        updated_by: actorUserId,
        deleted_at: null,
      })),
      ...exportItemIds.map((exportItemId) => ({
        org_id: orgId,
        case_id: caseId,
        review_set_id: reviewSetId,
        message_id: null,
        export_item_id: exportItemId,
        evidence_type: evidenceType,
        review_status: reviewStatus,
        reviewer_id: reviewerId,
        reviewed_at: reviewStatus === "unreviewed" ? null : new Date().toISOString(),
        tags,
        notes,
        metadata,
        created_by: actorUserId,
        updated_by: actorUserId,
        deleted_at: null,
      })),
    ];

    const { data, error } = await supabase
      .from("vault_review_set_items")
      .upsert(insertPayload, {
        onConflict: "review_set_id,message_id",
        ignoreDuplicates: false,
      })
      .select(
        "id, org_id, case_id, review_set_id, message_id, export_item_id, evidence_type, review_status, reviewer_id, reviewed_at, tags, notes, metadata, created_by, updated_by, deleted_by, created_at, updated_at, deleted_at"
      );

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.review_set.items.add.failed",
        entityType: "vault_review_set",
        entityId: reviewSetId,
        status: "failure",
        request,
        details: {
          case_id: caseId,
          error: error.message,
          message_count: messageIds.length,
          export_item_count: exportItemIds.length,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to add review set items.", 500, {
        details: error.message,
      });
    }

    const items = toRows<VaultReviewSetItemRow>(data).map(buildReviewSetItemPayload);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.review_set.items.add",
      entityType: "vault_review_set",
      entityId: reviewSetId,
      status: "success",
      request,
      details: {
        case_id: caseId,
        added_count: items.length,
        message_count: messageIds.length,
        export_item_count: exportItemIds.length,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk(
      {
        ok: true,
        case: caseLookup.caseRow,
        reviewSet: reviewSetLookup.reviewSet,
        items,
        summary: buildItemSummary(items),
      },
      201
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error adding review set items.";

    return jsonError("Failed to add review set items.", 500, {
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
      (await request.json().catch(() => null)) as UpdateReviewSetItemsRequest | null;

    if (!body || typeof body !== "object") {
      return jsonError("A valid review set item update payload is required.", 400);
    }

    const ids = normalizeStringArray(body.ids ?? body.itemIds ?? body.item_ids);

    if (!ids.length) {
      return jsonError("At least one review set item id is required.", 400);
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: actorUserId,
    };

    if ("reviewStatus" in body || "review_status" in body) {
      const reviewStatus = normalizeReviewStatusForUpdate(
        body.reviewStatus ?? body.review_status
      );

      if (reviewStatus) {
        updatePayload.review_status = reviewStatus;
        updatePayload.reviewed_at =
          reviewStatus === "unreviewed" ? null : new Date().toISOString();
      }
    }

    if ("reviewerId" in body || "reviewer_id" in body || body.clearReviewer || body.clear_reviewer) {
      updatePayload.reviewer_id =
        body.clearReviewer || body.clear_reviewer
          ? null
          : normalizeNullableString(body.reviewerId) ??
            normalizeNullableString(body.reviewer_id) ??
            null;
    }

    if ("tags" in body || body.clearTags || body.clear_tags) {
      updatePayload.tags =
        body.clearTags || body.clear_tags ? [] : normalizeTags(body.tags) ?? [];
    }

    if ("notes" in body) {
      updatePayload.notes = normalizeNullableString(body.notes);
    }

    if ("metadata" in body) {
      updatePayload.metadata = normalizeMetadata(body.metadata) ?? {};
    }

    if (Object.keys(updatePayload).length <= 1) {
      return jsonError("No valid review set item fields were provided.", 400);
    }

    const { data, error } = await supabase
      .from("vault_review_set_items")
      .update(updatePayload)
      .eq("org_id", orgId)
      .eq("case_id", caseId)
      .eq("review_set_id", reviewSetId)
      .in("id", ids)
      .is("deleted_at", null)
      .select(
        "id, org_id, case_id, review_set_id, message_id, export_item_id, evidence_type, review_status, reviewer_id, reviewed_at, tags, notes, metadata, created_by, updated_by, deleted_by, created_at, updated_at, deleted_at"
      );

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.review_set.items.update.failed",
        entityType: "vault_review_set",
        entityId: reviewSetId,
        status: "failure",
        request,
        details: {
          case_id: caseId,
          error: error.message,
          requested_count: ids.length,
          update_fields: Object.keys(updatePayload),
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to update review set items.", 500, {
        details: error.message,
      });
    }

    const items = toRows<VaultReviewSetItemRow>(data).map(buildReviewSetItemPayload);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.review_set.items.update",
      entityType: "vault_review_set",
      entityId: reviewSetId,
      status: "success",
      request,
      details: {
        case_id: caseId,
        requested_count: ids.length,
        updated_count: items.length,
        update_fields: Object.keys(updatePayload),
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseLookup.caseRow,
      reviewSet: reviewSetLookup.reviewSet,
      items,
      summary: buildItemSummary(items),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error updating review set items.";

    return jsonError("Failed to update review set items.", 500, {
      details: message,
    });
  }
}