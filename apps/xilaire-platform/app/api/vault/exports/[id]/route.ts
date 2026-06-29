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

type VaultExportStatus =
  | "queued"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

type VaultExportType = "search_result" | "case_export" | "hold_export" | "manual";
type VaultExportFormat = "eml" | "pst" | "zip" | "json" | "csv";

type UpdateVaultExportAction =
  | "approve"
  | "cancel"
  | "mark_processing"
  | "mark_completed"
  | "mark_failed"
  | "restore";

type UpdateVaultExportRequest = {
  action?: UpdateVaultExportAction;
  notes?: string | null;
  expiresAt?: string | null;
  storagePath?: string | null;
  manifestHashSha256?: string | null;
  caseId?: string | null;
  case_id?: string | null;
};

type VaultExportRecord = {
  id: string;
  org_id: string;
  name: string;
  export_type: VaultExportType;
  format: VaultExportFormat;
  status: VaultExportStatus;
  requested_by: string | null;
  approved_by: string | null;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
  file_count: number;
  total_size_bytes: number;
  storage_path: string | null;
  manifest_hash_sha256: string | null;
  filters: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

type VaultExportRecordWithArtifactFlags = VaultExportRecord & {
  artifact_ready: boolean;
  artifact_state: "ready" | "partial" | "missing";
  has_storage_path: boolean;
  has_manifest_hash: boolean;
  can_rebuild: boolean;
  case_id: string | null;
  case_scoped: boolean;
};

type ExportMetricRow = {
  message_id: string | null;
  vault_messages:
    | {
        size_bytes: number | null;
      }
    | {
        size_bytes: number | null;
      }[]
    | null;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string;
  status: string | null;
  deleted_at: string | null;
};

const VAULT_EXPORT_SELECT = `
  id,
  org_id,
  name,
  export_type,
  format,
  status,
  requested_by,
  approved_by,
  requested_at,
  completed_at,
  expires_at,
  file_count,
  total_size_bytes,
  storage_path,
  manifest_hash_sha256,
  filters,
  notes,
  created_at,
  updated_at,
  deleted_at,
  deleted_by
`;

const ALLOWED_ACTIONS: UpdateVaultExportAction[] = [
  "approve",
  "cancel",
  "mark_processing",
  "mark_completed",
  "mark_failed",
  "restore",
];

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getExportIdFromPath(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const exportId = parts[parts.length - 1]?.trim();

  if (!exportId) {
    throw new Error("A valid export id is required.");
  }

  const normalized = decodeURIComponent(exportId).trim();

  if (
    !normalized ||
    ["undefined", "null", "new", "create", "list", "exports"].includes(
      normalized.toLowerCase()
    ) ||
    !isLikelyUuid(normalized)
  ) {
    throw new Error("A valid export id is required.");
  }

  return normalized;
}

function toInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function sanitizeLimit(value: number): number {
  if (value < 1) return 25;
  if (value > 250) return 250;
  return value;
}

function sanitizeOffset(value: number): number {
  if (value < 0) return 0;
  return value;
}

function getSupportContext(request: NextRequest) {
  return {
    supportSessionId:
      request.headers.get("x-support-session-id") ||
      request.headers.get("X-Support-Session-Id") ||
      request.nextUrl.searchParams.get("supportSessionId") ||
      null,
    supportGrantId:
      request.headers.get("x-support-grant-id") ||
      request.headers.get("X-Support-Grant-Id") ||
      request.nextUrl.searchParams.get("supportGrantId") ||
      null,
  };
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== "string") {
    throw new Error("Invalid string field in request payload.");
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNullableIsoString(value: unknown): string | null | undefined {
  const normalized = normalizeNullableString(value);

  if (normalized === undefined || normalized === null) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date field in request payload.");
  }

  return parsed.toISOString();
}

function normalizeAction(value: unknown): UpdateVaultExportAction | undefined {
  if (value === undefined) return undefined;

  const normalized = String(value).trim() as UpdateVaultExportAction;

  if (!ALLOWED_ACTIONS.includes(normalized)) {
    throw new Error(
      "action must be one of: approve, cancel, mark_processing, mark_completed, mark_failed, restore."
    );
  }

  return normalized;
}

function getCaseIdFromFilters(filters?: Record<string, unknown> | null) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return null;
  }

  const value =
    normalizeString(filters.caseId) ??
    normalizeString(filters.case_id) ??
    normalizeString(filters.caseID);

  return value && isLikelyUuid(value) ? value : null;
}

function getCaseIdFromRequest(request: NextRequest) {
  const value =
    normalizeString(request.nextUrl.searchParams.get("caseId")) ??
    normalizeString(request.nextUrl.searchParams.get("case_id"));

  return value && isLikelyUuid(value) ? value : null;
}

function getCaseIdFromPayload(payload: UpdateVaultExportRequest) {
  const value = normalizeString(payload.caseId) ?? normalizeString(payload.case_id);
  return value && isLikelyUuid(value) ? value : null;
}

function mergeCaseIntoFilters(
  filters: Record<string, unknown> | null,
  caseId: string | null
) {
  if (!caseId) {
    return filters ?? {};
  }

  return {
    ...(filters ?? {}),
    caseId,
    case_id: caseId,
    caseScoped: true,
  };
}

function normalizePatchPayload(body: unknown): UpdateVaultExportRequest {
  if (!body || typeof body !== "object") {
    throw new Error("A valid export update payload is required.");
  }

  const input = body as Record<string, unknown>;

  const action = normalizeAction(input.action);
  const notes = normalizeNullableString(input.notes);
  const expiresAt = normalizeNullableIsoString(input.expiresAt ?? input.expires_at);
  const storagePath = normalizeNullableString(input.storagePath ?? input.storage_path);
  const manifestHashSha256 = normalizeNullableString(
    input.manifestHashSha256 ?? input.manifest_hash_sha256
  );
  const caseId = normalizeNullableString(input.caseId);
  const case_id = normalizeNullableString(input.case_id);

  if (
    action === undefined &&
    notes === undefined &&
    expiresAt === undefined &&
    storagePath === undefined &&
    manifestHashSha256 === undefined &&
    caseId === undefined &&
    case_id === undefined
  ) {
    throw new Error("At least one updatable export field is required.");
  }

  if (
    (storagePath !== undefined && manifestHashSha256 === undefined) ||
    (storagePath === undefined && manifestHashSha256 !== undefined)
  ) {
    throw new Error("storagePath and manifestHashSha256 must be updated together.");
  }

  return {
    action,
    notes,
    expiresAt,
    storagePath,
    manifestHashSha256,
    caseId,
    case_id,
  };
}

async function getExportOrThrow(params: {
  exportId: string;
  orgId: string;
}): Promise<VaultExportRecord> {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_exports")
    .select(VAULT_EXPORT_SELECT)
    .eq("id", params.exportId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Vault export: ${error.message}`);
  }

  if (!data) {
    throw new Error("Vault export not found for the target org.");
  }

  return data as VaultExportRecord;
}

async function getExportIncludingDeletedOrThrow(params: {
  exportId: string;
  orgId: string;
}): Promise<VaultExportRecord> {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_exports")
    .select(VAULT_EXPORT_SELECT)
    .eq("id", params.exportId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Vault export: ${error.message}`);
  }

  if (!data) {
    throw new Error("Vault export not found for the target org.");
  }

  return data as VaultExportRecord;
}

async function loadCaseOrThrow(params: {
  orgId: string;
  caseId: string;
}): Promise<VaultCaseRow> {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_cases")
    .select("id, org_id, name, status, deleted_at")
    .eq("id", params.caseId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to validate Vault case: ${error.message}`);
  }

  if (!data) {
    throw new Error("Vault case was not found.");
  }

  const caseRow = data as VaultCaseRow;

  if (caseRow.deleted_at) {
    throw new Error("Vault case is deleted.");
  }

  return caseRow;
}

async function validateCaseContext(params: {
  orgId: string;
  requestCaseId: string | null;
  exportRecord: VaultExportRecord;
}) {
  const filterCaseId = getCaseIdFromFilters(params.exportRecord.filters);
  const effectiveCaseId = params.requestCaseId ?? filterCaseId;

  if (!effectiveCaseId) {
    return {
      caseId: null,
      caseRow: null as VaultCaseRow | null,
      caseScoped: params.exportRecord.export_type === "case_export",
    };
  }

  if (filterCaseId && params.requestCaseId && filterCaseId !== params.requestCaseId) {
    throw new Error("Requested caseId does not match this export case context.");
  }

  const caseRow = await loadCaseOrThrow({
    orgId: params.orgId,
    caseId: effectiveCaseId,
  });

  return {
    caseId: effectiveCaseId,
    caseRow,
    caseScoped: true,
  };
}

function normalizeExportMetricMessage(
  value: ExportMetricRow["vault_messages"]
): { size_bytes: number | null } | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getExportMetrics(params: {
  exportId: string;
  orgId: string;
}) {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_export_items")
    .select(
      `
      message_id,
      vault_messages (
        size_bytes
      )
      `
    )
    .eq("org_id", params.orgId)
    .eq("export_id", params.exportId);

  if (error) {
    throw new Error(`Unable to calculate export metrics: ${error.message}`);
  }

  const rows = (data ?? []) as ExportMetricRow[];

  let totalSizeBytes = 0;
  for (const row of rows) {
    const message = normalizeExportMetricMessage(row.vault_messages);
    const size = Number(message?.size_bytes ?? 0);
    if (Number.isFinite(size) && size > 0) {
      totalSizeBytes += size;
    }
  }

  return {
    fileCount: rows.length,
    totalSizeBytes,
  };
}

async function syncExportMetrics(params: {
  exportId: string;
  orgId: string;
}): Promise<VaultExportRecord> {
  const adminClient = getVaultAdminClient();
  const metrics = await getExportMetrics(params);

  const { data, error } = await adminClient
    .from("vault_exports")
    .update({
      file_count: metrics.fileCount,
      total_size_bytes: metrics.totalSizeBytes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.exportId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select(VAULT_EXPORT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to sync Vault export metrics: ${error?.message ?? "Unknown error"}`
    );
  }

  return data as VaultExportRecord;
}

function validateStatusTransition(
  currentStatus: VaultExportStatus,
  action: UpdateVaultExportAction
) {
  if (action === "restore") return;

  if (action === "approve") {
    if (!["queued", "processing"].includes(currentStatus)) {
      throw new Error("Only queued or processing exports can be approved.");
    }
    return;
  }

  if (action === "cancel") {
    if (!["queued", "approved", "processing"].includes(currentStatus)) {
      throw new Error("Only queued, approved, or processing exports can be cancelled.");
    }
    return;
  }

  if (action === "mark_processing") {
    if (!["queued", "approved"].includes(currentStatus)) {
      throw new Error("Only queued or approved exports can be marked processing.");
    }
    return;
  }

  if (action === "mark_completed") {
    if (!["queued", "approved", "processing"].includes(currentStatus)) {
      throw new Error("Only queued, approved, or processing exports can be marked completed.");
    }
    return;
  }

  if (action === "mark_failed") {
    if (!["queued", "approved", "processing"].includes(currentStatus)) {
      throw new Error("Only queued, approved, or processing exports can be marked failed.");
    }
  }
}

function canEditArtifactMetadata(exportRecord: VaultExportRecord) {
  return ["completed", "failed", "cancelled"].includes(exportRecord.status);
}

function enrichExportRecord(record: VaultExportRecord): VaultExportRecordWithArtifactFlags {
  const hasStoragePath = Boolean(record.storage_path);
  const hasManifestHash = Boolean(record.manifest_hash_sha256);
  const artifactReady = record.status === "completed" && hasStoragePath && hasManifestHash;
  const caseId = getCaseIdFromFilters(record.filters);

  return {
    ...record,
    artifact_ready: artifactReady,
    artifact_state:
      hasStoragePath && hasManifestHash
        ? "ready"
        : hasStoragePath || hasManifestHash
          ? "partial"
          : "missing",
    has_storage_path: hasStoragePath,
    has_manifest_hash: hasManifestHash,
    can_rebuild:
      !record.deleted_at &&
      record.format !== "pst" &&
      (record.status === "completed" ||
        record.status === "failed" ||
        record.status === "cancelled"),
    case_id: caseId,
    case_scoped: record.export_type === "case_export" || Boolean(caseId),
  };
}

function getHttpStatusForVaultExportError(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("permission") ||
    lower.includes("support grant") ||
    lower.includes("scope")
  ) {
    return 403;
  }

  if (lower.includes("authenticate") || lower.includes("bearer token")) {
    return 401;
  }

  if (lower.includes("valid export id is required")) {
    return 400;
  }

  if (lower.includes("not found")) {
    return 404;
  }

  if (
    lower.includes("deleted") ||
    lower.includes("transition") ||
    lower.includes("does not match")
  ) {
    return 409;
  }

  return 400;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "export_management",
    });

    const adminClient = getVaultAdminClient();
    const exportId = getExportIdFromPath(request);
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const includeItems = request.nextUrl.searchParams.get("includeItems") !== "false";
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true";
    const requestCaseId = getCaseIdFromRequest(request);

    const exportRecord = includeDeleted
      ? await getExportIncludingDeletedOrThrow({
          exportId,
          orgId: access.targetOrgId,
        })
      : await getExportOrThrow({
          exportId,
          orgId: access.targetOrgId,
        });

    const caseContext = await validateCaseContext({
      orgId: access.targetOrgId,
      requestCaseId,
      exportRecord,
    });

    let exportItems: Array<Record<string, unknown>> = [];

    if (includeItems) {
      const limit = sanitizeLimit(toInt(request.nextUrl.searchParams.get("limit"), 100));
      const offset = sanitizeOffset(toInt(request.nextUrl.searchParams.get("offset"), 0));

      const { data, error } = await adminClient
        .from("vault_export_items")
        .select(
          `
          id,
          org_id,
          export_id,
          message_id,
          included_at,
          item_hash_sha256,
          metadata,
          vault_messages (
            id,
            subject,
            sender_email,
            sent_at,
            received_at,
            on_hold,
            disposition_status,
            has_attachments,
            attachment_count,
            size_bytes
          )
          `
        )
        .eq("org_id", access.targetOrgId)
        .eq("export_id", exportId)
        .order("included_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Unable to load export items: ${error.message}`);
      }

      exportItems = data ?? [];
    }

    const enrichedExportRecord = enrichExportRecord(exportRecord);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.export.read",
      entityType: "vault_export",
      entityId: exportRecord.id,
      status: "success",
      details: {
        include_items: includeItems,
        include_deleted: includeDeleted,
        linked_item_count: exportItems.length,
        export_status: exportRecord.status,
        export_type: exportRecord.export_type,
        file_count: exportRecord.file_count,
        total_size_bytes: exportRecord.total_size_bytes,
        storage_path_present: enrichedExportRecord.has_storage_path,
        manifest_present: enrichedExportRecord.has_manifest_hash,
        artifact_state: enrichedExportRecord.artifact_state,
        can_rebuild: enrichedExportRecord.can_rebuild,
        case_id: caseContext.caseId,
        case_scoped: caseContext.caseScoped,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      item: enrichedExportRecord,
      exportItems,
      caseContext: caseContext.caseRow
        ? {
            id: caseContext.caseRow.id,
            name: caseContext.caseRow.name,
            status: caseContext.caseRow.status,
          }
        : null,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vault export lookup failed.";

    return jsonError(message, getHttpStatusForVaultExportError(message));
  }
}

export async function PATCH(request: NextRequest) {
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;
  let auditExportId: string | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "export_management",
    });

    auditAccess = access;

    const adminClient = getVaultAdminClient();
    const exportId = getExportIdFromPath(request);
    auditExportId = exportId;

    const { supportSessionId, supportGrantId } = getSupportContext(request);
    const payload = normalizePatchPayload(await request.json());

    const existingExport =
      payload.action === "restore"
        ? await getExportIncludingDeletedOrThrow({
            exportId,
            orgId: access.targetOrgId,
          })
        : await getExportOrThrow({
            exportId,
            orgId: access.targetOrgId,
          });

    const requestCaseId =
      getCaseIdFromPayload(payload) ?? getCaseIdFromRequest(request);

    const caseContext = await validateCaseContext({
      orgId: access.targetOrgId,
      requestCaseId,
      exportRecord: existingExport,
    });

    const currentStatus = existingExport.status as VaultExportStatus;
    const updates: Record<string, unknown> = {};
    let shouldSyncMetrics = false;
    let artifactMetadataUpdated = false;

    if (payload.action) {
      validateStatusTransition(currentStatus, payload.action);

      if (payload.action === "approve") {
        updates.status = "approved";
        updates.approved_by = access.actorUserId;
      }

      if (payload.action === "cancel") {
        updates.status = "cancelled";
      }

      if (payload.action === "mark_processing") {
        updates.status = "processing";
      }

      if (payload.action === "mark_completed") {
        updates.status = "completed";
        updates.completed_at = new Date().toISOString();
        updates.approved_by = existingExport.approved_by ?? access.actorUserId;
        shouldSyncMetrics = true;
      }

      if (payload.action === "mark_failed") {
        updates.status = "failed";
      }

      if (payload.action === "restore") {
        if (!existingExport.deleted_at) {
          throw new Error("Export is not deleted.");
        }

        updates.deleted_at = null;
        updates.deleted_by = null;
      }
    }

    if (payload.notes !== undefined) {
      updates.notes = payload.notes;
    }

    if (payload.expiresAt !== undefined) {
      updates.expires_at = payload.expiresAt;
    }

    if (payload.storagePath !== undefined || payload.manifestHashSha256 !== undefined) {
      if (!canEditArtifactMetadata(existingExport) && payload.action !== "mark_completed") {
        throw new Error(
          "Artifact metadata can only be edited after an export is completed, failed, or cancelled."
        );
      }

      updates.storage_path = payload.storagePath ?? null;
      updates.manifest_hash_sha256 = payload.manifestHashSha256 ?? null;
      artifactMetadataUpdated = true;
    }

    if (caseContext.caseId) {
      updates.filters = mergeCaseIntoFilters(existingExport.filters, caseContext.caseId);
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedExport, error: updateError } = await adminClient
      .from("vault_exports")
      .update(updates)
      .eq("id", exportId)
      .eq("org_id", access.targetOrgId)
      .select(VAULT_EXPORT_SELECT)
      .single();

    if (updateError || !updatedExport) {
      throw new Error(
        `Unable to update Vault export: ${updateError?.message ?? "Unknown error"}`
      );
    }

    let finalExport = updatedExport as VaultExportRecord;

    if (shouldSyncMetrics) {
      finalExport = await syncExportMetrics({
        exportId,
        orgId: access.targetOrgId,
      });
    }

    const enrichedExportRecord = enrichExportRecord(finalExport);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: payload.action
        ? `vault.export.${payload.action}`
        : "vault.export.update",
      entityType: "vault_export",
      entityId: exportId,
      status: "success",
      details: {
        action: payload.action ?? null,
        previous_status: existingExport.status,
        new_status: finalExport.status,
        notes_updated: payload.notes !== undefined,
        expires_at_updated: payload.expiresAt !== undefined,
        artifact_metadata_updated: artifactMetadataUpdated,
        metrics_synced: shouldSyncMetrics,
        storage_path_present: enrichedExportRecord.has_storage_path,
        manifest_present: enrichedExportRecord.has_manifest_hash,
        artifact_state: enrichedExportRecord.artifact_state,
        case_id: caseContext.caseId,
        case_scoped: caseContext.caseScoped,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      item: enrichedExportRecord,
      caseContext: caseContext.caseRow
        ? {
            id: caseContext.caseRow.id,
            name: caseContext.caseRow.name,
            status: caseContext.caseRow.status,
          }
        : null,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    if (auditAccess) {
      try {
        const { supportSessionId, supportGrantId } = getSupportContext(request);

        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.export.update",
          entityType: "vault_export",
          entityId: auditExportId,
          status: "failure",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          request,
          supportSessionId,
          supportGrantId,
        });
      } catch {
        // swallow audit failures on error path
      }
    }

    const message =
      error instanceof Error ? error.message : "Vault export update failed.";

    return jsonError(message, getHttpStatusForVaultExportError(message));
  }
}

export async function DELETE(request: NextRequest) {
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;
  let auditExportId: string | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "export_management",
    });

    auditAccess = access;

    const adminClient = getVaultAdminClient();
    const exportId = getExportIdFromPath(request);
    auditExportId = exportId;
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const existingExport = await getExportOrThrow({
      exportId,
      orgId: access.targetOrgId,
    });

    const requestCaseId = getCaseIdFromRequest(request);

    const caseContext = await validateCaseContext({
      orgId: access.targetOrgId,
      requestCaseId,
      exportRecord: existingExport,
    });

    const deletedAt = new Date().toISOString();

    const { data: softDeletedExport, error: exportDeleteError } = await adminClient
      .from("vault_exports")
      .update({
        deleted_at: deletedAt,
        deleted_by: access.actorUserId,
        updated_at: deletedAt,
      })
      .eq("id", exportId)
      .eq("org_id", access.targetOrgId)
      .is("deleted_at", null)
      .select(VAULT_EXPORT_SELECT)
      .single();

    if (exportDeleteError || !softDeletedExport) {
      throw new Error(
        `Unable to soft delete Vault export: ${exportDeleteError?.message ?? "Unknown error"}`
      );
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.export.delete",
      entityType: "vault_export",
      entityId: existingExport.id,
      status: "success",
      details: {
        deleted_export_id: existingExport.id,
        deleted_export_name: existingExport.name,
        export_status: existingExport.status,
        export_type: existingExport.export_type,
        format: existingExport.format,
        file_count: existingExport.file_count,
        total_size_bytes: existingExport.total_size_bytes,
        storage_path: existingExport.storage_path,
        soft_deleted: true,
        deleted_at: deletedAt,
        deleted_by: access.actorUserId,
        case_id: caseContext.caseId,
        case_scoped: caseContext.caseScoped,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      ok: true,
      success: true,
      deletedId: existingExport.id,
      deletedName: existingExport.name,
      deletedAt,
      deletedBy: access.actorUserId,
      item: enrichExportRecord(softDeletedExport as VaultExportRecord),
      caseContext: caseContext.caseRow
        ? {
            id: caseContext.caseRow.id,
            name: caseContext.caseRow.name,
            status: caseContext.caseRow.status,
          }
        : null,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    if (auditAccess) {
      try {
        const { supportSessionId, supportGrantId } = getSupportContext(request);

        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.export.delete",
          entityType: "vault_export",
          entityId: auditExportId,
          status: "failure",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          request,
          supportSessionId,
          supportGrantId,
        });
      } catch {
        // swallow audit failures on error path
      }
    }

    const message =
      error instanceof Error ? error.message : "Vault export delete failed.";

    return jsonError(message, getHttpStatusForVaultExportError(message));
  }
}

export async function POST(request: NextRequest) {
  return PATCH(request);
}