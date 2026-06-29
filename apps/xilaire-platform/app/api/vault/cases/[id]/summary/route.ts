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
  status: string | null;
  priority: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

function exportBelongsToCase(
  filters: Record<string, unknown> | null | undefined,
  caseId: string
) {
  if (!filters || typeof filters !== "object") return false;

  return (
    filters.caseId === caseId ||
    filters.case_id === caseId ||
    filters.vault_case_id === caseId ||
    filters.vaultCaseId === caseId
  );
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

    const { data: caseData, error: caseError } = await supabase
      .from("vault_cases")
      .select(
        "id, org_id, name, status, priority, created_at, updated_at, deleted_at"
      )
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError) {
      return jsonError("Failed to load Vault case.", 500, {
        details: caseError.message,
      });
    }

    if (!caseData) {
      return jsonError("Vault case was not found.", 404);
    }

    const caseRow = caseData as unknown as VaultCaseRow;

    if (caseRow.deleted_at) {
      return jsonError("Vault case is deleted.", 409, {
        case: caseRow,
      });
    }

    const [membersResult, holdsResult, exportsResult] = await Promise.all([
      supabase
        .from("vault_case_members")
        .select("id, assignable_type, role, assignable_id")
        .eq("org_id", orgId)
        .eq("case_id", caseId),

      supabase
        .from("vault_holds")
        .select("id, status, case_id")
        .eq("org_id", orgId)
        .eq("case_id", caseId),

      supabase
        .from("vault_exports")
        .select(
          "id, status, export_type, format, file_count, total_size_bytes, filters"
        )
        .eq("org_id", orgId)
        .is("deleted_at", null),
    ]);

    const memberRows = toRows<{
      id: string;
      assignable_type: string | null;
      role: string | null;
      assignable_id: string | null;
    }>(membersResult.data);

    const holdRows = toRows<{
      id: string;
      status: string | null;
      case_id: string | null;
    }>(holdsResult.data);

    const exportRows = toRows<{
      id: string;
      status: string | null;
      export_type: string | null;
      format: string | null;
      file_count: number | null;
      total_size_bytes: number | null;
      filters: Record<string, unknown> | null;
    }>(exportsResult.data).filter((row) =>
      exportBelongsToCase(row.filters, caseId)
    );

    const assignedCustodianIds = Array.from(
      new Set(
        memberRows
          .filter((row) => row.assignable_type === "custodian")
          .map((row) => row.assignable_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const messagesResult = assignedCustodianIds.length
      ? await supabase
          .from("vault_messages")
          .select("id, custodian_id, has_attachments")
          .eq("org_id", orgId)
          .in("custodian_id", assignedCustodianIds)
      : { data: [], error: null };

    const messageRows = toRows<{
      id: string;
      custodian_id: string | null;
      has_attachments: boolean | null;
    }>(messagesResult.data);

    const messageIds = new Set(messageRows.map((row) => row.id));

    const [attachmentsResult, occurrencesResult, exportItemsResult] =
      await Promise.all([
        messageIds.size
          ? supabase
              .from("vault_message_attachments")
              .select("id, message_id, size_bytes")
              .eq("org_id", orgId)
          : Promise.resolve({ data: [], error: null }),

        messageIds.size
          ? supabase
              .from("vault_message_occurrences")
              .select("id, message_id, source_id, mailbox_id, folder_path")
              .eq("org_id", orgId)
          : Promise.resolve({ data: [], error: null }),

        exportRows.length
          ? supabase
              .from("vault_export_items")
              .select("id, export_id, message_id")
              .eq("org_id", orgId)
              .in(
                "export_id",
                exportRows.map((row) => row.id)
              )
          : Promise.resolve({ data: [], error: null }),
      ]);

    const attachmentRows = toRows<{
      id: string;
      message_id: string | null;
      size_bytes: number | null;
    }>(attachmentsResult.data).filter(
      (row) => row.message_id && messageIds.has(row.message_id)
    );

    const occurrenceRows = toRows<{
      id: string;
      message_id: string | null;
      source_id: string | null;
      mailbox_id: string | null;
      folder_path: string | null;
    }>(occurrencesResult.data).filter(
      (row) => row.message_id && messageIds.has(row.message_id)
    );

    const exportItemRows = toRows<{
      id: string;
      export_id: string | null;
      message_id: string | null;
    }>(exportItemsResult.data);

    const mailboxIds = new Set(
      occurrenceRows.map((row) => row.mailbox_id).filter(Boolean)
    );

    const sourceIds = new Set(
      occurrenceRows.map((row) => row.source_id).filter(Boolean)
    );

    const folderPaths = new Set(
      occurrenceRows.map((row) => row.folder_path).filter(Boolean)
    );

    const errors = [
      membersResult.error?.message,
      holdsResult.error?.message,
      exportsResult.error?.message,
      messagesResult.error?.message,
      attachmentsResult.error?.message,
      occurrencesResult.error?.message,
      exportItemsResult.error?.message,
    ].filter(Boolean);

    const summary = {
      members: {
        total: memberRows.length,
        custodians: memberRows.filter(
          (row) => row.assignable_type === "custodian"
        ).length,
        admins: memberRows.filter((row) => row.assignable_type === "admin")
          .length,
        owners: memberRows.filter((row) => row.role === "owner").length,
        reviewers: memberRows.filter((row) => row.role === "reviewer").length,
        viewers: memberRows.filter((row) => row.role === "viewer").length,
        members: memberRows.filter((row) => row.role === "member").length,
      },

      holds: {
        total: holdRows.length,
        active: holdRows.filter((row) => row.status === "active").length,
        pending: holdRows.filter((row) => row.status === "pending").length,
        released: holdRows.filter((row) => row.status === "released").length,
      },

      exports: {
        total: exportRows.length,
        queued: exportRows.filter((row) => row.status === "queued").length,
        processing: exportRows.filter((row) => row.status === "processing")
          .length,
        completed: exportRows.filter((row) => row.status === "completed")
          .length,
        failed: exportRows.filter((row) => row.status === "failed").length,
        cancelled: exportRows.filter((row) => row.status === "cancelled")
          .length,
        fileCount: exportRows.reduce(
          (total, row) => total + Number(row.file_count ?? 0),
          0
        ),
        totalSizeBytes: exportRows.reduce(
          (total, row) => total + Number(row.total_size_bytes ?? 0),
          0
        ),
        exportedMessageCount: new Set(
          exportItemRows.map((row) => row.message_id).filter(Boolean)
        ).size,
      },

      evidence: {
        messages: messageRows.length,
        messagesWithAttachments: messageRows.filter(
          (row) => row.has_attachments
        ).length,
        attachments: attachmentRows.length,
        attachmentSizeBytes: attachmentRows.reduce(
          (total, row) => total + Number(row.size_bytes ?? 0),
          0
        ),
        occurrences: occurrenceRows.length,
        uniqueMailboxes: mailboxIds.size,
        uniqueSources: sourceIds.size,
        uniqueFolders: folderPaths.size,
      },

      coverage: {
        assignedCustodianCount: assignedCustodianIds.length,
        custodiansWithMessages: new Set(
          messageRows.map((row) => row.custodian_id).filter(Boolean)
        ).size,
      },
    };

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.summary",
      entityType: "vault_case",
      entityId: caseId,
      status: errors.length ? "warning" : "success",
      request,
      details: {
        errors,
        schema_mapping: {
          exports: "vault_exports.filters.caseId/case_id/vault_case_id",
          messages: "vault_messages.custodian_id through vault_case_members",
        },
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseRow,
      summary,
      warnings: errors,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading Vault case summary.";

    return jsonError("Failed to load Vault case summary.", 500, {
      details: message,
    });
  }
}