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
  params: {
    id: string;
  };
};

type VaultAccessLike = {
  targetOrgId?: string | null;
};

type VaultMessageRow = {
  id: string;
  org_id: string;
  source_id: string | null;
  custodian_id: string | null;
  retention_policy_id: string | null;
  provider_message_id: string | null;
  internet_message_id: string | null;
  conversation_id: string | null;
  thread_id: string | null;
  message_direction: string | null;
  message_type: string | null;
  sensitivity: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  body_preview: string | null;
  sender_name: string | null;
  sender_email: string | null;
  from_domain: string | null;
  to_recipients: unknown;
  cc_recipients: unknown;
  bcc_recipients: unknown;
  reply_to_recipients: unknown;
  sent_at: string | null;
  received_at: string | null;
  indexed_at: string | null;
  archived_at: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
  message_hash_sha256: string | null;
  raw_storage_path: string | null;
  normalized_storage_path: string | null;
  retention_expires_at: string | null;
  on_hold: boolean | null;
  disposition_status: string | null;
  export_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type VaultSourceRow = {
  id: string;
  source_key: string | null;
  source_type: string | null;
  provider: string | null;
  display_name: string | null;
  name: string | null;
  status: string | null;
  sync_mode: string | null;
};

type VaultCustodianRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  employee_id: string | null;
  department: string | null;
  status: string | null;
};

type VaultRetentionPolicyRow = {
  id: string;
  name: string | null;
  policy_key: string | null;
  status: string | null;
  retention_days: number | null;
  description: string | null;
};

type VaultAttachmentStorage = {
  bucket: string | null;
  objectPath: string | null;
  fileName: string | null;
};

type VaultMessageAttachmentRow = {
  id: string;
  org_id: string;
  message_id: string;
  file_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  sha256: string | null;
  created_at: string | null;
  updated_at: string | null;
  storage: VaultAttachmentStorage;
};

type VaultSourceMailboxRow = {
  id: string;
  mailbox_address: string | null;
  external_mailbox_id: string | null;
  display_name: string | null;
  mailbox_type: string | null;
  ingestion_status: string | null;
};

type VaultMessageOccurrenceBaseRow = {
  id: string;
  org_id: string;
  message_id: string;
  source_id: string | null;
  mailbox_id: string | null;
  external_folder_id: string | null;
  folder_path: string | null;
  external_occurrence_id: string | null;
  provider_message_id: string | null;
  change_key: string | null;
  occurrence_type: string | null;
  is_deleted_at_source: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type VaultMessageOccurrenceRow = VaultMessageOccurrenceBaseRow & {
  mailbox: VaultSourceMailboxRow | null;
  mailbox_address: string | null;
  deleted_at_source: boolean;
};

type VaultHoldMessageRow = {
  id: string;
  hold_id: string;
};

type VaultHoldRow = {
  id: string;
  name: string | null;
  hold_type: string | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
};

type VaultNormalizedHoldRow = VaultHoldRow & {
  hold_name: string | null;
  linked_message_id: string;
};

function normalizeId(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveTargetOrgId(access: VaultAccessLike) {
  return normalizeId(access.targetOrgId) || null;
}

function buildStorageObjectInfo(storagePath: string | null): VaultAttachmentStorage {
  if (!storagePath) {
    return {
      bucket: null,
      objectPath: null,
      fileName: null,
    };
  }

  return {
    bucket: process.env.VAULT_ATTACHMENT_BUCKET?.trim() || "vault-attachments",
    objectPath: storagePath,
    fileName: storagePath.split("/").pop() ?? null,
  };
}

function normalizeHold(hold: VaultHoldRow, messageId: string): VaultNormalizedHoldRow {
  return {
    ...hold,
    hold_name: toNonEmptyString(hold.name) ?? null,
    linked_message_id: messageId,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const messageId = normalizeId(context.params?.id);

    if (!messageId) {
      return jsonError("Message id is required.", 400);
    }

    const access = (await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    })) as VaultAccessLike;

    const targetOrgId = resolveTargetOrgId(access);

    if (!targetOrgId) {
      return jsonError("Unable to resolve Vault organization context.", 403);
    }

    const adminClient = getVaultAdminClient();

    const { data: message, error: messageError } = await adminClient
      .from("vault_messages")
      .select(
        `
        id,
        org_id,
        source_id,
        custodian_id,
        retention_policy_id,
        provider_message_id,
        internet_message_id,
        conversation_id,
        thread_id,
        message_direction,
        message_type,
        sensitivity,
        subject,
        body_text,
        body_html,
        body_preview,
        sender_name,
        sender_email,
        from_domain,
        to_recipients,
        cc_recipients,
        bcc_recipients,
        reply_to_recipients,
        sent_at,
        received_at,
        indexed_at,
        archived_at,
        has_attachments,
        attachment_count,
        size_bytes,
        message_hash_sha256,
        raw_storage_path,
        normalized_storage_path,
        retention_expires_at,
        on_hold,
        disposition_status,
        export_count,
        metadata,
        created_at,
        updated_at
      `
      )
      .eq("org_id", targetOrgId)
      .eq("id", messageId)
      .maybeSingle<VaultMessageRow>();

    if (messageError) {
      return jsonError(messageError.message, 500);
    }

    if (!message) {
      return jsonError("Vault message not found.", 404);
    }

    const [
      sourceResult,
      custodianResult,
      retentionPolicyResult,
      attachmentsResult,
      occurrencesResult,
      holdLinksResult,
    ] = await Promise.all([
      message.source_id
        ? adminClient
            .from("vault_sources")
            .select(
              `
              id,
              source_key,
              source_type,
              provider,
              display_name,
              name,
              status,
              sync_mode
            `
            )
            .eq("org_id", targetOrgId)
            .eq("id", message.source_id)
            .maybeSingle<VaultSourceRow>()
        : Promise.resolve({ data: null, error: null }),
      message.custodian_id
        ? adminClient
            .from("vault_custodians")
            .select(
              `
              id,
              display_name,
              email,
              employee_id,
              department,
              status
            `
            )
            .eq("org_id", targetOrgId)
            .eq("id", message.custodian_id)
            .maybeSingle<VaultCustodianRow>()
        : Promise.resolve({ data: null, error: null }),
      message.retention_policy_id
        ? adminClient
            .from("vault_retention_policies")
            .select(
              `
              id,
              name,
              policy_key,
              status,
              retention_days,
              description
            `
            )
            .eq("org_id", targetOrgId)
            .eq("id", message.retention_policy_id)
            .maybeSingle<VaultRetentionPolicyRow>()
        : Promise.resolve({ data: null, error: null }),
      adminClient
        .from("vault_message_attachments")
        .select(
          `
          id,
          org_id,
          message_id,
          file_name,
          content_type,
          size_bytes,
          storage_path,
          sha256,
          created_at,
          updated_at
        `
        )
        .eq("org_id", targetOrgId)
        .eq("message_id", message.id)
        .order("created_at", { ascending: true }),
      adminClient
        .from("vault_message_occurrences")
        .select(
          `
          id,
          org_id,
          message_id,
          source_id,
          mailbox_id,
          external_folder_id,
          folder_path,
          external_occurrence_id,
          provider_message_id,
          change_key,
          occurrence_type,
          is_deleted_at_source,
          created_at,
          updated_at
        `
        )
        .eq("org_id", targetOrgId)
        .eq("message_id", message.id)
        .order("created_at", { ascending: true }),
      adminClient
        .from("vault_hold_messages")
        .select(
          `
          id,
          hold_id
        `
        )
        .eq("org_id", targetOrgId)
        .eq("message_id", message.id),
    ]);

    if (sourceResult.error) {
      return jsonError(sourceResult.error.message, 500);
    }

    if (custodianResult.error) {
      return jsonError(custodianResult.error.message, 500);
    }

    if (retentionPolicyResult.error) {
      return jsonError(retentionPolicyResult.error.message, 500);
    }

    if (attachmentsResult.error) {
      return jsonError(attachmentsResult.error.message, 500);
    }

    if (occurrencesResult.error) {
      return jsonError(occurrencesResult.error.message, 500);
    }

    if (holdLinksResult.error) {
      return jsonError(holdLinksResult.error.message, 500);
    }

    const attachments = ((attachmentsResult.data ?? []) as Omit<
      VaultMessageAttachmentRow,
      "storage"
    >[]).map((attachment) => ({
      ...attachment,
      storage: buildStorageObjectInfo(attachment.storage_path),
    }));

    const occurrencesBase = (occurrencesResult.data ?? []) as VaultMessageOccurrenceBaseRow[];
    const holdLinks = (holdLinksResult.data ?? []) as VaultHoldMessageRow[];

    const mailboxIds = Array.from(
      new Set(
        occurrencesBase
          .map((occurrence) => occurrence.mailbox_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const holdIds = Array.from(
      new Set(
        holdLinks
          .map((link) => link.hold_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const [mailboxLookupResult, holdsLookupResult] = await Promise.all([
      mailboxIds.length > 0
        ? adminClient
            .from("vault_source_mailboxes")
            .select(
              `
              id,
              mailbox_address,
              external_mailbox_id,
              display_name,
              mailbox_type,
              ingestion_status
            `
            )
            .in("id", mailboxIds)
        : Promise.resolve({ data: [], error: null }),
      holdIds.length > 0
        ? adminClient
            .from("vault_holds")
            .select(
              `
              id,
              name,
              hold_type,
              status,
              description,
              created_at
            `
            )
            .eq("org_id", targetOrgId)
            .in("id", holdIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (mailboxLookupResult.error) {
      return jsonError(mailboxLookupResult.error.message, 500);
    }

    if (holdsLookupResult.error) {
      return jsonError(holdsLookupResult.error.message, 500);
    }

    const mailboxMap = new Map(
      ((mailboxLookupResult.data ?? []) as VaultSourceMailboxRow[]).map(
        (mailbox) => [mailbox.id, mailbox]
      )
    );

    const holdMap = new Map(
      ((holdsLookupResult.data ?? []) as VaultHoldRow[]).map((hold) => [
        hold.id,
        hold,
      ])
    );

    const occurrences: VaultMessageOccurrenceRow[] = occurrencesBase.map(
      (occurrence) => {
        const mailbox = occurrence.mailbox_id
          ? mailboxMap.get(occurrence.mailbox_id) ?? null
          : null;

        return {
          ...occurrence,
          mailbox,
          mailbox_address:
            mailbox?.mailbox_address ?? mailbox?.display_name ?? null,
          deleted_at_source: occurrence.is_deleted_at_source === true,
        };
      }
    );

    const holds: VaultNormalizedHoldRow[] = holdLinks
      .map((link) => {
        const hold = holdMap.get(link.hold_id) ?? null;
        return hold ? normalizeHold(hold, message.id) : null;
      })
      .filter((hold): hold is VaultNormalizedHoldRow => Boolean(hold));

    const counts = {
      attachments: attachments.length,
      occurrences: occurrences.length,
      holds: holds.length,
    };

    await writeUnifiedVaultAccessAuditLog({
      access: access as never,
      action: "vault.message.detail",
      entityType: "vault_message",
      entityId: messageId,
      status: "success",
      details: {
        message_id: messageId,
        attachment_count: counts.attachments,
        occurrence_count: counts.occurrences,
        hold_count: counts.holds,
      },
      request,
    });

    return jsonOk({
      ok: true,
      item: message,
      source: sourceResult.data ?? null,
      custodian: custodianResult.data ?? null,
      retentionPolicy: retentionPolicyResult.data ?? null,
      attachments,
      occurrences,
      holds,
      counts,
      summary: {
        attachment_count: counts.attachments,
        occurrence_count: counts.occurrences,
        hold_count: counts.holds,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Vault message detail.";

    const lower = message.toLowerCase();
    const status =
      lower.includes("permission") ||
      lower.includes("access denied") ||
      lower.includes("support scope")
        ? 403
        : lower.includes("authenticate") || lower.includes("bearer token")
          ? 401
          : 500;

    return jsonError(message, status);
  }
}