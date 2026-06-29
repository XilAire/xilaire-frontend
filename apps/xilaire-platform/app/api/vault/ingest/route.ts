import crypto from "crypto";
import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  normalizeEmail,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";
import type { VaultIngestMessage } from "@/lib/vault/types";

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function computeAttachmentCount(message: VaultIngestMessage): number {
  return safeArray(message.attachments).length;
}

function computeMessageSizeBytes(message: VaultIngestMessage): number {
  return Number(message.sizeBytes ?? 0);
}

function defaultBodyPreview(message: VaultIngestMessage): string | null {
  const preview = message.bodyPreview?.trim();
  if (preview) return preview.slice(0, 500);

  const bodyText = message.bodyText?.trim();
  if (bodyText) return bodyText.slice(0, 500);

  return null;
}

function resolveRetentionExpiresAt(): string | null {
  return null;
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

async function upsertSource(params: {
  orgId: string;
  sourceKey: string;
  provider: string;
  sourceType: string;
}): Promise<{ id: string }> {
  const adminClient = getVaultAdminClient();

  const now = new Date().toISOString();

  const payload = {
    org_id: params.orgId,
    source_key: params.sourceKey,
    provider: params.provider,
    source_type: params.sourceType,
    display_name: params.sourceKey,
    status: "active",
    last_ingested_at: now,
    last_success_at: now,
    last_error_at: null,
    last_error_message: null,
  };

  const { data, error } = await adminClient
    .from("vault_sources")
    .upsert(payload, { onConflict: "org_id,source_key" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Unable to upsert Vault source: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

async function upsertCustodian(params: {
  orgId: string;
  sourceId?: string | null;
  email?: string | null;
  displayName?: string | null;
}): Promise<{ id: string } | null> {
  const email = normalizeEmail(params.email);
  if (!email) return null;

  const adminClient = getVaultAdminClient();

  const payload = {
    org_id: params.orgId,
    source_id: params.sourceId ?? null,
    email,
    display_name: params.displayName ?? null,
    last_seen_at: new Date().toISOString(),
    status: "active",
  };

  const { data, error } = await adminClient
    .from("vault_custodians")
    .upsert(payload, { onConflict: "org_id,email" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Unable to upsert Vault custodian: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

function buildSearchTextHash(message: VaultIngestMessage): string {
  const hash = crypto.createHash("sha256");
  hash.update(message.messageHashSha256);
  hash.update(message.subject ?? "");
  hash.update(message.senderEmail ?? "");
  hash.update(message.sentAt ?? "");
  return hash.digest("hex");
}

function normalizeProvider(
  provider?: VaultIngestMessage["provider"]
): "microsoft_365" | "exchange_on_prem" | "google_workspace" | "smtp_journal" | "manual_upload" | "api" {
  return provider ?? "api";
}

function normalizeSourceType(
  sourceType?: VaultIngestMessage["sourceType"]
): "mailbox" | "journal" | "shared_mailbox" | "distribution_group" | "ingestion_api" | "future_teams" | "future_sharepoint" {
  return sourceType ?? "ingestion_api";
}

export async function POST(request: NextRequest) {
  let auditAccess:
    | Awaited<ReturnType<typeof requireVaultAccess>>
    | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "full_support_admin",
    });

    auditAccess = access;

    const body = (await request.json()) as VaultIngestMessage | VaultIngestMessage[];
    const messages = Array.isArray(body) ? body : [body];
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    if (!messages.length) {
      return jsonError("At least one message is required for ingestion.", 400);
    }

    const adminClient = getVaultAdminClient();
    const results: Array<{ messageId: string; status: "inserted" | "updated" }> = [];

    for (const message of messages) {
      if (!message?.sourceKey?.trim()) {
        throw new Error("sourceKey is required.");
      }

      if (!message?.messageHashSha256?.trim()) {
        throw new Error("messageHashSha256 is required.");
      }

      const source = await upsertSource({
        orgId: access.targetOrgId,
        sourceKey: message.sourceKey.trim(),
        provider: normalizeProvider(message.provider),
        sourceType: normalizeSourceType(message.sourceType),
      });

      const custodian = await upsertCustodian({
        orgId: access.targetOrgId,
        sourceId: source.id,
        email: message.custodianEmail ?? null,
        displayName: message.custodianDisplayName ?? null,
      });

      const vaultMessagePayload = {
        org_id: access.targetOrgId,
        source_id: source.id,
        custodian_id: custodian?.id ?? null,
        provider_message_id: message.providerMessageId ?? null,
        internet_message_id: message.internetMessageId ?? null,
        conversation_id: message.conversationId ?? null,
        thread_id: message.threadId ?? null,
        message_direction: message.messageDirection ?? "unknown",
        message_type: message.messageType ?? "email",
        sensitivity: message.sensitivity ?? "normal",
        subject: message.subject ?? null,
        body_text: message.bodyText ?? null,
        body_html: message.bodyHtml ?? null,
        body_preview: defaultBodyPreview(message),
        sender_name: message.senderName ?? null,
        sender_email: normalizeEmail(message.senderEmail),
        to_recipients: safeArray(message.toRecipients),
        cc_recipients: safeArray(message.ccRecipients),
        bcc_recipients: safeArray(message.bccRecipients),
        reply_to_recipients: safeArray(message.replyToRecipients),
        sent_at: message.sentAt ?? null,
        received_at: message.receivedAt ?? null,
        indexed_at: new Date().toISOString(),
        archived_at: new Date().toISOString(),
        has_attachments: computeAttachmentCount(message) > 0,
        attachment_count: computeAttachmentCount(message),
        size_bytes: computeMessageSizeBytes(message),
        message_hash_sha256: message.messageHashSha256,
        raw_storage_path: message.rawStoragePath ?? null,
        normalized_storage_path: message.normalizedStoragePath ?? null,
        retention_expires_at: resolveRetentionExpiresAt(),
        metadata: {
          ...(message.metadata ?? {}),
          ingest_signature: buildSearchTextHash(message),
        },
      };

      const { data: existingMessage } = await adminClient
        .from("vault_messages")
        .select("id")
        .eq("org_id", access.targetOrgId)
        .eq("message_hash_sha256", message.messageHashSha256)
        .maybeSingle();

      const { data: vaultMessage, error: vaultMessageError } = await adminClient
        .from("vault_messages")
        .upsert(vaultMessagePayload, { onConflict: "org_id,message_hash_sha256" })
        .select("id")
        .single();

      if (vaultMessageError || !vaultMessage) {
        throw new Error(`Unable to upsert Vault message: ${vaultMessageError?.message ?? "Unknown error"}`);
      }

      if (Array.isArray(message.attachments) && message.attachments.length > 0) {
        const attachmentsPayload = message.attachments.map((attachment) => ({
          org_id: access.targetOrgId,
          message_id: vaultMessage.id,
          filename: attachment.filename,
          file_extension: attachment.filename.includes(".")
            ? attachment.filename.split(".").pop()?.toLowerCase() ?? null
            : null,
          mime_type: attachment.mimeType ?? null,
          size_bytes: Number(attachment.sizeBytes ?? 0),
          content_hash_sha256: attachment.contentHashSha256,
          storage_path: attachment.storagePath,
          extracted_text: attachment.extractedText ?? null,
          extracted_metadata: attachment.extractedMetadata ?? {},
          is_embedded: attachment.isEmbedded ?? false,
        }));

        const { error: attachmentError } = await adminClient
          .from("vault_attachments")
          .upsert(attachmentsPayload, {
            onConflict: "org_id,message_id,content_hash_sha256",
          });

        if (attachmentError) {
          throw new Error(`Unable to upsert Vault attachments: ${attachmentError.message}`);
        }
      }

      const resultStatus: "inserted" | "updated" = existingMessage ? "updated" : "inserted";

      results.push({
        messageId: vaultMessage.id,
        status: resultStatus,
      });

      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.message.ingest",
        entityType: "vault_message",
        entityId: vaultMessage.id,
        status: "success",
        details: {
          source_key: message.sourceKey,
          internet_message_id: message.internetMessageId ?? null,
          provider_message_id: message.providerMessageId ?? null,
          result_status: resultStatus,
        },
        request,
        supportSessionId,
        supportGrantId,
      });
    }

    return jsonOk({
      count: results.length,
      results,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    if (auditAccess) {
      try {
        const { supportSessionId, supportGrantId } = getSupportContext(request);

        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.message.ingest",
          entityType: "vault_message",
          status: "failure",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          request,
          supportSessionId,
          supportGrantId,
        });
      } catch {
        // swallow audit-log failures on error path
      }
    }

    const message =
      error instanceof Error ? error.message : "Vault ingest failed.";

    const lower = message.toLowerCase();
    const status =
      lower.includes("permission") ||
      lower.includes("support grant") ||
      lower.includes("scope")
        ? 403
        : lower.includes("authenticate") || lower.includes("bearer token")
        ? 401
        : 400;

    return jsonError(message, status);
  }
}