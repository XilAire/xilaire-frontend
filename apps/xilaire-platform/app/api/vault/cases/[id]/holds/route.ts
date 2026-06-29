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

type VaultHoldRow = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string | null;
  reason: string | null;
  created_by: string | null;
  released_by: string | null;
  released_at: string | null;
  release_reason: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type VaultHoldMessageRow = {
  id: string;
  org_id: string;
  hold_id: string;
  message_id: string;
};

type VaultMessageRow = {
  id: string;
  org_id: string;
  custodian_id: string | null;
  subject: string | null;
  sender_email: string | null;
  sent_at: string | null;
  received_at: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
  on_hold: boolean | null;
  disposition_status: string | null;
};

type HoldSummary = VaultHoldRow & {
  message_count: number;
  case_message_count: number;
  latest_message_at: string | null;
  case_scoped: boolean;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function toInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function sanitizeLimit(value: number): number {
  if (value < 1) return 25;
  if (value > 250) return 250;
  return value;
}

function sanitizeOffset(value: number): number {
  if (value < 0) return 0;
  return value;
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

function getHttpStatusForCaseHoldsError(message: string) {
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
    throw new Error(`Unable to load Vault case: ${caseError.message}`);
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
    throw new Error(`Unable to load case custodians: ${memberError.message}`);
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await context.params;

    if (!caseId) {
      throw new Error("A valid case id is required.");
    }

    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "export_management",
    });

    const adminClient = getVaultAdminClient();
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const limit = sanitizeLimit(toInt(request.nextUrl.searchParams.get("limit"), 25));
    const offset = sanitizeOffset(toInt(request.nextUrl.searchParams.get("offset"), 0));
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const includeReleased = request.nextUrl.searchParams.get("includeReleased") === "true";
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true";

    const caseScope = await loadCaseScope({
      adminClient,
      orgId: access.targetOrgId,
      caseId,
    });

    if (caseScope.custodianIds.length === 0) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.holds.list",
        entityType: "vault_case",
        entityId: caseId,
        status: "success",
        details: {
          case_id: caseId,
          case_name: caseScope.caseRow.name,
          case_custodian_count: 0,
          returned_count: 0,
          total_count: 0,
          reason: "case_has_no_custodians",
        },
        request,
        supportSessionId,
        supportGrantId,
      });

      return jsonOk({
        items: [],
        total: 0,
        limit,
        offset,
        caseScope: {
          id: caseScope.caseRow.id,
          name: caseScope.caseRow.name,
          status: caseScope.caseRow.status,
          priority: caseScope.caseRow.priority,
          matter_number: null,
          custodianCount: 0,
        },
        targetOrgId: access.targetOrgId,
        accessPath: access.accessPath,
      });
    }

    const { data: caseMessageData, error: caseMessageError } = await adminClient
      .from("vault_messages")
      .select(
        `
          id,
          org_id,
          custodian_id,
          subject,
          sender_email,
          sent_at,
          received_at,
          has_attachments,
          attachment_count,
          size_bytes,
          on_hold,
          disposition_status
        `
      )
      .eq("org_id", access.targetOrgId)
      .in("custodian_id", caseScope.custodianIds);

    if (caseMessageError) {
      throw new Error(`Unable to load case messages: ${caseMessageError.message}`);
    }

    const caseMessages = toRows<VaultMessageRow>(caseMessageData);
    const caseMessageIds = new Set(caseMessages.map((message) => message.id));

    if (caseMessageIds.size === 0) {
      return jsonOk({
        items: [],
        total: 0,
        limit,
        offset,
        caseScope: {
          id: caseScope.caseRow.id,
          name: caseScope.caseRow.name,
          status: caseScope.caseRow.status,
          priority: caseScope.caseRow.priority,
          matter_number: null,
          custodianCount: caseScope.custodianIds.length,
        },
        targetOrgId: access.targetOrgId,
        accessPath: access.accessPath,
      });
    }

    const { data: holdMessageData, error: holdMessageError } = await adminClient
      .from("vault_hold_messages")
      .select(
        `
          id,
          org_id,
          hold_id,
          message_id
        `
      )
      .eq("org_id", access.targetOrgId)
      .in("message_id", Array.from(caseMessageIds));

    if (holdMessageError) {
      throw new Error(`Unable to load case hold message links: ${holdMessageError.message}`);
    }

    const holdMessageRows = toRows<VaultHoldMessageRow>(holdMessageData);
    const holdIds = Array.from(
      new Set(
        holdMessageRows
          .map((row) => normalizeString(row.hold_id))
          .filter((id): id is string => Boolean(id))
      )
    );

    if (holdIds.length === 0) {
      return jsonOk({
        items: [],
        total: 0,
        limit,
        offset,
        caseScope: {
          id: caseScope.caseRow.id,
          name: caseScope.caseRow.name,
          status: caseScope.caseRow.status,
          priority: caseScope.caseRow.priority,
          matter_number: null,
          custodianCount: caseScope.custodianIds.length,
        },
        targetOrgId: access.targetOrgId,
        accessPath: access.accessPath,
      });
    }

    let holdsQuery = adminClient
      .from("vault_holds")
      .select(
        `
          id,
          org_id,
          name,
          description,
          status,
          reason,
          created_by,
          released_by,
          released_at,
          release_reason,
          created_at,
          updated_at,
          deleted_at,
          deleted_by
        `,
        { count: "exact" }
      )
      .eq("org_id", access.targetOrgId)
      .in("id", holdIds);

    if (!includeDeleted) {
      holdsQuery = holdsQuery.is("deleted_at", null);
    }

    if (!includeReleased && !status) {
      holdsQuery = holdsQuery.or("status.is.null,status.neq.released");
    }

    if (status) {
      holdsQuery = holdsQuery.eq("status", status);
    }

    if (q) {
      holdsQuery = holdsQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%,reason.ilike.%${q}%`);
    }

    const { data: holdData, error: holdError, count } = await holdsQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (holdError) {
      throw new Error(`Unable to load Vault holds: ${holdError.message}`);
    }

    const holdRows = toRows<VaultHoldRow>(holdData);

    const holdSummaryItems: HoldSummary[] = holdRows.map((hold) => {
      const links = holdMessageRows.filter((row) => row.hold_id === hold.id);
      const linkedCaseMessageIds = new Set(links.map((link) => link.message_id));
      const linkedCaseMessages = caseMessages.filter((message) =>
        linkedCaseMessageIds.has(message.id)
      );

      const latestMessageAt =
        linkedCaseMessages
          .map((message) => message.sent_at ?? message.received_at)
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

      return {
        ...hold,
        message_count: links.length,
        case_message_count: linkedCaseMessages.length,
        latest_message_at: latestMessageAt,
        case_scoped: true,
      };
    });

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.holds.list",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      details: {
        q,
        status_filter: status || null,
        include_released: includeReleased,
        include_deleted: includeDeleted,
        case_id: caseId,
        case_name: caseScope.caseRow.name,
        case_custodian_count: caseScope.custodianIds.length,
        case_message_count: caseMessages.length,
        hold_link_count: holdMessageRows.length,
        returned_count: holdSummaryItems.length,
        total_count: count ?? holdSummaryItems.length,
        limit,
        offset,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      items: holdSummaryItems,
      total: count ?? holdSummaryItems.length,
      limit,
      offset,
      caseScope: {
        id: caseScope.caseRow.id,
        name: caseScope.caseRow.name,
        status: caseScope.caseRow.status,
        priority: caseScope.caseRow.priority,
        matter_number: null,
        custodianCount: caseScope.custodianIds.length,
      },
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Case holds lookup failed.";

    return jsonError(message, getHttpStatusForCaseHoldsError(message));
  }
}