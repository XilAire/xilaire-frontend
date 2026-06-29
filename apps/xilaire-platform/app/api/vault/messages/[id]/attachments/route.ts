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

type VaultMessageRow = {
  id: string;
  org_id: string | null;
  subject: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  attachment_count: number | null;
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
};

type NormalizedAttachment = {
  id: string;
  message_id: string | null;
  file_name: string | null;
  display_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  file_size_bytes: number | null;
  sha256: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
  object_path: string | null;
  created_at: string | null;
  updated_at: string | null;
  download_url: string;
};

type AttachmentsResponse = {
  ok: true;
  message: {
    id: string;
    subject: string | null;
    sender_email: string | null;
    recipient_email: string | null;
  };
  summary: {
    total_count: number;
    total_size_bytes: number;
    message_attachment_count: number | null;
    count_mismatch: boolean;
  };
  attachments: NormalizedAttachment[];
};

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getAttachmentName(row: VaultAttachmentRow) {
  return toNonEmptyString(row.file_name) ?? null;
}

function getAttachmentContentType(row: VaultAttachmentRow) {
  return toNonEmptyString(row.content_type) ?? "application/octet-stream";
}

function getAttachmentSize(row: VaultAttachmentRow) {
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

function getAttachmentBucket(row: VaultAttachmentRow) {
  return (
    toNonEmptyString(row.storage_bucket) ??
    toNonEmptyString(row.bucket_name) ??
    null
  );
}

function getAttachmentObjectPath(row: VaultAttachmentRow) {
  return (
    toNonEmptyString(row.object_path) ??
    toNonEmptyString(row.storage_object_path) ??
    null
  );
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

function normalizeAttachment(row: VaultAttachmentRow): NormalizedAttachment {
  const displayName = getAttachmentName(row);

  return {
    id: row.id,
    message_id: row.message_id,
    file_name: toNonEmptyString(row.file_name),
    display_name: displayName,
    content_type: getAttachmentContentType(row),
    size_bytes: getAttachmentSize(row),
    file_size_bytes:
      typeof row.file_size_bytes === "number" &&
      Number.isFinite(row.file_size_bytes)
        ? row.file_size_bytes
        : null,
    sha256: toNonEmptyString(row.sha256),
    storage_path: toNonEmptyString(row.storage_path),
    storage_bucket: getAttachmentBucket(row),
    object_path: getAttachmentObjectPath(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
    download_url: `/api/vault/attachments/${row.id}/download`,
  };
}

async function loadMessage(
  messageId: string,
): Promise<{
  message: VaultMessageRow | null;
  error: string | null;
}> {
  const admin = getVaultAdminClient();

  const { data, error } = await admin
    .from("vault_messages")
    .select(
      `
        id,
        org_id,
        subject,
        sender_email,
        recipient_email,
        attachment_count
      `,
    )
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    return {
      message: null,
      error: error.message,
    };
  }

  return {
    message: (data as VaultMessageRow | null) ?? null,
    error: null,
  };
}

async function loadAttachments(
  messageId: string,
): Promise<{
  attachments: VaultAttachmentRow[];
  error: string | null;
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
        updated_at
      `,
    )
    .eq("message_id", messageId)
    .order("created_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (error) {
    return {
      attachments: [],
      error: error.message,
    };
  }

  return {
    attachments: (data as VaultAttachmentRow[] | null) ?? [],
    error: null,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return jsonError("Message id is required.", 400);
  }

  const { message, error: messageError } = await loadMessage(id);

  if (messageError) {
    return jsonError(`Message lookup failed: ${messageError}`, 500);
  }

  if (!message) {
    return jsonError("Message not found.", 404);
  }

  if (!message.org_id) {
    return jsonError("Message org context could not be resolved.", 500);
  }

  const access = await requireVaultAccess(request);

  if ("response" in access) {
    return access.response;
  }

  const accessOrgId = getAccessOrgId(access);

  if (accessOrgId && accessOrgId !== message.org_id) {
    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault_message_attachments_view_denied",
      entityType: "vault_message",
      entityId: message.id,
      status: "failure",
      details: {
        message_id: message.id,
        subject: message.subject,
        requested_org_id: message.org_id,
        access_org_id: accessOrgId,
        reason: "Org mismatch",
      },
      request,
    });

    return jsonError("You do not have access to this message.", 403);
  }

  const { attachments, error: attachmentError } = await loadAttachments(id);

  if (attachmentError) {
    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault_message_attachments_view_failed",
      entityType: "vault_message",
      entityId: message.id,
      status: "failure",
      details: {
        message_id: message.id,
        subject: message.subject,
        reason: attachmentError,
      },
      request,
    });

    return jsonError(`Attachment lookup failed: ${attachmentError}`, 500);
  }

  const normalizedAttachments = attachments.map(normalizeAttachment);

  const totalCount = normalizedAttachments.length;
  const totalSizeBytes = normalizedAttachments.reduce((sum, attachment) => {
    const size =
      typeof attachment.size_bytes === "number" &&
      Number.isFinite(attachment.size_bytes)
        ? attachment.size_bytes
        : 0;

    return sum + size;
  }, 0);

  const messageAttachmentCount =
    typeof message.attachment_count === "number" &&
    Number.isFinite(message.attachment_count)
      ? message.attachment_count
      : null;

  const countMismatch =
    messageAttachmentCount !== null && messageAttachmentCount !== totalCount;

  await writeUnifiedVaultAccessAuditLog({
    access,
    action: "vault_message_attachments_viewed",
    entityType: "vault_message",
    entityId: message.id,
    status: "success",
    details: {
      message_id: message.id,
      subject: message.subject,
      attachment_count: totalCount,
      total_size_bytes: totalSizeBytes,
      message_attachment_count: messageAttachmentCount,
      count_mismatch: countMismatch,
    },
    request,
  });

  const payload: AttachmentsResponse = {
    ok: true,
    message: {
      id: message.id,
      subject: message.subject,
      sender_email: message.sender_email,
      recipient_email: message.recipient_email,
    },
    summary: {
      total_count: totalCount,
      total_size_bytes: totalSizeBytes,
      message_attachment_count: messageAttachmentCount,
      count_mismatch: countMismatch,
    },
    attachments: normalizedAttachments,
  };

  return jsonOk(payload);
}