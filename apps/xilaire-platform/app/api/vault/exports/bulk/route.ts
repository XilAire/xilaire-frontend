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

type CreateVaultBulkExportRequest = {
  name?: string | null;
  exportType?: VaultExportType;
  export_type?: VaultExportType;
  format?: VaultExportFormat;
  notes?: string | null;
  expiresAt?: string | null;
  expires_at?: string | null;
  filters?: Record<string, unknown>;
  messageIds?: string[];
  message_ids?: string[];
  caseId?: string | null;
  case_id?: string | null;
};

type BulkActionName = "approve" | "cancel" | "rebuild" | "delete" | "restore";

type BulkActionRequest = {
  ids: string[];
  action: BulkActionName;
  caseId?: string | null;
  case_id?: string | null;
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

function normalizeCaseIdFromBody(input: Record<string, unknown>) {
  const directCaseId =
    normalizeString(input.caseId) ??
    normalizeString(input.case_id) ??
    null;

  const filters =
    input.filters && typeof input.filters === "object" && !Array.isArray(input.filters)
      ? (input.filters as Record<string, unknown>)
      : null;

  const filterCaseId =
    normalizeString(filters?.caseId) ??
    normalizeString(filters?.case_id) ??
    normalizeString(filters?.caseID) ??
    null;

  return directCaseId ?? filterCaseId;
}

function normalizeFiltersWithCaseId(
  filters: Record<string, unknown>,
  caseId: string | null
) {
  if (!caseId) {
    return filters;
  }

  return {
    ...filters,
    caseId,
    case_id: caseId,
    caseScoped: true,
  };
}

function normalizeBulkCreatePayload(body: unknown): CreateVaultBulkExportRequest & {
  name: string | null;
  exportType: VaultExportType;
  format: VaultExportFormat;
  notes: string | null;
  expiresAt: string | null;
  filters: Record<string, unknown>;
  messageIds: string[];
  caseId: string | null;
} {
  if (!body || typeof body !== "object") {
    throw new Error("A valid bulk export create payload is required.");
  }

  const input = body as Record<string, unknown>;
  const name = normalizeNullableString(input.name) ?? null;
  const notes = normalizeNullableString(input.notes) ?? null;
  const expiresAt =
    normalizeNullableIsoString(input.expiresAt ?? input.expires_at) ?? null;

  const rawCaseId = normalizeCaseIdFromBody(input);
  const caseId = rawCaseId && isLikelyUuid(rawCaseId) ? rawCaseId : null;

  const exportType =
    input.exportType === undefined && input.export_type === undefined
      ? caseId
        ? "case_export"
        : "manual"
      : normalizeExportType(input.exportType ?? input.export_type);

  const format =
    input.format === undefined ? "zip" : normalizeExportFormat(input.format);

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

  const invalidIds = messageIds.filter((id) => !isLikelyUuid(id));
  if (invalidIds.length > 0) {
    throw new Error("All messageIds must be valid UUID values.");
  }

  const dedupedMessageIds = Array.from(new Set(messageIds));

  return {
    name,
    exportType: caseId ? "case_export" : exportType,
    format,
    notes,
    expiresAt,
    filters: normalizeFiltersWithCaseId(filters, caseId),
    messageIds: dedupedMessageIds,
    caseId,
  };
}

function normalizeBulkActionPayload(body: unknown): BulkActionRequest & {
  ids: string[];
  action: BulkActionName;
  caseId: string | null;
} {
  if (!body || typeof body !== "object") {
    throw new Error("A valid bulk action payload is required.");
  }

  const input = body as Record<string, unknown>;
  const action = String(input.action ?? "").trim() as BulkActionName;

  if (
    action !== "approve" &&
    action !== "cancel" &&
    action !== "rebuild" &&
    action !== "delete" &&
    action !== "restore"
  ) {
    throw new Error("action must be one of: approve, cancel, rebuild, delete, restore.");
  }

  if (!Array.isArray(input.ids)) {
    throw new Error("ids must be an array.");
  }

  const ids = input.ids
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("At least one export id is required.");
  }

  const invalidIds = ids.filter((id) => !isLikelyUuid(id));
  if (invalidIds.length > 0) {
    throw new Error("All ids must be valid UUID values.");
  }

  const rawCaseId =
    normalizeString(input.caseId) ??
    normalizeString(input.case_id) ??
    null;

  const caseId = rawCaseId && isLikelyUuid(rawCaseId) ? rawCaseId : null;

  return {
    ids: Array.from(new Set(ids)),
    action,
    caseId,
  };
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

function withArtifactFlags(row: VaultExportRecord): VaultExportRecordWithArtifactFlags {
  const hasStoragePath = Boolean(row.storage_path);
  const hasManifestHash = Boolean(row.manifest_hash_sha256);

  return {
    ...row,
    artifact_ready: row.status === "completed" && hasStoragePath && hasManifestHash,
    artifact_state:
      hasStoragePath && hasManifestHash
        ? "ready"
        : hasStoragePath || hasManifestHash
          ? "partial"
          : "missing",
    has_storage_path: hasStoragePath,
    has_manifest_hash: hasManifestHash,
    can_rebuild:
      !row.deleted_at &&
      row.format !== "pst" &&
      (row.status === "completed" ||
        row.status === "failed" ||
        row.status === "cancelled"),
  };
}

function getDefaultExportName(exportType: VaultExportType, format: VaultExportFormat) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (exportType === "case_export") return `Case Export ${timestamp}.${format}`;
  if (exportType === "hold_export") return `Hold Export ${timestamp}.${format}`;
  if (exportType === "search_result") return `Search Export ${timestamp}.${format}`;

  return `Manual Export ${timestamp}.${format}`;
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
    generated_at: new Date().toISOString(),
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

function getCaseIdFromExportRecord(record: VaultExportRecord) {
  return (
    normalizeString(record.filters?.caseId) ??
    normalizeString(record.filters?.case_id) ??
    normalizeString(record.filters?.caseID) ??
    null
  );
}

async function loadCaseOrError(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  caseId: string | null
) {
  if (!caseId) {
    return {
      ok: true as const,
      caseRow: null,
      custodianIds: null as string[] | null,
    };
  }

  const { data: caseData, error: caseError } = await supabase
    .from("vault_cases")
    .select("id, org_id, name, status, deleted_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (caseError) {
    return {
      ok: false as const,
      response: jsonError("Failed to validate Vault case.", 500, {
        details: caseError.message,
      }),
    };
  }

  if (!caseData) {
    return {
      ok: false as const,
      response: jsonError("Vault case was not found.", 404),
    };
  }

  const caseRow = caseData as VaultCaseRow;

  if (caseRow.deleted_at) {
    return {
      ok: false as const,
      response: jsonError("Vault case is deleted.", 409),
    };
  }

  const { data: memberRows, error: memberError } = await supabase
    .from("vault_case_members")
    .select("id, case_id, org_id, assignable_type, assignable_id")
    .eq("org_id", orgId)
    .eq("case_id", caseId)
    .eq("assignable_type", "custodian");

  if (memberError) {
    return {
      ok: false as const,
      response: jsonError("Failed to validate case custodians.", 500, {
        details: memberError.message,
      }),
    };
  }

  const custodianIds = (memberRows ?? [])
    .map((row) => (row as VaultCaseMemberRow).assignable_id)
    .filter(Boolean);

  return {
    ok: true as const,
    caseRow,
    custodianIds,
  };
}

async function loadMessagesForExport(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  messageIds: string[],
  caseCustodianIds: string[] | null
) {
  let query = supabase
    .from("vault_messages")
    .select(VAULT_MESSAGE_SELECT)
    .eq("org_id", orgId)
    .in("id", messageIds);

  if (caseCustodianIds) {
    if (caseCustodianIds.length === 0) {
      return {
        ok: true as const,
        messages: [] as VaultMessageRow[],
      };
    }

    query = query.in("custodian_id", caseCustodianIds);
  }

  const { data, error } = await query;

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  return {
    ok: true as const,
    messages: (data ?? []) as VaultMessageRow[],
  };
}

async function loadExportMessages(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  exportId: string,
  caseCustodianIds: string[] | null
) {
  const { data: itemRows, error: itemError } = await supabase
    .from("vault_export_items")
    .select("message_id")
    .eq("org_id", orgId)
    .eq("export_id", exportId);

  if (itemError) {
    return {
      ok: false as const,
      error: itemError.message,
    };
  }

  const messageIds = (itemRows ?? [])
    .map((row) => normalizeString((row as Record<string, unknown>).message_id))
    .filter((id): id is string => Boolean(id));

  if (messageIds.length === 0) {
    return {
      ok: true as const,
      messages: [] as VaultMessageRow[],
    };
  }

  return loadMessagesForExport(supabase, orgId, messageIds, caseCustodianIds);
}

async function buildArtifact(params: {
  exportRecord: VaultExportRecord;
  messages: VaultMessageRow[];
  caseId: string | null;
}): Promise<ArtifactBuildResult> {
  const totalSizeBytes = params.messages.reduce(
    (total, message) => total + Number(message.size_bytes ?? 0),
    0
  );

  const manifest = buildManifest(params);
  let buffer: Buffer;
  let contentType: string;
  let extension: string;

  if (params.exportRecord.format === "json") {
    buffer = Buffer.from(
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
    contentType = "application/json";
    extension = "json";
  } else if (params.exportRecord.format === "csv") {
    buffer = Buffer.from(buildCsv(params.messages), "utf8");
    contentType = "text/csv";
    extension = "csv";
  } else {
    const zip = new JSZip();

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("messages.json", JSON.stringify(params.messages, null, 2));
    zip.file("messages.csv", buildCsv(params.messages));

    for (const message of params.messages) {
      zip.file(`messages/${message.id}.eml`, buildEml(message));
    }

    if (params.exportRecord.format === "pst") {
      zip.file(
        "PST_NOT_AUTOMATED.txt",
        "PST export generation is queued/not automated in this implementation. Message evidence is included as JSON, CSV, and EML files."
      );
    }

    buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    contentType = "application/zip";
    extension = "zip";
  }

  const storagePath = `${params.exportRecord.org_id}/${params.exportRecord.id}/export.${extension}`;
  const manifestHashSha256 = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  return {
    buffer,
    storagePath,
    contentType,
    manifestHashSha256,
    fileCount: params.messages.length,
    totalSizeBytes,
  };
}

async function uploadArtifact(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  artifact: ArtifactBuildResult
) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(artifact.storagePath, artifact.buffer, {
      cacheControl: "0",
      contentType: artifact.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

async function updateExportCounts(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  messageIds: string[]
) {
  if (messageIds.length === 0) {
    return {
      updatedCount: 0,
      failedCount: 0,
    };
  }

  const { data: messageRows, error: lookupError } = await supabase
    .from("vault_messages")
    .select("id, export_count")
    .eq("org_id", orgId)
    .in("id", messageIds);

  if (lookupError) {
    return {
      updatedCount: 0,
      failedCount: messageIds.length,
    };
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const row of messageRows ?? []) {
    const record = row as { id: string; export_count: number | null };
    const nextCount = Number(record.export_count ?? 0) + 1;

    const { error } = await supabase
      .from("vault_messages")
      .update({
        export_count: nextCount,
      })
      .eq("org_id", orgId)
      .eq("id", record.id);

    if (error) {
      failedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  return {
    updatedCount,
    failedCount,
  };
}

async function createExportItems(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  exportId: string,
  messageIds: string[]
) {
  if (messageIds.length === 0) {
    return {
      linkedCount: 0,
    };
  }

  const payload = messageIds.map((messageId) => ({
    org_id: orgId,
    export_id: exportId,
    message_id: messageId,
  }));

  const { data, error } = await supabase
    .from("vault_export_items")
    .upsert(payload, {
      onConflict: "export_id,message_id",
      ignoreDuplicates: true,
    })
    .select("message_id");

  if (error) {
    throw new Error(error.message);
  }

  return {
    linkedCount: data?.length ?? messageIds.length,
  };
}

async function generateAndPersistArtifact(params: {
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>;
  exportRecord: VaultExportRecord;
  messages: VaultMessageRow[];
  caseId: string | null;
}) {
  if (params.exportRecord.format === "pst") {
    return {
      item: params.exportRecord,
      rebuild: {
        success: false,
        storageBucket: STORAGE_BUCKET,
        storagePath: null,
        manifestHashSha256: null,
        format: params.exportRecord.format,
        contentType: null,
        fileCount: params.messages.length,
        totalSizeBytes: params.messages.reduce(
          (total, message) => total + Number(message.size_bytes ?? 0),
          0
        ),
        reason: "PST generation is queued/not automated.",
      },
    };
  }

  const artifact = await buildArtifact({
    exportRecord: params.exportRecord,
    messages: params.messages,
    caseId: params.caseId,
  });

  await uploadArtifact(params.supabase, artifact);

  const { data: updatedExport, error: updateError } = await params.supabase
    .from("vault_exports")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      file_count: artifact.fileCount,
      total_size_bytes: artifact.totalSizeBytes,
      storage_path: artifact.storagePath,
      manifest_hash_sha256: artifact.manifestHashSha256,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.exportRecord.id)
    .eq("org_id", params.exportRecord.org_id)
    .select(VAULT_EXPORT_SELECT)
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedExport) {
    throw new Error("Export record could not be updated after artifact generation.");
  }

  return {
    item: updatedExport as VaultExportRecord,
    rebuild: {
      success: true,
      storageBucket: STORAGE_BUCKET,
      storagePath: artifact.storagePath,
      manifestHashSha256: artifact.manifestHashSha256,
      format: params.exportRecord.format,
      contentType: artifact.contentType,
      fileCount: artifact.fileCount,
      totalSizeBytes: artifact.totalSizeBytes,
    },
  };
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supabase = await getVaultAdminClient();
    const supportContext = getSupportContext(request);

    const body = await request.json().catch(() => null);
    const payload = normalizeBulkCreatePayload(body);

    const caseLookup = await loadCaseOrError(supabase, orgId, payload.caseId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    const messageLookup = await loadMessagesForExport(
      supabase,
      orgId,
      payload.messageIds,
      caseLookup.custodianIds
    );

    if (!messageLookup.ok) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.exports.bulk.create.message_lookup_failed",
        entityType: "vault_export",
        entityId: null,
        status: "failure",
        request,
        details: {
          error: messageLookup.error,
          requested_count: payload.messageIds.length,
          case_id: payload.caseId,
          support_context: supportContext,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to validate export messages.", 500, {
        details: messageLookup.error,
      });
    }

    const messages = messageLookup.messages;
    const foundIds = new Set(messages.map((message) => message.id));
    const missingIds = payload.messageIds.filter((messageId) => !foundIds.has(messageId));

    if (messages.length === 0) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.exports.bulk.create.no_messages",
        entityType: "vault_export",
        entityId: null,
        status: "warning",
        request,
        details: {
          requested_count: payload.messageIds.length,
          missing_ids: missingIds,
          case_id: payload.caseId,
          support_context: supportContext,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("No valid messages were found for this export.", 400, {
        missingIds,
      });
    }

    if (payload.caseId && missingIds.length > 0) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.exports.bulk.create.case_scope_mismatch",
        entityType: "vault_case",
        entityId: payload.caseId,
        status: "warning",
        request,
        details: {
          requested_count: payload.messageIds.length,
          linked_count: messages.length,
          missing_ids: missingIds,
          case_id: payload.caseId,
          support_context: supportContext,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError(
        "One or more selected messages are outside the case custodian scope.",
        400,
        {
          missingIds,
          linkedCount: messages.length,
        }
      );
    }

    const totalSizeBytes = messages.reduce(
      (total, message) => total + Number(message.size_bytes ?? 0),
      0
    );

    const insertPayload = {
      org_id: orgId,
      name: payload.name ?? getDefaultExportName(payload.exportType, payload.format),
      export_type: payload.exportType,
      format: payload.format,
      status: payload.format === "pst" ? "queued" : "processing",
      requested_by: actorUserId,
      approved_by: null,
      requested_at: new Date().toISOString(),
      completed_at: null,
      expires_at: payload.expiresAt,
      file_count: messages.length,
      total_size_bytes: totalSizeBytes,
      storage_path: null,
      manifest_hash_sha256: null,
      filters: payload.filters,
      notes: payload.notes,
    };

    const { data: createdExport, error: createError } = await supabase
      .from("vault_exports")
      .insert(insertPayload)
      .select(VAULT_EXPORT_SELECT)
      .maybeSingle();

    if (createError) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.exports.bulk.create.failed",
        entityType: "vault_export",
        entityId: null,
        status: "failure",
        request,
        details: {
          error: createError.message,
          requested_count: payload.messageIds.length,
          linked_count: messages.length,
          case_id: payload.caseId,
          support_context: supportContext,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to create Vault export.", 500, {
        details: createError.message,
      });
    }

    if (!createdExport) {
      return jsonError("Failed to create Vault export.", 500);
    }

    const exportRecord = createdExport as VaultExportRecord;

    const itemCreate = await createExportItems(
      supabase,
      orgId,
      exportRecord.id,
      messages.map((message) => message.id)
    );

    const exportCountUpdate = await updateExportCounts(
      supabase,
      orgId,
      messages.map((message) => message.id)
    );

    let finalExportRecord = exportRecord;
    let rebuildSummary: Record<string, unknown> | null = null;

    if (payload.format !== "pst") {
      try {
        const artifactResult = await generateAndPersistArtifact({
          supabase,
          exportRecord,
          messages,
          caseId: payload.caseId,
        });

        finalExportRecord = artifactResult.item;
        rebuildSummary = artifactResult.rebuild;
      } catch (artifactError) {
        const artifactMessage =
          artifactError instanceof Error
            ? artifactError.message
            : "Unknown artifact generation error.";

        await supabase
          .from("vault_exports")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
            notes: payload.notes
              ? `${payload.notes}\n\nArtifact generation failed: ${artifactMessage}`
              : `Artifact generation failed: ${artifactMessage}`,
          })
          .eq("org_id", orgId)
          .eq("id", exportRecord.id);

        await writeUnifiedVaultAccessAuditLog({
          access,
          action: "vault.exports.bulk.create.artifact_failed",
          entityType: "vault_export",
          entityId: exportRecord.id,
          status: "failure",
          request,
          details: {
            error: artifactMessage,
            requested_count: payload.messageIds.length,
            linked_count: messages.length,
            case_id: payload.caseId,
            support_context: supportContext,
            duration_ms: Date.now() - startedAt,
          },
        });

        return jsonError("Export was created, but artifact generation failed.", 500, {
          exportId: exportRecord.id,
          details: artifactMessage,
        });
      }
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.exports.bulk.create",
      entityType: "vault_export",
      entityId: finalExportRecord.id,
      status: "success",
      request,
      details: {
        export_type: payload.exportType,
        format: payload.format,
        requested_count: payload.messageIds.length,
        linked_count: itemCreate.linkedCount,
        missing_ids: missingIds,
        case_id: payload.caseId,
        case_scoped: Boolean(payload.caseId),
        artifact: rebuildSummary,
        cached_export_count_updated_count: exportCountUpdate.updatedCount,
        cached_export_count_failed_count: exportCountUpdate.failedCount,
        support_context: supportContext,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk(
      {
        ok: true,
        success: true,
        item: withArtifactFlags(finalExportRecord),
        export: {
          id: finalExportRecord.id,
          name: finalExportRecord.name,
          status: finalExportRecord.status,
          format: finalExportRecord.format,
          exportType: finalExportRecord.export_type,
          export_type: finalExportRecord.export_type,
          createdAt: finalExportRecord.created_at,
          created_at: finalExportRecord.created_at,
        },
        messageCount: messages.length,
        summary: {
          requestedCount: payload.messageIds.length,
          linkedCount: itemCreate.linkedCount,
          missingCount: missingIds.length,
          missingIds,
          cachedExportCountUpdatedCount: exportCountUpdate.updatedCount,
          cachedExportCountFailedCount: exportCountUpdate.failedCount,
          caseId: payload.caseId,
          caseScoped: Boolean(payload.caseId),
        },
        rebuild: rebuildSummary,
        targetOrgId: orgId,
      },
      201
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create Vault export.";

    return jsonError("Unable to create Vault export.", 400, {
      details: message,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supabase = await getVaultAdminClient();
    const supportContext = getSupportContext(request);

    const body = await request.json().catch(() => null);
    const payload = normalizeBulkActionPayload(body);

    const { data: existingRows, error: lookupError } = await supabase
      .from("vault_exports")
      .select(VAULT_EXPORT_SELECT)
      .eq("org_id", orgId)
      .in("id", payload.ids);

    if (lookupError) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.exports.bulk.action.lookup_failed",
        entityType: "vault_export",
        entityId: null,
        status: "failure",
        request,
        details: {
          action: payload.action,
          ids: payload.ids,
          error: lookupError.message,
          support_context: supportContext,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load selected exports.", 500, {
        details: lookupError.message,
      });
    }

    const foundRows = (existingRows ?? []) as VaultExportRecord[];
    const foundIds = foundRows.map((row) => row.id);
    const missingIds = payload.ids.filter((id) => !foundIds.includes(id));

    const processedIds: string[] = [];
    const skipped: Array<{ id: string; name: string; reason: string }> = [];
    const rebuiltItems: VaultExportRecordWithArtifactFlags[] = [];

    for (const row of foundRows) {
      if (payload.action === "approve") {
        if (row.deleted_at) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Export is deleted.",
          });
          continue;
        }

        if (row.status !== "queued" && row.status !== "processing") {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Only queued or processing exports can be approved.",
          });
          continue;
        }

        const { error } = await supabase
          .from("vault_exports")
          .update({
            status: "approved",
            approved_by: actorUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId)
          .eq("id", row.id);

        if (error) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: error.message,
          });
          continue;
        }

        processedIds.push(row.id);
        continue;
      }

      if (payload.action === "cancel") {
        if (row.deleted_at) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Export is deleted.",
          });
          continue;
        }

        if (
          row.status !== "queued" &&
          row.status !== "approved" &&
          row.status !== "processing"
        ) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Only queued, approved, or processing exports can be cancelled.",
          });
          continue;
        }

        const { error } = await supabase
          .from("vault_exports")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId)
          .eq("id", row.id);

        if (error) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: error.message,
          });
          continue;
        }

        processedIds.push(row.id);
        continue;
      }

      if (payload.action === "delete") {
        if (row.deleted_at) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Export is already deleted.",
          });
          continue;
        }

        const { error } = await supabase
          .from("vault_exports")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: actorUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId)
          .eq("id", row.id);

        if (error) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: error.message,
          });
          continue;
        }

        processedIds.push(row.id);
        continue;
      }

      if (payload.action === "restore") {
        if (!row.deleted_at) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Export is not deleted.",
          });
          continue;
        }

        const { error } = await supabase
          .from("vault_exports")
          .update({
            deleted_at: null,
            deleted_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId)
          .eq("id", row.id);

        if (error) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: error.message,
          });
          continue;
        }

        processedIds.push(row.id);
        continue;
      }

      if (payload.action === "rebuild") {
        if (row.deleted_at) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Export is deleted.",
          });
          continue;
        }

        if (row.format === "pst") {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "PST rebuild is queued/not automated.",
          });
          continue;
        }

        if (
          row.status !== "completed" &&
          row.status !== "failed" &&
          row.status !== "cancelled"
        ) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Only completed, failed, or cancelled exports can be rebuilt.",
          });
          continue;
        }

        const caseId = payload.caseId ?? getCaseIdFromExportRecord(row);
        const caseLookup = await loadCaseOrError(supabase, orgId, caseId);

        if (!caseLookup.ok) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: "Case validation failed for rebuild.",
          });
          continue;
        }

        const messageLookup = await loadExportMessages(
          supabase,
          orgId,
          row.id,
          caseLookup.custodianIds
        );

        if (!messageLookup.ok) {
          skipped.push({
            id: row.id,
            name: row.name,
            reason: messageLookup.error,
          });
          continue;
        }

        try {
          const { data: processingExport, error: processingError } = await supabase
            .from("vault_exports")
            .update({
              status: "processing",
              updated_at: new Date().toISOString(),
            })
            .eq("org_id", orgId)
            .eq("id", row.id)
            .select(VAULT_EXPORT_SELECT)
            .maybeSingle();

          if (processingError || !processingExport) {
            skipped.push({
              id: row.id,
              name: row.name,
              reason: processingError?.message ?? "Unable to mark export processing.",
            });
            continue;
          }

          const artifactResult = await generateAndPersistArtifact({
            supabase,
            exportRecord: processingExport as VaultExportRecord,
            messages: messageLookup.messages,
            caseId,
          });

          processedIds.push(row.id);
          rebuiltItems.push(withArtifactFlags(artifactResult.item));
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "Unknown rebuild error.";

          await supabase
            .from("vault_exports")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("org_id", orgId)
            .eq("id", row.id);

          skipped.push({
            id: row.id,
            name: row.name,
            reason,
          });
        }
      }
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: `vault.exports.bulk.${payload.action}`,
      entityType: "vault_export",
      entityId: null,
      status: skipped.length > 0 ? "warning" : "success",
      request,
      details: {
        action: payload.action,
        requested_ids: payload.ids,
        found_ids: foundIds,
        missing_ids: missingIds,
        processed_ids: processedIds,
        processed_count: processedIds.length,
        skipped,
        skipped_count: skipped.length,
        case_id: payload.caseId,
        support_context: supportContext,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      success: true,
      action: payload.action,
      requestedIds: payload.ids,
      foundIds,
      missingIds,
      processedIds,
      processedCount: processedIds.length,
      skipped,
      skippedCount: skipped.length,
      rebuiltItems,
      targetOrgId: orgId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process bulk export action.";

    return jsonError("Unable to process bulk export action.", 400, {
      details: message,
    });
  }
}