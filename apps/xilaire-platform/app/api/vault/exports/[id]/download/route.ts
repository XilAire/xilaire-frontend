import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VaultExportRecord = {
  id: string;
  org_id: string;
  name: string;
  export_type: "search_result" | "case_export" | "hold_export" | "manual";
  format: "eml" | "pst" | "zip" | "json" | "csv";
  status: "queued" | "approved" | "processing" | "completed" | "failed" | "cancelled";
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
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string;
  status: string | null;
  deleted_at: string | null;
};

type VaultCaseMemberRow = {
  id: string;
  case_id: string;
  org_id: string;
  assignable_type: "custodian" | "admin";
  assignable_id: string;
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
  const downloadIndex = parts.lastIndexOf("download");
  const exportId =
    downloadIndex > 0 ? parts[downloadIndex - 1]?.trim() : parts[parts.length - 2]?.trim();

  if (!exportId) {
    throw new Error("A valid export id is required.");
  }

  const normalized = decodeURIComponent(exportId).trim();

  if (!normalized || !isLikelyUuid(normalized)) {
    throw new Error("A valid export id is required.");
  }

  return normalized;
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

function getCaseIdFromRequest(request: NextRequest) {
  const value =
    normalizeString(request.nextUrl.searchParams.get("caseId")) ??
    normalizeString(request.nextUrl.searchParams.get("case_id"));

  return value && isLikelyUuid(value) ? value : null;
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

function sanitizeFilenamePart(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;

  const sanitized = trimmed.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
  return sanitized || fallback;
}

function getContentType(format: VaultExportRecord["format"]) {
  if (format === "zip") return "application/zip";
  if (format === "json") return "application/json";
  if (format === "csv") return "text/csv; charset=utf-8";
  if (format === "pst") return "application/vnd.ms-outlook";
  if (format === "eml") return "message/rfc822";
  return "application/octet-stream";
}

function buildDownloadFilename(item: VaultExportRecord) {
  const baseName = sanitizeFilenamePart(item.name, `vault-export-${item.id}`);
  return `${baseName}.${item.format}`;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") {
      return serialized;
    }
  } catch {
    // ignore
  }

  return "Unknown storage error.";
}

function parseStoragePath(rawValue: string) {
  const raw = rawValue.trim();

  if (!raw) {
    throw new Error("Export storage path is empty.");
  }

  if (/^https?:\/\//i.test(raw)) {
    throw new Error("Direct URL storage paths are not supported by this download route.");
  }

  const fallbackBucket =
    process.env.VAULT_EXPORTS_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_VAULT_EXPORTS_STORAGE_BUCKET ||
    "vault-exports";

  const normalized = raw.replace(/^\/+/, "");

  const explicitBucketMatch = normalized.match(
    /^storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/i
  );
  if (explicitBucketMatch) {
    return {
      bucket: explicitBucketMatch[1],
      objectPath: explicitBucketMatch[2],
    };
  }

  if (normalized.startsWith(`${fallbackBucket}/`)) {
    return {
      bucket: fallbackBucket,
      objectPath: normalized.slice(fallbackBucket.length + 1),
    };
  }

  const firstSegment = normalized.split("/")[0] ?? "";

  if (isLikelyUuid(firstSegment)) {
    return {
      bucket: fallbackBucket,
      objectPath: normalized,
    };
  }

  const bucketFromPrefixMatch = normalized.match(/^([^/]+)\/(.+)$/);
  if (bucketFromPrefixMatch) {
    return {
      bucket: bucketFromPrefixMatch[1],
      objectPath: bucketFromPrefixMatch[2],
    };
  }

  return {
    bucket: fallbackBucket,
    objectPath: normalized,
  };
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;

  const timestamp = new Date(expiresAt).getTime();
  if (Number.isNaN(timestamp)) return false;

  return timestamp <= Date.now();
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

async function loadCaseCustodianIds(params: {
  orgId: string;
  caseId: string;
}) {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_case_members")
    .select("id, case_id, org_id, assignable_type, assignable_id")
    .eq("org_id", params.orgId)
    .eq("case_id", params.caseId)
    .eq("assignable_type", "custodian");

  if (error) {
    throw new Error(`Unable to validate case custodians: ${error.message}`);
  }

  return ((data ?? []) as VaultCaseMemberRow[])
    .map((row) => row.assignable_id)
    .filter(Boolean);
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
      custodianIds: null as string[] | null,
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

  const custodianIds = await loadCaseCustodianIds({
    orgId: params.orgId,
    caseId: effectiveCaseId,
  });

  return {
    caseId: effectiveCaseId,
    caseRow,
    custodianIds,
    caseScoped: true,
  };
}

async function validateExportItemsInsideCase(params: {
  orgId: string;
  exportId: string;
  caseId: string | null;
  caseCustodianIds: string[] | null;
}) {
  if (!params.caseId || !params.caseCustodianIds) {
    return {
      checked: false,
      itemCount: null as number | null,
      scopedMessageCount: null as number | null,
    };
  }

  const adminClient = getVaultAdminClient();

  const { data: itemRows, error: itemError } = await adminClient
    .from("vault_export_items")
    .select("message_id")
    .eq("org_id", params.orgId)
    .eq("export_id", params.exportId);

  if (itemError) {
    throw new Error(`Unable to validate export items for case scope: ${itemError.message}`);
  }

  const messageIds = (itemRows ?? [])
    .map((row) => normalizeString((row as Record<string, unknown>).message_id))
    .filter((id): id is string => Boolean(id));

  if (messageIds.length === 0) {
    return {
      checked: true,
      itemCount: 0,
      scopedMessageCount: 0,
    };
  }

  if (params.caseCustodianIds.length === 0) {
    throw new Error("This case has no custodian scope, so export download is blocked.");
  }

  const { data: scopedMessages, error: scopedError } = await adminClient
    .from("vault_messages")
    .select("id")
    .eq("org_id", params.orgId)
    .in("id", messageIds)
    .in("custodian_id", params.caseCustodianIds);

  if (scopedError) {
    throw new Error(`Unable to validate export message scope: ${scopedError.message}`);
  }

  const scopedMessageCount = scopedMessages?.length ?? 0;

  if (scopedMessageCount !== messageIds.length) {
    throw new Error("One or more export messages are outside the case custodian scope.");
  }

  return {
    checked: true,
    itemCount: messageIds.length,
    scopedMessageCount,
  };
}

function getHttpStatusForVaultExportError(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("permission") ||
    lower.includes("support grant") ||
    lower.includes("scope") ||
    lower.includes("outside the case")
  ) {
    return 403;
  }

  if (lower.includes("authenticate") || lower.includes("bearer token")) {
    return 401;
  }

  if (lower.includes("valid export id is required")) {
    return 400;
  }

  if (
    lower.includes("unable to download vault export artifact") ||
    lower.includes("file not found in storage") ||
    lower.includes("object not found") ||
    lower.includes("not found in storage")
  ) {
    return 404;
  }

  if (lower.includes("not found")) {
    return 404;
  }

  if (
    lower.includes("must be completed") ||
    lower.includes("storage path") ||
    lower.includes("not supported") ||
    lower.includes("expired") ||
    lower.includes("deleted") ||
    lower.includes("does not match")
  ) {
    return 409;
  }

  return 400;
}

export async function GET(request: NextRequest) {
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;
  let auditExportId: string | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "export_management",
    });

    auditAccess = access;

    const adminClient = getVaultAdminClient();
    const exportId = getExportIdFromPath(request);
    auditExportId = exportId;

    const { supportSessionId, supportGrantId } = getSupportContext(request);
    const requestCaseId = getCaseIdFromRequest(request);

    const exportRecord = await getExportOrThrow({
      exportId,
      orgId: access.targetOrgId,
    });

    const caseContext = await validateCaseContext({
      orgId: access.targetOrgId,
      requestCaseId,
      exportRecord,
    });

    const scopeValidation = await validateExportItemsInsideCase({
      orgId: access.targetOrgId,
      exportId,
      caseId: caseContext.caseId,
      caseCustodianIds: caseContext.custodianIds,
    });

    if (exportRecord.deleted_at) {
      throw new Error("Deleted exports cannot be downloaded.");
    }

    if (exportRecord.status !== "completed") {
      throw new Error("Export must be completed before downloading.");
    }

    if (isExpired(exportRecord.expires_at)) {
      throw new Error("This export has expired and can no longer be downloaded.");
    }

    if (!exportRecord.storage_path?.trim()) {
      throw new Error("Export does not have a storage path.");
    }

    if (!exportRecord.manifest_hash_sha256?.trim()) {
      throw new Error("Export does not have a manifest hash.");
    }

    const { bucket, objectPath } = parseStoragePath(exportRecord.storage_path);

    const { data: fileData, error: downloadError } = await adminClient.storage
      .from(bucket)
      .download(objectPath);

    if (downloadError || !fileData) {
      throw new Error(
        `Unable to download Vault export artifact: ${
          safeErrorMessage(downloadError) || "File not found in storage."
        }`
      );
    }

    const fileName = buildDownloadFilename(exportRecord);
    const contentType = fileData.type || getContentType(exportRecord.format);
    const arrayBuffer = await fileData.arrayBuffer();

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.export.download",
      entityType: "vault_export",
      entityId: exportRecord.id,
      status: "success",
      details: {
        export_status: exportRecord.status,
        export_type: exportRecord.export_type,
        format: exportRecord.format,
        storage_bucket: bucket,
        storage_path: objectPath,
        file_name: fileName,
        content_type: contentType,
        file_count: exportRecord.file_count,
        total_size_bytes: exportRecord.total_size_bytes,
        manifest_hash_sha256: exportRecord.manifest_hash_sha256,
        case_id: caseContext.caseId,
        case_scoped: caseContext.caseScoped,
        case_scope_checked: scopeValidation.checked,
        case_scope_item_count: scopeValidation.itemCount,
        case_scope_message_count: scopeValidation.scopedMessageCount,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(arrayBuffer.byteLength),
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Vault-Export-Id": exportRecord.id,
        "X-Vault-Export-Format": exportRecord.format,
        ...(caseContext.caseId ? { "X-Vault-Case-Id": caseContext.caseId } : {}),
      },
    });
  } catch (error) {
    if (auditAccess) {
      try {
        const { supportSessionId, supportGrantId } = getSupportContext(request);

        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.export.download",
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
      error instanceof Error ? error.message : "Vault export download failed.";

    return jsonError(message, getHttpStatusForVaultExportError(message));
  }
}