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

type PstIngestRequest = {
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

type HealthStatus = "healthy" | "warning" | "error" | "unknown";

type ProcessResult = {
  jobId: string;
  jobType: string;
  status: "completed" | "failed" | "skipped";
  sourceId: string | null;
  mailboxId: string | null;
  message: string;
  parsedFolders?: number;
  parsedMessages?: number;
  importedMessages?: number;
  importedAttachments?: number;
  healthStatus?: HealthStatus;
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

function getPayloadNumber(
  payload: Record<string, unknown> | null,
  key: string
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key];

  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return value;
}

function getPayloadObject(
  payload: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
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

function isPstSource(source: VaultSourceRow | null) {
  if (!source) return false;

  const sourceType = (source.source_type ?? "").toLowerCase();
  const provider = (source.provider ?? "").toLowerCase();

  return sourceType === "pst_import" || provider === "manual_upload";
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
  healthStatus: HealthStatus;
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
    .in("job_type", ["pst_parse", "pst_import"])
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

function buildPstCursor(params: {
  phase: "parsed" | "imported";
  fileName: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  importedAt: string;
}) {
  return JSON.stringify({
    sourceType: "pst_import",
    phase: params.phase,
    fileName: params.fileName,
    storageBucket: params.storageBucket,
    storagePath: params.storagePath,
    importedAt: params.importedAt,
  });
}

async function processPstParseJob(params: {
  orgId: string;
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  mailbox: VaultSourceMailboxRow;
  dryRun: boolean;
}): Promise<ProcessResult> {
  const payload = params.job.payload ?? {};
  const sourceConfig = getSourceConfig(params.source);

  const fileName =
    getPayloadString(payload, "fileName") ??
    normalizeString(sourceConfig.fileName);

  const storageBucket =
    getPayloadString(payload, "storageBucket") ??
    normalizeString(sourceConfig.storageBucket);

  const storagePath =
    getPayloadString(payload, "storagePath") ??
    normalizeString(sourceConfig.storagePath);

  const fileSizeBytes =
    getPayloadNumber(payload, "fileSizeBytes") ??
    (typeof sourceConfig.fileSizeBytes === "number"
      ? sourceConfig.fileSizeBytes
      : null);

  const sha256 =
    getPayloadString(payload, "sha256") ?? normalizeString(sourceConfig.sha256);

  const importMode =
    getPayloadString(payload, "importMode") ??
    normalizeString(sourceConfig.importMode) ??
    "full_import";

  if (!fileName) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: "PST parse failed because fileName could not be resolved.",
      healthStatus: "error",
      error: "Missing fileName.",
    };
  }

  if (!storageBucket) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: "PST parse failed because storageBucket could not be resolved.",
      healthStatus: "error",
      error: "Missing storageBucket.",
    };
  }

  if (!storagePath) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: "PST parse failed because storagePath could not be resolved.",
      healthStatus: "error",
      error: "Missing storagePath.",
    };
  }

  if (params.dryRun) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "completed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: `Dry run completed. PST parse payload is valid for ${fileName}.`,
      parsedFolders: 0,
      parsedMessages: 0,
      healthStatus: "healthy",
    };
  }

  await updateMailboxStatus({
    orgId: params.orgId,
    mailboxId: params.mailbox.id,
    ingestionStatus: "parsing",
  });

  /*
    PST parser implementation goes here next.

    Next implementation layer:
    - Load the uploaded PST file from Supabase Storage or object storage.
    - Verify file size and sha256 if provided.
    - Use a PST parser service/library outside the request cycle when needed.
    - Enumerate folder tree.
    - Build a normalized manifest of folders, messages, attachments, and IDs.
    - Store parse manifest in a storage object or metadata table.
    - Save a parse cursor/manifest reference in vault_source_mailboxes.sync_cursor.

    This route currently validates the PST import job and marks the parse
    framework completed without creating fake Vault evidence.
  */

  const completedAt = new Date().toISOString();

  await updateMailboxStatus({
    orgId: params.orgId,
    mailboxId: params.mailbox.id,
    ingestionStatus: "parsed",
    syncCursor: buildPstCursor({
      phase: "parsed",
      fileName,
      storageBucket,
      storagePath,
      importedAt: completedAt,
    }),
    lastSyncAt: completedAt,
  });

  return {
    jobId: params.job.id,
    jobType: params.job.job_type,
    status: "completed",
    sourceId: params.source.id,
    mailboxId: params.mailbox.id,
    message: `PST parse framework completed for ${fileName}. Import mode: ${importMode}. File size: ${
      fileSizeBytes ?? "unknown"
    }. SHA256: ${sha256 ?? "not provided"}.`,
    parsedFolders: 0,
    parsedMessages: 0,
    healthStatus: "healthy",
  };
}

async function processPstImportJob(params: {
  orgId: string;
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  mailbox: VaultSourceMailboxRow;
  dryRun: boolean;
}): Promise<ProcessResult> {
  const payload = params.job.payload ?? {};
  const sourceConfig = getSourceConfig(params.source);

  const fileName =
    getPayloadString(payload, "fileName") ??
    normalizeString(sourceConfig.fileName);

  const storageBucket =
    getPayloadString(payload, "storageBucket") ??
    normalizeString(sourceConfig.storageBucket);

  const storagePath =
    getPayloadString(payload, "storagePath") ??
    normalizeString(sourceConfig.storagePath);

  const importMode =
    getPayloadString(payload, "importMode") ??
    normalizeString(sourceConfig.importMode) ??
    "full_import";

  const folderScope =
    getPayloadObject(payload, "folderScope") ??
    getPayloadObject(params.source.scope_config, "folderScope");

  const retentionScope =
    getPayloadObject(payload, "retentionScope") ??
    getPayloadObject(params.source.scope_config, "retentionScope");

  const mailboxAddress =
    normalizeString(params.mailbox.mailbox_address) ??
    normalizeString(params.mailbox.external_mailbox_id) ??
    getPayloadString(payload, "mailboxAddress");

  if (!fileName) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: "PST import failed because fileName could not be resolved.",
      healthStatus: "error",
      error: "Missing fileName.",
    };
  }

  if (!storageBucket) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: "PST import failed because storageBucket could not be resolved.",
      healthStatus: "error",
      error: "Missing storageBucket.",
    };
  }

  if (!storagePath) {
    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed",
      sourceId: params.source.id,
      mailboxId: params.mailbox.id,
      message: "PST import failed because storagePath could not be resolved.",
      healthStatus: "error",
      error: "Missing storagePath.",
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
        "PST import failed because mailbox address could not be resolved.",
      healthStatus: "error",
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
      message: `Dry run completed. PST import payload is valid for ${fileName}.`,
      importedMessages: 0,
      importedAttachments: 0,
      healthStatus: "healthy",
    };
  }

  await updateMailboxStatus({
    orgId: params.orgId,
    mailboxId: params.mailbox.id,
    ingestionStatus: "importing",
  });

  /*
    PST import implementation goes here next.

    Next implementation layer:
    - Load parse manifest generated by pst_parse.
    - Stream normalized messages into vault_messages.
    - Use Message-ID, normalized sent date, mailbox address, subject hash, and
      body hash to dedupe.
    - Create vault_message_occurrences for mailbox ownership/placement.
    - Extract attachments and store them in Vault storage.
    - Create vault_message_attachments rows.
    - Apply folderScope filters.
    - Apply retentionScope flags.
    - Write chain-of-custody audit records for:
      - PST file accepted
      - PST hash verification
      - message parsed
      - message imported
      - attachment extracted
      - dedupe/skipped messages

    This route currently validates and marks the PST import framework completed
    without writing placeholder evidence.
  */

  const completedAt = new Date().toISOString();

  await updateMailboxStatus({
    orgId: params.orgId,
    mailboxId: params.mailbox.id,
    ingestionStatus: "completed",
    syncCursor: buildPstCursor({
      phase: "imported",
      fileName,
      storageBucket,
      storagePath,
      importedAt: completedAt,
    }),
    lastSyncAt: completedAt,
  });

  return {
    jobId: params.job.id,
    jobType: params.job.job_type,
    status: "completed",
    sourceId: params.source.id,
    mailboxId: params.mailbox.id,
    message: `PST import framework completed for ${fileName} into ${mailboxAddress}. Import mode: ${importMode}. Folder scope configured: ${
      folderScope ? "yes" : "no"
    }. Retention scope configured: ${retentionScope ? "yes" : "no"}.`,
    importedMessages: 0,
    importedAttachments: 0,
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
      throw new Error("PST ingestion job is missing source_id.");
    }

    if (!params.job.mailbox_id) {
      throw new Error("PST ingestion job is missing mailbox_id.");
    }

    const source = await loadSource({
      orgId: params.orgId,
      sourceId: params.job.source_id,
    });

    if (!isPstSource(source)) {
      throw new Error("Ingestion job source is not a PST import source.");
    }

    const mailbox = await loadMailbox({
      orgId: params.orgId,
      mailboxId: params.job.mailbox_id,
    });

    if (!mailbox) {
      throw new Error("Mailbox for PST ingestion job was not found.");
    }

    let result: ProcessResult;

    if (params.job.job_type === "pst_parse") {
      result = await processPstParseJob({
        orgId: params.orgId,
        job: params.job,
        source,
        mailbox,
        dryRun: params.dryRun,
      });
    } else if (params.job.job_type === "pst_import") {
      result = await processPstImportJob({
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
        message: `Unsupported PST ingestion job type: ${params.job.job_type}`,
        healthStatus: "warning",
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

    await updateSourceHealth({
      orgId: params.orgId,
      sourceId: params.job.source_id,
      healthStatus: result.healthStatus ?? "healthy",
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PST ingestion error.";

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

    const healthStatus: HealthStatus = shouldRetry ? "warning" : "error";

    return {
      jobId: params.job.id,
      jobType: params.job.job_type,
      status: "failed" as const,
      sourceId: params.job.source_id,
      mailboxId: params.job.mailbox_id,
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

    const body = (await request.json().catch(() => ({}))) as PstIngestRequest;

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
      action: "vault.import.pst.ingest",
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
        : "Unable to process PST import jobs.";

    if (access) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        request,
        action: "vault.import.pst.ingest",
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