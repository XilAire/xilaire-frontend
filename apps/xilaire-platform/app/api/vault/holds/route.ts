import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

type VaultHoldType = "legal" | "investigation" | "regulatory" | "manual";
type VaultHoldScopeType =
  | "org"
  | "domain"
  | "custodian"
  | "mailbox"
  | "keyword"
  | "message";
type VaultHoldStatus = "active" | "released" | "expired";

type CreateVaultHoldRequest = {
  name: string;
  description?: string | null;
  holdType: VaultHoldType;
  scopeType: VaultHoldScopeType;
  scopeValue?: string | null;
  reason?: string | null;
  startedAt?: string | null;
  messageIds?: string[];
  caseId?: string | null;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string;
  status: string | null;
  priority: string | null;
  matter_number: string | null;
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

function toInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function sanitizeLimit(value: number): number {
  if (value < 1) return 25;
  if (value > 100) return 100;
  return value;
}

function sanitizeOffset(value: number): number {
  if (value < 0) return 0;
  return value;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
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

function normalizeCreatePayload(body: unknown): CreateVaultHoldRequest {
  if (!body || typeof body !== "object") {
    throw new Error("A valid hold payload is required.");
  }

  const input = body as Record<string, unknown>;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    throw new Error("name is required.");
  }

  const holdType = input.holdType as VaultHoldType;
  const scopeType = input.scopeType as VaultHoldScopeType;

  if (!["legal", "investigation", "regulatory", "manual"].includes(holdType)) {
    throw new Error(
      "holdType must be one of: legal, investigation, regulatory, manual."
    );
  }

  if (
    !["org", "domain", "custodian", "mailbox", "keyword", "message"].includes(
      scopeType
    )
  ) {
    throw new Error(
      "scopeType must be one of: org, domain, custodian, mailbox, keyword, message."
    );
  }

  const scopeValue =
    typeof input.scopeValue === "string" && input.scopeValue.trim()
      ? input.scopeValue.trim()
      : null;

  const description =
    typeof input.description === "string" && input.description.trim()
      ? input.description.trim()
      : null;

  const reason =
    typeof input.reason === "string" && input.reason.trim()
      ? input.reason.trim()
      : null;

  const startedAt =
    typeof input.startedAt === "string" && input.startedAt.trim()
      ? input.startedAt.trim()
      : null;

  const messageIds = Array.isArray(input.messageIds)
    ? input.messageIds.filter(
        (value): value is string => typeof value === "string" && !!value.trim()
      )
    : [];

  const caseId =
    typeof input.caseId === "string" && input.caseId.trim()
      ? input.caseId.trim()
      : null;

  if (scopeType === "message" && messageIds.length === 0) {
    throw new Error("messageIds is required when scopeType = message.");
  }

  if (scopeType !== "message" && messageIds.length > 0) {
    throw new Error("messageIds may only be supplied when scopeType = message.");
  }

  if (scopeType !== "org" && !scopeValue && scopeType !== "message") {
    throw new Error("scopeValue is required for this scopeType.");
  }

  return {
    name,
    description,
    holdType,
    scopeType,
    scopeValue,
    reason,
    startedAt,
    messageIds,
    caseId,
  };
}

async function loadCaseScope(input: {
  adminClient: Awaited<ReturnType<typeof getVaultAdminClient>>;
  targetOrgId: string;
  caseId: string;
}) {
  const { adminClient, targetOrgId, caseId } = input;

  const { data: caseData, error: caseError } = await adminClient
    .from("vault_cases")
    .select(
      `
      id,
      org_id,
      name,
      status,
      priority,
      matter_number,
      deleted_at
      `
    )
    .eq("id", caseId)
    .eq("org_id", targetOrgId)
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

  const { data: memberData, error: memberError } = await adminClient
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
    .eq("org_id", targetOrgId)
    .eq("case_id", caseId)
    .eq("assignable_type", "custodian");

  if (memberError) {
    throw new Error(`Failed to load case custodians: ${memberError.message}`);
  }

  const custodianIds = Array.from(
    new Set(
      toRows<VaultCaseMemberRow>(memberData)
        .filter((row) => row.assignable_type === "custodian")
        .map((row) => row.assignable_id)
        .filter(Boolean)
    )
  );

  return {
    caseRow,
    custodianIds,
    caseScope: {
      id: caseRow.id,
      name: caseRow.name,
      status: caseRow.status,
      priority: caseRow.priority,
      matter_number: caseRow.matter_number,
      custodianCount: custodianIds.length,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: [
        "vault_admin",
        "vault_compliance_admin",
        "vault_auditor",
      ],
      supportScope: "full_support_admin",
    });

    const adminClient = await getVaultAdminClient();
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    const statusParam =
      request.nextUrl.searchParams.get("status")?.trim() || null;
    const scopeTypeParam =
      request.nextUrl.searchParams.get("scopeType")?.trim() || null;
    const q = request.nextUrl.searchParams.get("q")?.trim() || null;
    const caseId = normalizeString(request.nextUrl.searchParams.get("caseId"));

    const limit = sanitizeLimit(
      toInt(request.nextUrl.searchParams.get("limit"), 25)
    );

    const offset = sanitizeOffset(
      toInt(request.nextUrl.searchParams.get("offset"), 0)
    );

    let caseScope:
      | {
          caseRow: VaultCaseRow;
          custodianIds: string[];
          caseScope: {
            id: string;
            name: string;
            status: string | null;
            priority: string | null;
            matter_number: string | null;
            custodianCount: number;
          };
        }
      | null = null;

    if (caseId) {
      caseScope = await loadCaseScope({
        adminClient,
        targetOrgId: access.targetOrgId,
        caseId,
      });
    }

    let query = adminClient
      .from("vault_holds")
      .select(
        `
        id,
        org_id,
        name,
        description,
        hold_type,
        scope_type,
        scope_value,
        status,
        reason,
        started_at,
        released_at,
        created_by,
        created_at,
        updated_at,
        case_id
        `,
        { count: "exact" }
      )
      .eq("org_id", access.targetOrgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (statusParam) {
      query = query.eq("status", statusParam as VaultHoldStatus);
    }

    if (scopeTypeParam) {
      query = query.eq("scope_type", scopeTypeParam as VaultHoldScopeType);
    }

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,reason.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Vault holds lookup failed: ${error.message}`);
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: caseId ? "vault.hold.list.case_scoped" : "vault.hold.list",
      entityType: caseId ? "vault_case" : "vault_hold",
      entityId: caseId ?? undefined,
      status: "success",
      details: {
        filters: {
          status: statusParam,
          scopeType: scopeTypeParam,
          q,
          caseId,
          limit,
          offset,
        },
        result_count: count ?? 0,
        case_scope: caseScope?.caseScope ?? null,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk({
      items: data ?? [],
      total: count ?? 0,
      limit,
      offset,
      targetOrgId: access.targetOrgId,
      accessPath: access.accessPath,
      caseScope: caseScope?.caseScope ?? null,
      caseId: caseId ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vault holds lookup failed.";

    const lower = message.toLowerCase();
    const status =
      lower.includes("permission") ||
      lower.includes("support grant") ||
      lower.includes("scope")
        ? 403
        : lower.includes("not found")
          ? 404
          : lower.includes("deleted")
            ? 409
            : lower.includes("authenticate") || lower.includes("bearer token")
              ? 401
              : 400;

    return jsonError(message, status);
  }
}

export async function POST(request: NextRequest) {
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "full_support_admin",
    });

    auditAccess = access;

    const adminClient = await getVaultAdminClient();
    const body = await request.json();
    const payload = normalizeCreatePayload(body);
    const { supportSessionId, supportGrantId } = getSupportContext(request);

    let caseScope:
      | {
          caseRow: VaultCaseRow;
          custodianIds: string[];
          caseScope: {
            id: string;
            name: string;
            status: string | null;
            priority: string | null;
            matter_number: string | null;
            custodianCount: number;
          };
        }
      | null = null;

    if (payload.caseId) {
      caseScope = await loadCaseScope({
        adminClient,
        targetOrgId: access.targetOrgId,
        caseId: payload.caseId,
      });
    }

    const holdInsert = {
      org_id: access.targetOrgId,
      name: payload.name,
      description: payload.description ?? null,
      hold_type: payload.holdType,
      scope_type: payload.scopeType,
      scope_value: payload.scopeValue ?? null,
      status: "active",
      reason: payload.reason ?? null,
      started_at: payload.startedAt ?? new Date().toISOString(),
      created_by: access.actorUserId,
      case_id: payload.caseId ?? null,
    };

    const { data: hold, error: holdError } = await adminClient
      .from("vault_holds")
      .insert(holdInsert)
      .select(
        `
        id,
        org_id,
        name,
        description,
        hold_type,
        scope_type,
        scope_value,
        status,
        reason,
        started_at,
        released_at,
        created_by,
        created_at,
        updated_at,
        case_id
        `
      )
      .single();

    if (holdError || !hold) {
      throw new Error(
        `Unable to create Vault hold: ${holdError?.message ?? "Unknown error"}`
      );
    }

    let appliedMessageCount = 0;

    if (
      payload.scopeType === "message" &&
      payload.messageIds &&
      payload.messageIds.length > 0
    ) {
      let messageQuery = adminClient
        .from("vault_messages")
        .select("id, custodian_id")
        .eq("org_id", access.targetOrgId)
        .in("id", payload.messageIds);

      if (caseScope) {
        if (caseScope.custodianIds.length === 0) {
          throw new Error(
            "This case has no assigned custodians. Message hold scope cannot be validated."
          );
        }

        messageQuery = messageQuery.in("custodian_id", caseScope.custodianIds);
      }

      const { data: validMessages, error: messageLookupError } =
        await messageQuery;

      if (messageLookupError) {
        throw new Error(
          `Unable to validate hold message scope: ${messageLookupError.message}`
        );
      }

      const validMessageIds = (validMessages ?? []).map((row) => row.id);

      if (validMessageIds.length !== payload.messageIds.length) {
        throw new Error(
          caseScope
            ? "One or more messageIds do not belong to the target org, do not exist, or are not assigned to this case."
            : "One or more messageIds do not belong to the target org or do not exist."
        );
      }

      const holdMessageRows = validMessageIds.map((messageId) => ({
        org_id: access.targetOrgId,
        hold_id: hold.id,
        message_id: messageId,
        applied_by: access.actorUserId,
        notes: payload.reason ?? null,
      }));

      const { error: holdMessagesError } = await adminClient
        .from("vault_hold_messages")
        .insert(holdMessageRows);

      if (holdMessagesError) {
        throw new Error(
          `Unable to apply hold to messages: ${holdMessagesError.message}`
        );
      }

      appliedMessageCount = holdMessageRows.length;
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: payload.caseId
        ? "vault.hold.create.case_scoped"
        : "vault.hold.create",
      entityType: payload.caseId ? "vault_case" : "vault_hold",
      entityId: payload.caseId ?? hold.id,
      status: "success",
      details: {
        hold_id: hold.id,
        hold_type: hold.hold_type,
        scope_type: hold.scope_type,
        scope_value: hold.scope_value,
        applied_message_count: appliedMessageCount,
        case_id: payload.caseId ?? null,
        case_scope: caseScope?.caseScope ?? null,
      },
      request,
      supportSessionId,
      supportGrantId,
    });

    return jsonOk(
      {
        item: hold,
        appliedMessageCount,
        targetOrgId: access.targetOrgId,
        accessPath: access.accessPath,
        caseScope: caseScope?.caseScope ?? null,
        caseId: payload.caseId ?? null,
      },
      201
    );
  } catch (error) {
    if (auditAccess) {
      try {
        const { supportSessionId, supportGrantId } = getSupportContext(request);

        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.hold.create",
          entityType: "vault_hold",
          status: "failure",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          request,
          supportSessionId,
          supportGrantId,
        });
      } catch {
        // swallow audit-log failures on failure path
      }
    }

    const message =
      error instanceof Error ? error.message : "Vault hold creation failed.";

    const lower = message.toLowerCase();
    const status =
      lower.includes("permission") ||
      lower.includes("support grant") ||
      lower.includes("scope")
        ? 403
        : lower.includes("not found")
          ? 404
          : lower.includes("deleted")
            ? 409
            : lower.includes("authenticate") || lower.includes("bearer token")
              ? 401
              : 400;

    return jsonError(message, status);
  }
}