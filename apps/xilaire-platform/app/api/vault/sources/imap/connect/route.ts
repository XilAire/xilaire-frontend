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

type ImapConnectRequest = {
  name?: string;
  sourceKey?: string;

  providerLabel?: string;

  host?: string;
  port?: number;
  secure?: boolean;

  username?: string;
  password?: string;
  passwordEnvVar?: string;

  mailboxAddresses?: string[];

  syncMode?: "scheduled" | "continuous";
  discoveryMode?: "selected_mailboxes" | "single_mailbox";

  folderScope?: {
    includeFolders?: string[];
    excludeFolders?: string[];
    includeSpamTrash?: boolean;
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

type ExistingPendingJobRow = {
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

function validateRequiredString(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeMailboxAddresses(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) =>
          typeof value === "string" ? value.trim().toLowerCase() : "",
        )
        .filter(Boolean),
    ),
  );
}

function normalizeFolderList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function coercePort(value: unknown, secure: boolean) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return secure ? 993 : 143;
  }

  const normalized = Math.floor(value);

  if (normalized < 1 || normalized > 65535) {
    return secure ? 993 : 143;
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

function buildSourceKey(payload: ImapConnectRequest) {
  if (payload.sourceKey?.trim()) {
    return payload.sourceKey.trim();
  }

  const username = payload.username?.trim().toLowerCase();
  const host = payload.host?.trim().toLowerCase();

  if (username && host) {
    return `imap-${username.replace(/[^a-z0-9]+/g, "-")}-${host.replace(
      /[^a-z0-9]+/g,
      "-",
    )}`;
  }

  if (host) {
    return `imap-${host.replace(/[^a-z0-9]+/g, "-")}`;
  }

  return `imap-${crypto.randomUUID()}`;
}

function buildDisplayName(payload: ImapConnectRequest) {
  if (payload.name?.trim()) {
    return payload.name.trim();
  }

  if (payload.providerLabel?.trim() && payload.username?.trim()) {
    return `${payload.providerLabel.trim()} (${payload.username.trim()})`;
  }

  if (payload.host?.trim() && payload.username?.trim()) {
    return `IMAP (${payload.username.trim()} @ ${payload.host.trim()})`;
  }

  if (payload.host?.trim()) {
    return `IMAP (${payload.host.trim()})`;
  }

  return "IMAP Source";
}

async function findExistingPendingMailboxJob(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
  jobType: "initial_sync" | "incremental_sync" | "process_raw_message";
}): Promise<ExistingPendingJobRow | null> {
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

  return data as unknown as ExistingPendingJobRow | null;
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
        "Unable to resolve organization context for IMAP source connection.",
        403,
      );
    }

    const body = (await request.json()) as ImapConnectRequest;

    const host = normalizeString(body.host);
    const username = normalizeString(body.username);
    const password = normalizeString(body.password);
    const passwordEnvVar = normalizeString(body.passwordEnvVar);
    const providerLabel = normalizeString(body.providerLabel) ?? "IMAP";

    const secure = body.secure !== false;
    const port = coercePort(body.port, secure);
    const batchSize = coerceBatchSize(body.batchSize, 100);

    const discoveryMode =
      body.discoveryMode === "single_mailbox"
        ? "single_mailbox"
        : "selected_mailboxes";

    const syncMode =
      body.syncMode === "continuous" ? "continuous" : "scheduled";

    const mailboxAddresses = normalizeMailboxAddresses(body.mailboxAddresses);

    const folderScope = {
      includeFolders: normalizeFolderList(body.folderScope?.includeFolders),
      excludeFolders: normalizeFolderList(body.folderScope?.excludeFolders),
      includeSpamTrash: body.folderScope?.includeSpamTrash === true,
    };

    if (!validateRequiredString(host)) {
      return jsonError("host is required for an IMAP source.", 400);
    }

    if (!validateRequiredString(username)) {
      return jsonError("username is required for an IMAP source.", 400);
    }

    if (!password && !passwordEnvVar) {
      return jsonError(
        "password or passwordEnvVar is required for an IMAP source.",
        400,
      );
    }

    if (discoveryMode === "selected_mailboxes" && mailboxAddresses.length < 1) {
      return jsonError(
        "At least one mailbox address is required for selected mailbox IMAP discovery.",
        400,
      );
    }

    const sourceKey = buildSourceKey(body);
    const displayName = buildDisplayName(body);

    const connectionConfig: Record<string, unknown> = {
      connector: "imap",
      providerLabel,
      host,
      port,
      secure,
      username,
      authMethod: "password",
    };

    if (password) {
      connectionConfig.password = password;
    }

    if (passwordEnvVar) {
      connectionConfig.passwordEnvVar = passwordEnvVar;
    }

    const scopeConfig: Record<string, unknown> = {
      discoveryMode,
      selectedMailboxes:
        discoveryMode === "single_mailbox"
          ? [username.toLowerCase()]
          : mailboxAddresses,
      folderScope,
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
        ].join(", "),
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
      source_type: "imap",
      provider: "api",
      status: "active",
      auth_method: "password",
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
          ].join(", "),
        )
        .single();

      if (updateSourceError || !updatedSource) {
        return jsonError(
          updateSourceError?.message || "Unable to update IMAP source.",
          500,
        );
      }

      source = updatedSource as unknown as VaultSourceRow;
    } else {
      const { data: insertedSource, error: insertSourceError } = await supabase
        .from("vault_sources")
        .insert({
          org_id: orgId,
          source_key: sourceKey,
          source_type: "imap",
          provider: "api",
          display_name: displayName,
          name: displayName,
          status: "active",
          auth_method: "password",
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
          ].join(", "),
        )
        .single();

      if (insertSourceError || !insertedSource) {
        return jsonError(
          insertSourceError?.message || "Unable to create IMAP source.",
          500,
        );
      }

      source = insertedSource as unknown as VaultSourceRow;
    }

    const selectedMailboxes =
      discoveryMode === "single_mailbox"
        ? [username.toLowerCase()]
        : mailboxAddresses;

    const jobsToCreate: Array<Record<string, unknown>> = [
      {
        org_id: orgId,
        source_id: source.id,
        mailbox_id: null,
        job_type: "discover_mailboxes",
        status: "queued",
        priority: 10,
        payload: {
          sourceType: "imap",
          provider: "api",
          providerLabel,
          host,
          port,
          secure,
          username,
          discoveryMode,
          selectedMailboxes,
          batchSize,
          folderScope,
        },
      },
    ];

    const mailboxUpserts = selectedMailboxes.map((address) => ({
      org_id: orgId,
      source_id: source.id,
      external_mailbox_id: address,
      mailbox_address: address,
      display_name: address,
      mailbox_type: "imap",
      ingestion_status: "pending",
      folder_scope: folderScope,
    }));

    let createdMailboxRows: VaultSourceMailboxRow[] = [];
    let skippedInitialSyncMailboxCount = 0;

    if (mailboxUpserts.length) {
      const { data: upsertedMailboxes, error: mailboxUpsertError } =
        await supabase
          .from("vault_source_mailboxes")
          .upsert(mailboxUpserts, {
            onConflict: "source_id,external_mailbox_id",
            ignoreDuplicates: false,
          })
          .select("id, source_id, mailbox_address, external_mailbox_id");

      if (mailboxUpsertError) {
        return jsonError(mailboxUpsertError.message, 500);
      }

      createdMailboxRows =
        (upsertedMailboxes as unknown as VaultSourceMailboxRow[]) ?? [];

      for (const mailbox of createdMailboxRows) {
        const existingInitialSync = await findExistingPendingMailboxJob({
          orgId,
          sourceId: source.id,
          mailboxId: mailbox.id,
          jobType: "initial_sync",
        });

        if (existingInitialSync) {
          skippedInitialSyncMailboxCount += 1;
          continue;
        }

        jobsToCreate.push({
          org_id: orgId,
          source_id: source.id,
          mailbox_id: mailbox.id,
          job_type: "initial_sync",
          status: "queued",
          priority: 20,
          payload: {
            sourceType: "imap",
            provider: "api",
            providerLabel,
            host,
            port,
            secure,
            username,
            mailboxAddress: mailbox.mailbox_address,
            externalMailboxId: mailbox.external_mailbox_id,
            batchSize,
            folderScope,
          },
        });
      }
    }

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
      action: "vault.source.imap.connect",
      entityType: "vault_source",
      entityId: source.id,
      status: "success",
      details: {
        source_key: source.source_key,
        source_type: source.source_type,
        provider: source.provider,
        provider_label: providerLabel,
        host,
        port,
        secure,
        username,
        sync_mode: syncMode,
        discovery_mode: discoveryMode,
        selected_mailbox_count: selectedMailboxes.length,
        queued_job_count: createdJobs?.length ?? 0,
        skipped_duplicate_initial_sync_mailboxes:
          skippedInitialSyncMailboxCount,
      },
    });

    return jsonOk({
      ok: true,
      item: source,
      queuedJobs: (createdJobs ?? []) as unknown as QueuedJobRow[],
      selectedMailboxes: createdMailboxRows,
      skippedDuplicateInitialSyncMailboxes: skippedInitialSyncMailboxCount,
      targetOrgId: orgId,
      accessPath: auth.accessPath ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to connect IMAP source.";

    if (auth) {
      await writeUnifiedVaultAccessAuditLog({
        access: auth,
        request,
        action: "vault.source.imap.connect",
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