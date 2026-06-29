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

type VaultSourceSummary = {
  id: string;
  display_name: string | null;
  name: string | null;
  source_key: string | null;
  provider: string | null;
  source_type: string | null;
  status: string | null;
};

type VaultCustodianSummary = {
  id: string;
  display_name: string | null;
  primary_email: string | null;
  department: string | null;
  status: string | null;
};

type VaultMessageListItem = {
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
  body_preview: string | null;
  sender_name: string | null;
  sender_email: string | null;
  from_domain: string | null;
  sent_at: string | null;
  received_at: string | null;
  indexed_at: string | null;
  archived_at: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
  retention_expires_at: string | null;
  on_hold: boolean | null;
  disposition_status: string | null;
  export_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  source: VaultSourceSummary | null;
  custodian: VaultCustodianSummary | null;
  occurrence_count: number;
};

type VaultAccessLike = {
  orgId?: string | null;
  org_id?: string | null;
  effectiveOrgId?: string | null;
  effective_org_id?: string | null;
  userId?: string | null;
  user_id?: string | null;
  actorUserId?: string | null;
  actor_user_id?: string | null;
  userEmail?: string | null;
  user_email?: string | null;
  actorEmail?: string | null;
  actor_email?: string | null;
};

type VaultOccurrenceCountRow = {
  message_id: string;
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseBooleanFilter(value: string | null) {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;

  return null;
}

function sanitizeSearchTerm(value: string | null) {
  if (!value) return "";
  return value.trim();
}

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

function resolveAccessOrgId(access: VaultAccessLike) {
  return (
    access.effectiveOrgId ||
    access.effective_org_id ||
    access.orgId ||
    access.org_id ||
    null
  );
}

export async function GET(request: NextRequest) {
  try {
    const access = (await requireVaultAccess(request, {})) as VaultAccessLike;
    const orgId = resolveAccessOrgId(access);

    if (!orgId) {
      return jsonError("Unable to resolve Vault organization context.", 403);
    }

    const supabase = getVaultAdminClient();
    const url = new URL(request.url);

    const limit = Math.min(
      parsePositiveInt(url.searchParams.get("limit"), 25) || 25,
      100
    );
    const offset = parsePositiveInt(url.searchParams.get("offset"), 0);

    const q = sanitizeSearchTerm(url.searchParams.get("q"));
    const sender = sanitizeSearchTerm(url.searchParams.get("sender"));
    const sourceId = sanitizeSearchTerm(url.searchParams.get("sourceId"));
    const custodianId = sanitizeSearchTerm(url.searchParams.get("custodianId"));
    const direction = sanitizeSearchTerm(url.searchParams.get("direction"));
    const messageType = sanitizeSearchTerm(url.searchParams.get("messageType"));
    const dispositionStatus = sanitizeSearchTerm(
      url.searchParams.get("dispositionStatus")
    );

    const hasAttachments = parseBooleanFilter(
      url.searchParams.get("hasAttachments")
    );
    const onHold = parseBooleanFilter(url.searchParams.get("onHold"));

    const sentFrom = sanitizeSearchTerm(url.searchParams.get("sentFrom"));
    const sentTo = sanitizeSearchTerm(url.searchParams.get("sentTo"));
    const receivedFrom = sanitizeSearchTerm(url.searchParams.get("receivedFrom"));
    const receivedTo = sanitizeSearchTerm(url.searchParams.get("receivedTo"));

    let query = supabase
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
        body_preview,
        sender_name,
        sender_email,
        from_domain,
        sent_at,
        received_at,
        indexed_at,
        archived_at,
        has_attachments,
        attachment_count,
        size_bytes,
        retention_expires_at,
        on_hold,
        disposition_status,
        export_count,
        created_at,
        updated_at
        `,
        { count: "exact" }
      )
      .eq("org_id", orgId);

    if (q) {
      const safe = escapeIlike(q);
      query = query.or(
        [
          `subject.ilike.%${safe}%`,
          `sender_name.ilike.%${safe}%`,
          `sender_email.ilike.%${safe}%`,
          `body_preview.ilike.%${safe}%`,
          `internet_message_id.ilike.%${safe}%`,
          `provider_message_id.ilike.%${safe}%`,
        ].join(",")
      );
    }

    if (sender) {
      const safeSender = escapeIlike(sender);
      query = query.or(
        [
          `sender_email.ilike.%${safeSender}%`,
          `sender_name.ilike.%${safeSender}%`,
        ].join(",")
      );
    }

    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    if (custodianId) {
      query = query.eq("custodian_id", custodianId);
    }

    if (direction) {
      query = query.eq("message_direction", direction);
    }

    if (messageType) {
      query = query.eq("message_type", messageType);
    }

    if (dispositionStatus) {
      query = query.eq("disposition_status", dispositionStatus);
    }

    if (typeof hasAttachments === "boolean") {
      query = query.eq("has_attachments", hasAttachments);
    }

    if (typeof onHold === "boolean") {
      query = query.eq("on_hold", onHold);
    }

    if (sentFrom) {
      query = query.gte("sent_at", sentFrom);
    }

    if (sentTo) {
      query = query.lte("sent_at", sentTo);
    }

    if (receivedFrom) {
      query = query.gte("received_at", receivedFrom);
    }

    if (receivedTo) {
      query = query.lte("received_at", receivedTo);
    }

    const { data: rows, error, count } = await query
      .order("received_at", { ascending: false, nullsFirst: false })
      .order("sent_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return jsonError(error.message, 500);
    }

    const items = ((rows ?? []) as Omit<
      VaultMessageListItem,
      "source" | "custodian" | "occurrence_count"
    >[]).map((item) => ({
      ...item,
      source: null,
      custodian: null,
      occurrence_count: 0,
    }));

    const sourceIds = Array.from(
      new Set(
        items
          .map((item) => item.source_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const custodianIds = Array.from(
      new Set(
        items
          .map((item) => item.custodian_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const messageIds = items.map((item) => item.id);

    const [sourcesResult, custodiansResult, occurrencesResult] = await Promise.all([
      sourceIds.length > 0
        ? supabase
            .from("vault_sources")
            .select(`
              id,
              display_name,
              name,
              source_key,
              provider,
              source_type,
              status
            `)
            .eq("org_id", orgId)
            .in("id", sourceIds)
        : Promise.resolve({ data: [], error: null }),
      custodianIds.length > 0
        ? supabase
            .from("vault_custodians")
            .select(`
              id,
              display_name,
              primary_email,
              department,
              status
            `)
            .eq("org_id", orgId)
            .in("id", custodianIds)
        : Promise.resolve({ data: [], error: null }),
      messageIds.length > 0
        ? supabase
            .from("vault_message_occurrences")
            .select("message_id")
            .eq("org_id", orgId)
            .in("message_id", messageIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (sourcesResult.error) {
      return jsonError(sourcesResult.error.message, 500);
    }

    if (custodiansResult.error) {
      return jsonError(custodiansResult.error.message, 500);
    }

    if (occurrencesResult.error) {
      return jsonError(occurrencesResult.error.message, 500);
    }

    const sourceMap = new Map<string, VaultSourceSummary>(
      ((sourcesResult.data ?? []) as VaultSourceSummary[]).map((source) => [
        source.id,
        source,
      ])
    );

    const custodianMap = new Map<string, VaultCustodianSummary>(
      ((custodiansResult.data ?? []) as VaultCustodianSummary[]).map(
        (custodian) => [custodian.id, custodian]
      )
    );

    const occurrenceCounts = ((occurrencesResult.data ?? []) as VaultOccurrenceCountRow[]).reduce<
      Record<string, number>
    >((acc, row) => {
      acc[row.message_id] = (acc[row.message_id] ?? 0) + 1;
      return acc;
    }, {});

    const enrichedItems: VaultMessageListItem[] = items.map((item) => ({
      ...item,
      source: item.source_id ? sourceMap.get(item.source_id) ?? null : null,
      custodian: item.custodian_id ? custodianMap.get(item.custodian_id) ?? null : null,
      occurrence_count: occurrenceCounts[item.id] ?? 0,
    }));

    const [attachmentCountResult, onHoldCountResult, exportedCountResult] =
      await Promise.all([
        supabase
          .from("vault_messages")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("has_attachments", true),
        supabase
          .from("vault_messages")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("on_hold", true),
        supabase
          .from("vault_messages")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .gt("export_count", 0),
      ]);

    if (attachmentCountResult.error) {
      return jsonError(attachmentCountResult.error.message, 500);
    }

    if (onHoldCountResult.error) {
      return jsonError(onHoldCountResult.error.message, 500);
    }

    if (exportedCountResult.error) {
      return jsonError(exportedCountResult.error.message, 500);
    }

    await writeUnifiedVaultAccessAuditLog({
      access: access as never,
      action: "vault.messages.list",
      entityType: "vault_message",
      entityId: undefined,
      status: "success",
      details: {
        orgId,
        limit,
        offset,
        resultCount: enrichedItems.length,
        totalCount: count ?? 0,
        filters: {
          q: q || null,
          sender: sender || null,
          sourceId: sourceId || null,
          custodianId: custodianId || null,
          direction: direction || null,
          messageType: messageType || null,
          dispositionStatus: dispositionStatus || null,
          hasAttachments,
          onHold,
          sentFrom: sentFrom || null,
          sentTo: sentTo || null,
          receivedFrom: receivedFrom || null,
          receivedTo: receivedTo || null,
        },
      },
      request,
    });

    return jsonOk({
      items: enrichedItems,
      paging: {
        limit,
        offset,
        total: count ?? 0,
        hasMore: offset + limit < (count ?? 0),
      },
      counts: {
        total: count ?? 0,
        attachments: attachmentCountResult.count ?? 0,
        onHold: onHoldCountResult.count ?? 0,
        exported: exportedCountResult.count ?? 0,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Vault messages.";

    return jsonError(message, 500);
  }
}