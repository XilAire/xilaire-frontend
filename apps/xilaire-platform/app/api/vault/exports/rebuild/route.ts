import { NextRequest } from "next/server";
import { createHash } from "crypto";
import JSZip from "jszip";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

type VaultExportStatus =
  | "queued"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

type VaultExportFormat = "eml" | "pst" | "zip" | "json" | "csv";

type VaultExportRecord = {
  id: string;
  org_id: string;
  name: string;
  export_type: "search_result" | "case_export" | "hold_export" | "manual";
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
};

type VaultMessageRow = {
  id: string;
  subject: string | null;
  sender_email: string | null;
  sent_at: string | null;
  received_at: string | null;
  on_hold: boolean | null;
  disposition_status: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
};

type ExportItemRow = {
  id: string;
  org_id: string;
  export_id: string;
  message_id: string | null;
  included_at: string | null;
  item_hash_sha256: string | null;
  metadata: Record<string, unknown> | null;
  vault_messages: VaultMessageRow | VaultMessageRow[] | null;
};

type RebuildRequest = {
  reason?: string | null;
};

type BuiltArtifact = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  manifest: Record<string, unknown>;
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
  updated_at
`;

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getExportIdFromRebuildPath(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const rebuildIndex = parts.lastIndexOf("rebuild");

  if (rebuildIndex <= 0) {
    throw new Error("A valid export id is required.");
  }

  const exportId = decodeURIComponent(parts[rebuildIndex - 1] ?? "").trim();

  if (!exportId || !isLikelyUuid(exportId)) {
    throw new Error("A valid export id is required.");
  }

  return exportId;
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

async function parseOptionalBody(request: NextRequest): Promise<RebuildRequest> {
  const contentLength = request.headers.get("content-length");
  if (!contentLength || contentLength === "0") {
    return {};
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return {};
    }

    const input = body as Record<string, unknown>;
    const reason =
      input.reason === undefined || input.reason === null
        ? null
        : typeof input.reason === "string"
          ? input.reason.trim() || null
          : (() => {
              throw new Error("reason must be a string when provided.");
            })();

    return { reason };
  } catch (error) {
    if (error instanceof Error && error.message.includes("reason must be a string")) {
      throw error;
    }
    return {};
  }
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

function normalizeVaultMessage(
  value: ExportItemRow["vault_messages"]
): VaultMessageRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getExportItemsOrThrow(params: {
  exportId: string;
  orgId: string;
}): Promise<ExportItemRow[]> {
  const adminClient = getVaultAdminClient();

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
    .eq("org_id", params.orgId)
    .eq("export_id", params.exportId)
    .order("included_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load export items: ${error.message}`);
  }

  return (data ?? []) as ExportItemRow[];
}

function validateRebuildEligibility(exportRecord: VaultExportRecord) {
  if (exportRecord.format === "pst") {
    throw new Error("PST rebuild is not supported yet.");
  }

  if (!["completed", "failed", "cancelled"].includes(exportRecord.status)) {
    throw new Error(
      "Only completed, failed, or cancelled exports can be rebuilt."
    );
  }
}

function sanitizeFilenameSegment(value: string | null | undefined, fallback: string) {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;

  return (
    raw
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || fallback
  );
}

function escapeCsvValue(value: unknown): string {
  const stringValue =
    value === null || value === undefined ? "" : String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, `""`)}"`;
  }

  return stringValue;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return lines.join("\r\n");
}

function buildMessageExportRows(items: ExportItemRow[]) {
  return items.map((item, index) => {
    const message = normalizeVaultMessage(item.vault_messages);

    return {
      row_number: index + 1,
      export_item_id: item.id,
      message_id: item.message_id,
      included_at: item.included_at,
      item_hash_sha256: item.item_hash_sha256,
      subject: message?.subject ?? null,
      sender_email: message?.sender_email ?? null,
      sent_at: message?.sent_at ?? null,
      received_at: message?.received_at ?? null,
      on_hold: message?.on_hold ?? null,
      disposition_status: message?.disposition_status ?? null,
      has_attachments: message?.has_attachments ?? null,
      attachment_count: message?.attachment_count ?? null,
      size_bytes: message?.size_bytes ?? null,
      metadata: item.metadata ?? null,
    };
  });
}

function buildEmlForItem(item: ExportItemRow, index: number): string {
  const message = normalizeVaultMessage(item.vault_messages);

  const subject = message?.subject ?? "(no subject)";
  const from = message?.sender_email ?? "unknown@example.com";
  const dateValue = message?.sent_at ?? message?.received_at ?? new Date().toISOString();
  const messageId = item.message_id ?? `${index + 1}`;

  return [
    `Message-ID: <${messageId}@vault-export.local>`,
    `Date: ${new Date(dateValue).toUTCString()}`,
    `From: ${from}`,
    `To: undisclosed-recipients:;`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    `Vault export rebuild`,
    ``,
    `Subject: ${subject}`,
    `From: ${from}`,
    `Sent: ${message?.sent_at ?? ""}`,
    `Received: ${message?.received_at ?? ""}`,
    `Message ID: ${item.message_id ?? ""}`,
    `On Hold: ${String(message?.on_hold ?? "")}`,
    `Disposition Status: ${message?.disposition_status ?? ""}`,
    `Has Attachments: ${String(message?.has_attachments ?? "")}`,
    `Attachment Count: ${String(message?.attachment_count ?? "")}`,
    `Size Bytes: ${String(message?.size_bytes ?? "")}`,
  ].join("\r\n");
}

function getArtifactPath(exportRecord: VaultExportRecord) {
  return `${exportRecord.org_id}/${exportRecord.id}/export.${exportRecord.format}`;
}

function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

function getTotalMessageSize(items: ExportItemRow[]) {
  return items.reduce((sum, item) => {
    const message = normalizeVaultMessage(item.vault_messages);
    const size = Number(message?.size_bytes ?? 0);
    return Number.isFinite(size) && size > 0 ? sum + size : sum;
  }, 0);
}

async function buildJsonArtifact(
  exportRecord: VaultExportRecord,
  items: ExportItemRow[]
): Promise<BuiltArtifact> {
  const rows = buildMessageExportRows(items);

  const manifest = {
    schema_version: 1,
    export_id: exportRecord.id,
    org_id: exportRecord.org_id,
    name: exportRecord.name,
    export_type: exportRecord.export_type,
    format: exportRecord.format,
    rebuilt_at: new Date().toISOString(),
    item_count: rows.length,
    total_message_size_bytes: getTotalMessageSize(items),
  };

  const payload = {
    manifest,
    messages: rows,
  };

  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));

  return {
    bytes,
    contentType: "application/json",
    extension: "json",
    manifest,
    fileCount: rows.length,
    totalSizeBytes: getTotalMessageSize(items),
  };
}

async function buildCsvArtifact(
  exportRecord: VaultExportRecord,
  items: ExportItemRow[]
): Promise<BuiltArtifact> {
  const rows = buildMessageExportRows(items);
  const manifest = {
    schema_version: 1,
    export_id: exportRecord.id,
    org_id: exportRecord.org_id,
    name: exportRecord.name,
    export_type: exportRecord.export_type,
    format: exportRecord.format,
    rebuilt_at: new Date().toISOString(),
    item_count: rows.length,
    total_message_size_bytes: getTotalMessageSize(items),
  };

  const csv = toCsv(rows);
  const bytes = new TextEncoder().encode(csv);

  return {
    bytes,
    contentType: "text/csv",
    extension: "csv",
    manifest,
    fileCount: rows.length,
    totalSizeBytes: getTotalMessageSize(items),
  };
}

async function buildEmlArtifact(
  exportRecord: VaultExportRecord,
  items: ExportItemRow[]
): Promise<BuiltArtifact> {
  const first = items[0];
  const eml = buildEmlForItem(first, 0);

  const manifest = {
    schema_version: 1,
    export_id: exportRecord.id,
    org_id: exportRecord.org_id,
    name: exportRecord.name,
    export_type: exportRecord.export_type,
    format: exportRecord.format,
    rebuilt_at: new Date().toISOString(),
    item_count: items.length,
    total_message_size_bytes: getTotalMessageSize(items),
    note:
      items.length > 1
        ? "EML format stores the first included message only for single-file export compatibility."
        : null,
  };

  const bytes = new TextEncoder().encode(eml);

  return {
    bytes,
    contentType: "message/rfc822",
    extension: "eml",
    manifest,
    fileCount: items.length,
    totalSizeBytes: getTotalMessageSize(items),
  };
}

async function buildZipArtifact(
  exportRecord: VaultExportRecord,
  items: ExportItemRow[]
): Promise<BuiltArtifact> {
  const zip = new JSZip();
  const rows = buildMessageExportRows(items);
  const totalSizeBytes = getTotalMessageSize(items);

  const manifest = {
    schema_version: 1,
    export_id: exportRecord.id,
    org_id: exportRecord.org_id,
    name: exportRecord.name,
    export_type: exportRecord.export_type,
    format: exportRecord.format,
    rebuilt_at: new Date().toISOString(),
    item_count: rows.length,
    total_message_size_bytes: totalSizeBytes,
    contents: [
      "manifest.json",
      "messages.json",
      "messages.csv",
      "messages/*.eml",
    ],
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "messages.json",
    JSON.stringify(
      {
        export: {
          id: exportRecord.id,
          name: exportRecord.name,
          type: exportRecord.export_type,
          format: exportRecord.format,
        },
        messages: rows,
      },
      null,
      2
    )
  );
  zip.file("messages.csv", toCsv(rows));

  const messagesFolder = zip.folder("messages");
  if (!messagesFolder) {
    throw new Error("Unable to create ZIP message folder.");
  }

  items.forEach((item, index) => {
    const message = normalizeVaultMessage(item.vault_messages);
    const fileBase = sanitizeFilenameSegment(
      message?.subject || item.message_id || `message_${index + 1}`,
      `message_${index + 1}`
    );

    messagesFolder.file(
      `${String(index + 1).padStart(4, "0")}_${fileBase}.eml`,
      buildEmlForItem(item, index)
    );
  });

  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  return {
    bytes,
    contentType: "application/zip",
    extension: "zip",
    manifest,
    fileCount: items.length,
    totalSizeBytes,
  };
}

async function buildArtifact(
  exportRecord: VaultExportRecord,
  items: ExportItemRow[]
): Promise<BuiltArtifact> {
  if (items.length === 0) {
    throw new Error("Cannot rebuild an export with no export items.");
  }

  if (exportRecord.format === "json") {
    return buildJsonArtifact(exportRecord, items);
  }

  if (exportRecord.format === "csv") {
    return buildCsvArtifact(exportRecord, items);
  }

  if (exportRecord.format === "eml") {
    return buildEmlArtifact(exportRecord, items);
  }

  if (exportRecord.format === "zip") {
    return buildZipArtifact(exportRecord, items);
  }

  throw new Error(`Unsupported export rebuild format: ${exportRecord.format}`);
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

  if (lower.includes("not supported")) {
    return 400;
  }

  return 400;
}

export async function POST(request: NextRequest) {
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;
  let auditExportId: string | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "export_management",
    });

    auditAccess = access;

    const adminClient = getVaultAdminClient();
    const exportId = getExportIdFromRebuildPath(request);
    auditExportId = exportId;

    const { supportSessionId, supportGrantId } = getSupportContext(request);
    const body = await parseOptionalBody(request);

    const exportRecord = await getExportOrThrow({
      exportId,
      orgId: access.targetOrgId,
    });

    validateRebuildEligibility(exportRecord);

    const items = await getExportItemsOrThrow({
      exportId,
      orgId: access.targetOrgId,
    });

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.export.rebuild",
      entityType: "vault_export",
      entityId: exportRecord.id,
      status: "success",
      details: {
        phase: "started",
        reason: body.reason ?? null,
        current_status: exportRecord.status,
        format: exportRecord.format,
        existing_storage_path: exportRecord.storage_path,
        existing_manifest_hash_sha256: exportRecord.manifest_hash_sha256,
        export_item_count: items.length,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    const artifact = await buildArtifact(exportRecord, items);
    const storagePath = getArtifactPath(exportRecord);
    const manifestHashSha256 = sha256Hex(
      new TextEncoder().encode(JSON.stringify(artifact.manifest, null, 2))
    );

    const uploadBody = Buffer.from(artifact.bytes);

    const { error: uploadError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, uploadBody, {
        upsert: true,
        contentType: artifact.contentType,
      });

    if (uploadError) {
      throw new Error(`Unable to upload rebuilt export artifact: ${uploadError.message}`);
    }

    const { data: updatedExport, error: updateError } = await adminClient
      .from("vault_exports")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        file_count: artifact.fileCount,
        total_size_bytes: artifact.totalSizeBytes,
        storage_path: storagePath,
        manifest_hash_sha256: manifestHashSha256,
      })
      .eq("id", exportRecord.id)
      .eq("org_id", access.targetOrgId)
      .select(VAULT_EXPORT_SELECT)
      .single();

    if (updateError || !updatedExport) {
      throw new Error(
        `Unable to update rebuilt export metadata: ${updateError?.message ?? "Unknown error"}`
      );
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.export.rebuild",
      entityType: "vault_export",
      entityId: exportRecord.id,
      status: "success",
      details: {
        phase: "completed",
        reason: body.reason ?? null,
        previous_status: exportRecord.status,
        new_status: "completed",
        format: exportRecord.format,
        storage_bucket: STORAGE_BUCKET,
        storage_path: storagePath,
        manifest_hash_sha256: manifestHashSha256,
        artifact_content_type: artifact.contentType,
        artifact_extension: artifact.extension,
        file_count: artifact.fileCount,
        total_size_bytes: artifact.totalSizeBytes,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      item: updatedExport,
      rebuild: {
        success: true,
        storageBucket: STORAGE_BUCKET,
        storagePath,
        manifestHashSha256,
        format: artifact.extension,
        contentType: artifact.contentType,
        fileCount: artifact.fileCount,
        totalSizeBytes: artifact.totalSizeBytes,
      },
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
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

export async function PATCH(request: NextRequest) {
  return POST(request);
}