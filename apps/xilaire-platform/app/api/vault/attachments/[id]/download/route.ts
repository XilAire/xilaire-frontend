import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  getBearerToken,
  jsonError,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";
import type { VaultRole } from "@/lib/vault/types";

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
const ALLOWED_VAULT_ROLES: VaultRole[] = [
  "vault_admin",
  "vault_compliance_admin",
];

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

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
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

  // The helper throws on denial; it does not return { response }.
  // Resolve permissions against the attachment's actual organization,
  // never an organization supplied by the requesting client.
  let access;
  try {
    access = await requireVaultAccess(request, {
      targetOrgId: orgId,
      requiredVaultRoles: ALLOWED_VAULT_ROLES,
      supportScope: "vault_read_only",
    });
  } catch (error) {
    console.error("Vault attachment authorization failed");
    void error;
    return jsonError(
      getBearerToken(request) ? "You do not have access to this attachment." : "Authentication required.",
      getBearerToken(request) ? 403 : 401,
    );
  }

  // Defense in depth: the returned authorization must be for this
  // attachment's organization and carry the required access path.
  const sameTargetOrg = access.targetOrgId === orgId;
  const permittedOrgRole =
    access.accessPath === "org_role" &&
    access.actorHomeOrgId === orgId &&
    access.grantedVaultRoles.some((role) => ALLOWED_VAULT_ROLES.includes(role));
  // requireVaultAccess already validated vault_read_only using
  // support_scope_allows before returning this access path.
  const permittedSupportGrant = access.accessPath === "support_grant";

  if (!sameTargetOrg || (!permittedOrgRole && !permittedSupportGrant)) {
    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault_attachment_download_denied",
      entityType: "vault_attachment",
      entityId: attachment.id,
      status: "failure",
      details: {
        attachment_id: attachment.id,
        message_id: attachment.message_id,
        reason: "Authorization context does not permit attachment download",
        requested_org_id: orgId,
        authorized_target_org_id: access.targetOrgId,
        access_path: access.accessPath,
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

  return new Response(fileData.stream(), {
    status: 200,
    headers,
  });
}