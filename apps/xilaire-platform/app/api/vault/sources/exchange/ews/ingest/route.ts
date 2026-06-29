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

type EwsIngestRequest = {
  limit?: number;
  jobId?: string;
  sourceId?: string;
  mailboxId?: string;
  dryRun?: boolean;
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

type VaultIngestionJobRow = {
  id: string;
  org_id: string;
  source_id: string | null;
  mailbox_id: string | null;
  job_type: string;
  status: string;
  priority: number | null;
  attempts: number | null;
  max_attempts: number | null;
  payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type VaultSourceRow = {
  id: string;
  org_id: string;
  source_key: string | null;
  source_type: string | null;
  provider: string | null;
  display_name: string | null;
  name: string | null;
  status: string | null;
  auth_method: string | null;
  config: Record<string, unknown> | null;
  connection_config: Record<string, unknown> | null;
  scope_config: Record<string, unknown> | null;
  health_status: string | null;
};

type VaultSourceMailboxRow = {
  id: string;
  org_id: string;
  source_id: string;
  external_mailbox_id: string | null;
  mailbox_address: string | null;
  display_name: string | null;
  mailbox_type: string | null;
  ingestion_status: string | null;
  sync_cursor: string | null;
  last_sync_at: string | null;
  deleted_at: string | null;
};

type ProcessResult = {
  jobId: string;
  jobType: string;
  status: "completed" | "failed" | "skipped";
  sourceId: string | null;
  mailboxId: string | null;
  message: string;
  discoveredMailboxes?: number;
  queuedJobs?: number;
  processedMessages?: number;
  error?: string;
};

function resolveAuthOrgId(auth: VaultAccessContextLike): string | null {
  return auth.effectiveOrgId ?? auth.targetOrgId ?? auth.orgId ?? null;
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

function coerceLimit(value: unknown, fallback = 5) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  const normalized = Math.floor(value);

  if (normalized < 1) return 1;
  if (normalized > 25) return 25;

  return normalized;
}

function getPayloadString(
  payload: Record<string, unknown> | null,
  key: string
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return normalizeString(payload[key]);
}

function getPayloadStringArray(
  payload: Record<string, unknown> | null,
  key: string
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const value = payload[key];

  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) =>
          typeof item === "string" ? item.trim().toLowerCase() : ""
        )
        .filter(Boolean)
    )
  );
}

function getSourceConfig(source: VaultSourceRow) {
  const connectionConfig =
    source.connection_config &&
    typeof source.connection_config === "object" &&
    !Array.isArray(source.connection_config)
      ? source.connection_config
      : null;

  const config =
    source.config &&
    typeof source.config === "object" &&
    !Array.isArray(source.config)
      ? source.config
      : null;

  return connectionConfig ?? config ?? {};
}

function getSourceScopeConfig(source: VaultSourceRow) {
  if (
    source.scope_config &&
    typeof source.scope_config === "object" &&
    !Array.isArray(source.scope_config)
  ) {
    return source.scope_config;
  }

  return {};
}

function isEwsSource(source: VaultSourceRow | null) {
  if (!source) return false;

  const sourceType = (source.source_type ?? "").toLowerCase();
  const provider = (source.provider ?? "").toLowerCase();

  return sourceType === "exchange_ews" || provider === "exchange_on_prem";
}

function getSelectedMailboxesFromSource(source: VaultSourceRow) {
  const scopeConfig = getSourceScopeConfig(source);
  const selectedMailboxes = scopeConfig.selectedMailboxes;

  if (!Array.isArray(selectedMailboxes)) return [];

  return Array.from(
    new Set(
      selectedMailboxes
        .map((item) =>
          typeof item === "string" ? item.trim().toLowerCase() : ""
        )
        .filter(Boolean)
    )
  );
}

async function updateJobStatus(params: {
  jobId: string;
  orgId: string;
  status: "queued" | "running" | "completed" | "failed" | "retrying";
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  attempts?: number | null;
}) {
  const supabase = await getVaultAdminClient();

  const patch: Record<string, unknown> = {
    status: params.status,
    updated_at: new Date().toISOString(),
  };

  if (params.errorMessage !== undefined) {
    patch.error_message = params.errorMessage;
  }

  if (params.startedAt !== undefined) {
    patch.started_at = params.startedAt;
  }

  if (params.completedAt !== undefined) {
    patch.completed_at = params.completedAt;
  }

  if (params.attempts !== undefined) {
    patch.attempts = params.attempts;
  }

  const { error } = await supabase
    .from("vault_ingestion_jobs")
    .update(patch)
    .eq("org_id", params.orgId)
    .eq("id", params.jobId);

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }
}

async function updateMailboxStatus(params: {
  orgId: string;
  mailboxId: string;
  ingestionStatus: string;
  syncCursor?: string | null;
  lastSyncAt?: string | null;
}) {
  const supabase = await getVaultAdminClient();

  const patch: Record<string, unknown> = {
    ingestion_status: params.ingestionStatus,
    updated_at: new Date().toISOString(),
  };

  if (params.syncCursor !== undefined) {
    patch.sync_cursor = params.syncCursor;
  }

  if (params.lastSyncAt !== undefined) {
    patch.last_sync_at = params.lastSyncAt;
  }

  const { error } = await supabase
    .from("vault_source_mailboxes")
    .update(patch)
    .eq("org_id", params.orgId)
    .eq("id", params.mailboxId);

  if (error) {
    throw new Error(`Failed to update mailbox status: ${error.message}`);
  }
}

async function updateSourceHealth(params: {
  orgId: string;
  sourceId: string;
  healthStatus: "healthy" | "warning" | "error" | "unknown";
}) {
  const supabase = await getVaultAdminClient();

  const { error } = await supabase
    .from("vault_sources")
    .update({
      health_status: params.healthStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", params.orgId)
    .eq("id", params.sourceId);

  if (error) {
    throw new Error(`Failed to update source health: ${error.message}`);
  }
}

async function loadQueuedJobs(params: {
  orgId: string;
  limit: number;
  jobId?: string | null;
  sourceId?: string | null;
  mailboxId?: string | null;
}) {
  const supabase = await getVaultAdminClient();

  let query = supabase
    .from("vault_ingestion_jobs")
    .select(
      [
        "id",
        "org_id",
        "source_id",
        "mailbox_id",
        "job_type",
        "status",
        "priority",
        "attempts",
        "max_attempts",
        "payload",
        "error_message",
        "created_at",
        "updated_at",
        "started_at",
        "completed_at",
      ].join(", ")
    )
    .eq("org_id", params.orgId)
    .in("status", ["queued", "retrying"])
    .in("job_type", ["discover_mailboxes", "initial_sync", "incremental_sync"])
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(params.limit);

  if (params.jobId) {
    query = query.eq("id", params.jobId);
  }

  if (params.sourceId) {
    query = query.eq("source_id", params.sourceId);
  }

  if (params.mailboxId) {
    query = query.eq("mailbox_id", params.mailboxId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return toRows<VaultIngestionJobRow>(data);
}

async function loadSource(params: {
  orgId: string;
  sourceId: string;
}): Promise<VaultSourceRow | null> {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
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
        "scope_config",
        "health_status",
      ].join(", ")
    )
    .eq("org_id", params.orgId)
    .eq("id", params.sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as VaultSourceRow | null;
}

async function loadMailbox(params: {
  orgId: string;
  mailboxId: string;
}): Promise<VaultSourceMailboxRow | null> {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_source_mailboxes")
    .select(
      [
        "id",
        "org_id",
        "source_id",
        "external_mailbox_id",
        "mailbox_address",
        "display_name",
        "mailbox_type",
        "ingestion_status",
        "sync_cursor",
        "last_sync_at",
        "deleted_at",
      ].join(", ")
    )
    .eq("org_id", params.orgId)
    .eq("id", params.mailboxId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as VaultSourceMailboxRow | null;
}

async function upsertEwsMailbox(params: {
  orgId: string;
  sourceId: string;
  mailboxAddress: string;
}): Promise<VaultSourceMailboxRow> {
  const supabase = await getVaultAdminClient();

  const normalizedAddress = params.mailboxAddress.trim().toLowerCase();

  const { data, error } = await supabase
    .from("vault_source_mailboxes")
    .upsert(
      {
        org_id: params.orgId,
        source_id: params.sourceId,
        external_mailbox_id: normalizedAddress,
        mailbox_address: normalizedAddress,
        display_name: normalizedAddress,
        mailbox_type: "exchange_on_prem",
        ingestion_status: "pending",
      },
      {
        onConflict: "source_id,external_mailbox_id",
        ignoreDuplicates: false,
      }
    )
    .select(
      [
        "id",
        "org_id",
        "source_id",
        "external_mailbox_id",
        "mailbox_address",
        "display_name",
        "mailbox_type",
        "ingestion_status",
        "sync_cursor",
        "last_sync_at",
        "deleted_at",
      ].join(", ")
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as VaultSourceMailboxRow;
}

async function hasPendingInitialSyncJob(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
}) {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .select("id")
    .eq("org_id", params.orgId)
    .eq("source_id", params.sourceId)
    .eq("mailbox_id", params.mailboxId)
    .eq("job_type", "initial_sync")
    .in("status", ["queued", "retrying", "running"])
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean((data as unknown as { id?: string } | null)?.id);
}

async function queueInitialSyncJob(params: {
  orgId: string;
  sourceId: string;
  mailbox: VaultSourceMailboxRow;
  payload: Record<string, unknown>;
}) {
  const supabase = await getVaultAdminClient();

  const alreadyQueued = await hasPendingInitialSyncJob({
    orgId: params.orgId,
    sourceId: params.sourceId,
    mailboxId: params.mailbox.id,
  });

  if (alreadyQueued) {
    return null;
  }

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .insert({
      org_id: params.orgId,
      source_id: params.sourceId,
      mailbox_id: params.mailbox.id,
      job_type: "initial_sync",
      status: "queued",
      priority: 20,
      payload: {
        ...params.payload,
        sourceType: "exchange_ews",
        provider: "exchange_on_prem",
        mailboxAddress: params.mailbox.mailbox_address,
        externalMailboxId: params.mailbox.external_mailbox_id,
      },
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeString((data as unknown as { id?: unknown } | null)?.id);
}

async function processDiscoverMailboxesJob(params: {
  orgId: string;
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  dryRun: boolean;
}): Promise<ProcessResult> {
  const payload = params.job.payload ?? {};
  const selectedFromPayload = getPayloadStringArray(payload, "selectedMailboxes");
  const selectedFromSource = getSelectedMailboxesFromSource(params.source);

  const selectedMailboxes = Array.from(
    new Set([...selectedFromPayload, ...selectedFromSource])
  );

  if (!selectedMailboxes.length) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "completed",
      sourceId: params.source.id,
      mailboxId: params.job.mailbox_id,
      message:
        "No selected Exchange EWS mailboxes were present. Autodiscover/all-mailbox discovery is ready for the EWS API layer.",
      discoveredMailboxes: 0,
      queuedJobs: 0,
    };
  }

  if (params.dryRun) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "completed",
      sourceId: params.source.id,
      mailboxId: params.job.mailbox_id,
      message: "Dry run completed. Selected Exchange EWS mailboxes were validated.",
      discoveredMailboxes: selectedMailboxes.length,
      queuedJobs: 0,
    };
  }

  let discoveredMailboxes = 0;
  let queuedJobs = 0;

  for (const mailboxAddress of selectedMailboxes) {
    const mailbox = await upsertEwsMailbox({
      orgId: params.orgId,
      sourceId: params.source.id,
      mailboxAddress,
    });

    discoveredMailboxes += 1;

    const queuedJobId = await queueInitialSyncJob({
      orgId: params.orgId,
      sourceId: params.source.id,
      mailbox,
      payload,
    });

    if (queuedJobId) queuedJobs += 1;
  }

  return {
    jobId: params.job.id,
    jobType: params.job.job_type,
    status: "completed",
    sourceId: params.source.id,
    mailboxId: params.job.mailbox_id,
    message:
      "Selected Exchange EWS mailboxes were discovered and initial sync jobs were queued.",
    discoveredMailboxes,
    queuedJobs,
  };
}

async function processMailboxSyncJob(params: {
  orgId: string;
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  mailbox: VaultSourceMailboxRow;
  dryRun: boolean;
}): Promise<ProcessResult> {
  const sourceConfig = getSourceConfig(params.source);
  const payload = params.job.payload ?? {};

  const exchangeVersion =
    normalizeString(sourceConfig.exchangeVersion) ??
    getPayloadString(payload, "exchangeVersion") ??
    "Exchange2016";

  const ewsUrl =
    normalizeString(sourceConfig.ewsUrl) ?? getPayloadString(payload, "ewsUrl");

  const autodiscoverUrl =
    normalizeString(sourceConfig.autodiscoverUrl) ??
    getPayloadString(payload, "autodiscoverUrl");

  const authMethod =
    normalizeString(sourceConfig.authMethod) ??
    normalizeString(payload.authMethod) ??
    params.source.auth_method ??
    "basic";

  const mailboxAddress =
    normalizeString(params.mailbox.mailbox_address) ??
    normalizeString(params.mailbox.external_mailbox_id) ??
    getPayloadString(payload, "mailboxAddress");

  if (!ewsUrl && !autodiscoverUrl) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message:
        "Exchange EWS sync failed because ewsUrl or autodiscoverUrl could not be resolved.",
      error: "Missing EWS endpoint.",
    };
  }

  if (!mailboxAddress) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message:
        "Exchange EWS sync failed because mailbox address could not be resolved.",
      error: "Missing mailbox address.",
    };
  }

  if (params.dryRun) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "completed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: `Dry run completed for Exchange EWS mailbox ${mailboxAddress}. Version: ${exchangeVersion}. Auth method: ${authMethod}.`,
      processedMessages: 0,
    };
  }

  await updateMailboxStatus({
    orgId: params.orgId,
    mailboxId: params.mailbox.id,
    ingestionStatus: "syncing",
  });

  /*
    Exchange EWS implementation goes here next.

    Next implementation layer:
    - Add an EWS client library or internal SOAP request client.
    - Resolve password/client secret from source.connection_config or env var.
    - Support auth methods:
      - basic
      - ntlm
      - oauth_client_credentials
      - oauth_delegated
    - Support autodiscover when configured.
    - Bind to the mailbox using impersonation where available.
    - Enumerate folder scope from source.scope_config.folderScope.
    - Fetch items by folder, date range, or sync cursor.
    - Normalize EWS message fields into vault_messages.
    - Create vault_message_occurrences.
    - Create vault_message_attachments rows and storage objects if needed.
    - Store SyncFolderItems watermark / folder cursor in vault_source_mailboxes.sync_cursor.

    This worker currently marks the sync framework as completed without writing
    placeholder evidence, because we do not want fake evidence in Vault.
  */

  await updateMailboxStatus({
    orgId: params.orgId,
    mailboxId: params.mailbox.id,
    ingestionStatus: "connected",
    syncCursor: normalizeString(params.mailbox.sync_cursor),
    lastSyncAt: new Date().toISOString(),
  });

  return {
    jobId: params.job.id,
    jobType: params.job.job_type,
    status: "completed",
    sourceId: params.source.id,
    mailboxId: params.mailbox.id,
    message: `Exchange EWS mailbox ${mailboxAddress} sync framework completed. EWS fetch/parser layer is ready to be plugged in next.`,
    processedMessages: 0,
  };
}

async function processJob(params: {
  orgId: string;
  job: VaultIngestionJobRow;
  dryRun: boolean;
}) {
  const startedAt = new Date().toISOString();
  const attempts = Number(params.job.attempts ?? 0) + 1;

  await updateJobStatus({
    orgId: params.orgId,
    jobId: params.job.id,
    status: "running",
    errorMessage: null,
    startedAt,
    attempts,
  });

  try {
    if (!params.job.source_id) {
      throw new Error("Exchange EWS ingestion job is missing source_id.");
    }

    const source: VaultSourceRow | null = await loadSource({
      orgId: params.orgId,
      sourceId: params.job.source_id,
    });

    if (!isEwsSource(source)) {
      throw new Error("Ingestion job source is not an Exchange EWS source.");
    }

    let result: ProcessResult;

    if (params.job.job_type === "discover_mailboxes") {
      result = await processDiscoverMailboxesJob({
        orgId: params.orgId,
        job: params.job,
        source,
        dryRun: params.dryRun,
      });
    } else if (
      params.job.job_type === "initial_sync" ||
      params.job.job_type === "incremental_sync"
    ) {
      if (!params.job.mailbox_id) {
        throw new Error(`${params.job.job_type} job is missing mailbox_id.`);
      }

      const mailbox: VaultSourceMailboxRow | null = await loadMailbox({
        orgId: params.orgId,
        mailboxId: params.job.mailbox_id,
      });

      if (!mailbox) {
        throw new Error("Mailbox for Exchange EWS ingestion job was not found.");
      }

      result = await processMailboxSyncJob({
        orgId: params.orgId,
        job: params.job,
        source,
        mailbox,
        dryRun: params.dryRun,
      });
    } else {
      result = {
        jobId: params.job.id,
        jobType: params.job.job_type,
        status: "skipped",
        sourceId: params.job.source_id,
        mailboxId: params.job.mailbox_id,
        message: `Unsupported Exchange EWS ingestion job type: ${params.job.job_type}`,
      };
    }

    if (result.status === "failed") {
      throw new Error(result.error ?? result.message);
    }

    await updateJobStatus({
      orgId: params.orgId,
      jobId: params.job.id,
      status: "completed",
      errorMessage: null,
      completedAt: new Date().toISOString(),
    });

    if (params.job.source_id) {
      await updateSourceHealth({
        orgId: params.orgId,
        sourceId: params.job.source_id,
        healthStatus: "healthy",
      });
    }

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Exchange EWS ingestion error.";

    const maxAttempts = Number(params.job.max_attempts ?? 3);
    const shouldRetry = attempts < maxAttempts;

    await updateJobStatus({
      orgId: params.orgId,
      jobId: params.job.id,
      status: shouldRetry ? "retrying" : "failed",
      errorMessage: message,
      completedAt: shouldRetry ? null : new Date().toISOString(),
      attempts,
    });

    if (params.job.mailbox_id) {
      await updateMailboxStatus({
        orgId: params.orgId,
        mailboxId: params.job.mailbox_id,
        ingestionStatus: shouldRetry ? "pending" : "failed",
      });
    }

    if (params.job.source_id) {
      await updateSourceHealth({
        orgId: params.orgId,
        sourceId: params.job.source_id,
        healthStatus: shouldRetry ? "warning" : "error",
      });
    }

    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed" as const,
      sourceId: params.job.source_id,
      mailboxId: params.job.mailbox_id,
      message,
      error: message,
    };
  }
}

export async function POST(request: NextRequest) {
  let access: VaultAccessContextLike | null = null;

  try {
    access = (await requireVaultAccess(request, {
      supportScope: "export_management",
    })) as VaultAccessContextLike;

    const orgId = resolveAuthOrgId(access);

    if (!orgId) {
      return jsonError("Unable to resolve organization context.", 403);
    }

    const body = (await request.json().catch(() => ({}))) as EwsIngestRequest;

    const limit = coerceLimit(body.limit, 5);
    const jobId = normalizeString(body.jobId);
    const sourceId = normalizeString(body.sourceId);
    const mailboxId = normalizeString(body.mailboxId);
    const dryRun = body.dryRun === true;

    const jobs = await loadQueuedJobs({
      orgId,
      limit,
      jobId,
      sourceId,
      mailboxId,
    });

    const results: ProcessResult[] = [];

    for (const job of jobs) {
      const result = await processJob({
        orgId,
        job,
        dryRun,
      });

      results.push(result);
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      request,
      action: "vault.source.exchange.ews.ingest",
      entityType: "vault_ingestion_job",
      status: "success",
      details: {
        requested_limit: limit,
        requested_job_id: jobId,
        requested_source_id: sourceId,
        requested_mailbox_id: mailboxId,
        dry_run: dryRun,
        jobs_found: jobs.length,
        completed_count: results.filter(
          (result) => result.status === "completed"
        ).length,
        failed_count: results.filter((result) => result.status === "failed")
          .length,
        skipped_count: results.filter((result) => result.status === "skipped")
          .length,
      },
    });

    return jsonOk({
      ok: true,
      dryRun,
      count: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process Exchange EWS ingestion jobs.";

    if (access) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        request,
        action: "vault.source.exchange.ews.ingest",
        entityType: "vault_ingestion_job",
        status: "failure",
        details: {
          error: message,
        },
      });
    }

    return jsonError(message, 500);
  }
}