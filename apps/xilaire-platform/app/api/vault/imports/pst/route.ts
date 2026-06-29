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

type PstImportRequest = {
  name?: string;
  sourceKey?: string;

  mailboxAddress?: string;
  displayName?: string;

  fileName?: string;
  fileSizeBytes?: number;
  storageBucket?: string;
  storagePath?: string;
  contentType?: string;
  sha256?: string;

  originalPath?: string;
  uploadedBy?: string;

  importMode?: "full_import" | "metadata_only" | "dedupe_only";
  syncMode?: "manual" | "scheduled";

  folderScope?: {
    includeFolders?: string[];
    excludeFolders?: string[];
    includeDeletedItems?: boolean;
    includeRecoverableItems?: boolean;
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

type VaultSourceMailboxRow = {
  id: string;
  source_id: string;
  mailbox_address: string | null;
  external_mailbox_id: string;
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

function normalizeFolderList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function coercePositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  const normalized = Math.floor(value);

  if (normalized < 0) return null;

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

function validateRequiredString(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function buildSourceKey(payload: PstImportRequest) {
  if (payload.sourceKey?.trim()) {
    return payload.sourceKey.trim();
  }

  if (payload.mailboxAddress?.trim() && payload.fileName?.trim()) {
    return `pst-${payload.mailboxAddress
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${payload.fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;
  }

  if (payload.fileName?.trim()) {
    return `pst-${payload.fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;
  }

  return `pst-${crypto.randomUUID()}`;
}

function buildDisplayName(payload: PstImportRequest) {
  if (payload.name?.trim()) {
    return payload.name.trim();
  }

  if (payload.mailboxAddress?.trim() && payload.fileName?.trim()) {
    return `PST Import - ${payload.mailboxAddress.trim()} - ${payload.fileName.trim()}`;
  }

  if (payload.fileName?.trim()) {
    return `PST Import - ${payload.fileName.trim()}`;
  }

  return "PST Import Source";
}

async function findExistingPendingMailboxJob(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
  jobType: "pst_parse" | "pst_import" | "initial_sync";
}) {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .select("id, job_type, mailbox_id, status, priority")
    .eq("org_id", params.orgId)
    .eq("source_id", params.sourceId)
    .eq("mailbox_id", params.mailboxId)
    .eq("job_type", params.jobType)
    .in("status", ["queued", "running", "retrying"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as
    | {
        id: string;
        job_type: string;
        mailbox_id: string | null;
        status: string;
        priority: number;
      }
    | null;
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
        "Unable to resolve organization context for PST import.",
        403
      );
    }

    const body = (await request.json()) as PstImportRequest;

    const mailboxAddress = normalizeString(body.mailboxAddress)?.toLowerCase();
    const displayName = normalizeString(body.displayName) ?? mailboxAddress;
    const fileName = normalizeString(body.fileName);
    const storageBucket = normalizeString(body.storageBucket);
    const storagePath = normalizeString(body.storagePath);
    const contentType =
      normalizeString(body.contentType) ?? "application/vnd.ms-outlook";
    const sha256 = normalizeString(body.sha256);
    const originalPath = normalizeString(body.originalPath);
    const uploadedBy =
      normalizeString(body.uploadedBy) ??
      normalizeString(auth.user?.email) ??
      auth.user?.id ??
      null;

    const fileSizeBytes = coercePositiveNumber(body.fileSizeBytes);

    const importMode =
      body.importMode === "metadata_only"
        ? "metadata_only"
        : body.importMode === "dedupe_only"
          ? "dedupe_only"
          : "full_import";

    const syncMode = body.syncMode === "scheduled" ? "scheduled" : "manual";

    const batchSize = coerceBatchSize(body.batchSize, 100);

    const folderScope = {
      includeFolders: normalizeFolderList(body.folderScope?.includeFolders),
      excludeFolders: normalizeFolderList(body.folderScope?.excludeFolders),
      includeDeletedItems: body.folderScope?.includeDeletedItems !== false,
      includeRecoverableItems:
        body.folderScope?.includeRecoverableItems === true,
    };

    const retentionScope = {
      applyDefaultRetention:
        body.retentionScope?.applyDefaultRetention === true,
      defaultRetentionDays: coerceRetentionDays(
        body.retentionScope?.defaultRetentionDays
      ),
      legalHoldByDefault: body.retentionScope?.legalHoldByDefault === true,
    };

    if (!validateRequiredString(mailboxAddress)) {
      return jsonError("mailboxAddress is required for PST import.", 400);
    }

    if (!validateRequiredString(fileName)) {
      return jsonError("fileName is required for PST import.", 400);
    }

    if (!validateRequiredString(storageBucket)) {
      return jsonError("storageBucket is required for PST import.", 400);
    }

    if (!validateRequiredString(storagePath)) {
      return jsonError("storagePath is required for PST import.", 400);
    }

    const sourceKey = buildSourceKey(body);
    const sourceDisplayName = buildDisplayName(body);

    const connectionConfig: Record<string, unknown> = {
      connector: "pst_import",
      provider: "manual_upload",
      sourceType: "pst_import",
      mailboxAddress,
      fileName,
      fileSizeBytes,
      storageBucket,
      storagePath,
      contentType,
      sha256,
      originalPath,
      uploadedBy,
      importMode,
      mailboxDiscoveryEnabled: false,
      manualUploadEnabled: true,
    };

    const scopeConfig: Record<string, unknown> = {
      importMode,
      folderScope,
      retentionScope,
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
          display_name: sourceDisplayName,
          name: sourceDisplayName,
          source_type: "pst_import",
          provider: "manual_upload",
          status: "active",
          auth_method: "manual_upload",
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
          updateSourceError?.message || "Unable to update PST import source.",
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
          source_type: "pst_import",
          provider: "manual_upload",
          display_name: sourceDisplayName,
          name: sourceDisplayName,
          status: "active",
          auth_method: "manual_upload",
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
          insertSourceError?.message || "Unable to create PST import source.",
          500
        );
      }

      source = insertedSource as unknown as VaultSourceRow;
    }

    const { data: upsertedMailbox, error: mailboxUpsertError } = await supabase
      .from("vault_source_mailboxes")
      .upsert(
        {
          org_id: orgId,
          source_id: source.id,
          external_mailbox_id: mailboxAddress,
          mailbox_address: mailboxAddress,
          display_name: displayName,
          mailbox_type: "pst_import",
          ingestion_status: "pending",
          folder_scope: folderScope,
        },
        {
          onConflict: "source_id,external_mailbox_id",
          ignoreDuplicates: false,
        }
      )
      .select("id, source_id, mailbox_address, external_mailbox_id")
      .single();

    if (mailboxUpsertError || !upsertedMailbox) {
      return jsonError(
        mailboxUpsertError?.message || "Unable to create PST mailbox target.",
        500
      );
    }

    const mailbox = upsertedMailbox as unknown as VaultSourceMailboxRow;

    const existingParseJob = await findExistingPendingMailboxJob({
      orgId,
      sourceId: source.id,
      mailboxId: mailbox.id,
      jobType: "pst_parse",
    });

    const existingImportJob = await findExistingPendingMailboxJob({
      orgId,
      sourceId: source.id,
      mailboxId: mailbox.id,
      jobType: "pst_import",
    });

    const jobsToCreate: Array<Record<string, unknown>> = [];

    if (!existingParseJob) {
      jobsToCreate.push({
        org_id: orgId,
        source_id: source.id,
        mailbox_id: mailbox.id,
        job_type: "pst_parse",
        status: "queued",
        priority: 10,
        payload: {
          sourceType: "pst_import",
          provider: "manual_upload",
          mailboxAddress,
          externalMailboxId: mailbox.external_mailbox_id,
          fileName,
          fileSizeBytes,
          storageBucket,
          storagePath,
          contentType,
          sha256,
          originalPath,
          uploadedBy,
          importMode,
          folderScope,
          retentionScope,
          batchSize,
        },
      });
    }

    if (!existingImportJob) {
      jobsToCreate.push({
        org_id: orgId,
        source_id: source.id,
        mailbox_id: mailbox.id,
        job_type: "pst_import",
        status: "queued",
        priority: 20,
        payload: {
          sourceType: "pst_import",
          provider: "manual_upload",
          mailboxAddress,
          externalMailboxId: mailbox.external_mailbox_id,
          fileName,
          fileSizeBytes,
          storageBucket,
          storagePath,
          contentType,
          sha256,
          originalPath,
          uploadedBy,
          importMode,
          folderScope,
          retentionScope,
          batchSize,
        },
      });
    }

    let createdJobs: QueuedJobRow[] = [];

    if (jobsToCreate.length > 0) {
      const { data: insertedJobs, error: jobInsertError } = await supabase
        .from("vault_ingestion_jobs")
        .insert(jobsToCreate)
        .select("id, job_type, mailbox_id, status, priority");

      if (jobInsertError) {
        return jsonError(jobInsertError.message, 500);
      }

      createdJobs = (insertedJobs ?? []) as unknown as QueuedJobRow[];
    }

    await writeUnifiedVaultAccessAuditLog({
      access: auth,
      request,
      action: "vault.import.pst.create",
      entityType: "vault_source",
      entityId: source.id,
      status: "success",
      details: {
        source_key: source.source_key,
        source_type: source.source_type,
        provider: source.provider,
        mailbox_address: mailboxAddress,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        content_type: contentType,
        sha256,
        import_mode: importMode,
        sync_mode: syncMode,
        queued_job_count: createdJobs.length,
        skipped_existing_parse_job: Boolean(existingParseJob),
        skipped_existing_import_job: Boolean(existingImportJob),
      },
    });

    return jsonOk({
      ok: true,
      item: source,
      mailbox,
      queuedJobs: createdJobs,
      skippedExistingParseJob: Boolean(existingParseJob),
      skippedExistingImportJob: Boolean(existingImportJob),
      targetOrgId: orgId,
      accessPath: auth.accessPath ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create PST import.";

    if (auth) {
      await writeUnifiedVaultAccessAuditLog({
        access: auth,
        request,
        action: "vault.import.pst.create",
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