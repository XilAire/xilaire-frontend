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

type GraphConnectRequest = {
  name?: string;
  sourceKey?: string;

  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  clientSecretEnvVar?: string;

  authMethod?: "oauth_client_credentials" | "delegated_admin";

  discoveryMode?: "selected_mailboxes" | "selected_workloads" | "all_tenant";
  syncMode?: "scheduled" | "continuous";

  selectedMailboxes?: string[];
  mailboxAddresses?: string[];

  workloads?: string[];

  scopeConfig?: {
    workloads?: string[];
    selectedMailboxes?: string[];
    includeTeams?: boolean;
    includeSharePoint?: boolean;
    includeOneDrive?: boolean;
    includeUsersGroups?: boolean;
    includeAuditLogs?: boolean;
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

function normalizeStringArray(input: unknown): string[] {
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

function normalizeMailboxAddresses(input: unknown): string[] {
  return normalizeStringArray(input);
}

function normalizeWorkloads(input: unknown): string[] {
  const values = normalizeStringArray(input);

  const allowed = new Set([
    "exchange",
    "mail",
    "mailboxes",
    "teams",
    "sharepoint",
    "onedrive",
    "users",
    "groups",
    "users_groups",
    "audit",
    "audit_logs",
  ]);

  return Array.from(
    new Set(
      values
        .map((value) => {
          if (value === "mail" || value === "mailboxes") return "exchange";
          if (value === "users" || value === "groups") return "users_groups";
          if (value === "audit") return "audit_logs";
          return value;
        })
        .filter((value) => allowed.has(value)),
    ),
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

function buildSourceKey(payload: GraphConnectRequest) {
  if (payload.sourceKey?.trim()) {
    return payload.sourceKey.trim();
  }

  if (payload.tenantId?.trim()) {
    return `graph-${payload.tenantId.trim().toLowerCase()}`;
  }

  return `graph-${crypto.randomUUID()}`;
}

function buildDisplayName(payload: GraphConnectRequest) {
  if (payload.name?.trim()) {
    return payload.name.trim();
  }

  if (payload.tenantId?.trim()) {
    return `Microsoft Graph (${payload.tenantId.trim()})`;
  }

  return "Microsoft Graph Source";
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
        "Unable to resolve organization context for Microsoft Graph source connection.",
        403,
      );
    }

    const body = (await request.json()) as GraphConnectRequest;

    const tenantId = normalizeString(body.tenantId);
    const clientId = normalizeString(body.clientId);
    const clientSecret = normalizeString(body.clientSecret);
    const clientSecretEnvVar = normalizeString(body.clientSecretEnvVar);

    const authMethod =
      body.authMethod === "delegated_admin"
        ? "delegated_admin"
        : "oauth_client_credentials";

    const discoveryMode =
      body.discoveryMode === "all_tenant"
        ? "all_tenant"
        : body.discoveryMode === "selected_workloads"
          ? "selected_workloads"
          : "selected_mailboxes";

    const syncMode =
      body.syncMode === "continuous" ? "continuous" : "scheduled";

    const selectedMailboxes = Array.from(
      new Set([
        ...normalizeMailboxAddresses(body.selectedMailboxes),
        ...normalizeMailboxAddresses(body.mailboxAddresses),
        ...normalizeMailboxAddresses(body.scopeConfig?.selectedMailboxes),
      ]),
    );

    const requestedWorkloads = normalizeWorkloads([
      ...normalizeWorkloads(body.workloads),
      ...normalizeWorkloads(body.scopeConfig?.workloads),
      "exchange",
      ...(body.scopeConfig?.includeTeams ? ["teams"] : []),
      ...(body.scopeConfig?.includeSharePoint ? ["sharepoint"] : []),
      ...(body.scopeConfig?.includeOneDrive ? ["onedrive"] : []),
      ...(body.scopeConfig?.includeUsersGroups ? ["users_groups"] : []),
      ...(body.scopeConfig?.includeAuditLogs ? ["audit_logs"] : []),
    ]);

    const workloads = requestedWorkloads.length
      ? requestedWorkloads
      : ["exchange"];

    const batchSize = coerceBatchSize(body.batchSize, 100);

    if (!validateRequiredString(tenantId)) {
      return jsonError("tenantId is required for Microsoft Graph source.", 400);
    }

    if (!validateRequiredString(clientId)) {
      return jsonError("clientId is required for Microsoft Graph source.", 400);
    }

    if (!clientSecret && !clientSecretEnvVar) {
      return jsonError(
        "clientSecret or clientSecretEnvVar is required for Microsoft Graph source.",
        400,
      );
    }

    if (discoveryMode === "selected_mailboxes" && selectedMailboxes.length < 1) {
      return jsonError(
        "At least one mailbox address is required for selected mailbox Graph discovery.",
        400,
      );
    }

    if (discoveryMode === "selected_workloads" && workloads.length < 1) {
      return jsonError(
        "At least one workload is required for selected workload Graph discovery.",
        400,
      );
    }

    const sourceKey = buildSourceKey(body);
    const displayName = buildDisplayName(body);

    const connectionConfig: Record<string, unknown> = {
      tenantId,
      clientId,
      authMethod,
      connector: "microsoft_graph",
      provider: "microsoft_365",
      mailboxDiscoveryEnabled: true,
      workloadDiscoveryEnabled: true,
    };

    if (clientSecret) {
      connectionConfig.clientSecret = clientSecret;
    }

    if (clientSecretEnvVar) {
      connectionConfig.clientSecretEnvVar = clientSecretEnvVar;
    }

    const scopeConfig: Record<string, unknown> = {
      discoveryMode,
      selectedMailboxes,
      workloads,
      includeTeams: workloads.includes("teams"),
      includeSharePoint: workloads.includes("sharepoint"),
      includeOneDrive: workloads.includes("onedrive"),
      includeUsersGroups: workloads.includes("users_groups"),
      includeAuditLogs: workloads.includes("audit_logs"),
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
          source_type: "graph_api",
          provider: "microsoft_365",
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
          ].join(", "),
        )
        .single();

      if (updateSourceError || !updatedSource) {
        return jsonError(
          updateSourceError?.message ||
            "Unable to update Microsoft Graph source.",
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
          source_type: "graph_api",
          provider: "microsoft_365",
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
          ].join(", "),
        )
        .single();

      if (insertSourceError || !insertedSource) {
        return jsonError(
          insertSourceError?.message ||
            "Unable to create Microsoft Graph source.",
          500,
        );
      }

      source = insertedSource as unknown as VaultSourceRow;
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
          sourceType: "graph_api",
          provider: "microsoft_365",
          tenantId,
          clientId,
          authMethod,
          discoveryMode,
          selectedMailboxes,
          workloads,
          batchSize,
        },
      },
      {
        org_id: orgId,
        source_id: source.id,
        mailbox_id: null,
        job_type: "discover_workloads",
        status: "queued",
        priority: 15,
        payload: {
          sourceType: "graph_api",
          provider: "microsoft_365",
          tenantId,
          clientId,
          authMethod,
          discoveryMode,
          workloads,
          batchSize,
        },
      },
    ];

    let createdMailboxRows: VaultSourceMailboxRow[] = [];
    let skippedInitialSyncMailboxCount = 0;

    if (selectedMailboxes.length > 0) {
      const mailboxUpserts = selectedMailboxes.map((address) => ({
        org_id: orgId,
        source_id: source.id,
        external_mailbox_id: address,
        mailbox_address: address,
        display_name: address,
        mailbox_type: "user",
        ingestion_status: "pending",
        folder_scope: {
          sourceType: "graph_api",
          provider: "microsoft_365",
          workloads,
        },
      }));

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
            sourceType: "graph_api",
            provider: "microsoft_365",
            tenantId,
            clientId,
            authMethod,
            mailboxAddress: mailbox.mailbox_address,
            externalMailboxId: mailbox.external_mailbox_id,
            workloads,
            batchSize,
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
      action: "vault.source.graph.connect",
      entityType: "vault_source",
      entityId: source.id,
      status: "success",
      details: {
        source_key: source.source_key,
        source_type: source.source_type,
        provider: source.provider,
        tenant_id: tenantId,
        client_id: clientId,
        auth_method: authMethod,
        sync_mode: syncMode,
        discovery_mode: discoveryMode,
        workloads,
        selected_mailbox_count: selectedMailboxes.length,
        queued_job_count: createdJobs?.length ?? 0,
        initial_sync_seeded: createdMailboxRows.length > 0,
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
      error instanceof Error
        ? error.message
        : "Unable to connect Microsoft Graph source.";

    if (auth) {
      await writeUnifiedVaultAccessAuditLog({
        access: auth,
        request,
        action: "vault.source.graph.connect",
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