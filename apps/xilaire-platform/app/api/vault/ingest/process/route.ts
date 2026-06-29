import { createHash, randomUUID } from "crypto";
import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";
import {
  discoverExoMailboxes,
  listExoMailboxMessages,
  getExoGraphMessageAttachments,
  getExoGraphMessageAttachmentContent,
  type ExoConnectionConfig,
  type ExoGraphAttachment,
  type ExoGraphMessage,
} from "@/lib/vault/exo-graph";

type VaultAccessContextLike = Awaited<ReturnType<typeof requireVaultAccess>> & {
  user: {
    id: string;
  };
  accessPath?: string | null;
  orgId?: string | null;
  effectiveOrgId?: string | null;
  targetOrgId?: string | null;
};

type IngestProcessRequest = {
  limit?: number;
  sourceId?: string;
  jobIds?: string[];
  workerId?: string;
};

type VaultIngestionJobRow = {
  id: string;
  org_id: string;
  source_id: string | null;
  mailbox_id: string | null;
  job_type:
    | "discover_mailboxes"
    | "initial_sync"
    | "incremental_sync"
    | "fetch_message_batch"
    | "fetch_single_message"
    | "fetch_attachments"
    | "process_raw_message"
    | "import_pst"
    | "import_eml"
    | "import_mbox"
    | "reprocess_message"
    | "rebuild_index"
    | "rehydrate_attachments";
  status: "queued" | "running" | "completed" | "failed" | "retrying" | "cancelled";
  priority: number;
  payload: Record<string, unknown> | null;
  attempts: number;
  max_attempts: number;
};

type VaultSourceRow = {
  id: string;
  org_id: string;
  source_type: string;
  provider: string;
  source_key: string | null;
  display_name: string | null;
  name: string | null;
  auth_method: string | null;
  config: Record<string, unknown> | null;
  connection_config: Record<string, unknown> | null;
  sync_mode: string | null;
  scope_config: Record<string, unknown> | null;
  status: string;
};

type VaultSourceMailboxRow = {
  id: string;
  org_id: string;
  source_id: string;
  external_mailbox_id: string;
  mailbox_address: string | null;
  display_name: string | null;
  mailbox_type: string;
  ingestion_status: string;
};

type VaultIngestionCheckpointRow = {
  id: string;
  org_id: string;
  source_id: string;
  mailbox_id: string | null;
  checkpoint_type: string;
  checkpoint_value: Record<string, unknown> | null;
  checkpoint_label: string | null;
  captured_at: string;
  is_current: boolean;
};

type DiscoverMailboxesPayload = {
  sourceType?: "exo_graph";
  provider?: "microsoft_365";
  tenantId?: string;
  clientId?: string;
  authMethod?: "oauth_client_credentials" | "delegated_admin";
  discoveryMode?: "all_mailboxes" | "selected_mailboxes";
  selectedMailboxes?: string[];
  batchSize?: number;
};

type InitialSyncPayload = {
  sourceType?: "exo_graph";
  provider?: "microsoft_365";
  tenantId?: string;
  clientId?: string;
  authMethod?: "oauth_client_credentials" | "delegated_admin";
  mailboxAddress?: string | null;
  externalMailboxId?: string | null;
  batchSize?: number;
  folderScope?: {
    includeFolders?: string[];
    excludeFolders?: string[];
    includeArchive?: boolean;
  };
};

type IncrementalSyncPayload = {
  sourceType?: "exo_graph";
  provider?: "microsoft_365";
  tenantId?: string | null;
  clientId?: string | null;
  authMethod?: string | null;
  mailboxAddress?: string | null;
  externalMailboxId?: string | null;
  batchSize?: number;
  folderScope?: {
    includeFolders?: string[];
    excludeFolders?: string[];
    includeArchive?: boolean;
  };
  nextLink?: string | null;
  deltaLink?: string | null;
};

type ProcessRawMessagePayload = {
  sourceType?: "exo_graph";
  provider?: "microsoft_365";
  tenantId?: string | null;
  clientId?: string | null;
  authMethod?: string | null;
  mailboxAddress?: string | null;
  externalMailboxId?: string | null;
  providerMessageId?: string | null;
  internetMessageId?: string | null;
  conversationId?: string | null;
  parentFolderId?: string | null;
  subject?: string | null;
  from?: {
    name?: string | null;
    email?: string | null;
  } | null;
  toRecipients?: Array<{
    name?: string | null;
    email?: string | null;
  }>;
  ccRecipients?: Array<{
    name?: string | null;
    email?: string | null;
  }>;
  bccRecipients?: Array<{
    name?: string | null;
    email?: string | null;
  }>;
  receivedDateTime?: string | null;
  sentDateTime?: string | null;
  hasAttachments?: boolean;
  bodyPreview?: string | null;
  webLink?: string | null;
};

type ProcessedJobResult = {
  jobId: string;
  jobType: string;
  status: "completed" | "failed" | "skipped";
  detail: Record<string, unknown>;
};

type InsertedMessageRow = {
  id: string;
};

type InsertedOccurrenceRow = {
  id: string;
};

type ExistingAttachmentRow = {
  id: string;
};

type UploadedAttachmentResult = {
  storagePath: string;
  sha256: string | null;
  sizeBytes: number;
};

type ExistingProcessRawJobRow = {
  id: string;
  mailbox_id: string | null;
  job_type: string;
  status: string;
  priority: number;
  payload: Record<string, unknown> | null;
};

const VAULT_ATTACHMENT_BUCKET =
  process.env.VAULT_ATTACHMENT_BUCKET?.trim() || "vault-attachments";

function resolveAuthOrgId(auth: VaultAccessContextLike): string | null {
  return auth.effectiveOrgId ?? auth.targetOrgId ?? auth.orgId ?? null;
}

function normalizeMailboxAddresses(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeJobIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeWorkerId(input?: string | null) {
  if (input && input.trim()) {
    return input.trim();
  }

  return `manual-worker-${randomUUID()}`;
}

function coerceLimit(value: unknown, fallback = 10) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  if (normalized < 1) return 1;
  if (normalized > 50) return 50;
  return normalized;
}

function buildExoConnectionConfig(source: VaultSourceRow): ExoConnectionConfig {
  const fromConnection = (source.connection_config ?? {}) as Record<string, unknown>;
  const fromConfig = (source.config ?? {}) as Record<string, unknown>;

  return {
    tenantId:
      typeof fromConnection.tenantId === "string"
        ? fromConnection.tenantId
        : typeof fromConfig.tenantId === "string"
          ? fromConfig.tenantId
          : null,
    clientId:
      typeof fromConnection.clientId === "string"
        ? fromConnection.clientId
        : typeof fromConfig.clientId === "string"
          ? fromConfig.clientId
          : null,
    clientSecret:
      typeof fromConnection.clientSecret === "string"
        ? fromConnection.clientSecret
        : typeof fromConfig.clientSecret === "string"
          ? fromConfig.clientSecret
          : null,
    clientSecretEnvVar:
      typeof fromConnection.clientSecretEnvVar === "string"
        ? fromConnection.clientSecretEnvVar
        : typeof fromConfig.clientSecretEnvVar === "string"
          ? fromConfig.clientSecretEnvVar
          : null,
    authMethod:
      typeof fromConnection.authMethod === "string"
        ? (fromConnection.authMethod as "oauth_client_credentials" | "delegated_admin")
        : typeof fromConfig.authMethod === "string"
          ? (fromConfig.authMethod as "oauth_client_credentials" | "delegated_admin")
          : null,
    connector:
      typeof fromConnection.connector === "string"
        ? fromConnection.connector
        : typeof fromConfig.connector === "string"
          ? fromConfig.connector
          : null,
    provider:
      typeof fromConnection.provider === "string"
        ? fromConnection.provider
        : typeof fromConfig.provider === "string"
          ? fromConfig.provider
          : null,
    mailboxDiscoveryEnabled:
      typeof fromConnection.mailboxDiscoveryEnabled === "boolean"
        ? fromConnection.mailboxDiscoveryEnabled
        : typeof fromConfig.mailboxDiscoveryEnabled === "boolean"
          ? fromConfig.mailboxDiscoveryEnabled
          : null,
  };
}

function extractFolderScope(
  scopeConfig: Record<string, unknown> | null | undefined,
  payloadFolderScope?:
    | InitialSyncPayload["folderScope"]
    | IncrementalSyncPayload["folderScope"]
) {
  const sourceScope =
    scopeConfig && typeof scopeConfig.folderScope === "object" && scopeConfig.folderScope
      ? (scopeConfig.folderScope as Record<string, unknown>)
      : {};

  const includeFolders = Array.isArray(payloadFolderScope?.includeFolders)
    ? payloadFolderScope.includeFolders.filter(Boolean)
    : Array.isArray(sourceScope.includeFolders)
      ? sourceScope.includeFolders.filter((x): x is string => typeof x === "string" && Boolean(x))
      : [];

  const excludeFolders = Array.isArray(payloadFolderScope?.excludeFolders)
    ? payloadFolderScope.excludeFolders.filter(Boolean)
    : Array.isArray(sourceScope.excludeFolders)
      ? sourceScope.excludeFolders.filter((x): x is string => typeof x === "string" && Boolean(x))
      : [];

  const includeArchive =
    typeof payloadFolderScope?.includeArchive === "boolean"
      ? payloadFolderScope.includeArchive
      : typeof sourceScope.includeArchive === "boolean"
        ? sourceScope.includeArchive
        : false;

  return {
    includeFolders,
    excludeFolders,
    includeArchive,
  };
}

function normalizeAttachmentExtension(fileName: string | null): string | null {
  if (!fileName || !fileName.includes(".")) {
    return null;
  }

  const last = fileName.split(".").pop()?.trim().toLowerCase() ?? "";
  return last || null;
}

function sanitizePathSegment(value: string | null | undefined): string {
  if (!value) {
    return "unknown";
  }

  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function buildMessageHash(
  payload: ProcessRawMessagePayload,
  senderEmail: string | null,
  bodyText: string | null
) {
  const hashSeed = JSON.stringify({
    providerMessageId: payload.providerMessageId,
    internetMessageId: payload.internetMessageId ?? null,
    conversationId: payload.conversationId ?? null,
    subject: payload.subject ?? null,
    senderEmail,
    sentDateTime: payload.sentDateTime ?? null,
    receivedDateTime: payload.receivedDateTime ?? null,
    bodyText,
  });

  return Buffer.from(hashSeed).toString("base64");
}

function buildAttachmentSha256FromBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function uploadAttachmentContentToStorage(params: {
  orgId: string;
  sourceId: string;
  mailboxId?: string | null;
  messageId: string;
  providerAttachmentId: string;
  fileName: string;
  contentType: string | null;
  contentBytesBase64: string | null;
}): Promise<UploadedAttachmentResult> {
  if (!params.contentBytesBase64) {
    return {
      storagePath: "",
      sha256: null,
      sizeBytes: 0,
    };
  }

  const supabase = getVaultAdminClient();
  const buffer = Buffer.from(params.contentBytesBase64, "base64");
  const sha256 = buildAttachmentSha256FromBuffer(buffer);
  const extension = normalizeAttachmentExtension(params.fileName);
  const sanitizedFileName = sanitizePathSegment(params.fileName);
  const objectPath = [
    sanitizePathSegment(params.orgId),
    "sources",
    sanitizePathSegment(params.sourceId),
    "messages",
    sanitizePathSegment(params.messageId),
    "attachments",
    sanitizePathSegment(params.providerAttachmentId),
    `${randomUUID()}_${sanitizedFileName}${extension && !sanitizedFileName.endsWith(`.${extension}`) ? `.${extension}` : ""}`,
  ].join("/");

  const { error } = await supabase.storage
    .from(VAULT_ATTACHMENT_BUCKET)
    .upload(objectPath, buffer, {
      upsert: false,
      contentType: params.contentType ?? "application/octet-stream",
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    storagePath: objectPath,
    sha256,
    sizeBytes: buffer.byteLength,
  };
}

async function writeIngestionEvent(params: {
  orgId: string;
  sourceId?: string | null;
  mailboxId?: string | null;
  jobId?: string | null;
  eventType:
    | "source_connected"
    | "mailbox_discovered"
    | "sync_started"
    | "sync_completed"
    | "sync_failed"
    | "message_fetched"
    | "raw_stored"
    | "normalized"
    | "attachment_stored"
    | "dedupe_matched"
    | "indexed"
    | "hold_applied"
    | "retention_applied"
    | "checkpoint_saved"
    | "job_cancelled"
    | "reprocess_started"
    | "reprocess_completed";
  status: "success" | "warning" | "error" | "info";
  detail?: Record<string, unknown>;
}) {
  const supabase = getVaultAdminClient();

  await supabase.from("vault_ingestion_events").insert({
    org_id: params.orgId,
    source_id: params.sourceId ?? null,
    mailbox_id: params.mailboxId ?? null,
    job_id: params.jobId ?? null,
    event_type: params.eventType,
    status: params.status,
    detail: params.detail ?? {},
  });
}

async function markJobRunning(params: {
  jobId: string;
  orgId: string;
  workerId: string;
}): Promise<VaultIngestionJobRow | null> {
  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .select(`
      id,
      org_id,
      source_id,
      mailbox_id,
      job_type,
      status,
      priority,
      payload,
      attempts,
      max_attempts
    `)
    .eq("id", params.jobId)
    .eq("org_id", params.orgId)
    .maybeSingle<VaultIngestionJobRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  if (data.status !== "queued" && data.status !== "retrying") {
    return null;
  }

  const nextAttempts = (data.attempts ?? 0) + 1;

  const { data: updated, error: updateError } = await supabase
    .from("vault_ingestion_jobs")
    .update({
      status: "running",
      worker_id: params.workerId,
      started_at: new Date().toISOString(),
      attempts: nextAttempts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.jobId)
    .eq("org_id", params.orgId)
    .in("status", ["queued", "retrying"])
    .select(`
      id,
      org_id,
      source_id,
      mailbox_id,
      job_type,
      status,
      priority,
      payload,
      attempts,
      max_attempts
    `)
    .maybeSingle<VaultIngestionJobRow>();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updated ?? null;
}

async function markJobCompleted(params: {
  jobId: string;
  orgId: string;
  checkpointAfter?: Record<string, unknown> | null;
}) {
  const supabase = getVaultAdminClient();

  const { error } = await supabase
    .from("vault_ingestion_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      checkpoint_after: params.checkpointAfter ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.jobId)
    .eq("org_id", params.orgId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markJobFailed(params: {
  job: VaultIngestionJobRow;
  errorMessage: string;
}) {
  const supabase = getVaultAdminClient();

  const shouldRetry = (params.job.attempts ?? 0) < (params.job.max_attempts ?? 5);
  const nextStatus: VaultIngestionJobRow["status"] = shouldRetry ? "retrying" : "failed";

  const { error } = await supabase
    .from("vault_ingestion_jobs")
    .update({
      status: nextStatus,
      failed_at: new Date().toISOString(),
      error_message: params.errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.job.id)
    .eq("org_id", params.job.org_id);

  if (error) {
    throw new Error(error.message);
  }
}

async function getSourceOrThrow(sourceId: string, orgId: string): Promise<VaultSourceRow> {
  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_sources")
    .select(`
      id,
      org_id,
      source_type,
      provider,
      source_key,
      display_name,
      name,
      auth_method,
      config,
      connection_config,
      sync_mode,
      scope_config,
      status
    `)
    .eq("id", sourceId)
    .eq("org_id", orgId)
    .single<VaultSourceRow>();

  if (error || !data) {
    throw new Error(error?.message || "Vault source not found.");
  }

  return data;
}

async function getCurrentCheckpoint(params: {
  orgId: string;
  sourceId: string;
  mailboxId?: string | null;
}): Promise<VaultIngestionCheckpointRow | null> {
  const supabase = getVaultAdminClient();

  let query = supabase
    .from("vault_ingestion_checkpoints")
    .select(`
      id,
      org_id,
      source_id,
      mailbox_id,
      checkpoint_type,
      checkpoint_value,
      checkpoint_label,
      captured_at,
      is_current
    `)
    .eq("org_id", params.orgId)
    .eq("source_id", params.sourceId)
    .eq("is_current", true)
    .order("captured_at", { ascending: false })
    .limit(1);

  if (params.mailboxId) {
    query = query.eq("mailbox_id", params.mailboxId);
  } else {
    query = query.is("mailbox_id", null);
  }

  const { data, error } = await query.maybeSingle<VaultIngestionCheckpointRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function saveCheckpoint(params: {
  orgId: string;
  sourceId: string;
  mailboxId?: string | null;
  checkpointType:
    | "graph_delta_token"
    | "ews_sync_state"
    | "gmail_history_id"
    | "imap_uid_state"
    | "journal_position"
    | "import_offset"
    | "time_window";
  checkpointValue: Record<string, unknown>;
  checkpointLabel?: string | null;
}) {
  const supabase = getVaultAdminClient();

  if (params.mailboxId) {
    await supabase
      .from("vault_ingestion_checkpoints")
      .update({ is_current: false })
      .eq("org_id", params.orgId)
      .eq("source_id", params.sourceId)
      .eq("mailbox_id", params.mailboxId)
      .eq("checkpoint_type", params.checkpointType)
      .eq("is_current", true);
  } else {
    await supabase
      .from("vault_ingestion_checkpoints")
      .update({ is_current: false })
      .eq("org_id", params.orgId)
      .eq("source_id", params.sourceId)
      .is("mailbox_id", null)
      .eq("checkpoint_type", params.checkpointType)
      .eq("is_current", true);
  }

  const { error } = await supabase.from("vault_ingestion_checkpoints").insert({
    org_id: params.orgId,
    source_id: params.sourceId,
    mailbox_id: params.mailboxId ?? null,
    checkpoint_type: params.checkpointType,
    checkpoint_value: params.checkpointValue,
    checkpoint_label: params.checkpointLabel ?? null,
    is_current: true,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function findExistingPendingIncrementalSync(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
}): Promise<VaultIngestionJobRow | null> {
  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .select(`
      id,
      org_id,
      source_id,
      mailbox_id,
      job_type,
      status,
      priority,
      payload,
      attempts,
      max_attempts
    `)
    .eq("org_id", params.orgId)
    .eq("source_id", params.sourceId)
    .eq("mailbox_id", params.mailboxId)
    .eq("job_type", "incremental_sync")
    .in("status", ["queued", "running", "retrying"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<VaultIngestionJobRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function queueIncrementalSyncJob(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
  tenantId?: string | null;
  clientId?: string | null;
  authMethod?: string | null;
  mailboxAddress?: string | null;
  externalMailboxId?: string | null;
  batchSize: number;
  folderScope?: Record<string, unknown>;
  nextLink?: string | null;
  deltaLink?: string | null;
  allowDuplicatePending?: boolean;
}) {
  if (!params.allowDuplicatePending) {
    const existingPending = await findExistingPendingIncrementalSync({
      orgId: params.orgId,
      sourceId: params.sourceId,
      mailboxId: params.mailboxId,
    });

    if (existingPending) {
      return [
        {
          id: existingPending.id,
          mailbox_id: existingPending.mailbox_id,
          job_type: existingPending.job_type,
          status: existingPending.status,
          priority: existingPending.priority,
          reused_existing: true,
        },
      ];
    }
  }

  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .insert({
      org_id: params.orgId,
      source_id: params.sourceId,
      mailbox_id: params.mailboxId,
      job_type: "incremental_sync",
      status: "queued",
      priority: 25,
      payload: {
        sourceType: "exo_graph",
        provider: "microsoft_365",
        tenantId: params.tenantId ?? null,
        clientId: params.clientId ?? null,
        authMethod: params.authMethod ?? null,
        mailboxAddress: params.mailboxAddress ?? null,
        externalMailboxId: params.externalMailboxId ?? null,
        batchSize: params.batchSize,
        folderScope: params.folderScope ?? {},
        nextLink: params.nextLink ?? null,
        deltaLink: params.deltaLink ?? null,
      } satisfies IncrementalSyncPayload,
    })
    .select("id, mailbox_id, job_type, status, priority");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function findExistingPendingProcessRawMessageJob(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
  providerMessageId: string;
}): Promise<ExistingProcessRawJobRow | null> {
  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .select(`
      id,
      mailbox_id,
      job_type,
      status,
      priority,
      payload
    `)
    .eq("org_id", params.orgId)
    .eq("source_id", params.sourceId)
    .eq("mailbox_id", params.mailboxId)
    .eq("job_type", "process_raw_message")
    .in("status", ["queued", "running", "retrying"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ExistingProcessRawJobRow[];

  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const existingProviderMessageId =
      typeof payload.providerMessageId === "string" ? payload.providerMessageId.trim() : "";

    if (existingProviderMessageId === params.providerMessageId) {
      return row;
    }
  }

  return null;
}

async function queueInitialSyncJobsForMailboxes(params: {
  orgId: string;
  sourceId: string;
  tenantId?: string;
  clientId?: string;
  authMethod?: string;
  batchSize: number;
  folderScope?: Record<string, unknown>;
  mailboxes: VaultSourceMailboxRow[];
}) {
  if (params.mailboxes.length === 0) {
    return [];
  }

  const supabase = getVaultAdminClient();

  const jobs = params.mailboxes.map((mailbox) => ({
    org_id: params.orgId,
    source_id: params.sourceId,
    mailbox_id: mailbox.id,
    job_type: "initial_sync",
    status: "queued",
    priority: 20,
    payload: {
      sourceType: "exo_graph",
      provider: "microsoft_365",
      tenantId: params.tenantId ?? null,
      clientId: params.clientId ?? null,
      authMethod: params.authMethod ?? null,
      mailboxAddress: mailbox.mailbox_address,
      externalMailboxId: mailbox.external_mailbox_id,
      batchSize: params.batchSize,
      folderScope: params.folderScope ?? {},
    },
  }));

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .insert(jobs)
    .select("id, mailbox_id, job_type, status, priority");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function queueProcessRawMessageJobs(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
  tenantId?: string | null;
  clientId?: string | null;
  authMethod?: string | null;
  mailboxAddress?: string | null;
  externalMailboxId?: string | null;
  messages: ExoGraphMessage[];
}) {
  if (params.messages.length === 0) {
    return {
      queuedJobs: [] as Array<Record<string, unknown>>,
      queuedCount: 0,
      skippedDuplicateCount: 0,
    };
  }

  const supabase = getVaultAdminClient();
  const jobsToInsert: Array<Record<string, unknown>> = [];
  let skippedDuplicateCount = 0;

  for (const message of params.messages) {
    if (!message.providerMessageId?.trim()) {
      continue;
    }

    const existingPending = await findExistingPendingProcessRawMessageJob({
      orgId: params.orgId,
      sourceId: params.sourceId,
      mailboxId: params.mailboxId,
      providerMessageId: message.providerMessageId,
    });

    if (existingPending) {
      skippedDuplicateCount += 1;
      continue;
    }

    jobsToInsert.push({
      org_id: params.orgId,
      source_id: params.sourceId,
      mailbox_id: params.mailboxId,
      job_type: "process_raw_message",
      status: "queued",
      priority: 30,
      payload: {
        sourceType: "exo_graph",
        provider: "microsoft_365",
        tenantId: params.tenantId ?? null,
        clientId: params.clientId ?? null,
        authMethod: params.authMethod ?? null,
        mailboxAddress: params.mailboxAddress ?? null,
        externalMailboxId: params.externalMailboxId ?? null,
        providerMessageId: message.providerMessageId,
        internetMessageId: message.internetMessageId,
        conversationId: message.conversationId,
        parentFolderId: message.parentFolderId,
        subject: message.subject,
        from: message.from,
        toRecipients: message.toRecipients,
        ccRecipients: message.ccRecipients,
        bccRecipients: message.bccRecipients,
        receivedDateTime: message.receivedDateTime,
        sentDateTime: message.sentDateTime,
        hasAttachments: message.hasAttachments,
        bodyPreview: message.bodyPreview,
        webLink: message.webLink,
      } satisfies ProcessRawMessagePayload,
    });
  }

  if (jobsToInsert.length === 0) {
    return {
      queuedJobs: [] as Array<Record<string, unknown>>,
      queuedCount: 0,
      skippedDuplicateCount,
    };
  }

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .insert(jobsToInsert)
    .select("id, job_type, mailbox_id, status, priority");

  if (error) {
    throw new Error(error.message);
  }

  return {
    queuedJobs: (data ?? []) as Array<Record<string, unknown>>,
    queuedCount: (data ?? []).length,
    skippedDuplicateCount,
  };
}

async function processDiscoverMailboxesJob(
  job: VaultIngestionJobRow,
  source: VaultSourceRow
): Promise<ProcessedJobResult> {
  const payload = (job.payload ?? {}) as DiscoverMailboxesPayload;
  const supabase = getVaultAdminClient();

  if (source.source_type !== "exo_graph") {
    throw new Error(`Unsupported source_type for discover_mailboxes: ${source.source_type}`);
  }

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: job.source_id,
    mailboxId: null,
    jobId: job.id,
    eventType: "sync_started",
    status: "info",
    detail: {
      job_type: job.job_type,
      discovery_mode: payload.discoveryMode ?? "all_mailboxes",
    },
  });

  const discoveryMode =
    payload.discoveryMode === "selected_mailboxes" ? "selected_mailboxes" : "all_mailboxes";

  const exoConfig = buildExoConnectionConfig(source);
  const batchSize =
    typeof payload.batchSize === "number" && payload.batchSize > 0
      ? Math.floor(payload.batchSize)
      : 100;

  const selectedMailboxes = normalizeMailboxAddresses(payload.selectedMailboxes);

  const discovered = await discoverExoMailboxes(exoConfig, {
    limit: batchSize,
    selectedMailboxes: discoveryMode === "selected_mailboxes" ? selectedMailboxes : [],
  });

  const mailboxUpserts = discovered.map((mailbox) => ({
    org_id: job.org_id,
    source_id: source.id,
    external_mailbox_id: mailbox.externalMailboxId,
    mailbox_address: mailbox.mailboxAddress,
    display_name: mailbox.displayName ?? mailbox.mailboxAddress,
    mailbox_type: mailbox.mailboxType,
    ingestion_status: "active",
    folder_scope:
      ((source.scope_config as Record<string, unknown> | null)?.folderScope as Record<string, unknown> | null) ??
      {},
  }));

  const { data: mailboxRows, error: mailboxError } =
    mailboxUpserts.length > 0
      ? await supabase
          .from("vault_source_mailboxes")
          .upsert(mailboxUpserts, {
            onConflict: "source_id,external_mailbox_id",
            ignoreDuplicates: false,
          })
          .select(`
            id,
            org_id,
            source_id,
            external_mailbox_id,
            mailbox_address,
            display_name,
            mailbox_type,
            ingestion_status
          `)
      : { data: [], error: null };

  if (mailboxError) {
    throw new Error(mailboxError.message);
  }

  const mailboxes = (mailboxRows ?? []) as VaultSourceMailboxRow[];

  for (const mailbox of mailboxes) {
    await writeIngestionEvent({
      orgId: job.org_id,
      sourceId: source.id,
      mailboxId: mailbox.id,
      jobId: job.id,
      eventType: "mailbox_discovered",
      status: "success",
      detail: {
        mailbox_address: mailbox.mailbox_address,
        external_mailbox_id: mailbox.external_mailbox_id,
      },
    });
  }

  const queuedInitialSyncJobs = await queueInitialSyncJobsForMailboxes({
    orgId: job.org_id,
    sourceId: source.id,
    tenantId: payload.tenantId,
    clientId: payload.clientId,
    authMethod: payload.authMethod,
    batchSize,
    folderScope:
      ((source.scope_config as Record<string, unknown> | null)?.folderScope as Record<string, unknown> | null) ??
      {},
    mailboxes,
  });

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: null,
    jobId: job.id,
    eventType: "sync_completed",
    status: "success",
    detail: {
      discoveryMode,
      discoveredMailboxCount: mailboxes.length,
      queuedInitialSyncJobs: queuedInitialSyncJobs.length,
    },
  });

  return {
    jobId: job.id,
    jobType: job.job_type,
    status: "completed",
    detail: {
      discoveryMode,
      discoveredMailboxCount: mailboxes.length,
      queuedInitialSyncJobs: queuedInitialSyncJobs.length,
    },
  };
}

async function processInitialSyncJob(
  job: VaultIngestionJobRow,
  source: VaultSourceRow
): Promise<ProcessedJobResult> {
  const payload = (job.payload ?? {}) as InitialSyncPayload;

  if (source.source_type !== "exo_graph") {
    throw new Error(`Unsupported source_type for initial_sync: ${source.source_type}`);
  }

  if (!job.mailbox_id) {
    throw new Error("initial_sync job is missing mailbox_id.");
  }

  if (!payload.mailboxAddress?.trim()) {
    throw new Error("initial_sync job is missing mailboxAddress.");
  }

  const exoConfig = buildExoConnectionConfig(source);
  const folderScope = extractFolderScope(
    (source.scope_config as Record<string, unknown> | null) ?? {},
    payload.folderScope
  );
  const batchSize =
    typeof payload.batchSize === "number" && payload.batchSize > 0
      ? Math.floor(payload.batchSize)
      : 50;

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: job.source_id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "sync_started",
    status: "info",
    detail: {
      mailbox_address: payload.mailboxAddress,
      external_mailbox_id: payload.externalMailboxId ?? null,
      batch_size: batchSize,
    },
  });

  const listed = await listExoMailboxMessages(exoConfig, payload.mailboxAddress, {
    limit: batchSize,
    folderScope,
  });

  for (const message of listed.messages) {
    await writeIngestionEvent({
      orgId: job.org_id,
      sourceId: source.id,
      mailboxId: job.mailbox_id,
      jobId: job.id,
      eventType: "message_fetched",
      status: "info",
      detail: {
        provider_message_id: message.providerMessageId,
        internet_message_id: message.internetMessageId,
        subject: message.subject,
      },
    });
  }

  const queuedProcessResult = await queueProcessRawMessageJobs({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    tenantId: payload.tenantId ?? null,
    clientId: payload.clientId ?? null,
    authMethod: payload.authMethod ?? null,
    mailboxAddress: payload.mailboxAddress ?? null,
    externalMailboxId: payload.externalMailboxId ?? null,
    messages: listed.messages,
  });

  const checkpointValue: Record<string, unknown> = {
    mode: "initial_sync_first_page",
    mailboxAddress: payload.mailboxAddress ?? null,
    externalMailboxId: payload.externalMailboxId ?? null,
    capturedAt: new Date().toISOString(),
    nextLink: listed.nextLink,
    deltaLink: listed.deltaLink,
    fetchedCount: listed.messages.length,
    rawCount: listed.rawCount,
    queuedProcessRawMessageJobs: queuedProcessResult.queuedCount,
    skippedDuplicateProcessRawMessageJobs: queuedProcessResult.skippedDuplicateCount,
  };

  const checkpointType = listed.deltaLink ? "graph_delta_token" : "time_window";

  await saveCheckpoint({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    checkpointType,
    checkpointValue,
    checkpointLabel: listed.deltaLink
      ? "Initial sync Graph delta checkpoint"
      : "Initial sync first page checkpoint",
  });

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "checkpoint_saved",
    status: "success",
    detail: {
      checkpoint_type: checkpointType,
      mailbox_address: payload.mailboxAddress ?? null,
      next_link_present: Boolean(listed.nextLink),
      delta_link_present: Boolean(listed.deltaLink),
    },
  });

  if (listed.nextLink || listed.deltaLink) {
    await queueIncrementalSyncJob({
      orgId: job.org_id,
      sourceId: source.id,
      mailboxId: job.mailbox_id,
      tenantId: payload.tenantId ?? null,
      clientId: payload.clientId ?? null,
      authMethod: payload.authMethod ?? null,
      mailboxAddress: payload.mailboxAddress ?? null,
      externalMailboxId: payload.externalMailboxId ?? null,
      batchSize,
      folderScope,
      nextLink: listed.nextLink,
      deltaLink: listed.deltaLink,
      allowDuplicatePending: false,
    });
  }

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "sync_completed",
    status: "success",
    detail: {
      mailbox_address: payload.mailboxAddress ?? null,
      fetchedCount: listed.messages.length,
      queuedProcessRawMessageJobs: queuedProcessResult.queuedCount,
      skippedDuplicateProcessRawMessageJobs: queuedProcessResult.skippedDuplicateCount,
      next_link_present: Boolean(listed.nextLink),
      delta_link_present: Boolean(listed.deltaLink),
    },
  });

  return {
    jobId: job.id,
    jobType: job.job_type,
    status: "completed",
    detail: {
      mailboxAddress: payload.mailboxAddress ?? null,
      externalMailboxId: payload.externalMailboxId ?? null,
      fetchedCount: listed.messages.length,
      rawCount: listed.rawCount,
      queuedProcessRawMessageJobs: queuedProcessResult.queuedCount,
      skippedDuplicateProcessRawMessageJobs: queuedProcessResult.skippedDuplicateCount,
      nextLinkPresent: Boolean(listed.nextLink),
      deltaLinkPresent: Boolean(listed.deltaLink),
      queuedIncrementalSync: Boolean(listed.nextLink || listed.deltaLink),
    },
  };
}

async function processIncrementalSyncJob(
  job: VaultIngestionJobRow,
  source: VaultSourceRow
): Promise<ProcessedJobResult> {
  const payload = (job.payload ?? {}) as IncrementalSyncPayload;

  if (source.source_type !== "exo_graph") {
    throw new Error(`Unsupported source_type for incremental_sync: ${source.source_type}`);
  }

  if (!job.mailbox_id) {
    throw new Error("incremental_sync job is missing mailbox_id.");
  }

  if (!payload.mailboxAddress?.trim()) {
    throw new Error("incremental_sync job is missing mailboxAddress.");
  }

  const exoConfig = buildExoConnectionConfig(source);
  const folderScope = extractFolderScope(
    (source.scope_config as Record<string, unknown> | null) ?? {},
    payload.folderScope
  );
  const batchSize =
    typeof payload.batchSize === "number" && payload.batchSize > 0
      ? Math.floor(payload.batchSize)
      : 50;

  const currentCheckpoint = await getCurrentCheckpoint({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
  });

  const checkpointValue = (currentCheckpoint?.checkpoint_value ?? {}) as Record<string, unknown>;
  const storedNextLink =
    typeof checkpointValue.nextLink === "string" && checkpointValue.nextLink.trim()
      ? checkpointValue.nextLink.trim()
      : null;
  const storedDeltaLink =
    typeof checkpointValue.deltaLink === "string" && checkpointValue.deltaLink.trim()
      ? checkpointValue.deltaLink.trim()
      : null;

  const nextLink =
    typeof payload.nextLink === "string" && payload.nextLink.trim()
      ? payload.nextLink.trim()
      : storedNextLink;
  const deltaLink =
    typeof payload.deltaLink === "string" && payload.deltaLink.trim()
      ? payload.deltaLink.trim()
      : storedDeltaLink;

  const resumeLink = nextLink ?? deltaLink ?? null;

  if (!resumeLink) {
    const existingPending = await findExistingPendingIncrementalSync({
      orgId: job.org_id,
      sourceId: source.id,
      mailboxId: job.mailbox_id,
    });

    const anotherPendingExists =
      Boolean(existingPending?.id) && existingPending.id !== job.id;

    await writeIngestionEvent({
      orgId: job.org_id,
      sourceId: job.source_id,
      mailboxId: job.mailbox_id,
      jobId: job.id,
      eventType: "checkpoint_saved",
      status: "warning",
      detail: {
        mailbox_address: payload.mailboxAddress ?? null,
        note: anotherPendingExists
          ? "No incremental checkpoint available yet. Another incremental_sync is already pending/running."
          : "No incremental checkpoint available yet. Re-queuing incremental_sync and waiting for initial_sync checkpoint.",
      },
    });

    if (!anotherPendingExists) {
      await queueIncrementalSyncJob({
        orgId: job.org_id,
        sourceId: source.id,
        mailboxId: job.mailbox_id,
        tenantId: payload.tenantId ?? null,
        clientId: payload.clientId ?? null,
        authMethod: payload.authMethod ?? null,
        mailboxAddress: payload.mailboxAddress ?? null,
        externalMailboxId: payload.externalMailboxId ?? null,
        batchSize,
        folderScope,
        nextLink: null,
        deltaLink: null,
        allowDuplicatePending: false,
      });
    }

    return {
      jobId: job.id,
      jobType: job.job_type,
      status: "completed",
      detail: {
        mailboxAddress: payload.mailboxAddress ?? null,
        externalMailboxId: payload.externalMailboxId ?? null,
        waitingForCheckpoint: true,
        requeuedIncrementalSync: !anotherPendingExists,
        duplicateWaitingJobPrevented: anotherPendingExists,
        note: "Skipped incremental pull because no checkpoint exists yet.",
      },
    };
  }

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: job.source_id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "sync_started",
    status: "info",
    detail: {
      mailbox_address: payload.mailboxAddress,
      external_mailbox_id: payload.externalMailboxId ?? null,
      batch_size: batchSize,
      using_resume_link: true,
    },
  });

  const listed = await listExoMailboxMessages(exoConfig, payload.mailboxAddress, {
    limit: batchSize,
    nextLink: resumeLink,
    folderScope,
  });

  for (const message of listed.messages) {
    await writeIngestionEvent({
      orgId: job.org_id,
      sourceId: source.id,
      mailboxId: job.mailbox_id,
      jobId: job.id,
      eventType: "message_fetched",
      status: "info",
      detail: {
        provider_message_id: message.providerMessageId,
        internet_message_id: message.internetMessageId,
        subject: message.subject,
        incremental_sync: true,
      },
    });
  }

  const queuedProcessResult = await queueProcessRawMessageJobs({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    tenantId: payload.tenantId ?? null,
    clientId: payload.clientId ?? null,
    authMethod: payload.authMethod ?? null,
    mailboxAddress: payload.mailboxAddress ?? null,
    externalMailboxId: payload.externalMailboxId ?? null,
    messages: listed.messages,
  });

  const newCheckpointValue: Record<string, unknown> = {
    mode: "incremental_sync",
    mailboxAddress: payload.mailboxAddress ?? null,
    externalMailboxId: payload.externalMailboxId ?? null,
    capturedAt: new Date().toISOString(),
    previousNextLink: nextLink,
    previousDeltaLink: deltaLink,
    nextLink: listed.nextLink,
    deltaLink: listed.deltaLink ?? deltaLink,
    fetchedCount: listed.messages.length,
    rawCount: listed.rawCount,
    queuedProcessRawMessageJobs: queuedProcessResult.queuedCount,
    skippedDuplicateProcessRawMessageJobs: queuedProcessResult.skippedDuplicateCount,
  };

  await saveCheckpoint({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    checkpointType: "graph_delta_token",
    checkpointValue: newCheckpointValue,
    checkpointLabel: "Incremental sync Graph checkpoint",
  });

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "checkpoint_saved",
    status: "success",
    detail: {
      checkpoint_type: "graph_delta_token",
      mailbox_address: payload.mailboxAddress ?? null,
      next_link_present: Boolean(listed.nextLink),
      delta_link_present: Boolean(listed.deltaLink ?? deltaLink),
    },
  });

  const shouldContinue = Boolean(listed.nextLink);

  if (shouldContinue) {
    await queueIncrementalSyncJob({
      orgId: job.org_id,
      sourceId: source.id,
      mailboxId: job.mailbox_id,
      tenantId: payload.tenantId ?? null,
      clientId: payload.clientId ?? null,
      authMethod: payload.authMethod ?? null,
      mailboxAddress: payload.mailboxAddress ?? null,
      externalMailboxId: payload.externalMailboxId ?? null,
      batchSize,
      folderScope,
      nextLink: listed.nextLink,
      deltaLink: listed.deltaLink ?? deltaLink,
      allowDuplicatePending: false,
    });
  }

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "sync_completed",
    status: "success",
    detail: {
      mailbox_address: payload.mailboxAddress ?? null,
      fetchedCount: listed.messages.length,
      queuedProcessRawMessageJobs: queuedProcessResult.queuedCount,
      skippedDuplicateProcessRawMessageJobs: queuedProcessResult.skippedDuplicateCount,
      next_link_present: Boolean(listed.nextLink),
      delta_link_present: Boolean(listed.deltaLink ?? deltaLink),
      queued_followup_incremental_sync: shouldContinue,
    },
  });

  return {
    jobId: job.id,
    jobType: job.job_type,
    status: "completed",
    detail: {
      mailboxAddress: payload.mailboxAddress ?? null,
      externalMailboxId: payload.externalMailboxId ?? null,
      fetchedCount: listed.messages.length,
      rawCount: listed.rawCount,
      queuedProcessRawMessageJobs: queuedProcessResult.queuedCount,
      skippedDuplicateProcessRawMessageJobs: queuedProcessResult.skippedDuplicateCount,
      nextLinkPresent: Boolean(listed.nextLink),
      deltaLinkPresent: Boolean(listed.deltaLink ?? deltaLink),
      queuedFollowupIncrementalSync: shouldContinue,
    },
  };
}

async function upsertVaultMessage(params: {
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  payload: ProcessRawMessagePayload;
}) {
  const supabase = getVaultAdminClient();
  const { job, source, payload } = params;

  const senderEmail =
    typeof payload.from?.email === "string" && payload.from.email.trim()
      ? payload.from.email.trim().toLowerCase()
      : null;

  const fromDomain =
    senderEmail && senderEmail.includes("@")
      ? senderEmail.split("@")[1]
      : null;

  const toRecipients = Array.isArray(payload.toRecipients) ? payload.toRecipients : [];
  const ccRecipients = Array.isArray(payload.ccRecipients) ? payload.ccRecipients : [];
  const bccRecipients = Array.isArray(payload.bccRecipients) ? payload.bccRecipients : [];

  const bodyText =
    typeof payload.bodyPreview === "string" && payload.bodyPreview.trim()
      ? payload.bodyPreview
      : null;

  const messageHash = buildMessageHash(payload, senderEmail, bodyText);

  const insertPayload = {
    org_id: job.org_id,
    source_id: source.id,
    provider_message_id: payload.providerMessageId,
    internet_message_id: payload.internetMessageId ?? null,
    conversation_id: payload.conversationId ?? null,
    thread_id: payload.conversationId ?? null,
    message_direction: "unknown",
    message_type: "email",
    sensitivity: "normal",
    subject: payload.subject ?? null,
    body_text: bodyText,
    body_html: null,
    body_preview: bodyText,
    sender_name:
      typeof payload.from?.name === "string" && payload.from.name.trim()
        ? payload.from.name.trim()
        : null,
    sender_email: senderEmail,
    from_domain: fromDomain,
    to_recipients: toRecipients,
    cc_recipients: ccRecipients,
    bcc_recipients: bccRecipients,
    reply_to_recipients: [],
    sent_at: payload.sentDateTime ?? null,
    received_at: payload.receivedDateTime ?? null,
    indexed_at: null,
    archived_at: new Date().toISOString(),
    has_attachments: payload.hasAttachments === true,
    attachment_count: 0,
    size_bytes: 0,
    message_hash_sha256: messageHash,
    raw_storage_path: null,
    normalized_storage_path: null,
    retention_expires_at: null,
    on_hold: false,
    disposition_status: "retained",
    export_count: 0,
    metadata: {
      source_type: "exo_graph",
      provider: "microsoft_365",
      mailbox_address: payload.mailboxAddress ?? null,
      external_mailbox_id: payload.externalMailboxId ?? null,
      parent_folder_id: payload.parentFolderId ?? null,
      web_link: payload.webLink ?? null,
      graph_stub: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("vault_messages")
    .upsert(insertPayload, {
      onConflict: "org_id,message_hash_sha256",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle<InsertedMessageRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    return {
      messageId: data.id,
      deduped: false,
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("vault_messages")
    .select("id")
    .eq("org_id", job.org_id)
    .eq("message_hash_sha256", messageHash)
    .maybeSingle<InsertedMessageRow>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing?.id) {
    throw new Error("Vault message upsert did not return an inserted or existing message id.");
  }

  return {
    messageId: existing.id,
    deduped: true,
  };
}

async function insertOccurrenceIfMissing(params: {
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  payload: ProcessRawMessagePayload;
  messageId: string;
}) {
  const supabase = getVaultAdminClient();
  const { job, source, payload, messageId } = params;

  const occurrenceQuery = supabase
    .from("vault_message_occurrences")
    .select("id")
    .eq("org_id", job.org_id)
    .eq("message_id", messageId)
    .eq("source_id", source.id)
    .eq("provider_message_id", payload.providerMessageId ?? null);

  const { data: existingOccurrence, error: existingOccurrenceError } = job.mailbox_id
    ? await occurrenceQuery.eq("mailbox_id", job.mailbox_id).maybeSingle<InsertedOccurrenceRow>()
    : await occurrenceQuery.is("mailbox_id", null).maybeSingle<InsertedOccurrenceRow>();

  if (existingOccurrenceError) {
    throw new Error(existingOccurrenceError.message);
  }

  if (existingOccurrence?.id) {
    return existingOccurrence.id;
  }

  const { data: insertedOccurrence, error: insertedOccurrenceError } = await supabase
    .from("vault_message_occurrences")
    .insert({
      org_id: job.org_id,
      message_id: messageId,
      source_id: source.id,
      mailbox_id: job.mailbox_id ?? null,
      external_folder_id: payload.parentFolderId ?? null,
      folder_path: null,
      external_occurrence_id: payload.providerMessageId ?? null,
      provider_message_id: payload.providerMessageId ?? null,
      change_key: null,
      occurrence_type: "mailbox_copy",
      is_deleted_at_source: false,
    })
    .select("id")
    .single<InsertedOccurrenceRow>();

  if (insertedOccurrenceError || !insertedOccurrence) {
    throw new Error(
      insertedOccurrenceError?.message || "Unable to insert vault message occurrence."
    );
  }

  return insertedOccurrence.id;
}

async function insertAttachments(params: {
  job: VaultIngestionJobRow;
  source: VaultSourceRow;
  payload: ProcessRawMessagePayload;
  messageId: string;
  occurrenceId: string | null;
  attachments: ExoGraphAttachment[];
}) {
  const supabase = getVaultAdminClient();
  const { job, source, payload, messageId, occurrenceId, attachments } = params;

  if (attachments.length === 0) {
    return {
      insertedCount: 0,
      skippedCount: 0,
      uploadedCount: 0,
    };
  }

  let insertedCount = 0;
  let skippedCount = 0;
  let uploadedCount = 0;

  for (const attachment of attachments) {
    const existingQuery = supabase
      .from("vault_message_attachments")
      .select("id")
      .eq("org_id", job.org_id)
      .eq("message_id", messageId)
      .eq("provider_attachment_id", attachment.providerAttachmentId);

    const { data: existingAttachment, error: existingAttachmentError } = occurrenceId
      ? await existingQuery.eq("occurrence_id", occurrenceId).maybeSingle<ExistingAttachmentRow>()
      : await existingQuery.is("occurrence_id", null).maybeSingle<ExistingAttachmentRow>();

    if (existingAttachmentError) {
      throw new Error(existingAttachmentError.message);
    }

    if (existingAttachment?.id) {
      skippedCount += 1;
      continue;
    }

    const attachmentContent = await getExoGraphMessageAttachmentContent(
      buildExoConnectionConfig(source),
      payload.mailboxAddress ?? "",
      payload.providerMessageId ?? "",
      attachment.providerAttachmentId
    );

    const fileName = attachmentContent.fileName ?? attachment.fileName ?? "attachment";
    const extension = normalizeAttachmentExtension(fileName);

    let storagePath: string | null = null;
    let sha256: string | null = null;
    let sizeBytes = attachmentContent.sizeBytes ?? attachment.sizeBytes ?? 0;

    if (attachmentContent.contentBytesBase64) {
      const uploaded = await uploadAttachmentContentToStorage({
        orgId: job.org_id,
        sourceId: source.id,
        mailboxId: job.mailbox_id,
        messageId,
        providerAttachmentId: attachment.providerAttachmentId,
        fileName,
        contentType: attachmentContent.contentType ?? attachment.contentType,
        contentBytesBase64: attachmentContent.contentBytesBase64,
      });

      storagePath = uploaded.storagePath;
      sha256 = uploaded.sha256;
      sizeBytes = uploaded.sizeBytes;
      uploadedCount += 1;
    }

    const { error } = await supabase.from("vault_message_attachments").insert({
      org_id: job.org_id,
      message_id: messageId,
      occurrence_id: occurrenceId,
      provider_attachment_id: attachment.providerAttachmentId,
      file_name: fileName,
      content_type: attachmentContent.contentType ?? attachment.contentType,
      extension,
      size_bytes: sizeBytes,
      storage_path: storagePath,
      sha256,
      extracted_text: null,
      extraction_status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }

    insertedCount += 1;

    await writeIngestionEvent({
      orgId: job.org_id,
      sourceId: source.id,
      mailboxId: job.mailbox_id,
      jobId: job.id,
      eventType: "attachment_stored",
      status: "success",
      detail: {
        message_id: messageId,
        occurrence_id: occurrenceId,
        provider_message_id: payload.providerMessageId ?? null,
        provider_attachment_id: attachment.providerAttachmentId,
        file_name: fileName,
        size_bytes: sizeBytes,
        sha256,
        storage_path: storagePath,
        uploaded_to_storage: Boolean(storagePath),
      },
    });
  }

  const finalAttachmentCount = attachments.length;

  const { error: messageUpdateError } = await supabase
    .from("vault_messages")
    .update({
      has_attachments: finalAttachmentCount > 0,
      attachment_count: finalAttachmentCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("org_id", job.org_id);

  if (messageUpdateError) {
    throw new Error(messageUpdateError.message);
  }

  return {
    insertedCount,
    skippedCount,
    uploadedCount,
  };
}

async function processProcessRawMessageJob(
  job: VaultIngestionJobRow,
  source: VaultSourceRow
): Promise<ProcessedJobResult> {
  const payload = (job.payload ?? {}) as ProcessRawMessagePayload;

  if (source.source_type !== "exo_graph") {
    throw new Error(`Unsupported source_type for process_raw_message: ${source.source_type}`);
  }

  if (!payload.providerMessageId?.trim()) {
    throw new Error("process_raw_message job is missing providerMessageId.");
  }

  if (!payload.mailboxAddress?.trim()) {
    throw new Error("process_raw_message job is missing mailboxAddress.");
  }

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "normalized",
    status: "info",
    detail: {
      provider_message_id: payload.providerMessageId,
      internet_message_id: payload.internetMessageId ?? null,
      subject: payload.subject ?? null,
    },
  });

  const upserted = await upsertVaultMessage({
    job,
    source,
    payload,
  });

  const occurrenceId = await insertOccurrenceIfMissing({
    job,
    source,
    payload,
    messageId: upserted.messageId,
  });

  let attachments: ExoGraphAttachment[] = [];
  if (payload.hasAttachments === true) {
    attachments = await getExoGraphMessageAttachments(
      buildExoConnectionConfig(source),
      payload.mailboxAddress,
      payload.providerMessageId
    );
  }

  const attachmentResults = await insertAttachments({
    job,
    source,
    payload,
    messageId: upserted.messageId,
    occurrenceId,
    attachments,
  });

  await writeIngestionEvent({
    orgId: job.org_id,
    sourceId: source.id,
    mailboxId: job.mailbox_id,
    jobId: job.id,
    eventType: "normalized",
    status: "success",
    detail: {
      message_id: upserted.messageId,
      occurrence_id: occurrenceId,
      provider_message_id: payload.providerMessageId,
      deduped: upserted.deduped,
      inserted_attachment_count: attachmentResults.insertedCount,
      skipped_attachment_count: attachmentResults.skippedCount,
      uploaded_attachment_count: attachmentResults.uploadedCount,
    },
  });

  return {
    jobId: job.id,
    jobType: job.job_type,
    status: "completed",
    detail: {
      messageId: upserted.messageId,
      occurrenceId,
      providerMessageId: payload.providerMessageId,
      internetMessageId: payload.internetMessageId ?? null,
      subject: payload.subject ?? null,
      inserted: !upserted.deduped,
      deduped: upserted.deduped,
      insertedAttachmentCount: attachmentResults.insertedCount,
      skippedAttachmentCount: attachmentResults.skippedCount,
      uploadedAttachmentCount: attachmentResults.uploadedCount,
    },
  };
}

async function processSingleJob(job: VaultIngestionJobRow): Promise<ProcessedJobResult> {
  if (!job.source_id) {
    throw new Error(`Job ${job.id} is missing source_id.`);
  }

  const source = await getSourceOrThrow(job.source_id, job.org_id);

  if (job.job_type === "discover_mailboxes") {
    return processDiscoverMailboxesJob(job, source);
  }

  if (job.job_type === "initial_sync") {
    return processInitialSyncJob(job, source);
  }

  if (job.job_type === "incremental_sync") {
    return processIncrementalSyncJob(job, source);
  }

  if (job.job_type === "process_raw_message") {
    return processProcessRawMessageJob(job, source);
  }

  return {
    jobId: job.id,
    jobType: job.job_type,
    status: "skipped",
    detail: {
      note: `Job type ${job.job_type} is not implemented in this processor yet.`,
    },
  };
}

export async function POST(request: NextRequest) {
  let auth: VaultAccessContextLike | null = null;

  try {
    auth = (await requireVaultAccess(request, {})) as VaultAccessContextLike;
    const orgId = resolveAuthOrgId(auth);

    if (!orgId) {
      return jsonError("Unable to resolve organization context.", 403);
    }

    const body = (await request.json().catch(() => ({}))) as IngestProcessRequest;
    const limit = coerceLimit(body.limit, 10);
    const workerId = normalizeWorkerId(body.workerId);
    const requestedJobIds = normalizeJobIds(body.jobIds);
    const sourceId =
      typeof body.sourceId === "string" && body.sourceId.trim()
        ? body.sourceId.trim()
        : null;

    const supabase = getVaultAdminClient();

    let jobQuery = supabase
      .from("vault_ingestion_jobs")
      .select(`
        id,
        org_id,
        source_id,
        mailbox_id,
        job_type,
        status,
        priority,
        payload,
        attempts,
        max_attempts
      `)
      .eq("org_id", orgId)
      .in("status", ["queued", "retrying"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (sourceId) {
      jobQuery = jobQuery.eq("source_id", sourceId);
    }

    if (requestedJobIds.length > 0) {
      jobQuery = jobQuery.in("id", requestedJobIds);
    }

    const { data: queuedJobs, error: queuedJobsError } = await jobQuery;

    if (queuedJobsError) {
      return jsonError(queuedJobsError.message, 500);
    }

    const candidates = (queuedJobs ?? []) as VaultIngestionJobRow[];
    const results: ProcessedJobResult[] = [];

    for (const candidate of candidates) {
      const claimedJob = await markJobRunning({
        jobId: candidate.id,
        orgId,
        workerId,
      });

      if (!claimedJob) {
        results.push({
          jobId: candidate.id,
          jobType: candidate.job_type,
          status: "skipped",
          detail: {
            note: "Job could not be claimed for processing.",
          },
        });
        continue;
      }

      try {
        const processed = await processSingleJob(claimedJob);

        await markJobCompleted({
          jobId: claimedJob.id,
          orgId,
          checkpointAfter: processed.detail,
        });

        results.push(processed);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown ingestion processing failure.";

        await markJobFailed({
          job: claimedJob,
          errorMessage: message,
        });

        await writeIngestionEvent({
          orgId: claimedJob.org_id,
          sourceId: claimedJob.source_id,
          mailboxId: claimedJob.mailbox_id,
          jobId: claimedJob.id,
          eventType: "sync_failed",
          status: "error",
          detail: {
            error: message,
            job_type: claimedJob.job_type,
          },
        });

        results.push({
          jobId: claimedJob.id,
          jobType: claimedJob.job_type,
          status: "failed",
          detail: {
            error: message,
          },
        });
      }
    }

    await writeUnifiedVaultAccessAuditLog({
      access: auth,
      request,
      action: "vault.ingest.process",
      entityType: "vault_ingestion_job",
      status: "success",
      details: {
        worker_id: workerId,
        requested_limit: limit,
        source_id: sourceId,
        requested_job_ids: requestedJobIds,
        processed_count: results.length,
        completed_count: results.filter((r) => r.status === "completed").length,
        failed_count: results.filter((r) => r.status === "failed").length,
        skipped_count: results.filter((r) => r.status === "skipped").length,
      },
    });

    return jsonOk({
      ok: true,
      workerId,
      processed: results,
      processedCount: results.length,
      completedCount: results.filter((r) => r.status === "completed").length,
      failedCount: results.filter((r) => r.status === "failed").length,
      skippedCount: results.filter((r) => r.status === "skipped").length,
      targetOrgId: orgId,
      accessPath: auth.accessPath ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process ingestion jobs.";

    if (auth) {
      await writeUnifiedVaultAccessAuditLog({
        access: auth,
        request,
        action: "vault.ingest.process",
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