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

type VaultSourceRow = {
  id: string;
  org_id: string;
  display_name: string | null;
  name: string | null;
  source_key: string | null;
  provider: string | null;
  source_type: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type VaultCustodianDbRow = {
  id: string;
  org_id: string;
  email: string | null;
  display_name: string | null;
  department: string | null;
  status: string | null;
};

type VaultCustodianPayload = {
  id: string;
  org_id: string;
  display_name: string | null;
  primary_email: string | null;
  department: string | null;
  status: string | null;
  source_id: string | null;
};

type SourceWithCustodians = VaultSourceRow & {
  custodians: VaultCustodianPayload[];
  custodian_count: number;
};

const MICROSOFT_PROVIDER = "microsoft_365";
const MICROSOFT_SOURCE_TYPE = "exo_graph";
const ACTIVE_STATUS = "active";

const VAULT_SOURCE_SELECT = `
  id,
  org_id,
  display_name,
  name,
  source_key,
  provider,
  source_type,
  status,
  created_at,
  updated_at
`;

const VAULT_CUSTODIAN_SELECT = `
  id,
  org_id,
  email,
  display_name,
  department,
  status
`;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
}

function getAccessOrgId(access: unknown): string {
  const record = access as Record<string, unknown> | null;

  const orgId =
    normalizeString(record?.orgId) ??
    normalizeString(record?.org_id) ??
    normalizeString(record?.targetOrgId) ??
    normalizeString(record?.target_org_id) ??
    normalizeString(
      record?.profile && typeof record.profile === "object"
        ? (record.profile as Record<string, unknown>).org_id
        : null
    ) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).org_id
        : null
    );

  if (!orgId) {
    throw new Error("Unable to resolve Vault org context from access object.");
  }

  return orgId;
}

function getSupportContext(request: NextRequest) {
  return {
    supportSessionId:
      request.headers.get("x-support-session-id") ||
      request.headers.get("X-Support-Session-Id") ||
      request.nextUrl.searchParams.get("supportSessionId") ||
      null,

    supportGrantId:
      request.headers.get("x-support-grant-id") ||
      request.headers.get("X-Support-Grant-Id") ||
      request.nextUrl.searchParams.get("supportGrantId") ||
      null,
  };
}

function toInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeLimit(value: number) {
  if (value < 1) return 25;
  if (value > 250) return 250;

  return value;
}

function sanitizeOffset(value: number) {
  return value < 0 ? 0 : value;
}

function normalizeProvider(value: string | null) {
  const provider = normalizeString(value)?.toLowerCase();

  return provider || MICROSOFT_PROVIDER;
}

function normalizeSourceType(value: string | null) {
  const sourceType = normalizeString(value)?.toLowerCase();

  return sourceType || MICROSOFT_SOURCE_TYPE;
}

function normalizeStatus(value: string | null) {
  const status = normalizeString(value)?.toLowerCase();

  return status || ACTIVE_STATUS;
}

function sourceMatchesSearch(source: VaultSourceRow, q: string | null) {
  if (!q) return true;

  const needle = q.toLowerCase();

  return [
    source.display_name,
    source.name,
    source.source_key,
    source.provider,
    source.source_type,
    source.status,
  ].some((value) => (value ?? "").toLowerCase().includes(needle));
}

function custodianMatchesSearch(
  custodian: VaultCustodianPayload,
  q: string | null
) {
  if (!q) return true;

  const needle = q.toLowerCase();

  return [
    custodian.display_name,
    custodian.primary_email,
    custodian.department,
    custodian.status,
  ].some((value) => (value ?? "").toLowerCase().includes(needle));
}

function normalizeCustodian(row: VaultCustodianDbRow): VaultCustodianPayload {
  return {
    id: row.id,
    org_id: row.org_id,
    display_name: row.display_name,
    primary_email: row.email,
    department: row.department,
    status: row.status,
    source_id: null,
  };
}

function getHttpStatusForSourcesError(message: string) {
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

  return 400;
}

async function loadMicrosoftSources(params: {
  orgId: string;
  provider: string;
  sourceType: string;
  status: string;
  q: string | null;
  limit: number;
  offset: number;
}) {
  const supabase = getVaultAdminClient();

  const { data, error, count } = await supabase
    .from("vault_sources")
    .select(VAULT_SOURCE_SELECT, {
      count: "exact",
    })
    .eq("org_id", params.orgId)
    .eq("provider", params.provider)
    .eq("source_type", params.sourceType)
    .eq("status", params.status)
    .order("created_at", {
      ascending: false,
    })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    throw new Error(
      `Unable to load Microsoft ingestion sources: ${error.message}`
    );
  }

  const rows = ((data ?? []) as VaultSourceRow[]).filter((source) =>
    sourceMatchesSearch(source, params.q)
  );

  return {
    rows,
    count: count ?? rows.length,
  };
}

async function loadFallbackCustodians(params: {
  orgId: string;
  q: string | null;
  status: string | null;
}) {
  const supabase = getVaultAdminClient();

  let query = supabase
    .from("vault_custodians")
    .select(VAULT_CUSTODIAN_SELECT)
    .eq("org_id", params.orgId)
    .order("display_name", {
      ascending: true,
    })
    .limit(250);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load fallback custodians: ${error.message}`);
  }

  return ((data ?? []) as VaultCustodianDbRow[])
    .map(normalizeCustodian)
    .filter((custodian) => custodianMatchesSearch(custodian, params.q));
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: [
        "vault_admin",
        "vault_compliance_admin",
        "vault_auditor",
      ],
      supportScope: "export_management",
    });

    const orgId = getAccessOrgId(access);
    const supportContext = getSupportContext(request);

    const q = normalizeString(request.nextUrl.searchParams.get("q"));

    const provider = normalizeProvider(
      request.nextUrl.searchParams.get("provider")
    );

    const sourceType = normalizeSourceType(
      request.nextUrl.searchParams.get("sourceType") ??
        request.nextUrl.searchParams.get("source_type")
    );

    const status = normalizeStatus(request.nextUrl.searchParams.get("status"));

    const custodianStatus = normalizeString(
      request.nextUrl.searchParams.get("custodianStatus")
    );

    const includeFallbackCustodians = true;

    const limit = sanitizeLimit(
      toInt(request.nextUrl.searchParams.get("limit"), 50)
    );

    const offset = sanitizeOffset(
      toInt(request.nextUrl.searchParams.get("offset"), 0)
    );

    const sourceResult = await loadMicrosoftSources({
      orgId,
      provider,
      sourceType,
      status,
      q,
      limit,
      offset,
    });

    const fallbackCustodians = includeFallbackCustodians
      ? await loadFallbackCustodians({
          orgId,
          q,
          status: custodianStatus,
        })
      : [];

    const items: SourceWithCustodians[] = sourceResult.rows.map((source) => ({
      ...source,
      custodians: fallbackCustodians,
      custodian_count: fallbackCustodians.length,
    }));

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.ingest.microsoft.sources.list",
      entityType: "vault_source",
      entityId: null,
      status: "success",
      request,
      details: {
        org_id: orgId,
        q,
        provider,
        source_type: sourceType,
        status,
        custodian_status: custodianStatus,
        include_custodians: true,
        include_fallback_custodians: includeFallbackCustodians,
        source_count: items.length,
        fallback_custodian_count: fallbackCustodians.length,
        limit,
        offset,
        support_context: supportContext,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      targetOrgId: orgId,

      filters: {
        q,
        provider,
        sourceType,
        status,
        custodianStatus,
        includeCustodians: true,
        includeFallbackCustodians,
        limit,
        offset,
      },

      paging: {
        limit,
        offset,
        total: sourceResult.count,
        returned: items.length,
        hasMore: offset + limit < sourceResult.count,
      },

      items,
      fallbackCustodians,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load Microsoft ingestion sources.";

    return jsonError(message, getHttpStatusForSourcesError(message));
  }
}