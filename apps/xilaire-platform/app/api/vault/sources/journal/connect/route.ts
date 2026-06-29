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

type JournalConnectRequest = {
  name?: string;
  sourceKey?: string;

  journalAddress?: string;
  journalDomain?: string;
  inboundHost?: string;
  inboundPort?: number;
  requireTls?: boolean;

  acceptedSenderDomains?: string[];
  allowedRelayIps?: string[];

  authMethod?: "none" | "smtp_basic" | "mta_tls";
  username?: string;
  password?: string;
  passwordEnvVar?: string;

  syncMode?: "continuous" | "scheduled";

  captureScope?: {
    captureInbound?: boolean;
    captureOutbound?: boolean;
    captureInternal?: boolean;
    captureBccEnvelope?: boolean;
    preserveJournalEnvelope?: boolean;
  };

  retentionScope?: {
    applyDefaultRetention?: boolean;
    defaultRetentionDays?: number;
    legalHoldByDefault?: boolean;
  };

  batchSize?: number;
};

type VaultAccessContextLike = Awaited<ReturnType<typeof requireVaultAccess>> & {
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
  accessPath?: string | null;
  orgId?: string | null;
  effectiveOrgId?: string | null;
  targetOrgId?: string | null;
};

type VaultSourceRow = {
  id: string;
  org_id: string;
  source_key: string | null;
  source_type: string;
  provider: string;
  display_name: string | null;
  name: string | null;
  status: string;
  auth_method: string | null;
  config: Record<string, unknown> | null;
  connection_config: Record<string, unknown> | null;
  sync_mode: string | null;
  scope_config: Record<string, unknown> | null;
  health_status: string | null;
  created_at: string;
  updated_at: string;
};

type QueuedJobRow = {
  id: string;
  job_type: string;
  mailbox_id: string | null;
  status: string;
  priority: number;
};

function resolveAuthOrgId(auth: VaultAccessContextLike): string | null {
  return auth.effectiveOrgId ?? auth.targetOrgId ?? auth.orgId ?? null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) =>
          typeof value === "string" ? value.trim().toLowerCase() : ""
        )
        .filter(Boolean)
    )
  );
}

function validateRequiredString(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function coerceInboundPort(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 25;
  }

  const normalized = Math.floor(value);

  if (normalized < 1 || normalized > 65535) {
    return 25;
  }

  return normalized;
}

function coerceBatchSize(value: unknown, fallback = 100) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);

  if (normalized < 1) return 1;
  if (normalized > 500) return 500;

  return normalized;
}

function coerceRetentionDays(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);

  if (normalized < 1) return null;
  if (normalized > 36500) return 36500;

  return normalized;
}

function buildSourceKey(payload: JournalConnectRequest) {
  if (payload.sourceKey?.trim()) {
    return payload.sourceKey.trim();
  }

  if (payload.journalAddress?.trim()) {
    return `journal-${payload.journalAddress
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;
  }

  if (payload.journalDomain?.trim()) {
    return `journal-${payload.journalDomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;
  }

  return `journal-${crypto.randomUUID()}`;
}

function buildDisplayName(payload: JournalConnectRequest) {
  if (payload.name?.trim()) {
    return payload.name.trim();
  }

  if (payload.journalAddress?.trim()) {
    return `SMTP Journal (${payload.journalAddress.trim()})`;
  }

  if (payload.journalDomain?.trim()) {
    return `SMTP Journal (${payload.journalDomain.trim()})`;
  }

  return "SMTP Journal Source";
}

export async function POST(request: NextRequest) {
  let auth: VaultAccessContextLike | null = null;

  try {
    auth = (await requireVaultAccess(request, {
      supportScope: "export_management",
    })) as VaultAccessContextLike;

    const orgId = resolveAuthOrgId(auth);

    if (!orgId) {
      return jsonError(
        "Unable to resolve organization context for SMTP journal source connection.",
        403
      );
    }

    const body = (await request.json()) as JournalConnectRequest;

    const journalAddress = normalizeString(body.journalAddress);
    const journalDomain = normalizeString(body.journalDomain);
    const inboundHost = normalizeString(body.inboundHost);
    const inboundPort = coerceInboundPort(body.inboundPort);
    const requireTls = body.requireTls !== false;

    const authMethod =
      body.authMethod === "smtp_basic"
        ? "smtp_basic"
        : body.authMethod === "mta_tls"
          ? "mta_tls"
          : "none";

    const username = normalizeString(body.username);
    const password = normalizeString(body.password);
    const passwordEnvVar = normalizeString(body.passwordEnvVar);

    const syncMode =
      body.syncMode === "scheduled" ? "scheduled" : "continuous";

    const acceptedSenderDomains = normalizeStringArray(
      body.acceptedSenderDomains
    );

    const allowedRelayIps = normalizeStringArray(body.allowedRelayIps);

    const batchSize = coerceBatchSize(body.batchSize, 100);

    const captureScope = {
      captureInbound: body.captureScope?.captureInbound !== false,
      captureOutbound: body.captureScope?.captureOutbound !== false,
      captureInternal: body.captureScope?.captureInternal !== false,
      captureBccEnvelope: body.captureScope?.captureBccEnvelope === true,
      preserveJournalEnvelope:
        body.captureScope?.preserveJournalEnvelope !== false,
    };

    const retentionScope = {
      applyDefaultRetention:
        body.retentionScope?.applyDefaultRetention === true,
      defaultRetentionDays: coerceRetentionDays(
        body.retentionScope?.defaultRetentionDays
      ),
      legalHoldByDefault: body.retentionScope?.legalHoldByDefault === true,
    };

    if (!journalAddress && !journalDomain) {
      return jsonError(
        "journalAddress or journalDomain is required for SMTP journaling.",
        400
      );
    }

    if (authMethod === "smtp_basic") {
      if (!validateRequiredString(username)) {
        return jsonError(
          "username is required when SMTP journal authMethod is smtp_basic.",
          400
        );
      }

      if (!password && !passwordEnvVar) {
        return jsonError(
          "password or passwordEnvVar is required when SMTP journal authMethod is smtp_basic.",
          400
        );
      }
    }

    const sourceKey = buildSourceKey(body);
    const displayName = buildDisplayName(body);

    const connectionConfig: Record<string, unknown> = {
      connector: "smtp_journal",
      provider: "exchange_on_prem",
      sourceType: "exchange_journal_smtp",
      journalAddress,
      journalDomain,
      inboundHost,
      inboundPort,
      requireTls,
      authMethod,
      acceptedSenderDomains,
      allowedRelayIps,
      mailboxDiscoveryEnabled: false,
      journalCaptureEnabled: true,
    };

    if (username) {
      connectionConfig.username = username;
    }

    if (password) {
      connectionConfig.password = password;
    }

    if (passwordEnvVar) {
      connectionConfig.passwordEnvVar = passwordEnvVar;
    }

    const scopeConfig: Record<string, unknown> = {
      captureScope,
      retentionScope,
      acceptedSenderDomains,
      allowedRelayIps,
      batchSize,
    };

    const supabase = await getVaultAdminClient();

    const { data: existingSource, error: existingSourceError } = await supabase
      .from("vault_sources")
      .select(
        [
          "id",
          "org_id",
          "source_key",
          "source_type",
          "provider",
          "display_name",
          "name",
          "status",
          "auth_method",
          "config",
          "connection_config",
          "sync_mode",
          "scope_config",
          "health_status",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("org_id", orgId)
      .eq("source_key", sourceKey)
      .maybeSingle();

    if (existingSourceError) {
      return jsonError(existingSourceError.message, 500);
    }

    let source: VaultSourceRow | null = null;

    if ((existingSource as unknown as { id?: string } | null)?.id) {
      const existingId = (existingSource as unknown as { id: string }).id;

      const { data: updatedSource, error: updateSourceError } = await supabase
        .from("vault_sources")
        .update({
          display_name: displayName,
          name: displayName,
          source_type: "exchange_journal_smtp",
          provider: "exchange_on_prem",
          status: "active",
          auth_method: authMethod,
          sync_mode: syncMode,
          health_status: "unknown",
          config: connectionConfig,
          connection_config: connectionConfig,
          scope_config: scopeConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId)
        .eq("org_id", orgId)
        .select(
          [
            "id",
            "org_id",
            "source_key",
            "source_type",
            "provider",
            "display_name",
            "name",
            "status",
            "auth_method",
            "config",
            "connection_config",
            "sync_mode",
            "scope_config",
            "health_status",
            "created_at",
            "updated_at",
          ].join(", ")
        )
        .single();

      if (updateSourceError || !updatedSource) {
        return jsonError(
          updateSourceError?.message ||
            "Unable to update SMTP journal source.",
          500
        );
      }

      source = updatedSource as unknown as VaultSourceRow;
    } else {
      const { data: insertedSource, error: insertSourceError } = await supabase
        .from("vault_sources")
        .insert({
          org_id: orgId,
          source_key: sourceKey,
          source_type: "exchange_journal_smtp",
          provider: "exchange_on_prem",
          display_name: displayName,
          name: displayName,
          status: "active",
          auth_method: authMethod,
          sync_mode: syncMode,
          health_status: "unknown",
          created_by: auth.user?.id ?? null,
          config: connectionConfig,
          connection_config: connectionConfig,
          scope_config: scopeConfig,
        })
        .select(
          [
            "id",
            "org_id",
            "source_key",
            "source_type",
            "provider",
            "display_name",
            "name",
            "status",
            "auth_method",
            "config",
            "connection_config",
            "sync_mode",
            "scope_config",
            "health_status",
            "created_at",
            "updated_at",
          ].join(", ")
        )
        .single();

      if (insertSourceError || !insertedSource) {
        return jsonError(
          insertSourceError?.message ||
            "Unable to create SMTP journal source.",
          500
        );
      }

      source = insertedSource as unknown as VaultSourceRow;
    }

    const jobsToCreate: Array<Record<string, unknown>> = [
      {
        org_id: orgId,
        source_id: source.id,
        mailbox_id: null,
        job_type: "journal_listener_setup",
        status: "queued",
        priority: 10,
        payload: {
          sourceType: "exchange_journal_smtp",
          provider: "exchange_on_prem",
          journalAddress,
          journalDomain,
          inboundHost,
          inboundPort,
          requireTls,
          authMethod,
          acceptedSenderDomains,
          allowedRelayIps,
          captureScope,
          retentionScope,
          batchSize,
        },
      },
      {
        org_id: orgId,
        source_id: source.id,
        mailbox_id: null,
        job_type: "journal_health_check",
        status: "queued",
        priority: 20,
        payload: {
          sourceType: "exchange_journal_smtp",
          provider: "exchange_on_prem",
          journalAddress,
          journalDomain,
          inboundHost,
          inboundPort,
          requireTls,
          authMethod,
          acceptedSenderDomains,
          allowedRelayIps,
          batchSize,
        },
      },
    ];

    const { data: createdJobs, error: jobInsertError } = await supabase
      .from("vault_ingestion_jobs")
      .insert(jobsToCreate)
      .select("id, job_type, mailbox_id, status, priority");

    if (jobInsertError) {
      return jsonError(jobInsertError.message, 500);
    }

    await writeUnifiedVaultAccessAuditLog({
      access: auth,
      request,
      action: "vault.source.journal.connect",
      entityType: "vault_source",
      entityId: source.id,
      status: "success",
      details: {
        source_key: source.source_key,
        source_type: source.source_type,
        provider: source.provider,
        journal_address: journalAddress,
        journal_domain: journalDomain,
        inbound_host: inboundHost,
        inbound_port: inboundPort,
        require_tls: requireTls,
        auth_method: authMethod,
        sync_mode: syncMode,
        accepted_sender_domain_count: acceptedSenderDomains.length,
        allowed_relay_ip_count: allowedRelayIps.length,
        queued_job_count: createdJobs?.length ?? 0,
        capture_scope: captureScope,
        retention_scope: retentionScope,
      },
    });

    return jsonOk({
      ok: true,
      item: source,
      queuedJobs: (createdJobs ?? []) as unknown as QueuedJobRow[],
      targetOrgId: orgId,
      accessPath: auth.accessPath ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to connect SMTP journal source.";

    if (auth) {
      await writeUnifiedVaultAccessAuditLog({
        access: auth,
        request,
        action: "vault.source.journal.connect",
        entityType: "vault_source",
        status: "failure",
        details: {
          error: message,
        },
      });
    }

    return jsonError(message, 500);
  }
}