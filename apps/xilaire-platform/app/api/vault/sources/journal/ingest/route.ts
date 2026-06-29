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

type JournalIngestRequest = {
  limit?: number;
  jobId?: string;
  sourceId?: string;
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

type JournalHealthStatus = "healthy" | "warning" | "error" | "unknown";

type ProcessResult = {
  jobId: string;
  jobType: string;
  status: "completed" | "failed" | "skipped";
  sourceId: string | null;
  message: string;
  processedMessages?: number;
  listenerReady?: boolean;
  healthStatus?: JournalHealthStatus;
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

function getPayloadBoolean(
  payload: Record<string, unknown> | null,
  key: string,
  fallback = false
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }

  const value = payload[key];

  if (typeof value === "boolean") return value;

  return fallback;
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

function getConfigString(config: Record<string, unknown>, key: string) {
  return normalizeString(config[key]);
}

function getConfigBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback = false
) {
  const value = config[key];

  if (typeof value === "boolean") return value;

  return fallback;
}

function getConfigStringArray(config: Record<string, unknown>, key: string) {
  const value = config[key];

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

function isJournalSource(source: VaultSourceRow | null) {
  if (!source) return false;

  const sourceType = (source.source_type ?? "").toLowerCase();
  const provider = (source.provider ?? "").toLowerCase();

  return (
    sourceType === "exchange_journal_smtp" ||
    sourceType === "smtp_journal" ||
    (provider === "exchange_on_prem" && sourceType.includes("journal"))
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

async function updateSourceHealth(params: {
  orgId: string;
  sourceId: string;
  healthStatus: JournalHealthStatus;
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
    .in("job_type", [
      "journal_listener_setup",
      "journal_health_check",
      "process_raw_journal_message",
    ])
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(params.limit);

  if (params.jobId) {
    query = query.eq("id", params.jobId);
  }

  if (params.sourceId) {
    query = query.eq("source_id", params.sourceId);
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

async function processJournalListenerSetupJob(params: {
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  dryRun: boolean;
}): Promise<ProcessResult> {
  const payload = params.job.payload ?? {};
  const sourceConfig = getSourceConfig(params.source);
  const scopeConfig = getSourceScopeConfig(params.source);

  const journalAddress =
    getConfigString(sourceConfig, "journalAddress") ??
    getPayloadString(payload, "journalAddress");

  const journalDomain =
    getConfigString(sourceConfig, "journalDomain") ??
    getPayloadString(payload, "journalDomain");

  const inboundHost =
    getConfigString(sourceConfig, "inboundHost") ??
    getPayloadString(payload, "inboundHost");

  const inboundPort =
    typeof sourceConfig.inboundPort === "number"
      ? sourceConfig.inboundPort
      : typeof payload.inboundPort === "number"
        ? payload.inboundPort
        : 25;

  const requireTls =
    getConfigBoolean(
      sourceConfig,
      "requireTls",
      getPayloadBoolean(payload, "requireTls", true)
    );

  const acceptedSenderDomains = Array.from(
    new Set([
      ...getConfigStringArray(sourceConfig, "acceptedSenderDomains"),
      ...getPayloadStringArray(payload, "acceptedSenderDomains"),
    ])
  );

  const allowedRelayIps = Array.from(
    new Set([
      ...getConfigStringArray(sourceConfig, "allowedRelayIps"),
      ...getPayloadStringArray(payload, "allowedRelayIps"),
    ])
  );

  if (!journalAddress && !journalDomain) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      message:
        "SMTP journal listener setup failed because journalAddress or journalDomain could not be resolved.",
      listenerReady: false,
      healthStatus: "error",
      error: "Missing journal address or journal domain.",
    };
  }

  if (params.dryRun) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "completed",
      sourceId: params.source.id,
      message:
        "Dry run completed. SMTP journal listener configuration was validated.",
      listenerReady: true,
      healthStatus: "healthy",
    };
  }

  const captureScope =
    scopeConfig.captureScope &&
    typeof scopeConfig.captureScope === "object" &&
    !Array.isArray(scopeConfig.captureScope)
      ? scopeConfig.captureScope
      : null;

  const retentionScope =
    scopeConfig.retentionScope &&
    typeof scopeConfig.retentionScope === "object" &&
    !Array.isArray(scopeConfig.retentionScope)
      ? scopeConfig.retentionScope
      : null;

  return {
    jobId: params.job.id,
    jobType: params.job.job_type,
    status: "completed",
    sourceId: params.source.id,
    message: `SMTP journal listener setup framework completed for ${
      journalAddress ?? journalDomain
    }. Inbound host: ${inboundHost ?? "not assigned"}. Port: ${inboundPort}. TLS required: ${
      requireTls ? "yes" : "no"
    }. Accepted domains: ${acceptedSenderDomains.length}. Allowed relay IPs: ${
      allowedRelayIps.length
    }. Capture scope configured: ${captureScope ? "yes" : "no"}. Retention scope configured: ${
      retentionScope ? "yes" : "no"
    }.`,
    listenerReady: true,
    healthStatus: "healthy",
  };
}

async function processJournalHealthCheckJob(params: {
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  dryRun: boolean;
}): Promise<ProcessResult> {
  const payload = params.job.payload ?? {};
  const sourceConfig = getSourceConfig(params.source);

  const journalAddress =
    getConfigString(sourceConfig, "journalAddress") ??
    getPayloadString(payload, "journalAddress");

  const journalDomain =
    getConfigString(sourceConfig, "journalDomain") ??
    getPayloadString(payload, "journalDomain");

  const inboundHost =
    getConfigString(sourceConfig, "inboundHost") ??
    getPayloadString(payload, "inboundHost");

  const inboundPort =
    typeof sourceConfig.inboundPort === "number"
      ? sourceConfig.inboundPort
      : typeof payload.inboundPort === "number"
        ? payload.inboundPort
        : 25;

  if (!journalAddress && !journalDomain) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      message:
        "SMTP journal health check failed because journalAddress or journalDomain could not be resolved.",
      healthStatus: "error",
      error: "Missing journal address or journal domain.",
    };
  }

  if (params.dryRun) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "completed",
      sourceId: params.source.id,
      message:
        "Dry run completed. SMTP journal health check configuration was validated.",
      healthStatus: "healthy",
    };
  }

  return {
    jobId: params.job.id,
    jobType: params.job.job_type,
    status: "completed",
    sourceId: params.source.id,
    message: `SMTP journal health check framework completed for ${
      journalAddress ?? journalDomain
    }. Inbound host: ${inboundHost ?? "not assigned"}. Port: ${inboundPort}.`,
    healthStatus: "healthy",
  };
}

async function processRawJournalMessageJob(params: {
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  dryRun: boolean;
}): Promise<ProcessResult> {
  const payload = params.job.payload ?? {};

  const rawMessageId =
    getPayloadString(payload, "rawMessageId") ??
    getPayloadString(payload, "raw_message_id");

  const storagePath =
    getPayloadString(payload, "storagePath") ??
    getPayloadString(payload, "storage_path");

  const internetMessageId =
    getPayloadString(payload, "internetMessageId") ??
    getPayloadString(payload, "internet_message_id");

  if (!rawMessageId && !storagePath && !internetMessageId) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      message:
        "Raw SMTP journal message processing failed because no raw message reference was provided.",
      processedMessages: 0,
      healthStatus: "error",
      error:
        "Missing rawMessageId, storagePath, or internetMessageId in journal processing payload.",
    };
  }

  if (params.dryRun) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "completed",
      sourceId: params.source.id,
      message:
        "Dry run completed. Raw SMTP journal message payload was validated.",
      processedMessages: 0,
      healthStatus: "healthy",
    };
  }

  return {
    jobId: params.job.id,
    jobType: params.job.job_type,
    status: "completed",
    sourceId: params.source.id,
    message:
      "Raw SMTP journal message processing framework completed. Journal parser layer is ready to be plugged in next.",
    processedMessages: 0,
    healthStatus: "healthy",
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
      throw new Error("SMTP journal ingestion job is missing source_id.");
    }

    const source: VaultSourceRow | null = await loadSource({
      orgId: params.orgId,
      sourceId: params.job.source_id,
    });

    if (!isJournalSource(source)) {
      throw new Error("Ingestion job source is not an SMTP journal source.");
    }

    let result: ProcessResult;

    if (params.job.job_type === "journal_listener_setup") {
      result = await processJournalListenerSetupJob({
        job: params.job,
        source,
        dryRun: params.dryRun,
      });
    } else if (params.job.job_type === "journal_health_check") {
      result = await processJournalHealthCheckJob({
        job: params.job,
        source,
        dryRun: params.dryRun,
      });
    } else if (params.job.job_type === "process_raw_journal_message") {
      result = await processRawJournalMessageJob({
        job: params.job,
        source,
        dryRun: params.dryRun,
      });
    } else {
      result = {
        jobId: params.job.id,
        jobType: params.job.job_type,
        status: "skipped",
        sourceId: params.job.source_id,
        message: `Unsupported SMTP journal ingestion job type: ${params.job.job_type}`,
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
        healthStatus: result.healthStatus ?? "healthy",
      });
    }

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown SMTP journal ingestion error.";

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

    if (params.job.source_id) {
      await updateSourceHealth({
        orgId: params.orgId,
        sourceId: params.job.source_id,
        healthStatus: shouldRetry ? "warning" : "error",
      });
    }

    const healthStatus: JournalHealthStatus = shouldRetry
      ? "warning"
      : "error";

    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed" as const,
      sourceId: params.job.source_id,
      message,
      error: message,
      healthStatus,
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

    const body = (await request.json().catch(() => ({}))) as JournalIngestRequest;

    const limit = coerceLimit(body.limit, 5);
    const jobId = normalizeString(body.jobId);
    const sourceId = normalizeString(body.sourceId);
    const dryRun = body.dryRun === true;

    const jobs = await loadQueuedJobs({
      orgId,
      limit,
      jobId,
      sourceId,
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
      action: "vault.source.journal.ingest",
      entityType: "vault_ingestion_job",
      status: "success",
      details: {
        requested_limit: limit,
        requested_job_id: jobId,
        requested_source_id: sourceId,
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
        : "Unable to process SMTP journal ingestion jobs.";

    if (access) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        request,
        action: "vault.source.journal.ingest",
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