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
  name: string;
  status: string | null;
  deleted_at: string | null;
};

type VaultReviewSetRow = {
  id: string;
  org_id: string;
  case_id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type VaultReviewSetItemRow = {
  id: string;
  review_set_id: string;
  review_status: string | null;
  tags: string[] | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

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
    throw new Error("Unable to resolve Vault org context.");
  }

  return orgId;
}

async function loadCase(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  caseId: string,
  orgId: string
) {
  const { data, error } = await supabase
    .from("vault_cases")
    .select("id, org_id, name, status, deleted_at")
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
      response: jsonError("Vault case not found.", 404),
    };
  }

  if ((data as VaultCaseRow).deleted_at) {
    return {
      ok: false as const,
      response: jsonError("Vault case has been deleted.", 409),
    };
  }

  return {
    ok: true as const,
    caseRow: data as VaultCaseRow,
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const startedAt = Date.now();

  try {
    const { id: caseId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);

    const supabase = await getVaultAdminClient();

    const caseLookup = await loadCase(
      supabase,
      caseId,
      orgId
    );

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    const reviewSetsResult = await supabase
      .from("vault_review_sets")
      .select(`
        id,
        org_id,
        case_id,
        name,
        description,
        status,
        assigned_to,
        created_at,
        updated_at,
        deleted_at
      `)
      .eq("org_id", orgId)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      });

    if (reviewSetsResult.error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.review_sets.list.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          error: reviewSetsResult.error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError(
        "Failed to load review sets.",
        500,
        {
          details: reviewSetsResult.error.message,
        }
      );
    }

    const reviewSets = toRows<VaultReviewSetRow>(
      reviewSetsResult.data
    );

    const reviewSetIds = reviewSets.map(
      (item) => item.id
    );

    let reviewSetItems: VaultReviewSetItemRow[] = [];

    if (reviewSetIds.length > 0) {
      const itemsResult = await supabase
        .from("vault_review_set_items")
        .select(`
          id,
          review_set_id,
          review_status,
          tags
        `)
        .in("review_set_id", reviewSetIds);

      if (itemsResult.error) {
        await writeUnifiedVaultAccessAuditLog({
          access,
          action: "vault.review_sets.items.failed",
          entityType: "vault_case",
          entityId: caseId,
          status: "failure",
          request,
          details: {
            error: itemsResult.error.message,
            duration_ms: Date.now() - startedAt,
          },
        });

        return jsonError(
          "Failed to load review set items.",
          500,
          {
            details: itemsResult.error.message,
          }
        );
      }

      reviewSetItems = toRows<VaultReviewSetItemRow>(
        itemsResult.data
      );
    }

    const itemsByReviewSetId = new Map<
      string,
      VaultReviewSetItemRow[]
    >();

    for (const item of reviewSetItems) {
      const existing =
        itemsByReviewSetId.get(item.review_set_id) ?? [];

      existing.push(item);

      itemsByReviewSetId.set(
        item.review_set_id,
        existing
      );
    }

    const items = reviewSets.map((reviewSet) => {
      const reviewItems =
        itemsByReviewSetId.get(reviewSet.id) ?? [];

      const reviewedCount = reviewItems.filter(
        (item) =>
          item.review_status === "reviewed" ||
          item.review_status === "completed"
      ).length;

      const taggedCount = reviewItems.filter(
        (item) =>
          Array.isArray(item.tags) &&
          item.tags.length > 0
      ).length;

      return {
        id: reviewSet.id,
        org_id: reviewSet.org_id,
        case_id: reviewSet.case_id,
        name:
          reviewSet.name ??
          "Untitled Review Set",
        description:
          reviewSet.description ?? "",
        status:
          reviewSet.status ??
          "not_started",
        assigned_to:
          reviewSet.assigned_to ??
          "Unassigned",
        item_count: reviewItems.length,
        reviewed_count: reviewedCount,
        tagged_count: taggedCount,
        created_at:
          reviewSet.created_at,
        updated_at:
          reviewSet.updated_at,
      };
    });

    const summary = {
      totalCount: items.length,
      itemCount: items.reduce(
        (total, item) =>
          total + item.item_count,
        0
      ),
      reviewedCount: items.reduce(
        (total, item) =>
          total + item.reviewed_count,
        0
      ),
      taggedCount: items.reduce(
        (total, item) =>
          total + item.tagged_count,
        0
      ),
    };

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.review_sets.list",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        review_set_count:
          summary.totalCount,
        item_count:
          summary.itemCount,
        reviewed_count:
          summary.reviewedCount,
        tagged_count:
          summary.taggedCount,
        duration_ms:
          Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseLookup.caseRow,
      items,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading review sets.";

    return jsonError(
      "Failed to load review sets.",
      500,
      {
        details: message,
      }
    );
  }
}