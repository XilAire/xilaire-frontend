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

type GmailAuthMethod =
  | "service_account_domain_wide_delegation"
  | "oauth_refresh_token";

type GmailConnectRequest = {
  name?: string;
  sourceKey?: string;

  workspaceDomain?: string;
  customerId?: string;

  authMethod?: GmailAuthMethod;

  clientEmail?: string;
  privateKey?: string;
  privateKeyEnvVar?: string;
  delegatedAdminEmail?: string;

  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  refreshTokenEnvVar?: string;

  mailboxAddresses?: string[];

  syncMode?: "scheduled" | "continuous";
  discoveryMode?: "all_mailboxes" | "selected_mailboxes";

  labelScope?: {
    includeLabels?: string[];
    excludeLabels?: string[];
    includeSpamTrash?: boolean;
  };

  batchSize?: number;
};

type VaultAccessContextLike = Awaited<ReturnType<typeof requireVaultAccess>> & {
  user: {
    id: string;
  };
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

function validateRequiredString(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeMailboxAddresses(input: unknown): string[] {
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

function normalizeLabelList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
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

function buildSourceKey(payload: GmailConnectRequest) {
  if (payload.sourceKey?.trim()) {
    return payload.sourceKey.trim();
  }

  if (payload.workspaceDomain?.trim()) {
    return `gmail-${payload.workspaceDomain.trim().toLowerCase()}`;
  }

  if (payload.customerId?.trim()) {
    return `gmail-${payload.customerId.trim().toLowerCase()}`;
  }

  return `gmail-${crypto.randomUUID()}`;
}

function buildDisplayName(payload: GmailConnectRequest) {
  if (payload.name?.trim()) {
    return payload.name.trim();
  }

  if (payload.workspaceDomain?.trim()) {
    return `Google Workspace (${payload.workspaceDomain.trim()})`;
  }

  if (payload.customerId?.trim()) {
    return `Google Workspace (${payload.customerId.trim()})`;
  }

  return "Gmail Source";
}

async function findExistingPendingMailboxJob(params: {
  orgId: string;
  sourceId: string;
  mailboxId: string;
  jobType: "initial_sync" | "incremental_sync" | "process_raw_message";
}): Promise<ExistingPendingJobRow | null> {
  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_ingestion_jobs")
    .select(`
      id,
      job_type,
      mailbox_id,
      status,
      priority
    `)
    .eq("org_id", params.orgId)
    .eq("source_id", params.sourceId)
    .eq("mailbox_id", params.mailboxId)
    .eq("job_type", params.jobType)
    .in("status", ["queued", "running", "retrying"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ExistingPendingJobRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function POST(request: NextRequest) {
  let auth: VaultAccessContextLike | null = null;

  try {
    auth = (await requireVaultAccess(request, {})) as VaultAccessContextLike;

    const orgId = resolveAuthOrgId(auth);

    if (!orgId) {
      return jsonError(
        "Unable to resolve organization context for Gmail source connection.",
        403
      );
    }

    const body = (await request.json()) as GmailConnectRequest;

    const authMethod: GmailAuthMethod =
      body.authMethod === "oauth_refresh_token"
        ? "oauth_refresh_token"
        : "service_account_domain_wide_delegation";

    const workspaceDomain = body.workspaceDomain?.trim() || null;
    const customerId = body.customerId?.trim() || null;

    const clientEmail = body.clientEmail?.trim() || null;
    const privateKey = body.privateKey?.trim() || null;
    const privateKeyEnvVar = body.privateKeyEnvVar?.trim() || null;
    const delegatedAdminEmail = body.delegatedAdminEmail?.trim() || null;

    const clientId = body.clientId?.trim() || null;
    const clientSecret = body.clientSecret?.trim() || null;
    const refreshToken = body.refreshToken?.trim() || null;
    const refreshTokenEnvVar = body.refreshTokenEnvVar?.trim() || null;

    if (!workspaceDomain && !customerId) {
      return jsonError(
        "workspaceDomain or customerId is required for the Gmail source.",
        400
      );
    }

    if (authMethod === "service_account_domain_wide_delegation") {
      if (!validateRequiredString(clientEmail)) {
        return jsonError("clientEmail is required for service account auth.", 400);
      }

      if (!privateKey && !privateKeyEnvVar) {
        return jsonError(
          "privateKey or privateKeyEnvVar is required for service account auth.",
          400
        );
      }

      if (!validateRequiredString(delegatedAdminEmail)) {
        return jsonError(
          "delegatedAdminEmail is required for service account domain-wide delegation.",
          400
        );
      }
    }

    if (authMethod === "oauth_refresh_token") {
      if (!validateRequiredString(clientId)) {
        return jsonError("clientId is required for OAuth refresh token auth.", 400);
      }

      if (!clientSecret) {
        return jsonError(
          "clientSecret is required for OAuth refresh token auth.",
          400
        );
      }

      if (!refreshToken && !refreshTokenEnvVar) {
        return jsonError(
          "refreshToken or refreshTokenEnvVar is required for OAuth refresh token auth.",
          400
        );
      }
    }

    const sourceKey = buildSourceKey(body);
    const displayName = buildDisplayName(body);
    const mailboxAddresses = normalizeMailboxAddresses(body.mailboxAddresses);
    const batchSize = coerceBatchSize(body.batchSize, 100);

    const discoveryMode =
      body.discoveryMode === "selected_mailboxes"
        ? "selected_mailboxes"
        : "all_mailboxes";

    const syncMode =
      body.syncMode === "continuous" ? "continuous" : "scheduled";

    const labelScope = {
      includeLabels: normalizeLabelList(body.labelScope?.includeLabels),
      excludeLabels: normalizeLabelList(body.labelScope?.excludeLabels),
      includeSpamTrash: body.labelScope?.includeSpamTrash === true,
    };

    const connectionConfig: Record<string, unknown> = {
      workspaceDomain,
      customerId,
      authMethod,
      connector: "gmail_api",
      provider: "google_workspace",
      mailboxDiscoveryEnabled: true,
    };

    if (authMethod === "service_account_domain_wide_delegation") {
      connectionConfig.clientEmail = clientEmail;
      connectionConfig.delegatedAdminEmail = delegatedAdminEmail;

      if (privateKey) {
        connectionConfig.privateKey = privateKey;
      }

      if (privateKeyEnvVar) {
        connectionConfig.privateKeyEnvVar = privateKeyEnvVar;
      }
    }

    if (authMethod === "oauth_refresh_token") {
      connectionConfig.clientId = clientId;
      connectionConfig.clientSecret = clientSecret;

      if (refreshToken) {
        connectionConfig.refreshToken = refreshToken;
      }

      if (refreshTokenEnvVar) {
        connectionConfig.refreshTokenEnvVar = refreshTokenEnvVar;
      }
    }

    const scopeConfig: Record<string, unknown> = {
      discoveryMode,
      selectedMailboxes: mailboxAddresses,
      labelScope,
      batchSize,
    };

    const supabase = getVaultAdminClient();

    const { data: existingSource, error: existingSourceError } = await supabase
      .from("vault_sources")
      .select(`
        id,
        org_id,
        source_key,
        source_type,
        provider,
        display_name,
        name,
        status,
        auth_method,
        config,
        connection_config,
        sync_mode,
        scope_config,
        health_status,
        created_at,
        updated_at
      `)
      .eq("org_id", orgId)
      .eq("source_key", sourceKey)
      .maybeSingle<VaultSourceRow>();

    if (existingSourceError) {
      return jsonError(existingSourceError.message, 500);
    }

    let source: VaultSourceRow | null = null;

    if (existingSource?.id) {
      const { data: updatedSource, error: updateSourceError } = await supabase
        .from("vault_sources")
        .update({
          display_name: displayName,
          name: displayName,
          source_type: "gmail_api",
          provider: "google_workspace",
          status: "active",
          auth_method: authMethod,
          sync_mode: syncMode,
          health_status: "unknown",
          config: connectionConfig,
          connection_config: connectionConfig,
          scope_config: scopeConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSource.id)
        .eq("org_id", orgId)
        .select(`
          id,
          org_id,
          source_key,
          source_type,
          provider,
          display_name,
          name,
          status,
          auth_method,
          config,
          connection_config,
          sync_mode,
          scope_config,
          health_status,
          created_at,
          updated_at
        `)
        .single<VaultSourceRow>();

      if (updateSourceError || !updatedSource) {
        return jsonError(
          updateSourceError?.message || "Unable to update Gmail source.",
          500
        );
      }

      source = updatedSource;
    } else {
      const { data: insertedSource, error: insertSourceError } = await supabase
        .from("vault_sources")
        .insert({
          org_id: orgId,
          source_key: sourceKey,
          source_type: "gmail_api",
          provider: "google_workspace",
          display_name: displayName,
          name: displayName,
          status: "active",
          auth_method: authMethod,
          sync_mode: syncMode,
          health_status: "unknown",
          created_by: auth.user.id,
          config: connectionConfig,
          connection_config: connectionConfig,
          scope_config: scopeConfig,
        })
        .select(`
          id,
          org_id,
          source_key,
          source_type,
          provider,
          display_name,
          name,
          status,
          auth_method,
          config,
          connection_config,
          sync_mode,
          scope_config,
          health_status,
          created_at,
          updated_at
        `)
        .single<VaultSourceRow>();

      if (insertSourceError || !insertedSource) {
        return jsonError(
          insertSourceError?.message || "Unable to create Gmail source.",
          500
        );
      }

      source = insertedSource;
    }

    const jobsToCreate: Array<Record<string, unknown>> = [
      {
        org_id: orgId,
        source_id: source.id,
        mailbox_id: null,
        job_type: "discover_mailboxes",
        status: "queued",
        priority: 10,
        payload: {
          sourceType: "gmail_api",
          provider: "google_workspace",
          workspaceDomain,
          customerId,
          authMethod,
          discoveryMode,
          selectedMailboxes: mailboxAddresses,
          batchSize,
          labelScope,
        },
      },
    ];

    let createdMailboxRows: VaultSourceMailboxRow[] = [];
    let skippedInitialSyncMailboxCount = 0;

    if (discoveryMode === "selected_mailboxes" && mailboxAddresses.length > 0) {
      const mailboxUpserts = mailboxAddresses.map((address) => ({
        org_id: orgId,
        source_id: source.id,
        external_mailbox_id: address,
        mailbox_address: address,
        display_name: address,
        mailbox_type: "gmail",
        ingestion_status: "pending",
        folder_scope: labelScope,
      }));

      const { data: upsertedMailboxes, error: mailboxUpsertError } =
        await supabase
          .from("vault_source_mailboxes")
          .upsert(mailboxUpserts, {
            onConflict: "source_id,external_mailbox_id",
            ignoreDuplicates: false,
          })
          .select(`
            id,
            source_id,
            mailbox_address,
            external_mailbox_id
          `);

      if (mailboxUpsertError) {
        return jsonError(mailboxUpsertError.message, 500);
      }

      createdMailboxRows = (upsertedMailboxes ?? []) as VaultSourceMailboxRow[];

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
            sourceType: "gmail_api",
            provider: "google_workspace",
            workspaceDomain,
            customerId,
            authMethod,
            mailboxAddress: mailbox.mailbox_address,
            externalMailboxId: mailbox.external_mailbox_id,
            batchSize,
            labelScope,
          },
        });
      }
    }

    const { data: createdJobs, error: jobInsertError } = await supabase
      .from("vault_ingestion_jobs")
      .insert(jobsToCreate)
      .select(`
        id,
        job_type,
        mailbox_id,
        status,
        priority
      `);

    if (jobInsertError) {
      return jsonError(jobInsertError.message, 500);
    }

    await writeUnifiedVaultAccessAuditLog({
      access: auth,
      request,
      action: "vault.source.gmail.connect",
      entityType: "vault_source",
      entityId: source.id,
      status: "success",
      details: {
        source_key: source.source_key,
        source_type: source.source_type,
        provider: source.provider,
        workspace_domain: workspaceDomain,
        customer_id: customerId,
        auth_method: authMethod,
        sync_mode: syncMode,
        discovery_mode: discoveryMode,
        selected_mailbox_count: mailboxAddresses.length,
        queued_job_count: createdJobs?.length ?? 0,
        initial_sync_seeded:
          discoveryMode === "selected_mailboxes" &&
          createdMailboxRows.length > 0,
        skipped_duplicate_initial_sync_mailboxes:
          skippedInitialSyncMailboxCount,
        incremental_sync_seeded_at_connect: false,
      },
    });

    return jsonOk({
      ok: true,
      item: source,
      queuedJobs: (createdJobs ?? []) as QueuedJobRow[],
      selectedMailboxes: createdMailboxRows,
      skippedDuplicateInitialSyncMailboxes: skippedInitialSyncMailboxCount,
      targetOrgId: orgId,
      accessPath: auth.accessPath ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to connect Gmail source.";

    if (auth) {
      await writeUnifiedVaultAccessAuditLog({
        access: auth,
        request,
        action: "vault.source.gmail.connect",
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