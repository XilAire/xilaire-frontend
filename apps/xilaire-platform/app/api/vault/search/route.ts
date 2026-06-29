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

type VaultAccessLike = {
  targetOrgId?: string | null;
  target_org_id?: string | null;
  effectiveOrgId?: string | null;
  effective_org_id?: string | null;
  orgId?: string | null;
  org_id?: string | null;
  accessPath?: string | null;
  access_path?: string | null;
};

type VaultSearchRequest = {
  q?: string;
  caseId?: string;
  senderEmail?: string;
  recipientEmail?: string;
  subject?: string;
  internetMessageId?: string;
  conversationId?: string;
  onHold?: boolean;
  hasAttachments?: boolean;
  exported?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

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
  email: string | null;
  department: string | null;
  status: string | null;
};

type VaultOccurrenceCountRow = {
  message_id: string;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string;
  status: string | null;
  priority: string | null;
  deleted_at: string | null;
};

type VaultCaseMemberRow = {
  id: string;
  org_id: string;
  case_id: string;
  assignable_type: "custodian" | "admin";
  assignable_id: string;
  role: string | null;
};

type VaultSearchRow = {
  id: string;
  org_id: string;
  source_id: string | null;
  custodian_id: string | null;
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
  to_recipients: Array<{ email?: string | null; name?: string | null }> | null;
  cc_recipients: Array<{ email?: string | null; name?: string | null }> | null;
  bcc_recipients: Array<{ email?: string | null; name?: string | null }> | null;
  recipient_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  sent_at: string | null;
  received_at: string | null;
  archived_at: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
  on_hold: boolean | null;
  disposition_status: string | null;
  export_count: number | null;
  metadata: Record<string, unknown> | null;
  source: VaultSourceSummary | null;
  custodian: VaultCustodianSummary | null;
  occurrence_count: number;
};

function normalizeText(value: string | null) {
  const normalized = value?.trim() || "";
  return normalized || undefined;
}

function normalizeEmail(value: string | null) {
  const normalized = value?.trim().toLowerCase() || "";
  return normalized || undefined;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeLimit(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 25;
  return Math.min(value, 100);
}

function sanitizeOffset(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function normalizeSearchInput(searchParams: URLSearchParams): VaultSearchRequest {
  return {
    q: normalizeText(searchParams.get("q")),
    caseId:
      normalizeText(searchParams.get("caseId")) ??
      normalizeText(searchParams.get("case_id")),
    senderEmail:
      normalizeEmail(searchParams.get("senderEmail")) ??
      normalizeEmail(searchParams.get("sender_email")) ??
      normalizeEmail(searchParams.get("sender")),
    recipientEmail:
      normalizeEmail(searchParams.get("recipientEmail")) ??
      normalizeEmail(searchParams.get("recipient_email")) ??
      normalizeEmail(searchParams.get("recipient")),
    subject: normalizeText(searchParams.get("subject")),
    internetMessageId:
      normalizeText(searchParams.get("internetMessageId")) ??
      normalizeText(searchParams.get("internet_message_id")),
    conversationId:
      normalizeText(searchParams.get("conversationId")) ??
      normalizeText(searchParams.get("conversation_id")),
    onHold:
      searchParams.get("onHold") === null &&
      searchParams.get("on_hold") === null
        ? undefined
        : (searchParams.get("onHold") ?? searchParams.get("on_hold")) ===
          "true",
    hasAttachments:
      searchParams.get("hasAttachments") === null &&
      searchParams.get("has_attachments") === null
        ? undefined
        : (searchParams.get("hasAttachments") ??
            searchParams.get("has_attachments")) === "true",
    exported:
      searchParams.get("exported") === null
        ? undefined
        : searchParams.get("exported") === "true",
    dateFrom:
      normalizeText(searchParams.get("dateFrom")) ??
      normalizeText(searchParams.get("date_from")),
    dateTo:
      normalizeText(searchParams.get("dateTo")) ??
      normalizeText(searchParams.get("date_to")),
    limit: sanitizeLimit(toInt(searchParams.get("limit"), 25)),
    offset: sanitizeOffset(toInt(searchParams.get("offset"), 0)),
  };
}

function buildRecipientOrFilter(recipientEmail: string): string {
  const safeEmail = recipientEmail.replace(/"/g, '\\"');

  return [
    `to_recipients.cs.[{"email":"${safeEmail}"}]`,
    `cc_recipients.cs.[{"email":"${safeEmail}"}]`,
    `bcc_recipients.cs.[{"email":"${safeEmail}"}]`,
  ].join(",");
}

function buildKeywordFallbackOrFilter(q: string): string {
  const safe = escapeLike(q);

  return [
    `subject.ilike.%${safe}%`,
    `body_preview.ilike.%${safe}%`,
    `sender_email.ilike.%${safe}%`,
    `sender_name.ilike.%${safe}%`,
    `internet_message_id.ilike.%${safe}%`,
    `provider_message_id.ilike.%${safe}%`,
  ].join(",");
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

function resolveAccessOrgId(access: VaultAccessLike) {
  return (
    access.targetOrgId ||
    access.target_org_id ||
    access.effectiveOrgId ||
    access.effective_org_id ||
    access.orgId ||
    access.org_id ||
    null
  );
}

function resolveAccessPath(access: VaultAccessLike) {
  return access.accessPath || access.access_path || null;
}

function recipientEmails(
  value: Array<{ email?: string | null; name?: string | null }> | null
) {
  return (value ?? [])
    .map((item) => item.email)
    .filter((email): email is string => Boolean(email));
}

async function loadCaseScope(params: {
  adminClient: ReturnType<typeof getVaultAdminClient>;
  orgId: string;
  caseId: string;
}) {
  const { data: caseData, error: caseError } = await params.adminClient
    .from("vault_cases")
    .select(
      `
        id,
        org_id,
        name,
        status,
        priority,
        deleted_at
      `
    )
    .eq("id", params.caseId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (caseError) {
    throw new Error(`Failed to load case scope: ${caseError.message}`);
  }

  if (!caseData) {
    throw new Error("Vault case was not found.");
  }

  const caseRow = caseData as VaultCaseRow;

  if (caseRow.deleted_at) {
    throw new Error("Vault case is deleted.");
  }

  const { data: memberData, error: memberError } = await params.adminClient
    .from("vault_case_members")
    .select(
      `
        id,
        org_id,
        case_id,
        assignable_type,
        assignable_id,
        role
      `
    )
    .eq("org_id", params.orgId)
    .eq("case_id", params.caseId)
    .eq("assignable_type", "custodian");

  if (memberError) {
    throw new Error(`Failed to load case custodians: ${memberError.message}`);
  }

  const custodianIds = Array.from(
    new Set(
      toRows<VaultCaseMemberRow>(memberData)
        .filter((row) => row.assignable_type === "custodian")
        .map((row) => normalizeString(row.assignable_id))
        .filter((id): id is string => Boolean(id))
    )
  );

  return {
    caseRow,
    custodianIds,
  };
}

function normalizeSearchRow(row: Partial<VaultSearchRow>): VaultSearchRow {
  const toRecipients = Array.isArray(row.to_recipients)
    ? row.to_recipients
    : [];
  const ccRecipients = Array.isArray(row.cc_recipients)
    ? row.cc_recipients
    : [];
  const bccRecipients = Array.isArray(row.bcc_recipients)
    ? row.bcc_recipients
    : [];

  return {
    id: String(row.id ?? ""),
    org_id: String(row.org_id ?? ""),
    source_id: row.source_id ?? null,
    custodian_id: row.custodian_id ?? null,
    provider_message_id: row.provider_message_id ?? null,
    internet_message_id: row.internet_message_id ?? null,
    conversation_id: row.conversation_id ?? null,
    thread_id: row.thread_id ?? null,
    message_direction: row.message_direction ?? null,
    message_type: row.message_type ?? null,
    sensitivity: row.sensitivity ?? null,
    subject: row.subject ?? null,
    body_preview: row.body_preview ?? null,
    sender_name: row.sender_name ?? null,
    sender_email: row.sender_email ?? null,
    to_recipients: toRecipients,
    cc_recipients: ccRecipients,
    bcc_recipients: bccRecipients,
    recipient_emails: recipientEmails(toRecipients),
    cc_emails: recipientEmails(ccRecipients),
    bcc_emails: recipientEmails(bccRecipients),
    sent_at: row.sent_at ?? null,
    received_at: row.received_at ?? null,
    archived_at: row.archived_at ?? null,
    has_attachments: Boolean(row.has_attachments),
    attachment_count: Number(row.attachment_count ?? 0),
    size_bytes: Number(row.size_bytes ?? 0),
    on_hold: Boolean(row.on_hold),
    disposition_status: row.disposition_status ?? "active",
    export_count: Number(row.export_count ?? 0),
    metadata: row.metadata ?? {},
    source: row.source ?? null,
    custodian: row.custodian ?? null,
    occurrence_count: Number(row.occurrence_count ?? 0),
  };
}

function getHttpStatusForVaultSearchError(message: string) {
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

  if (lower.includes("not found")) {
    return 404;
  }

  if (lower.includes("deleted")) {
    return 409;
  }

  return 400;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "export_management",
    });

    const adminClient = getVaultAdminClient();
    const targetOrgId = resolveAccessOrgId(access as VaultAccessLike);

    if (!targetOrgId) {
      throw new Error("Unable to resolve Vault organization context.");
    }

    const accessPath = resolveAccessPath(access as VaultAccessLike);
    const { supportSessionId, supportGrantId } = getSupportContext(request);
    const filters = normalizeSearchInput(request.nextUrl.searchParams);

    let caseScope:
      | {
          caseRow: VaultCaseRow;
          custodianIds: string[];
        }
      | null = null;

    if (filters.caseId) {
      caseScope = await loadCaseScope({
        adminClient,
        orgId: targetOrgId,
        caseId: filters.caseId,
      });

      if (caseScope.custodianIds.length === 0) {
        await writeUnifiedVaultAccessAuditLog({
          access,
          action: "vault.search.case_scoped",
          entityType: "vault_case",
          entityId: filters.caseId,
          status: "success",
          details: {
            filters,
            case_id: filters.caseId,
            case_name: caseScope.caseRow.name,
            case_custodian_count: 0,
            returned_count: 0,
            total_count: 0,
            reason: "case_has_no_custodians",
            duration_ms: Date.now() - startedAt,
          },
          request,
          supportSessionId,
          supportGrantId,
        });

        return jsonOk({
          ok: true,
          items: [],
          total: 0,
          limit: filters.limit ?? 25,
          offset: filters.offset ?? 0,
          paging: {
            limit: filters.limit ?? 25,
            offset: filters.offset ?? 0,
            total: 0,
            hasMore: false,
          },
          counts: {
            total: 0,
            attachments: 0,
            onHold: 0,
            exported: 0,
          },
          caseScope: {
            id: caseScope.caseRow.id,
            name: caseScope.caseRow.name,
            status: caseScope.caseRow.status,
            priority: caseScope.caseRow.priority,
            matter_number: null,
            custodianCount: 0,
          },
          targetOrgId,
          accessPath,
        });
      }
    }

    let query = adminClient
      .from("vault_messages")
      .select(
        `
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
          metadata,
          source:vault_sources (
            id,
            display_name,
            name,
            source_key,
            provider,
            source_type,
            status
          ),
          custodian:vault_custodians (
            id,
            display_name,
            email,
            department,
            status
          )
        `,
        { count: "exact" }
      )
      .eq("org_id", targetOrgId);

    if (caseScope) {
      query = query.in("custodian_id", caseScope.custodianIds);
    }

    if (filters.q) {
      query = query.or(buildKeywordFallbackOrFilter(filters.q));
    }

    if (filters.senderEmail) {
      query = query.ilike("sender_email", `%${escapeLike(filters.senderEmail)}%`);
    }

    if (filters.recipientEmail) {
      query = query.or(buildRecipientOrFilter(filters.recipientEmail));
    }

    if (filters.subject) {
      query = query.ilike("subject", `%${escapeLike(filters.subject)}%`);
    }

    if (filters.internetMessageId) {
      query = query.ilike(
        "internet_message_id",
        `%${escapeLike(filters.internetMessageId)}%`
      );
    }

    if (filters.conversationId) {
      query = query.eq("conversation_id", filters.conversationId);
    }

    if (typeof filters.onHold === "boolean") {
      query = query.eq("on_hold", filters.onHold);
    }

    if (typeof filters.hasAttachments === "boolean") {
      query = query.eq("has_attachments", filters.hasAttachments);
    }

    if (typeof filters.exported === "boolean") {
      if (filters.exported) {
        query = query.gt("export_count", 0);
      } else {
        query = query.or("export_count.is.null,export_count.eq.0");
      }
    }

    if (filters.dateFrom) {
      query = query.gte("received_at", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("received_at", filters.dateTo);
    }

    const { data, error, count } = await query
      .order("received_at", { ascending: false, nullsFirst: false })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 25) - 1
      );

    if (error) {
      throw new Error(`Unable to search Vault messages: ${error.message}`);
    }

    const messageRows = toRows<Partial<VaultSearchRow>>(data).map(normalizeSearchRow);
    const messageIds = messageRows.map((row) => row.id).filter(Boolean);

    let occurrenceCounts = new Map<string, number>();

    if (messageIds.length > 0) {
      const { data: occurrenceData, error: occurrenceError } = await adminClient
        .from("vault_message_occurrences")
        .select("message_id")
        .eq("org_id", targetOrgId)
        .in("message_id", messageIds);

      if (!occurrenceError) {
        occurrenceCounts = toRows<VaultOccurrenceCountRow>(occurrenceData).reduce(
          (map, row) => {
            map.set(row.message_id, (map.get(row.message_id) ?? 0) + 1);
            return map;
          },
          new Map<string, number>()
        );
      }
    }

    const items = messageRows.map((row) => ({
      ...row,
      occurrence_count: occurrenceCounts.get(row.id) ?? row.occurrence_count ?? 0,
    }));

    const counts = {
      total: count ?? items.length,
      attachments: items.filter((item) => Boolean(item.has_attachments)).length,
      onHold: items.filter((item) => Boolean(item.on_hold)).length,
      exported: items.filter((item) => Number(item.export_count ?? 0) > 0).length,
    };

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: filters.caseId ? "vault.search.case_scoped" : "vault.search",
      entityType: filters.caseId ? "vault_case" : "vault_message",
      entityId: filters.caseId ?? null,
      status: "success",
      details: {
        filters,
        case_id: filters.caseId ?? null,
        case_name: caseScope?.caseRow.name ?? null,
        case_custodian_count: caseScope?.custodianIds.length ?? null,
        returned_count: items.length,
        total_count: count ?? items.length,
        limit: filters.limit,
        offset: filters.offset,
        duration_ms: Date.now() - startedAt,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      ok: true,
      items,
      total: count ?? items.length,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
      paging: {
        limit: filters.limit ?? 25,
        offset: filters.offset ?? 0,
        total: count ?? items.length,
        hasMore: (filters.offset ?? 0) + items.length < (count ?? items.length),
      },
      counts,
      caseScope: caseScope
        ? {
            id: caseScope.caseRow.id,
            name: caseScope.caseRow.name,
            status: caseScope.caseRow.status,
            priority: caseScope.caseRow.priority,
            matter_number: null,
            custodianCount: caseScope.custodianIds.length,
          }
        : null,
      targetOrgId,
      accessPath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vault search failed.";

    return jsonError(message, getHttpStatusForVaultSearchError(message));
  }
}