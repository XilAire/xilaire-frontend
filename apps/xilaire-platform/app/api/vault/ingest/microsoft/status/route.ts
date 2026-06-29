import { NextRequest } from "next/server";
import {
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MicrosoftGraphTokenResponse = {
  token_type?: string;
  expires_in?: number;
  ext_expires_in?: number;
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GraphOrganizationResponse = {
  value?: Array<{
    id?: string;
    displayName?: string | null;
    verifiedDomains?: Array<{
      name?: string | null;
      isDefault?: boolean | null;
    }>;
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

type TokenStatus =
  | {
      ok: true;
      tokenType: string | null;
      expiresIn: number | null;
      extExpiresIn: number | null;
    }
  | {
      ok: false;
      error: string;
    };

type GraphStatus =
  | {
      ok: true;
      tenantId: string | null;
      displayName: string | null;
      defaultDomain: string | null;
    }
  | {
      ok: false;
      error: string;
    };

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function maskValue(value: string | null) {
  if (!value) return null;
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
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

function getGraphAppOnlyConfiguration() {
  const tenantId =
    normalizeString(process.env.MICROSOFT_TENANT_ID) ??
    normalizeString(process.env.AZURE_TENANT_ID);

  const clientId =
    normalizeString(process.env.MICROSOFT_CLIENT_ID) ??
    normalizeString(process.env.AZURE_CLIENT_ID);

  const clientSecret =
    normalizeString(process.env.MICROSOFT_CLIENT_SECRET) ??
    normalizeString(process.env.AZURE_CLIENT_SECRET);

  return {
    tenantId,
    clientId,
    clientSecret,
    configured: Boolean(tenantId && clientId && clientSecret),
    missing: {
      tenantId: !tenantId,
      clientId: !clientId,
      clientSecret: !clientSecret,
    },
  };
}

async function requestMicrosoftGraphAppOnlyToken() {
  const config = getGraphAppOnlyConfiguration();

  if (!config.configured) {
    throw new Error(
      "Microsoft Graph app-only authentication is not configured. Required env vars: MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET."
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const tokenBody = new URLSearchParams({
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenBody.toString(),
  });

  const payload =
    (await response.json().catch(() => null)) as MicrosoftGraphTokenResponse | null;

  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        `Unable to acquire Microsoft Graph app-only token (${response.status}).`
    );
  }

  const accessToken = normalizeString(payload?.access_token);

  if (!accessToken) {
    throw new Error("Microsoft Graph token endpoint did not return an access token.");
  }

  return {
    accessToken,
    tokenType: payload?.token_type ?? null,
    expiresIn: payload?.expires_in ?? null,
    extExpiresIn: payload?.ext_expires_in ?? null,
  };
}

async function testGraphConnectivity(accessToken: string): Promise<GraphStatus> {
  const response = await fetch("https://graph.microsoft.com/v1.0/organization", {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const payload =
    (await response.json().catch(() => null)) as GraphOrganizationResponse | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.error?.code ||
        `Microsoft Graph organization test failed (${response.status}).`
    );
  }

  const tenant = payload?.value?.[0] ?? null;

  const defaultDomain =
    tenant?.verifiedDomains?.find((domain) => domain.isDefault)?.name ??
    tenant?.verifiedDomains?.[0]?.name ??
    null;

  return {
    ok: true,
    tenantId: tenant?.id ?? null,
    displayName: tenant?.displayName ?? null,
    defaultDomain,
  };
}

function getHttpStatusForStatusError(message: string) {
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

  return 200;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin", "vault_auditor"],
      supportScope: "export_management",
    });

    const orgId = getAccessOrgId(access);
    const supportContext = getSupportContext(request);
    const config = getGraphAppOnlyConfiguration();

    let tokenStatus: TokenStatus = {
      ok: false,
      error: "Not tested.",
    };

    let graphStatus: GraphStatus = {
      ok: false,
      error: "Not tested.",
    };

    if (config.configured) {
      try {
        const token = await requestMicrosoftGraphAppOnlyToken();

        tokenStatus = {
          ok: true,
          tokenType: token.tokenType,
          expiresIn: token.expiresIn,
          extExpiresIn: token.extExpiresIn,
        };

        try {
          graphStatus = await testGraphConnectivity(token.accessToken);
        } catch (graphError) {
          graphStatus = {
            ok: false,
            error:
              graphError instanceof Error
                ? graphError.message
                : "Microsoft Graph connectivity test failed.",
          };
        }
      } catch (tokenError) {
        tokenStatus = {
          ok: false,
          error:
            tokenError instanceof Error
              ? tokenError.message
              : "Microsoft Graph token acquisition failed.",
        };
      }
    } else {
      tokenStatus = {
        ok: false,
        error:
          "App-only authentication is not configured. Add MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET.",
      };
    }

    const operational = config.configured && tokenStatus.ok && graphStatus.ok;

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.ingest.microsoft.status",
      entityType: "vault_source",
      entityId: null,
      status: operational ? "success" : "warning",
      request,
      details: {
        org_id: orgId,
        app_only_configured: config.configured,
        missing_tenant_id: config.missing.tenantId,
        missing_client_id: config.missing.clientId,
        missing_client_secret: config.missing.clientSecret,
        token_ok: tokenStatus.ok,
        graph_ok: graphStatus.ok,
        operational,
        support_context: supportContext,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      targetOrgId: orgId,
      microsoftGraph: {
        operational,
        mode: "app_only",
        configuration: {
          configured: config.configured,
          tenantId: maskValue(config.tenantId),
          clientId: maskValue(config.clientId),
          clientSecretConfigured: Boolean(config.clientSecret),
          missing: config.missing,
        },
        token: tokenStatus,
        graph: graphStatus,
      },
      nextSteps: operational
        ? [
            "App-only Microsoft Graph authentication is working.",
            "You can now test mailbox ingestion without manually pasting a Graph token.",
            "Next step: ingest a small mailbox sample with limit 5 to validate schema mapping.",
          ]
        : [
            "Create or update the Azure App Registration.",
            "Add MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET to the app environment.",
            "Grant Microsoft Graph Application permissions such as Mail.Read and User.Read.All.",
            "Grant admin consent.",
            "Restart the Next.js server and re-check this status endpoint.",
          ],
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to check Microsoft ingestion status.";

    return jsonError(message, getHttpStatusForStatusError(message));
  }
}