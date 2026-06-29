import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
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

type VaultMessageJoin = {
  id: string;
  org_id: string | null;
  subject: string | null;
  source_id: string | null;
  custodian_id: string | null;
};

type VaultAttachmentRow = {
  id: string;
  org_id: string | null;
  message_id: string | null;
  file_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  file_size_bytes: number | null;
  storage_path: string | null;
  storage_bucket: string | null;
  bucket_name: string | null;
  object_path: string | null;
  storage_object_path: string | null;
  sha256: string | null;
  created_at: string | null;
  updated_at: string | null;
  vault_messages?: VaultMessageJoin | VaultMessageJoin[] | null;
};

type ParsedStorageLocation = {
  bucket: string;
  objectPath: string;
};

const DEFAULT_DOWNLOAD_BUCKET = "vault-exports";
const ALLOWED_VAULT_ROLES = new Set([
  "vault_admin",
  "vault_compliance_admin",
  "master_admin",
]);

function coerceSingleMessage(
  value: VaultAttachmentRow["vault_messages"],
): VaultMessageJoin | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFileName(value: string | null, fallbackId: string) {
  const raw = value?.trim() || `vault-attachment-${fallbackId}`;
  return raw.replace(/[/\\?%*:|"<>]/g, "_");
}

function buildContentDisposition(fileName: string, inline: boolean) {
  const asciiSafe = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(fileName);
  const dispositionType = inline ? "inline" : "attachment";
  return `${dispositionType}; filename="${asciiSafe}"; filename*=UTF-8''${encoded}`;
}

function parseStorageLocation(row: VaultAttachmentRow): ParsedStorageLocation | null {
  const explicitBucket =
    toNonEmptyString(row.storage_bucket) ??
    toNonEmptyString(row.bucket_name);

  const explicitObjectPath =
    toNonEmptyString(row.object_path) ??
    toNonEmptyString(row.storage_object_path);

  if (explicitBucket && explicitObjectPath) {
    return {
      bucket: explicitBucket,
      objectPath: explicitObjectPath.replace(/^\/+/, ""),
    };
  }

  const storagePath = toNonEmptyString(row.storage_path);
  if (!storagePath) return null;

  const cleaned = storagePath.replace(/^\/+/, "");

  if (explicitBucket) {
    const withoutBucketPrefix = cleaned.startsWith(`${explicitBucket}/`)
      ? cleaned.slice(explicitBucket.length + 1)
      : cleaned;

    if (!withoutBucketPrefix) return null;

    return {
      bucket: explicitBucket,
      objectPath: withoutBucketPrefix,
    };
  }

  const parts = cleaned.split("/").filter(Boolean);

  if (parts.length >= 2) {
    return {
      bucket: parts[0],
      objectPath: parts.slice(1).join("/"),
    };
  }

  if (parts.length === 1) {
    return {
      bucket: DEFAULT_DOWNLOAD_BUCKET,
      objectPath: parts[0],
    };
  }

  return null;
}

function getPreferredContentType(row: VaultAttachmentRow) {
  return toNonEmptyString(row.content_type) ?? "application/octet-stream";
}

function getPreferredSize(row: VaultAttachmentRow) {
  if (typeof row.size_bytes === "number" && Number.isFinite(row.size_bytes)) {
    return row.size_bytes;
  }

  if (
    typeof row.file_size_bytes === "number" &&
    Number.isFinite(row.file_size_bytes)
  ) {
    return row.file_size_bytes;
  }

  return null;
}

function getAccessOrgId(access: unknown): string | null {
  if (!access || typeof access !== "object") return null;

  const record = access as Record<string, unknown>;

  if (typeof record.orgId === "string" && record.orgId.trim()) {
    return record.orgId;
  }

  if (typeof record.org_id === "string" && record.org_id.trim()) {
    return record.org_id;
  }

  if (
    typeof record.effectiveOrgId === "string" &&
    record.effectiveOrgId.trim()
  ) {
    return record.effectiveOrgId;
  }

  if (
    typeof record.sessionOrgId === "string" &&
    record.sessionOrgId.trim()
  ) {
    return record.sessionOrgId;
  }

  const profile = record.profile;
  if (profile && typeof profile === "object") {
    const profileRecord = profile as Record<string, unknown>;

    if (
      typeof profileRecord.org_id === "string" &&
      profileRecord.org_id.trim()
    ) {
      return profileRecord.org_id;
    }

    if (
      typeof profileRecord.orgId === "string" &&
      profileRecord.orgId.trim()
    ) {
      return profileRecord.orgId;
    }
  }

  const membership = record.membership;
  if (membership && typeof membership === "object") {
    const membershipRecord = membership as Record<string, unknown>;

    if (
      typeof membershipRecord.org_id === "string" &&
      membershipRecord.org_id.trim()
    ) {
      return membershipRecord.org_id;
    }

    if (
      typeof membershipRecord.orgId === "string" &&
      membershipRecord.orgId.trim()
    ) {
      return membershipRecord.orgId;
    }
  }

  return null;
}

function collectAccessRoles(access: unknown): string[] {
  if (!access || typeof access !== "object") return [];

  const record = access as Record<string, unknown>;
  const roles = new Set<string>();

  const pushRole = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      roles.add(value.trim());
    }
  };

  const pushRoleList = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      pushRole(item);
    }
  };

  pushRole(record.role);
  pushRole(record.vault_role);
  pushRole(record.profile_role);

  pushRoleList(record.roles);
  pushRoleList(record.vault_roles);

  const profile = record.profile;
  if (profile && typeof profile === "object") {
    const profileRecord = profile as Record<string, unknown>;
    pushRole(profileRecord.role);
    pushRole(profileRecord.vault_role);
    pushRole(profileRecord.profile_role);
    pushRoleList(profileRecord.roles);
    pushRoleList(profileRecord.vault_roles);
  }

  const membership = record.membership;
  if (membership && typeof membership === "object") {
    const membershipRecord = membership as Record<string, unknown>;
    pushRole(membershipRecord.role);
    pushRole(membershipRecord.vault_role);
    pushRole(membershipRecord.profile_role);
    pushRoleList(membershipRecord.roles);
    pushRoleList(membershipRecord.vault_roles);
  }

  return Array.from(roles);
}

function hasAllowedVaultRole(access: unknown) {
  const roles = collectAccessRoles(access);
  return roles.some((role) => ALLOWED_VAULT_ROLES.has(role));
}

async function loadAttachmentById(
  attachmentId: string,
): Promise<{
  attachment: VaultAttachmentRow | null;
  lookupError: string | null;
}> {
  const admin = getVaultAdminClient();

  const { data, error } = await admin
    .from("vault_message_attachments")
    .select(
      `
        id,
        org_id,
        message_id,
        file_name,
        content_type,
        size_bytes,
        file_size_bytes,
        storage_path,
        storage_bucket,
        bucket_name,
        object_path,
        storage_object_path,
        sha256,
        created_at,
        updated_at,
        vault_messages (
          id,
          org_id,
          subject,
          source_id,
          custodian_id
        )
      `,
    )
    .eq("id", attachmentId)
    .maybeSingle();

  if (error) {
    return {
      attachment: null,
      lookupError: error.message,
    };
  }

  return {
    attachment: (data as VaultAttachmentRow | null) ?? null,
    lookupError: null,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return jsonError("Attachment id is required.", 400);
  }

  const { attachment, lookupError } = await loadAttachmentById(id);

  if (lookupError) {
    return jsonError(`Attachment lookup failed: ${lookupError}`, 500);
  }

  if (!attachment) {
    return jsonError("Attachment not found.", 404);
  }

  const message = coerceSingleMessage(attachment.vault_messages);
  const orgId = message?.org_id ?? attachment.org_id ?? null;

  if (!orgId) {
    return jsonError("Attachment org context could not be resolved.", 500);
  }

  const access = await requireVaultAccess(request);

  if ("response" in access) {
    return access.response;
  }

  const accessOrgId = getAccessOrgId(access);
  const allowedByRole = hasAllowedVaultRole(access);

  if (!allowedByRole) {
    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault_attachment_download_denied",
      entityType: "vault_attachment",
      entityId: attachment.id,
      status: "failure",
      details: {
        attachment_id: attachment.id,
        message_id: attachment.message_id,
        subject: message?.subject ?? null,
        reason: "Missing required vault role",
        required_roles: Array.from(ALLOWED_VAULT_ROLES),
        resolved_roles: collectAccessRoles(access),
      },
      request,
    });

    return jsonError("You do not have permission to download this attachment.", 403);
  }

  if (accessOrgId && accessOrgId !== orgId) {
    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault_attachment_download_denied",
      entityType: "vault_attachment",
      entityId: attachment.id,
      status: "failure",
      details: {
        attachment_id: attachment.id,
        message_id: attachment.message_id,
        subject: message?.subject ?? null,
        reason: "Org mismatch",
        requested_org_id: orgId,
        access_org_id: accessOrgId,
      },
      request,
    });

    return jsonError("You do not have access to this attachment.", 403);
  }

  const storage = parseStorageLocation(attachment);

  if (!storage?.bucket || !storage.objectPath) {
    return jsonError("Attachment storage location is missing or invalid.", 500);
  }

  const admin = getVaultAdminClient();

  const { data: fileData, error: downloadError } = await admin.storage
    .from(storage.bucket)
    .download(storage.objectPath);

  if (downloadError || !fileData) {
    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault_attachment_download_failed",
      entityType: "vault_attachment",
      entityId: attachment.id,
      status: "failure",
      details: {
        attachment_id: attachment.id,
        message_id: attachment.message_id,
        subject: message?.subject ?? null,
        bucket: storage.bucket,
        object_path: storage.objectPath,
        reason: downloadError?.message ?? "Storage download returned no file.",
      },
      request,
    });

    return jsonError(
      `Attachment download failed: ${
        downloadError?.message ?? "Unable to retrieve file from storage."
      }`,
      500,
    );
  }

  const fileName = normalizeFileName(
    toNonEmptyString(attachment.file_name),
    attachment.id,
  );

  const contentType = getPreferredContentType(attachment);
  const contentLength = getPreferredSize(attachment);
  const inline =
    request.nextUrl.searchParams.get("inline") === "1" ||
    request.nextUrl.searchParams.get("inline") === "true";

  await writeUnifiedVaultAccessAuditLog({
    access,
    action: "vault_attachment_downloaded",
    entityType: "vault_attachment",
    entityId: attachment.id,
    status: "success",
    details: {
      attachment_id: attachment.id,
      message_id: attachment.message_id,
      subject: message?.subject ?? null,
      bucket: storage.bucket,
      object_path: storage.objectPath,
      file_name: fileName,
      content_type: contentType,
      size_bytes: contentLength,
      sha256: attachment.sha256,
      inline,
    },
    request,
  });

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", buildContentDisposition(fileName, inline));
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");

  if (typeof contentLength === "number" && Number.isFinite(contentLength)) {
    headers.set("Content-Length", String(contentLength));
  }

  return new Response(fileData.stream(), {
    status: 200,
    headers,
  });
}