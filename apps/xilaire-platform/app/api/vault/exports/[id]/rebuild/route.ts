import { NextRequest } from "next/server";
import JSZip from "jszip";
import crypto from "crypto";
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

type VaultMessageRow = {
  id: string;
  org_id: string;
  source_id: string | null;
  custodian_id: string | null;
  provider_message_id?: string | null;
  internet_message_id?: string | null;
  conversation_id?: string | null;
  thread_id?: string | null;
  message_direction?: string | null;
  message_type?: string | null;
  sensitivity?: string | null;
  subject: string | null;
  body_preview?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  sender_name?: string | null;
  sender_email: string | null;
  to_recipients?: Array<{ email?: string | null; name?: string | null }> | null;
  cc_recipients?: Array<{ email?: string | null; name?: string | null }> | null;
  bcc_recipients?: Array<{ email?: string | null; name?: string | null }> | null;
  sent_at?: string | null;
  received_at?: string | null;
  archived_at?: string | null;
  has_attachments?: boolean | null;
  attachment_count?: number | null;
  size_bytes?: number | null;
  on_hold?: boolean | null;
  disposition_status?: string | null;
  export_count?: number | null;
  metadata?: Record<string, unknown> | null;
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

type RebuildRequestBody = {
  reason?: string | null;
  caseId?: string | null;
  case_id?: string | null;
};

type ArtifactBuildResult = {
  buffer: Buffer;
  storagePath: string;
  contentType: string;
  manifestHashSha256: string;
  fileCount: number;
  totalSizeBytes: number;
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
  deleted_by
`;

const VAULT_MESSAGE_SELECT = `
  id,
  org_id,
  source_id,
  custodian_id,
  provider_message_id,
  internet_message_id,
  conversation_id,
  thread_id,
  message_direction,
  message_type,
  sensitivity,
  subject,
  body_preview,
  body_text,
  body_html,
  sender_name,
  sender_email,
  to_recipients,
  cc_recipients,
  bcc_recipients,
  sent_at,
  received_at,
  archived_at,
  has_attachments,
  attachment_count,
  size_bytes,
  on_hold,
  disposition_status,
  export_count,
  metadata
`;

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
  const rebuildIndex = parts.lastIndexOf("rebuild");
  const exportId = rebuildIndex > 0 ? parts[rebuildIndex - 1]?.trim() : null;

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
    normalizeString(record?.actorUserId) ??
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

function getCaseIdFromBody(body: RebuildRequestBody | null) {
  if (!body || typeof body !== "object") return null;

  const value = normalizeString(body.caseId) ?? normalizeString(body.case_id);
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
    lower.includes("does not match") ||
    lower.includes("outside the case") ||
    lower.includes("not eligible") ||
    lower.includes("pst")
  ) {
    return 409;
  }

  return 400;
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

async function loadExportMessageIds(params: {
  orgId: string;
  exportId: string;
}) {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_export_items")
    .select("message_id")
    .eq("org_id", params.orgId)
    .eq("export_id", params.exportId);

  if (error) {
    throw new Error(`Unable to load export items: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => normalizeString((row as Record<string, unknown>).message_id))
    .filter((id): id is string => Boolean(id));
}

async function loadMessagesForExport(params: {
  orgId: string;
  exportId: string;
  caseCustodianIds: string[] | null;
}) {
  const adminClient = getVaultAdminClient();

  const messageIds = await loadExportMessageIds({
    orgId: params.orgId,
    exportId: params.exportId,
  });

  if (messageIds.length === 0) {
    return [] as VaultMessageRow[];
  }

  let query = adminClient
    .from("vault_messages")
    .select(VAULT_MESSAGE_SELECT)
    .eq("org_id", params.orgId)
    .in("id", messageIds);

  if (params.caseCustodianIds) {
    if (params.caseCustodianIds.length === 0) {
      return [] as VaultMessageRow[];
    }

    query = query.in("custodian_id", params.caseCustodianIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load export messages: ${error.message}`);
  }

  const messages = (data ?? []) as VaultMessageRow[];

  if (params.caseCustodianIds && messages.length !== messageIds.length) {
    throw new Error("One or more export messages are outside the case custodian scope.");
  }

  return messages;
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";

  const text =
    typeof value === "string" ? value : JSON.stringify(value);

  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsv(messages: VaultMessageRow[]) {
  const headers = [
    "id",
    "subject",
    "sender_email",
    "sent_at",
    "received_at",
    "archived_at",
    "internet_message_id",
    "conversation_id",
    "custodian_id",
    "source_id",
    "has_attachments",
    "attachment_count",
    "size_bytes",
    "on_hold",
  ];

  const rows = messages.map((message) =>
    headers
      .map((header) => escapeCsvValue((message as unknown as Record<string, unknown>)[header]))
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

function normalizeRecipients(
  recipients: Array<{ email?: string | null; name?: string | null }> | null | undefined
) {
  if (!Array.isArray(recipients)) return "";

  return recipients
    .map((recipient) => {
      const email = normalizeString(recipient.email);
      const name = normalizeString(recipient.name);

      if (name && email) return `${name} <${email}>`;
      return email ?? name ?? "";
    })
    .filter(Boolean)
    .join(", ");
}

function buildEml(message: VaultMessageRow) {
  const sentOrReceived = message.sent_at ?? message.received_at ?? message.archived_at;
  const date = sentOrReceived ? new Date(sentOrReceived).toUTCString() : new Date().toUTCString();

  const headers = [
    `From: ${message.sender_name && message.sender_email ? `${message.sender_name} <${message.sender_email}>` : message.sender_email ?? ""}`,
    `To: ${normalizeRecipients(message.to_recipients)}`,
    message.cc_recipients?.length ? `Cc: ${normalizeRecipients(message.cc_recipients)}` : null,
    `Subject: ${message.subject ?? "(No Subject)"}`,
    `Date: ${date}`,
    message.internet_message_id ? `Message-ID: ${message.internet_message_id}` : null,
    message.conversation_id ? `X-Vault-Conversation-ID: ${message.conversation_id}` : null,
    `X-Vault-Message-ID: ${message.id}`,
    `X-Vault-Custodian-ID: ${message.custodian_id ?? ""}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
  ].filter(Boolean);

  const body =
    message.body_text ??
    message.body_preview ??
    "No message body was archived for this record.";

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

function buildManifest(params: {
  exportRecord: VaultExportRecord;
  messages: VaultMessageRow[];
  caseId: string | null;
  reason: string | null;
}) {
  return {
    export: {
      id: params.exportRecord.id,
      org_id: params.exportRecord.org_id,
      name: params.exportRecord.name,
      export_type: params.exportRecord.export_type,
      format: params.exportRecord.format,
      status: params.exportRecord.status,
      requested_at: params.exportRecord.requested_at,
      rebuilt_at: new Date().toISOString(),
      rebuild_reason: params.reason,
      caseId: params.caseId,
      filters: params.exportRecord.filters ?? {},
    },
    counts: {
      messages: params.messages.length,
      total_size_bytes: params.messages.reduce(
        (total, message) => total + Number(message.size_bytes ?? 0),
        0
      ),
    },
    messages: params.messages.map((message) => ({
      id: message.id,
      subject: message.subject,
      sender_email: message.sender_email,
      sent_at: message.sent_at,
      received_at: message.received_at,
      archived_at: message.archived_at,
      internet_message_id: message.internet_message_id,
      conversation_id: message.conversation_id,
      custodian_id: message.custodian_id,
      source_id: message.source_id,
      has_attachments: message.has_attachments,
      attachment_count: message.attachment_count,
      size_bytes: message.size_bytes,
      on_hold: message.on_hold,
    })),
  };
}

async function buildArtifact(params: {
  exportRecord: VaultExportRecord;
  messages: VaultMessageRow[];
  caseId: string | null;
  reason: string | null;
}): Promise<ArtifactBuildResult> {
  const totalSizeBytes = params.messages.reduce(
    (total, message) => total + Number(message.size_bytes ?? 0),
    0
  );

  const manifest = buildManifest(params);

  if (params.exportRecord.format === "json") {
    const buffer = Buffer.from(
      JSON.stringify(
        {
          manifest,
          messages: params.messages,
        },
        null,
        2
      ),
      "utf8"
    );

    return {
      buffer,
      storagePath: `${params.exportRecord.org_id}/${params.exportRecord.id}/export.json`,
      contentType: "application/json",
      manifestHashSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      fileCount: params.messages.length,
      totalSizeBytes,
    };
  }

  if (params.exportRecord.format === "csv") {
    const buffer = Buffer.from(buildCsv(params.messages), "utf8");

    return {
      buffer,
      storagePath: `${params.exportRecord.org_id}/${params.exportRecord.id}/export.csv`,
      contentType: "text/csv; charset=utf-8",
      manifestHashSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      fileCount: params.messages.length,
      totalSizeBytes,
    };
  }

  if (params.exportRecord.format === "eml") {
    const buffer = Buffer.from(params.messages.map(buildEml).join("\r\n\r\n"), "utf8");

    return {
      buffer,
      storagePath: `${params.exportRecord.org_id}/${params.exportRecord.id}/export.eml`,
      contentType: "message/rfc822",
      manifestHashSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      fileCount: params.messages.length,
      totalSizeBytes,
    };
  }

  if (params.exportRecord.format === "zip") {
    const zip = new JSZip();

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("messages.json", JSON.stringify(params.messages, null, 2));
    zip.file("messages.csv", buildCsv(params.messages));

    for (const message of params.messages) {
      zip.file(`messages/${message.id}.eml`, buildEml(message));
    }

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    return {
      buffer,
      storagePath: `${params.exportRecord.org_id}/${params.exportRecord.id}/export.zip`,
      contentType: "application/zip",
      manifestHashSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      fileCount: params.messages.length,
      totalSizeBytes,
    };
  }

  throw new Error("PST rebuild is queued/not automated.");
}

async function uploadArtifact(artifact: ArtifactBuildResult) {
  const adminClient = getVaultAdminClient();

  const { error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(artifact.storagePath, artifact.buffer, {
      cacheControl: "0",
      contentType: artifact.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Unable to upload rebuilt export artifact: ${error.message}`);
  }
}

async function markProcessing(params: {
  exportId: string;
  orgId: string;
  caseId: string | null;
  filters: Record<string, unknown> | null;
}) {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_exports")
    .update({
      status: "processing",
      filters: mergeCaseIntoFilters(params.filters, params.caseId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.exportId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select(VAULT_EXPORT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to mark export processing before rebuild: ${error?.message ?? "Unknown error"}`
    );
  }

  return data as VaultExportRecord;
}

async function markCompleted(params: {
  exportId: string;
  orgId: string;
  artifact: ArtifactBuildResult;
  actorUserId: string | null;
  caseId: string | null;
  filters: Record<string, unknown> | null;
}) {
  const adminClient = getVaultAdminClient();

  const { data, error } = await adminClient
    .from("vault_exports")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      approved_by: params.actorUserId,
      file_count: params.artifact.fileCount,
      total_size_bytes: params.artifact.totalSizeBytes,
      storage_path: params.artifact.storagePath,
      manifest_hash_sha256: params.artifact.manifestHashSha256,
      filters: mergeCaseIntoFilters(params.filters, params.caseId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.exportId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select(VAULT_EXPORT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to finalize rebuilt export: ${error?.message ?? "Unknown error"}`
    );
  }

  return data as VaultExportRecord;
}

async function markFailed(params: {
  exportId: string;
  orgId: string;
  message: string;
}) {
  const adminClient = getVaultAdminClient();

  await adminClient
    .from("vault_exports")
    .update({
      status: "failed",
      updated_at: new Date().toISOString(),
      notes: `Rebuild failed: ${params.message}`,
    })
    .eq("id", params.exportId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null);
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;
  let auditExportId: string | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "export_management",
    });

    auditAccess = access;

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const exportId = getExportIdFromPath(request);
    auditExportId = exportId;

    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const body = (await request.json().catch(() => null)) as RebuildRequestBody | null;
    const reason = normalizeString(body?.reason) ?? "Manual export rebuild requested.";
    const requestCaseId = getCaseIdFromBody(body) ?? getCaseIdFromRequest(request);

    const exportRecord = await getExportOrThrow({
      exportId,
      orgId,
    });

    const enrichedBefore = enrichExportRecord(exportRecord);

    if (exportRecord.deleted_at) {
      throw new Error("Deleted exports cannot be rebuilt.");
    }

    if (exportRecord.format === "pst") {
      throw new Error("PST rebuild is queued/not automated.");
    }

    if (!enrichedBefore.can_rebuild) {
      throw new Error("This export is not eligible for rebuild.");
    }

    const caseContext = await validateCaseContext({
      orgId,
      requestCaseId,
      exportRecord,
    });

    const processingExport = await markProcessing({
      exportId,
      orgId,
      caseId: caseContext.caseId,
      filters: exportRecord.filters,
    });

    try {
      const messages = await loadMessagesForExport({
        orgId,
        exportId,
        caseCustodianIds: caseContext.custodianIds,
      });

      if (messages.length === 0) {
        throw new Error("No export messages are available to rebuild.");
      }

      const artifact = await buildArtifact({
        exportRecord: processingExport,
        messages,
        caseId: caseContext.caseId,
        reason,
      });

      await uploadArtifact(artifact);

      const completedExport = await markCompleted({
        exportId,
        orgId,
        artifact,
        actorUserId,
        caseId: caseContext.caseId,
        filters: processingExport.filters,
      });

      const enrichedCompletedExport = enrichExportRecord(completedExport);

      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.export.rebuild",
        entityType: "vault_export",
        entityId: exportId,
        status: "success",
        details: {
          reason,
          previous_status: exportRecord.status,
          new_status: completedExport.status,
          format: completedExport.format,
          file_count: completedExport.file_count,
          total_size_bytes: completedExport.total_size_bytes,
          storage_path: completedExport.storage_path,
          manifest_hash_sha256: completedExport.manifest_hash_sha256,
          artifact_state: enrichedCompletedExport.artifact_state,
          case_id: caseContext.caseId,
          case_scoped: caseContext.caseScoped,
          duration_ms: Date.now() - startedAt,
        },
        request,
        supportSessionId,
        supportGrantId,
      });

      return jsonOk({
        ok: true,
        item: enrichedCompletedExport,
        rebuild: {
          success: true,
          storageBucket: STORAGE_BUCKET,
          storagePath: artifact.storagePath,
          manifestHashSha256: artifact.manifestHashSha256,
          format: completedExport.format,
          contentType: artifact.contentType,
          fileCount: artifact.fileCount,
          totalSizeBytes: artifact.totalSizeBytes,
        },
        caseContext: caseContext.caseRow
          ? {
              id: caseContext.caseRow.id,
              name: caseContext.caseRow.name,
              status: caseContext.caseRow.status,
            }
          : null,
        targetOrgId: orgId,
        accessPath: (access as Record<string, unknown>).accessPath ?? null,
      });
    } catch (rebuildError) {
      const message =
        rebuildError instanceof Error
          ? rebuildError.message
          : "Unknown rebuild error.";

      await markFailed({
        exportId,
        orgId,
        message,
      });

      throw rebuildError;
    }
  } catch (error) {
    if (auditAccess) {
      try {
        const { supportSessionId, supportGrantId } = getSupportContext(request);

        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.export.rebuild",
          entityType: "vault_export",
          entityId: auditExportId,
          status: "failure",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
            duration_ms: Date.now() - startedAt,
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
      error instanceof Error ? error.message : "Vault export rebuild failed.";

    return jsonError(message, getHttpStatusForVaultExportError(message));
  }
}