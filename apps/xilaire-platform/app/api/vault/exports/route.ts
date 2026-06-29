import { NextRequest } from "next/server";
import JSZip from "jszip";
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

type CreateVaultExportRequest = {
  name?: string | null;
  caseId?: string | null;
  case_id?: string | null;
  exportType: VaultExportType;
  export_type?: VaultExportType;
  format: VaultExportFormat;
  notes?: string | null;
  expiresAt?: string | null;
  expires_at?: string | null;
  filters?: Record<string, unknown>;
  messageIds: string[];
  message_ids?: string[];
};

type VaultMessageRow = {
  id: string;
  org_id: string;
  custodian_id: string | null;
  subject: string | null;
  sender_email: string | null;
  sent_at?: string | null;
  received_at?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  internet_message_id?: string | null;
  conversation_id?: string | null;
  has_attachments?: boolean | null;
  attachment_count?: number | null;
  size_bytes?: number | null;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string;
  status: string | null;
  priority: string | null;
  deleted_at: string | null;
};

type VaultCaseMemberRow = {
  id: string;
  org_id: string;
  case_id: string;
  assignable_type: "custodian" | "admin";
  assignable_id: string;
  role: string | null;
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
  case_id: string | null;
};

type VaultExportRecordWithArtifactFlags = VaultExportRecord & {
  artifact_ready: boolean;
  artifact_state: "ready" | "partial" | "missing";
  has_storage_path: boolean;
  has_manifest_hash: boolean;
  can_rebuild: boolean;
};

const STORAGE_BUCKET = "vault-exports";

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
  deleted_by,
  case_id
`;

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

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
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
    throw new Error("expiresAt must be a valid date value.");
  }

  return parsed.toISOString();
}

function normalizeExportType(value: unknown): VaultExportType {
  if (
    value === "search_result" ||
    value === "case_export" ||
    value === "hold_export" ||
    value === "manual"
  ) {
    return value;
  }

  throw new Error("exportType must be one of: search_result, case_export, hold_export, manual.");
}

function normalizeExportFormat(value: unknown): VaultExportFormat {
  if (
    value === "eml" ||
    value === "pst" ||
    value === "zip" ||
    value === "json" ||
    value === "csv"
  ) {
    return value;
  }

  throw new Error("format must be one of: eml, pst, zip, json, csv.");
}

function isUuidLike(value: string | null | undefined) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeCaseId(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return isUuidLike(normalized) ? normalized : null;
}

function normalizeCreatePayload(body: unknown): CreateVaultExportRequest {
  if (!body || typeof body !== "object") {
    throw new Error("A valid export create payload is required.");
  }

  const input = body as Record<string, unknown>;
  const name = normalizeNullableString(input.name);
  const notes = normalizeNullableString(input.notes);
  const expiresAt = normalizeNullableIsoString(input.expiresAt ?? input.expires_at);
  const caseIdCandidate =
    normalizeNullableString(input.caseId) ??
    normalizeNullableString(input.case_id);

  const caseId = caseIdCandidate ? normalizeCaseId(caseIdCandidate) : null;

  if (caseIdCandidate && !caseId) {
    throw new Error("caseId must be a valid UUID.");
  }

  const exportType = normalizeExportType(input.exportType ?? input.export_type);
  const format = normalizeExportFormat(input.format);

  const rawFilters = input.filters;
  let filters: Record<string, unknown> = {};
  if (rawFilters !== undefined) {
    if (!rawFilters || typeof rawFilters !== "object" || Array.isArray(rawFilters)) {
      throw new Error("filters must be an object.");
    }
    filters = rawFilters as Record<string, unknown>;
  }

  const rawMessageIds = input.messageIds ?? input.message_ids;
  if (!Array.isArray(rawMessageIds)) {
    throw new Error("messageIds must be an array.");
  }

  const messageIds = rawMessageIds
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (messageIds.length === 0) {
    throw new Error("At least one message id is required.");
  }

  const dedupedMessageIds = Array.from(new Set(messageIds));

  return {
    name,
    caseId,
    case_id: caseId,
    exportType,
    export_type: exportType,
    format,
    notes,
    expiresAt,
    expires_at: expiresAt,
    filters,
    messageIds: dedupedMessageIds,
    message_ids: dedupedMessageIds,
  };
}

function isValidStatusFilter(value: string): value is VaultExportStatus {
  return (
    value === "queued" ||
    value === "approved" ||
    value === "processing" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  );
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

  if (lower.includes("not found")) {
    return 404;
  }

  if (lower.includes("deleted")) {
    return 409;
  }

  return 400;
}

function formatCsvValue(value: unknown) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildMessagesCsv(messages: VaultMessageRow[]) {
  const header = [
    "id",
    "subject",
    "sender_email",
    "sent_at",
    "received_at",
    "internet_message_id",
    "conversation_id",
    "has_attachments",
    "attachment_count",
    "size_bytes",
  ];

  const rows = messages.map((message) =>
    [
      message.id,
      message.subject,
      message.sender_email,
      message.sent_at,
      message.received_at,
      message.internet_message_id,
      message.conversation_id,
      message.has_attachments,
      message.attachment_count,
      message.size_bytes,
    ]
      .map(formatCsvValue)
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

function buildEmlContent(message: VaultMessageRow) {
  const fromHeader = message.sender_email || "unknown@example.com";
  const subjectHeader = message.subject || "(No Subject)";
  const dateHeader = message.sent_at || message.received_at || new Date().toISOString();
  const messageIdHeader = message.internet_message_id || `<${message.id}@vault.local>`;
  const body = message.body_text || "No message body available.";

  const headers = [
    `From: ${fromHeader}`,
    "To: ",
    `Subject: ${subjectHeader}`,
    `Date: ${new Date(dateHeader).toUTCString()}`,
    `Message-ID: ${messageIdHeader}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    body,
  ];

  return headers.join("\r\n");
}

async function sha256Hex(input: ArrayBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", input);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildExportArtifact(params: {
  exportRecord: Pick<VaultExportRecord, "id" | "org_id" | "name" | "format" | "requested_at"> & {
    case_id?: string | null;
  };
  messages: VaultMessageRow[];
}): Promise<{
  buffer: ArrayBuffer;
  contentType: string;
  extension: string;
  manifestHashSha256: string;
}> {
  const manifest = {
    export_id: params.exportRecord.id,
    org_id: params.exportRecord.org_id,
    case_id: params.exportRecord.case_id ?? null,
    export_name: params.exportRecord.name,
    format: params.exportRecord.format,
    generated_at: new Date().toISOString(),
    requested_at: params.exportRecord.requested_at,
    message_count: params.messages.length,
    messages: params.messages.map((message) => ({
      id: message.id,
      subject: message.subject,
      sender_email: message.sender_email,
      sent_at: message.sent_at,
      received_at: message.received_at,
      has_attachments: message.has_attachments ?? false,
      attachment_count: message.attachment_count ?? 0,
      size_bytes: message.size_bytes ?? 0,
    })),
  };

  if (params.exportRecord.format === "zip") {
    const zip = new JSZip();

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("messages.json", JSON.stringify(params.messages, null, 2));
    zip.file("messages.csv", buildMessagesCsv(params.messages));

    for (const message of params.messages) {
      zip.file(`messages/${message.id}.eml`, buildEmlContent(message));
    }

    const uint8 = await zip.generateAsync({ type: "uint8array" });
    const arrayBuffer = uint8.buffer.slice(
      uint8.byteOffset,
      uint8.byteOffset + uint8.byteLength
    ) as ArrayBuffer;

    return {
      buffer: arrayBuffer,
      contentType: "application/zip",
      extension: "zip",
      manifestHashSha256: await sha256Hex(arrayBuffer),
    };
  }

  if (params.exportRecord.format === "json") {
    const text = JSON.stringify(
      {
        manifest,
        messages: params.messages,
      },
      null,
      2
    );
    const arrayBuffer = new TextEncoder().encode(text).buffer as ArrayBuffer;

    return {
      buffer: arrayBuffer,
      contentType: "application/json",
      extension: "json",
      manifestHashSha256: await sha256Hex(arrayBuffer),
    };
  }

  if (params.exportRecord.format === "csv") {
    const csv = buildMessagesCsv(params.messages);
    const arrayBuffer = new TextEncoder().encode(csv).buffer as ArrayBuffer;

    return {
      buffer: arrayBuffer,
      contentType: "text/csv; charset=utf-8",
      extension: "csv",
      manifestHashSha256: await sha256Hex(arrayBuffer),
    };
  }

  if (params.exportRecord.format === "eml") {
    const combined = params.messages.map(buildEmlContent).join("\r\n\r\n");
    const arrayBuffer = new TextEncoder().encode(combined).buffer as ArrayBuffer;

    return {
      buffer: arrayBuffer,
      contentType: "message/rfc822",
      extension: "eml",
      manifestHashSha256: await sha256Hex(arrayBuffer),
    };
  }

  throw new Error("Automatic artifact generation is not yet implemented for PST exports.");
}

function buildStorageObjectPath(params: {
  orgId: string;
  exportId: string;
  extension: string;
}) {
  return `${params.orgId}/${params.exportId}/export.${params.extension}`;
}

function buildStoragePathValue(params: {
  bucket: string;
  objectPath: string;
}) {
  return `${params.bucket}/${params.objectPath}`;
}

function enrichExportRecord(record: VaultExportRecord): VaultExportRecordWithArtifactFlags {
  const hasStoragePath = Boolean(record.storage_path);
  const hasManifestHash = Boolean(record.manifest_hash_sha256);
  const artifactReady = hasStoragePath && hasManifestHash;

  return {
    ...record,
    artifact_ready: artifactReady,
    artifact_state: artifactReady
      ? "ready"
      : hasStoragePath || hasManifestHash
        ? "partial"
        : "missing",
    has_storage_path: hasStoragePath,
    has_manifest_hash: hasManifestHash,
    can_rebuild:
      record.format !== "pst" &&
      (record.status === "completed" ||
        record.status === "failed" ||
        record.status === "cancelled"),
  };
}

async function loadCaseScope(params: {
  adminClient: ReturnType<typeof getVaultAdminClient>;
  orgId: string;
  caseId: string;
}) {
  const { data: caseData, error: caseError } = await params.adminClient
    .from("vault_cases")
    .select(
      `
        id,
        org_id,
        name,
        status,
        priority,
        deleted_at
      `
    )
    .eq("id", params.caseId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (caseError) {
    throw new Error(`Unable to load Vault case: ${caseError.message}`);
  }

  if (!caseData) {
    throw new Error("Vault case was not found.");
  }

  const caseRow = caseData as VaultCaseRow;

  if (caseRow.deleted_at) {
    throw new Error("Vault case is deleted.");
  }

  const { data: memberData, error: memberError } = await params.adminClient
    .from("vault_case_members")
    .select(
      `
        id,
        org_id,
        case_id,
        assignable_type,
        assignable_id,
        role
      `
    )
    .eq("org_id", params.orgId)
    .eq("case_id", params.caseId)
    .eq("assignable_type", "custodian");

  if (memberError) {
    throw new Error(`Unable to load case custodians: ${memberError.message}`);
  }

  const custodianIds = Array.from(
    new Set(
      toRows<VaultCaseMemberRow>(memberData)
        .filter((row) => row.assignable_type === "custodian")
        .map((row) => normalizeString(row.assignable_id))
        .filter((id): id is string => Boolean(id))
    )
  );

  return {
    caseRow,
    custodianIds,
  };
}

function normalizeCaseIdFromSearchParams(request: NextRequest) {
  const caseId =
    normalizeString(request.nextUrl.searchParams.get("caseId")) ??
    normalizeString(request.nextUrl.searchParams.get("case_id"));

  if (!caseId) return null;

  return normalizeCaseId(caseId);
}

function getCaseIdFromExportFilters(record: VaultExportRecord) {
  const filters = record.filters ?? {};
  return (
    normalizeCaseId(record.case_id) ??
    normalizeCaseId(filters.caseId) ??
    normalizeCaseId(filters.case_id) ??
    null
  );
}

function exportMatchesCaseFilter(record: VaultExportRecord, caseId: string | null) {
  if (!caseId) return true;
  return getCaseIdFromExportFilters(record) === caseId;
}

function mergeCaseFilters(params: {
  filters: Record<string, unknown>;
  caseId: string | null | undefined;
  caseScope:
    | {
        caseRow: VaultCaseRow;
        custodianIds: string[];
      }
    | null;
  requestedAt?: string | null;
  actorUserId?: string | null;
  messageCount?: number | null;
}) {
  const baseFilters: Record<string, unknown> = {
    ...params.filters,
  };

  if (params.actorUserId) {
    baseFilters.generatedBy = params.actorUserId;
    baseFilters.generated_by = params.actorUserId;
  }

  if (params.requestedAt) {
    baseFilters.generatedAt = params.requestedAt;
    baseFilters.generated_at = params.requestedAt;
  }

  if (typeof params.messageCount === "number") {
    baseFilters.exportMessageCount = params.messageCount;
    baseFilters.export_message_count = params.messageCount;
  }

  if (!params.caseId) return baseFilters;

  return {
    ...baseFilters,
    caseId: params.caseId,
    case_id: params.caseId,
    caseScoped: true,
    case_scoped: true,
    caseName: params.caseScope?.caseRow.name ?? null,
    case_name: params.caseScope?.caseRow.name ?? null,
    caseMatterNumber: null,
    case_matter_number: null,
    caseStatus: params.caseScope?.caseRow.status ?? null,
    case_status: params.caseScope?.caseRow.status ?? null,
    casePriority: params.caseScope?.caseRow.priority ?? null,
    case_priority: params.caseScope?.caseRow.priority ?? null,
    caseCustodianIds: params.caseScope?.custodianIds ?? [],
    case_custodian_ids: params.caseScope?.custodianIds ?? [],
    caseCustodianCount: params.caseScope?.custodianIds.length ?? 0,
    case_custodian_count: params.caseScope?.custodianIds.length ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "export_management",
    });

    const adminClient = getVaultAdminClient();
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const limit = sanitizeLimit(toInt(request.nextUrl.searchParams.get("limit"), 25));
    const offset = sanitizeOffset(toInt(request.nextUrl.searchParams.get("offset"), 0));

    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const exportType = request.nextUrl.searchParams.get("exportType")?.trim() || "";
    const format = request.nextUrl.searchParams.get("format")?.trim() || "";
    const caseId = normalizeCaseIdFromSearchParams(request);
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true";

    let caseScope:
      | {
          caseRow: VaultCaseRow;
          custodianIds: string[];
        }
      | null = null;

    if (caseId) {
      caseScope = await loadCaseScope({
        adminClient,
        orgId: access.targetOrgId,
        caseId,
      });
    }

    let query = adminClient
      .from("vault_exports")
      .select(VAULT_EXPORT_SELECT, { count: "exact" })
      .eq("org_id", access.targetOrgId);

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,notes.ilike.%${q}%`);
    }

    if (isValidStatusFilter(status)) {
      query = query.eq("status", status);
    }

    if (
      exportType === "search_result" ||
      exportType === "case_export" ||
      exportType === "hold_export" ||
      exportType === "manual"
    ) {
      query = query.eq("export_type", exportType);
    }

    if (
      format === "eml" ||
      format === "pst" ||
      format === "zip" ||
      format === "json" ||
      format === "csv"
    ) {
      query = query.eq("format", format);
    }

    if (caseId) {
      query = query.or(
        `case_id.eq.${caseId},filters->>caseId.eq.${caseId},filters->>case_id.eq.${caseId}`
      );
    }

    const serverFetchLimit = caseId ? Math.max(limit + offset, 250) : limit;
    const serverFetchOffset = caseId ? 0 : offset;

    const { data, error, count } = await query
      .order("requested_at", { ascending: false })
      .range(serverFetchOffset, serverFetchOffset + serverFetchLimit - 1);

    if (error) {
      throw new Error(`Unable to load Vault exports: ${error.message}`);
    }

    const rawItems = ((data ?? []) as VaultExportRecord[]).filter((record) =>
      exportMatchesCaseFilter(record, caseId)
    );

    const pagedItems = caseId ? rawItems.slice(offset, offset + limit) : rawItems;

    const enrichedItems = pagedItems.map(enrichExportRecord);
    const totalCount = caseId ? rawItems.length : count ?? rawItems.length;

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: caseId ? "vault.export.list.case_scoped" : "vault.export.list",
      entityType: caseId ? "vault_case" : "vault_export",
      entityId: caseId ?? null,
      status: "success",
      details: {
        q,
        status_filter: status || null,
        export_type_filter: exportType || null,
        format_filter: format || null,
        include_deleted: includeDeleted,
        case_id: caseId ?? null,
        case_name: caseScope?.caseRow.name ?? null,
        case_custodian_count: caseScope?.custodianIds.length ?? null,
        limit,
        offset,
        returned_count: enrichedItems.length,
        total_count: totalCount,
        ready_count: enrichedItems.filter((item) => item.artifact_state === "ready").length,
        partial_count: enrichedItems.filter((item) => item.artifact_state === "partial").length,
        missing_count: enrichedItems.filter((item) => item.artifact_state === "missing").length,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      items: enrichedItems,
      total: totalCount,
      limit,
      offset,
      caseScope: caseScope
        ? {
            id: caseScope.caseRow.id,
            name: caseScope.caseRow.name,
            status: caseScope.caseRow.status,
            priority: caseScope.caseRow.priority,
            matter_number: null,
            custodianCount: caseScope.custodianIds.length,
          }
        : null,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vault exports lookup failed.";

    return jsonError(message, getHttpStatusForVaultExportError(message));
  }
}

export async function POST(request: NextRequest) {
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;
  let createdExportId: string | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "export_management",
    });

    auditAccess = access;

    const adminClient = getVaultAdminClient();
    const { supportSessionId, supportGrantId } = getSupportContext(request);
    const payload = normalizeCreatePayload(await request.json());

    let caseScope:
      | {
          caseRow: VaultCaseRow;
          custodianIds: string[];
        }
      | null = null;

    if (payload.caseId) {
      caseScope = await loadCaseScope({
        adminClient,
        orgId: access.targetOrgId,
        caseId: payload.caseId,
      });

      if (caseScope.custodianIds.length === 0) {
        throw new Error("Cannot create a case export because this case has no assigned custodians.");
      }
    }

    const { data: existingMessages, error: messagesError } = await adminClient
      .from("vault_messages")
      .select(`
        id,
        org_id,
        custodian_id,
        subject,
        sender_email,
        sent_at,
        received_at,
        body_text,
        body_html,
        internet_message_id,
        conversation_id,
        has_attachments,
        attachment_count,
        size_bytes
      `)
      .eq("org_id", access.targetOrgId)
      .in("id", payload.messageIds);

    if (messagesError) {
      throw new Error(`Unable to validate export messages: ${messagesError.message}`);
    }

    const messages = (existingMessages ?? []) as VaultMessageRow[];
    const existingIds = new Set(messages.map((row) => row.id));
    const missingMessageIds = payload.messageIds.filter((id) => !existingIds.has(id));

    if (missingMessageIds.length > 0) {
      throw new Error(
        `Some message ids were not found for the target org: ${missingMessageIds.slice(0, 10).join(", ")}`
      );
    }

    if (caseScope) {
      const allowedCustodianIds = new Set(caseScope.custodianIds);

      const outOfScopeMessages = messages.filter(
        (message) =>
          !message.custodian_id || !allowedCustodianIds.has(message.custodian_id)
      );

      if (outOfScopeMessages.length > 0) {
        throw new Error(
          `Some message ids are outside of the selected case custodian scope: ${outOfScopeMessages
            .slice(0, 10)
            .map((message) => message.id)
            .join(", ")}`
        );
      }
    }

    const requestedAt = new Date().toISOString();
    const exportName =
      payload.name ??
      (caseScope
        ? `${caseScope.caseRow.name} Export ${requestedAt.replace(/[:.]/g, "-")}`
        : `Vault Export ${requestedAt.replace(/[:.]/g, "-")}`);

    const initialStatus: VaultExportStatus =
      payload.format === "pst" ? "queued" : "processing";

    const mergedFilters = mergeCaseFilters({
      filters: payload.filters ?? {},
      caseId: payload.caseId,
      caseScope,
      requestedAt,
      actorUserId: access.actorUserId ?? null,
      messageCount: messages.length,
    });

    const { data: createdExport, error: createError } = await adminClient
      .from("vault_exports")
      .insert({
        org_id: access.targetOrgId,
        case_id: payload.caseId ?? null,
        name: exportName,
        export_type: payload.exportType,
        format: payload.format,
        status: initialStatus,
        requested_by: access.actorUserId,
        approved_by: access.actorUserId,
        requested_at: requestedAt,
        expires_at: payload.expiresAt ?? null,
        filters: mergedFilters,
        notes: payload.notes ?? null,
        file_count: 0,
        total_size_bytes: 0,
        storage_path: null,
        manifest_hash_sha256: null,
        deleted_at: null,
        deleted_by: null,
      })
      .select(VAULT_EXPORT_SELECT)
      .single();

    if (createError || !createdExport) {
      throw new Error(`Unable to create Vault export: ${createError?.message ?? "Unknown error"}`);
    }

    createdExportId = createdExport.id;

    const exportItems = payload.messageIds.map((messageId) => ({
      org_id: access.targetOrgId,
      export_id: createdExport.id,
      message_id: messageId,
      included_at: requestedAt,
      metadata: {
        case_id: payload.caseId ?? null,
        caseId: payload.caseId ?? null,
        case_name: caseScope?.caseRow.name ?? null,
        caseName: caseScope?.caseRow.name ?? null,
        case_matter_number: null,
        caseMatterNumber: null,
        case_status: caseScope?.caseRow.status ?? null,
        caseStatus: caseScope?.caseRow.status ?? null,
        case_priority: caseScope?.caseRow.priority ?? null,
        casePriority: caseScope?.caseRow.priority ?? null,
        case_custodian_count: caseScope?.custodianIds.length ?? null,
        caseCustodianCount: caseScope?.custodianIds.length ?? null,
        export_type: payload.exportType,
        exportType: payload.exportType,
        generated_at: requestedAt,
        generatedAt: requestedAt,
        generated_by: access.actorUserId ?? null,
        generatedBy: access.actorUserId ?? null,
      },
    }));

    const { error: itemsError } = await adminClient
      .from("vault_export_items")
      .insert(exportItems);

    if (itemsError) {
      throw new Error(`Unable to create Vault export items: ${itemsError.message}`);
    }

    const fileCount = messages.length;
    const totalSizeBytes = messages.reduce((sum, row) => {
      const size = Number(row.size_bytes ?? 0);
      return sum + (Number.isFinite(size) && size > 0 ? size : 0);
    }, 0);

    if (payload.format === "pst") {
      const { data: queuedExport, error: queuedUpdateError } = await adminClient
        .from("vault_exports")
        .update({
          file_count: fileCount,
          total_size_bytes: totalSizeBytes,
          notes:
            payload.notes ??
            "PST artifact generation is not yet automated. This export remains queued.",
        })
        .eq("id", createdExport.id)
        .eq("org_id", access.targetOrgId)
        .select(VAULT_EXPORT_SELECT)
        .single();

      if (queuedUpdateError || !queuedExport) {
        throw new Error(
          `Unable to finalize queued PST export: ${queuedUpdateError?.message ?? "Unknown error"}`
        );
      }

      const enrichedQueuedExport = enrichExportRecord(queuedExport as VaultExportRecord);

      await writeUnifiedVaultAccessAuditLog({
        access,
        action: payload.caseId
          ? "vault.export.create.case_scoped"
          : "vault.export.create",
        entityType: payload.caseId ? "vault_case" : "vault_export",
        entityId: payload.caseId ?? queuedExport.id,
        status: "success",
        details: {
          export_id: queuedExport.id,
          case_id: payload.caseId ?? null,
          case_name: caseScope?.caseRow.name ?? null,
          case_custodian_count: caseScope?.custodianIds.length ?? null,
          export_type: queuedExport.export_type,
          format: queuedExport.format,
          requested_message_count: payload.messageIds.length,
          linked_count: queuedExport.file_count,
          total_size_bytes: queuedExport.total_size_bytes,
          artifact_generated: false,
          artifact_state: enrichedQueuedExport.artifact_state,
          reason: "pst_not_automated",
        },
        request,
        supportSessionId,
        supportGrantId,
      });

      return jsonOk({
        item: enrichedQueuedExport,
        messageCount: queuedExport.file_count,
        summary: {
          requestedCount: payload.messageIds.length,
          linkedCount: queuedExport.file_count,
          cachedExportCountUpdatedCount: 0,
          cachedExportCountFailedCount: 0,
        },
        caseScope: caseScope
          ? {
              id: caseScope.caseRow.id,
              name: caseScope.caseRow.name,
              status: caseScope.caseRow.status,
              priority: caseScope.caseRow.priority,
              matter_number: null,
              custodianCount: caseScope.custodianIds.length,
            }
          : null,
        targetOrgId: access.targetOrgId,
        accessPath: access.accessPath,
      });
    }

    const artifact = await buildExportArtifact({
      exportRecord: {
        id: createdExport.id,
        org_id: access.targetOrgId,
        case_id: payload.caseId ?? null,
        name: createdExport.name,
        format: createdExport.format,
        requested_at: createdExport.requested_at,
      },
      messages,
    });

    const objectPath = buildStorageObjectPath({
      orgId: access.targetOrgId,
      exportId: createdExport.id,
      extension: artifact.extension,
    });

    const uploadBody = Buffer.from(artifact.buffer);

    const { error: uploadError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, uploadBody, {
        upsert: true,
        contentType: artifact.contentType,
      });

    if (uploadError) {
      throw new Error(`Unable to upload Vault export artifact: ${uploadError.message}`);
    }

    const storagePathValue = buildStoragePathValue({
      bucket: STORAGE_BUCKET,
      objectPath,
    });

    const { data: completedExport, error: completeError } = await adminClient
      .from("vault_exports")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        approved_by: access.actorUserId,
        file_count: fileCount,
        total_size_bytes: totalSizeBytes,
        storage_path: storagePathValue,
        manifest_hash_sha256: artifact.manifestHashSha256,
      })
      .eq("id", createdExport.id)
      .eq("org_id", access.targetOrgId)
      .select(VAULT_EXPORT_SELECT)
      .single();

    if (completeError || !completedExport) {
      throw new Error(
        `Unable to finalize completed Vault export: ${completeError?.message ?? "Unknown error"}`
      );
    }

    const enrichedCompletedExport = enrichExportRecord(completedExport as VaultExportRecord);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: payload.caseId
        ? "vault.export.create.case_scoped"
        : "vault.export.create",
      entityType: payload.caseId ? "vault_case" : "vault_export",
      entityId: payload.caseId ?? completedExport.id,
      status: "success",
      details: {
        export_id: completedExport.id,
        case_id: payload.caseId ?? null,
        case_name: caseScope?.caseRow.name ?? null,
        case_custodian_count: caseScope?.custodianIds.length ?? null,
        export_type: completedExport.export_type,
        format: completedExport.format,
        requested_message_count: payload.messageIds.length,
        linked_count: completedExport.file_count,
        total_size_bytes: completedExport.total_size_bytes,
        artifact_generated: true,
        artifact_state: enrichedCompletedExport.artifact_state,
        storage_path: completedExport.storage_path,
        manifest_hash_sha256: completedExport.manifest_hash_sha256,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      item: enrichedCompletedExport,
      messageCount: completedExport.file_count,
      summary: {
        requestedCount: payload.messageIds.length,
        linkedCount: completedExport.file_count,
        cachedExportCountUpdatedCount: 0,
        cachedExportCountFailedCount: 0,
      },
      caseScope: caseScope
        ? {
            id: caseScope.caseRow.id,
            name: caseScope.caseRow.name,
            status: caseScope.caseRow.status,
            priority: caseScope.caseRow.priority,
            matter_number: null,
            custodianCount: caseScope.custodianIds.length,
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
          action: "vault.export.create",
          entityType: "vault_export",
          entityId: createdExportId,
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
      error instanceof Error ? error.message : "Vault export create failed.";

    return jsonError(message, getHttpStatusForVaultExportError(message));
  }
}