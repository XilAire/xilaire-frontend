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

type VaultMessageLookupRow = {
  id: string;
  org_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null;
  archived_at?: string | null;
  attachment_count?: number | null;
  on_hold?: boolean | null;
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

function normalizeId(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function resolveTargetOrgId(access: VaultAccessLike) {
  return normalizeId(access.targetOrgId) || null;
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildOccurrenceSummary(occurrences: VaultMessageOccurrenceRow[]) {
  const deletedAtSourceCount = occurrences.filter(
    (occurrence) => occurrence.deleted_at_source === true,
  ).length;

  const activeCount = occurrences.length - deletedAtSourceCount;

  const uniqueMailboxAddresses = Array.from(
    new Set(
      occurrences
        .map((occurrence) => toNonEmptyString(occurrence.mailbox_address))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const uniqueFolderPaths = Array.from(
    new Set(
      occurrences
        .map((occurrence) => toNonEmptyString(occurrence.folder_path))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return {
    totalCount: occurrences.length,
    deletedAtSourceCount,
    activeCount,
    uniqueMailboxCount: uniqueMailboxAddresses.length,
    uniqueFolderCount: uniqueFolderPaths.length,
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
        subject,
        sender_name,
        sender_email,
        received_at,
        archived_at,
        attachment_count,
        on_hold
      `,
      )
      .eq("org_id", targetOrgId)
      .eq("id", messageId)
      .maybeSingle<VaultMessageLookupRow>();

    if (messageError) {
      return jsonError(messageError.message, 500);
    }

    if (!message) {
      return jsonError("Vault message not found.", 404);
    }

    const { data: occurrenceRows, error: occurrencesError } = await adminClient
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
      `,
      )
      .eq("org_id", targetOrgId)
      .eq("message_id", messageId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (occurrencesError) {
      return jsonError(occurrencesError.message, 500);
    }

    const occurrencesBase =
      (occurrenceRows ?? []) as VaultMessageOccurrenceBaseRow[];

    const mailboxIds = Array.from(
      new Set(
        occurrencesBase
          .map((occurrence) => normalizeId(occurrence.mailbox_id))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    let mailboxMap = new Map<string, VaultSourceMailboxRow>();

    if (mailboxIds.length > 0) {
      const { data: mailboxRows, error: mailboxError } = await adminClient
        .from("vault_source_mailboxes")
        .select(
          `
          id,
          mailbox_address,
          external_mailbox_id,
          display_name,
          mailbox_type,
          ingestion_status
        `,
        )
        .in("id", mailboxIds);

      if (mailboxError) {
        return jsonError(mailboxError.message, 500);
      }

      mailboxMap = new Map(
        ((mailboxRows ?? []) as VaultSourceMailboxRow[]).map((mailbox) => [
          mailbox.id,
          mailbox,
        ]),
      );
    }

    const occurrences: VaultMessageOccurrenceRow[] = occurrencesBase.map(
      (occurrence) => {
        const mailbox = occurrence.mailbox_id
          ? mailboxMap.get(occurrence.mailbox_id) ?? null
          : null;

        return {
          ...occurrence,
          mailbox,
          mailbox_address:
            mailbox?.mailbox_address ??
            mailbox?.display_name ??
            null,
          deleted_at_source: occurrence.is_deleted_at_source === true,
        };
      },
    );

    const summary = buildOccurrenceSummary(occurrences);

    await writeUnifiedVaultAccessAuditLog({
      access: access as never,
      action: "vault.message.occurrences.list",
      entityType: "vault_message",
      entityId: messageId,
      status: "success",
      details: {
        message_id: messageId,
        occurrence_count: summary.totalCount,
        deleted_at_source_count: summary.deletedAtSourceCount,
        active_count: summary.activeCount,
        unique_mailbox_count: summary.uniqueMailboxCount,
        unique_folder_count: summary.uniqueFolderCount,
      },
      request,
    });

    return jsonOk({
      ok: true,
      item: {
        id: message.id,
        org_id: message.org_id,
        subject: message.subject,
        sender_name: message.sender_name,
        sender_email: message.sender_email,
        received_at: message.received_at,
        archived_at: message.archived_at ?? null,
        attachment_count: message.attachment_count ?? null,
        on_hold: message.on_hold ?? null,
      },
      occurrences,
      counts: {
        occurrences: summary.totalCount,
      },
      summary: {
        totalCount: summary.totalCount,
        deletedAtSourceCount: summary.deletedAtSourceCount,
        activeCount: summary.activeCount,
        uniqueMailboxCount: summary.uniqueMailboxCount,
        uniqueFolderCount: summary.uniqueFolderCount,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Vault message occurrences.";

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