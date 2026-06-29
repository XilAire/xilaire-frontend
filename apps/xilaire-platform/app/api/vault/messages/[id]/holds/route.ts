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
  on_hold: boolean | null;
};

type VaultHoldLinkRow = {
  id: string;
  org_id: string;
  message_id: string;
  hold_id: string;
};

type VaultHoldRow = {
  id: string;
  org_id: string;
  name: string | null;
  hold_name?: string | null;
  hold_type: string | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
  updated_at?: string | null;
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

function normalizeHold(row: VaultHoldRow, messageId: string): VaultNormalizedHoldRow {
  return {
    ...row,
    hold_name: toNonEmptyString(row.name) ?? toNonEmptyString(row.hold_name) ?? null,
    linked_message_id: messageId,
  };
}

function buildHoldSummary(holds: VaultNormalizedHoldRow[]) {
  const byStatus = holds.reduce<Record<string, number>>((acc, hold) => {
    const key = toNonEmptyString(hold.status) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const byType = holds.reduce<Record<string, number>>((acc, hold) => {
    const key = toNonEmptyString(hold.hold_type) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const activeCount = holds.filter((hold) => {
    const status = (toNonEmptyString(hold.status) ?? "").toLowerCase();
    return status === "active" || status === "open" || status === "enabled";
  }).length;

  return {
    totalCount: holds.length,
    activeCount,
    inactiveCount: holds.length - activeCount,
    uniqueStatusCount: Object.keys(byStatus).length,
    uniqueTypeCount: Object.keys(byType).length,
    byStatus,
    byType,
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
      `
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

    const { data: holdLinks, error: holdLinksError } = await adminClient
      .from("vault_hold_messages")
      .select(
        `
        id,
        org_id,
        message_id,
        hold_id
      `
      )
      .eq("org_id", targetOrgId)
      .eq("message_id", messageId);

    if (holdLinksError) {
      return jsonError(holdLinksError.message, 500);
    }

    const links = (holdLinks ?? []) as VaultHoldLinkRow[];

    const holdIds = Array.from(
      new Set(
        links
          .map((link) => normalizeId(link.hold_id))
          .filter((value): value is string => Boolean(value))
      )
    );

    let holds: VaultNormalizedHoldRow[] = [];

    if (holdIds.length > 0) {
      const { data: holdRows, error: holdsError } = await adminClient
        .from("vault_holds")
        .select(
          `
          id,
          org_id,
          name,
          hold_type,
          status,
          description,
          created_at,
          updated_at
        `
        )
        .eq("org_id", targetOrgId)
        .in("id", holdIds)
        .order("created_at", { ascending: false, nullsFirst: false });

      if (holdsError) {
        return jsonError(holdsError.message, 500);
      }

      const holdMap = new Map<string, VaultHoldRow>(
        ((holdRows ?? []) as VaultHoldRow[]).map((hold) => [hold.id, hold])
      );

      holds = holdIds
        .map((id) => {
          const hold = holdMap.get(id) ?? null;
          return hold ? normalizeHold(hold, messageId) : null;
        })
        .filter((hold): hold is VaultNormalizedHoldRow => Boolean(hold));
    }

    const summary = buildHoldSummary(holds);

    await writeUnifiedVaultAccessAuditLog({
      access: access as never,
      action: "vault.message.holds.list",
      entityType: "vault_message",
      entityId: messageId,
      status: "success",
      details: {
        message_id: messageId,
        hold_count: summary.totalCount,
        active_count: summary.activeCount,
        inactive_count: summary.inactiveCount,
        unique_status_count: summary.uniqueStatusCount,
        unique_type_count: summary.uniqueTypeCount,
        by_status: summary.byStatus,
        by_type: summary.byType,
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
        on_hold: message.on_hold,
      },
      holds,
      counts: {
        holds: holds.length,
      },
      summary: {
        totalCount: summary.totalCount,
        activeCount: summary.activeCount,
        inactiveCount: summary.inactiveCount,
        uniqueStatusCount: summary.uniqueStatusCount,
        uniqueTypeCount: summary.uniqueTypeCount,
        byStatus: summary.byStatus,
        byType: summary.byType,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Vault message holds.";

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