import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  CreateFinancialConnectionData,
  FinancialConnectionCategory,
  FinancialConnectionData,
  FinancialConnectionErrorCode,
  FinancialConnectionHealth,
  FinancialConnectionStatus,
  FinancialDataProvider,
  FinancialSyncStatus,
  FinancialSyncTrigger,
  UpdateFinancialConnectionData,
} from "@/types/financial-connection";

export type FinancialConnectionOwner = {
  userId: string;
  workspaceId: string;
};

export type FinancialConnectionLookup = {
  connectionId: string;
  owner: FinancialConnectionOwner;
};

export type FinancialConnectionProviderLookup = {
  provider: Exclude<
    FinancialDataProvider,
    "manual"
  >;

  providerConnectionId: string;

  owner?: FinancialConnectionOwner;
};

export type FinancialConnectionListFilters = {
  provider?: FinancialDataProvider;
  category?: FinancialConnectionCategory;
  status?: FinancialConnectionStatus;
  includeDisconnected?: boolean;
};

export type CreateFinancialConnectionRepositoryInput =
  CreateFinancialConnectionData & {
    providerConnectionId?: string;
    providerInstitutionId?: string;
  };

export type MarkFinancialConnectionSyncStartedInput = {
  connectionId: string;
  owner: FinancialConnectionOwner;
  trigger: FinancialSyncTrigger;
};

export type MarkFinancialConnectionSyncCompletedInput = {
  connectionId: string;
  owner: FinancialConnectionOwner;

  status?:
    | "completed"
    | "completed-with-warnings";

  completedAt?: string;
};

export type MarkFinancialConnectionSyncFailedInput = {
  connectionId: string;
  owner: FinancialConnectionOwner;

  errorCode: FinancialConnectionErrorCode;
  errorMessage: string;

  requiresReauthentication?: boolean;
};

export type MarkFinancialConnectionReauthenticationInput = {
  connectionId: string;
  owner: FinancialConnectionOwner;

  errorCode?: FinancialConnectionErrorCode;
  errorMessage?: string;
};

export type DisconnectFinancialConnectionInput = {
  connectionId: string;
  owner: FinancialConnectionOwner;

  disconnectedAt?: string;
};

export type FinancialConnectionRepositoryErrorCode =
  | "configuration-error"
  | "invalid-input"
  | "not-found"
  | "ownership-mismatch"
  | "duplicate-connection"
  | "database-error"
  | "unknown";

export class FinancialConnectionRepositoryError extends Error {
  readonly code:
    FinancialConnectionRepositoryErrorCode;

  readonly operation:
    string;

  readonly causeCode?:
    string;

  constructor({
    message,
    code,
    operation,
    causeCode,
    cause,
  }: {
    message: string;
    code: FinancialConnectionRepositoryErrorCode;
    operation: string;
    causeCode?: string;
    cause?: unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "FinancialConnectionRepositoryError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode;
  }
}

type FinancialConnectionRow = {
  id: string;

  workspace_id: string;
  user_id: string;

  provider: FinancialDataProvider;
  category: FinancialConnectionCategory;

  provider_user_id: string | null;
  provider_connection_id: string | null;
  provider_institution_id: string | null;

  institution_name: string;
  institution_logo_url: string | null;

  display_name: string;

  status: FinancialConnectionStatus;
  health: FinancialConnectionHealth;

  capabilities: string[];

  last_sync_status: FinancialSyncStatus;
  last_sync_trigger: FinancialSyncTrigger | null;

  last_sync_started_at: string | null;
  last_sync_completed_at: string | null;
  last_successful_sync_at: string | null;

  last_error_code: FinancialConnectionErrorCode | null;
  last_error_message: string | null;

  requires_reauthentication: boolean;

  metadata: Record<
    string,
    string | number | boolean | null
  >;

  disconnected_at: string | null;

  created_at: string;
  updated_at: string;
};

type FinancialConnectionInsertRow = Omit<
  FinancialConnectionRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "disconnected_at"
> & {
  disconnected_at?: string | null;
};

type FinancialConnectionUpdateRow = Partial<
  Omit<
    FinancialConnectionRow,
    | "id"
    | "workspace_id"
    | "user_id"
    | "provider"
    | "category"
    | "created_at"
  >
>;

const FINANCIAL_CONNECTIONS_TABLE =
  "financial_connections";

const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME =
  "SUPABASE_SERVICE_ROLE_KEY_CASE_BUDGET";

let cachedSupabaseAdminClient:
  SupabaseClient | null = null;

/**
 * Creates a financial connection metadata record.
 *
 * Secret provider credentials must never be included in this repository input.
 * Plaid access tokens belong in the server-only plaid_items repository.
 */
export async function createFinancialConnection(
  input:
    CreateFinancialConnectionRepositoryInput,
): Promise<FinancialConnectionData> {
  const operation =
    "createFinancialConnection";

  const normalizedInput =
    normalizeCreateInput(
      input,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    const insertRow:
      FinancialConnectionInsertRow = {
        workspace_id:
          normalizedInput.workspaceId,

        user_id:
          normalizedInput.userId,

        provider:
          normalizedInput.provider,

        category:
          normalizedInput.category,

        provider_user_id:
          normalizedInput.providerUserId ??
          null,

        provider_connection_id:
          normalizedInput.providerConnectionId ??
          null,

        provider_institution_id:
          normalizedInput.providerInstitutionId ??
          null,

        institution_name:
          normalizedInput.institutionName,

        institution_logo_url:
          normalizedInput.institutionLogoUrl ??
          null,

        display_name:
          normalizedInput.displayName,

        status:
          normalizedInput.status,

        health:
          normalizedInput.health,

        capabilities:
          normalizedInput.capabilities,

        last_sync_status:
          "idle",

        last_sync_trigger:
          null,

        last_sync_started_at:
          null,

        last_sync_completed_at:
          null,

        last_successful_sync_at:
          null,

        last_error_code:
          null,

        last_error_message:
          null,

        requires_reauthentication:
          false,

        metadata:
          normalizedInput.metadata,
      };

    const {
      data,
      error,
    } =
      await supabase
        .from(
          FINANCIAL_CONNECTIONS_TABLE,
        )
        .insert(
          insertRow,
        )
        .select(
          "*",
        )
        .single<FinancialConnectionRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
        duplicateMessage:
          "A connection for this provider item already exists.",
      });
    }

    if (
      !data
    ) {
      throw new FinancialConnectionRepositoryError({
        message:
          "The financial connection was created but no record was returned.",

        code:
          "database-error",

        operation,
      });
    }

    return mapFinancialConnectionRow(
      data,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to create the financial connection.",
    );
  }
}

/**
 * Returns one connection only when both user and workspace ownership match.
 */
export async function getFinancialConnectionById({
  connectionId,
  owner,
}: FinancialConnectionLookup): Promise<
  FinancialConnectionData | null
> {
  const operation =
    "getFinancialConnectionById";

  const normalizedConnectionId =
    requireNonEmptyString(
      connectionId,
      "connectionId",
      operation,
    );

  const normalizedOwner =
    normalizeOwner(
      owner,
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          FINANCIAL_CONNECTIONS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "id",
          normalizedConnectionId,
        )
        .eq(
          "workspace_id",
          normalizedOwner.workspaceId,
        )
        .eq(
          "user_id",
          normalizedOwner.userId,
        )
        .maybeSingle<FinancialConnectionRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    return data
      ? mapFinancialConnectionRow(
          data,
        )
      : null;
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the financial connection.",
    );
  }
}

/**
 * Returns a connection by provider connection identifier.
 *
 * When owner is supplied, user and workspace ownership are also enforced.
 */
export async function getFinancialConnectionByProviderConnectionId({
  provider,
  providerConnectionId,
  owner,
}: FinancialConnectionProviderLookup): Promise<
  FinancialConnectionData | null
> {
  const operation =
    "getFinancialConnectionByProviderConnectionId";

  const normalizedProviderConnectionId =
    requireNonEmptyString(
      providerConnectionId,
      "providerConnectionId",
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    let query =
      supabase
        .from(
          FINANCIAL_CONNECTIONS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "provider",
          provider,
        )
        .eq(
          "provider_connection_id",
          normalizedProviderConnectionId,
        );

    if (
      owner
    ) {
      const normalizedOwner =
        normalizeOwner(
          owner,
          operation,
        );

      query =
        query
          .eq(
            "workspace_id",
            normalizedOwner.workspaceId,
          )
          .eq(
            "user_id",
            normalizedOwner.userId,
          );
    }

    const {
      data,
      error,
    } =
      await query.maybeSingle<FinancialConnectionRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    return data
      ? mapFinancialConnectionRow(
          data,
        )
      : null;
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the provider connection.",
    );
  }
}

/**
 * Lists financial connections for one authenticated workspace and user.
 */
export async function listFinancialConnections(
  owner:
    FinancialConnectionOwner,
  filters:
    FinancialConnectionListFilters = {},
): Promise<FinancialConnectionData[]> {
  const operation =
    "listFinancialConnections";

  const normalizedOwner =
    normalizeOwner(
      owner,
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    let query =
      supabase
        .from(
          FINANCIAL_CONNECTIONS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          normalizedOwner.workspaceId,
        )
        .eq(
          "user_id",
          normalizedOwner.userId,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (
      filters.provider
    ) {
      query =
        query.eq(
          "provider",
          filters.provider,
        );
    }

    if (
      filters.category
    ) {
      query =
        query.eq(
          "category",
          filters.category,
        );
    }

    if (
      filters.status
    ) {
      query =
        query.eq(
          "status",
          filters.status,
        );
    } else if (
      !filters.includeDisconnected
    ) {
      query =
        query.neq(
          "status",
          "disconnected",
        );
    }

    const {
      data,
      error,
    } =
      await query.returns<
        FinancialConnectionRow[]
      >();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    return (
      data ??
      []
    ).map(
      mapFinancialConnectionRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to list financial connections.",
    );
  }
}

/**
 * Updates non-secret financial connection metadata after enforcing ownership.
 */
export async function updateFinancialConnection(
  lookup:
    FinancialConnectionLookup,
  updates:
    UpdateFinancialConnectionData,
): Promise<FinancialConnectionData> {
  const operation =
    "updateFinancialConnection";

  const normalizedLookup =
    normalizeLookup(
      lookup,
      operation,
    );

  const updateRow =
    mapUpdateDataToRow(
      updates,
      operation,
    );

  if (
    Object.keys(
      updateRow,
    ).length ===
    0
  ) {
    const existingConnection =
      await getFinancialConnectionById(
        normalizedLookup,
      );

    if (
      !existingConnection
    ) {
      throw new FinancialConnectionRepositoryError({
        message:
          "The financial connection could not be found.",

        code:
          "not-found",

        operation,
      });
    }

    return existingConnection;
  }

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          FINANCIAL_CONNECTIONS_TABLE,
        )
        .update(
          updateRow,
        )
        .eq(
          "id",
          normalizedLookup.connectionId,
        )
        .eq(
          "workspace_id",
          normalizedLookup.owner.workspaceId,
        )
        .eq(
          "user_id",
          normalizedLookup.owner.userId,
        )
        .select(
          "*",
        )
        .maybeSingle<FinancialConnectionRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
        duplicateMessage:
          "A connection for this provider item already exists.",
      });
    }

    if (
      !data
    ) {
      throw new FinancialConnectionRepositoryError({
        message:
          "The financial connection could not be found or is not owned by this user and workspace.",

        code:
          "not-found",

        operation,
      });
    }

    return mapFinancialConnectionRow(
      data,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to update the financial connection.",
    );
  }
}

/**
 * Marks a connection as actively synchronizing.
 */
export async function markFinancialConnectionSyncStarted({
  connectionId,
  owner,
  trigger,
}: MarkFinancialConnectionSyncStartedInput) {
  const startedAt =
    new Date().toISOString();

  return updateFinancialConnection(
    {
      connectionId,
      owner,
    },
    {
      status:
        "syncing",

      health:
        "healthy",

      lastSyncStatus:
        "syncing",

      lastSyncTrigger:
        trigger,

      lastSyncStartedAt:
        startedAt,

      lastSyncCompletedAt:
        undefined,

      lastErrorCode:
        undefined,

      lastErrorMessage:
        undefined,

      requiresReauthentication:
        false,
    },
  );
}

/**
 * Marks a sync as completed and records the latest successful sync time.
 */
export async function markFinancialConnectionSyncCompleted({
  connectionId,
  owner,
  status = "completed",
  completedAt =
    new Date().toISOString(),
}: MarkFinancialConnectionSyncCompletedInput) {
  return updateFinancialConnection(
    {
      connectionId,
      owner,
    },
    {
      status:
        "connected",

      health:
        status ===
        "completed-with-warnings"
          ? "attention-required"
          : "healthy",

      lastSyncStatus:
        status,

      lastSyncCompletedAt:
        completedAt,

      lastSuccessfulSyncAt:
        completedAt,

      lastErrorCode:
        undefined,

      lastErrorMessage:
        undefined,

      requiresReauthentication:
        false,
    },
  );
}

/**
 * Marks a sync failure and optionally transitions the connection into
 * reauthentication-required state.
 */
export async function markFinancialConnectionSyncFailed({
  connectionId,
  owner,
  errorCode,
  errorMessage,
  requiresReauthentication =
    false,
}: MarkFinancialConnectionSyncFailedInput) {
  const completedAt =
    new Date().toISOString();

  return updateFinancialConnection(
    {
      connectionId,
      owner,
    },
    {
      status:
        requiresReauthentication
          ? "reauthentication-required"
          : "error",

      health:
        "attention-required",

      lastSyncStatus:
        "failed",

      lastSyncCompletedAt:
        completedAt,

      lastErrorCode:
        errorCode,

      lastErrorMessage:
        requireNonEmptyString(
          errorMessage,
          "errorMessage",
          "markFinancialConnectionSyncFailed",
        ),

      requiresReauthentication,
    },
  );
}

/**
 * Explicitly marks a connection as requiring user reauthentication.
 */
export async function markFinancialConnectionReauthenticationRequired({
  connectionId,
  owner,
  errorCode =
    "reauthentication-required",
  errorMessage =
    "The financial institution requires the user to reconnect.",
}: MarkFinancialConnectionReauthenticationInput) {
  return updateFinancialConnection(
    {
      connectionId,
      owner,
    },
    {
      status:
        "reauthentication-required",

      health:
        "attention-required",

      lastSyncStatus:
        "failed",

      lastErrorCode:
        errorCode,

      lastErrorMessage:
        errorMessage,

      requiresReauthentication:
        true,
    },
  );
}

/**
 * Clears the reauthentication-required state after a successful update-mode
 * Plaid Link or provider reconnection flow.
 */
export async function markFinancialConnectionReauthenticated(
  lookup:
    FinancialConnectionLookup,
) {
  return updateFinancialConnection(
    lookup,
    {
      status:
        "connected",

      health:
        "healthy",

      lastSyncStatus:
        "idle",

      lastErrorCode:
        undefined,

      lastErrorMessage:
        undefined,

      requiresReauthentication:
        false,

      disconnectedAt:
        undefined,
    },
  );
}

/**
 * Marks a connection disconnected without deleting historical metadata.
 */
export async function disconnectFinancialConnection({
  connectionId,
  owner,
  disconnectedAt =
    new Date().toISOString(),
}: DisconnectFinancialConnectionInput) {
  return updateFinancialConnection(
    {
      connectionId,
      owner,
    },
    {
      status:
        "disconnected",

      health:
        "unavailable",

      lastSyncStatus:
        "idle",

      requiresReauthentication:
        false,

      disconnectedAt,
    },
  );
}

/**
 * Permanently deletes one connection after enforcing user and workspace
 * ownership. Prefer disconnectFinancialConnection for normal user actions.
 */
export async function deleteFinancialConnection({
  connectionId,
  owner,
}: FinancialConnectionLookup) {
  const operation =
    "deleteFinancialConnection";

  const normalizedLookup =
    normalizeLookup(
      {
        connectionId,
        owner,
      },
      operation,
    );

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          FINANCIAL_CONNECTIONS_TABLE,
        )
        .delete()
        .eq(
          "id",
          normalizedLookup.connectionId,
        )
        .eq(
          "workspace_id",
          normalizedLookup.owner.workspaceId,
        )
        .eq(
          "user_id",
          normalizedLookup.owner.userId,
        )
        .select(
          "id",
        )
        .maybeSingle<{
          id: string;
        }>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    if (
      !data
    ) {
      throw new FinancialConnectionRepositoryError({
        message:
          "The financial connection could not be found or is not owned by this user and workspace.",

        code:
          "not-found",

        operation,
      });
    }

    return {
      deleted:
        true as const,

      connectionId:
        data.id,
    };
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to delete the financial connection.",
    );
  }
}

/**
 * Returns the trusted Supabase service-role client.
 *
 * Never import this repository into Client Components.
 */
function getSupabaseAdminClient() {
  if (
    cachedSupabaseAdminClient
  ) {
    return cachedSupabaseAdminClient;
  }

  const supabaseUrl =
    requireEnvironmentVariable(
      SUPABASE_URL_ENV_NAME,
    );

  const serviceRoleKey =
    requireEnvironmentVariable(
      SUPABASE_SERVICE_ROLE_KEY_ENV_NAME,
    );

  cachedSupabaseAdminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken:
            false,

          persistSession:
            false,

          detectSessionInUrl:
            false,
        },

        global: {
          headers: {
            "X-Client-Info":
              "case-budget-financial-connections-repository",
          },
        },
      },
    );

  return cachedSupabaseAdminClient;
}

function normalizeCreateInput(
  input:
    CreateFinancialConnectionRepositoryInput,
) {
  const operation =
    "createFinancialConnection";

  const workspaceId =
    requireNonEmptyString(
      input.workspaceId,
      "workspaceId",
      operation,
    );

  const userId =
    requireNonEmptyString(
      input.userId,
      "userId",
      operation,
    );

  const institutionName =
    requireNonEmptyString(
      input.institutionName,
      "institutionName",
      operation,
    );

  const displayName =
    normalizeOptionalText(
      input.displayName,
    ) ??
    institutionName;

  return {
    workspaceId,
    userId,

    provider:
      input.provider,

    category:
      input.category,

    providerUserId:
      normalizeOptionalText(
        input.providerUserId,
      ),

    providerConnectionId:
      normalizeOptionalText(
        input.providerConnectionId,
      ),

    providerInstitutionId:
      normalizeOptionalText(
        input.providerInstitutionId,
      ),

    institutionName,

    institutionLogoUrl:
      normalizeOptionalText(
        input.institutionLogoUrl,
      ),

    displayName,

    status:
      input.status ??
      "pending",

    health:
      input.health ??
      "unknown",

    capabilities:
      deduplicateStrings(
        input.capabilities ??
        [],
      ),

    metadata:
      normalizeMetadata(
        input.metadata,
      ),
  };
}

function mapUpdateDataToRow(
  updates:
    UpdateFinancialConnectionData,
  operation:
    string,
): FinancialConnectionUpdateRow {
  const row:
    FinancialConnectionUpdateRow = {};

  if (
    updates.providerUserId !==
    undefined
  ) {
    row.provider_user_id =
      normalizeOptionalText(
        updates.providerUserId,
      ) ??
      null;
  }

  if (
    updates.providerConnectionId !==
    undefined
  ) {
    row.provider_connection_id =
      normalizeOptionalText(
        updates.providerConnectionId,
      ) ??
      null;
  }

  if (
    updates.providerInstitutionId !==
    undefined
  ) {
    row.provider_institution_id =
      normalizeOptionalText(
        updates.providerInstitutionId,
      ) ??
      null;
  }

  if (
    updates.institutionName !==
    undefined
  ) {
    row.institution_name =
      requireNonEmptyString(
        updates.institutionName,
        "institutionName",
        operation,
      );
  }

  if (
    updates.institutionLogoUrl !==
    undefined
  ) {
    row.institution_logo_url =
      normalizeOptionalText(
        updates.institutionLogoUrl,
      ) ??
      null;
  }

  if (
    updates.displayName !==
    undefined
  ) {
    row.display_name =
      requireNonEmptyString(
        updates.displayName,
        "displayName",
        operation,
      );
  }

  if (
    updates.status !==
    undefined
  ) {
    row.status =
      updates.status;
  }

  if (
    updates.health !==
    undefined
  ) {
    row.health =
      updates.health;
  }

  if (
    updates.capabilities !==
    undefined
  ) {
    row.capabilities =
      deduplicateStrings(
        updates.capabilities,
      );
  }

  if (
    updates.lastSyncStatus !==
    undefined
  ) {
    row.last_sync_status =
      updates.lastSyncStatus;
  }

  if (
    updates.lastSyncTrigger !==
    undefined
  ) {
    row.last_sync_trigger =
      updates.lastSyncTrigger ??
      null;
  }

  if (
    updates.lastSyncStartedAt !==
    undefined
  ) {
    row.last_sync_started_at =
      normalizeOptionalIsoDate(
        updates.lastSyncStartedAt,
        "lastSyncStartedAt",
        operation,
      );
  }

  if (
    updates.lastSyncCompletedAt !==
    undefined
  ) {
    row.last_sync_completed_at =
      normalizeOptionalIsoDate(
        updates.lastSyncCompletedAt,
        "lastSyncCompletedAt",
        operation,
      );
  }

  if (
    updates.lastSuccessfulSyncAt !==
    undefined
  ) {
    row.last_successful_sync_at =
      normalizeOptionalIsoDate(
        updates.lastSuccessfulSyncAt,
        "lastSuccessfulSyncAt",
        operation,
      );
  }

  if (
    updates.lastErrorCode !==
    undefined
  ) {
    row.last_error_code =
      updates.lastErrorCode ??
      null;
  }

  if (
    updates.lastErrorMessage !==
    undefined
  ) {
    row.last_error_message =
      normalizeOptionalText(
        updates.lastErrorMessage,
      ) ??
      null;
  }

  if (
    updates.requiresReauthentication !==
    undefined
  ) {
    row.requires_reauthentication =
      updates.requiresReauthentication;
  }

  if (
    updates.metadata !==
    undefined
  ) {
    row.metadata =
      normalizeMetadata(
        updates.metadata,
      );
  }

  if (
    updates.disconnectedAt !==
    undefined
  ) {
    row.disconnected_at =
      normalizeOptionalIsoDate(
        updates.disconnectedAt,
        "disconnectedAt",
        operation,
      );
  }

  return row;
}

function mapFinancialConnectionRow(
  row:
    FinancialConnectionRow,
): FinancialConnectionData {
  return {
    id:
      row.id,

    workspaceId:
      row.workspace_id,

    userId:
      row.user_id,

    provider:
      row.provider,

    category:
      row.category,

    providerUserId:
      row.provider_user_id ??
      undefined,

    providerConnectionId:
      row.provider_connection_id ??
      undefined,

    providerInstitutionId:
      row.provider_institution_id ??
      undefined,

    institutionName:
      row.institution_name,

    institutionLogoUrl:
      row.institution_logo_url ??
      undefined,

    displayName:
      row.display_name,

    status:
      row.status,

    health:
      row.health,

    capabilities:
      row.capabilities as FinancialConnectionData["capabilities"],

    lastSyncStatus:
      row.last_sync_status,

    lastSyncTrigger:
      row.last_sync_trigger ??
      undefined,

    lastSyncStartedAt:
      row.last_sync_started_at ??
      undefined,

    lastSyncCompletedAt:
      row.last_sync_completed_at ??
      undefined,

    lastSuccessfulSyncAt:
      row.last_successful_sync_at ??
      undefined,

    lastErrorCode:
      row.last_error_code ??
      undefined,

    lastErrorMessage:
      row.last_error_message ??
      undefined,

    requiresReauthentication:
      row.requires_reauthentication,

    metadata:
      row.metadata,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,

    disconnectedAt:
      row.disconnected_at ??
      undefined,
  };
}

function normalizeLookup(
  lookup:
    FinancialConnectionLookup,
  operation:
    string,
): FinancialConnectionLookup {
  return {
    connectionId:
      requireNonEmptyString(
        lookup.connectionId,
        "connectionId",
        operation,
      ),

    owner:
      normalizeOwner(
        lookup.owner,
        operation,
      ),
  };
}

function normalizeOwner(
  owner:
    FinancialConnectionOwner,
  operation:
    string,
): FinancialConnectionOwner {
  return {
    userId:
      requireNonEmptyString(
        owner.userId,
        "userId",
        operation,
      ),

    workspaceId:
      requireNonEmptyString(
        owner.workspaceId,
        "workspaceId",
        operation,
      ),
  };
}

function normalizeMetadata(
  metadata:
    Record<
      string,
      string | number | boolean | null
    > | undefined,
) {
  if (
    !metadata
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(
      metadata,
    ).filter(
      ([
        key,
        value,
      ]) =>
        Boolean(
          key.trim(),
        ) &&
        (
          value ===
            null ||
          typeof value ===
            "string" ||
          typeof value ===
            "number" ||
          typeof value ===
            "boolean"
        ),
    ),
  );
}

function normalizeOptionalIsoDate(
  value:
    string | undefined,
  fieldName:
    string,
  operation:
    string,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

  if (
    !normalizedValue
  ) {
    return null;
  }

  const date =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new FinancialConnectionRepositoryError({
      message:
        `${fieldName} must be a valid date.`,

      code:
        "invalid-input",

      operation,
    });
  }

  return date.toISOString();
}

function requireEnvironmentVariable(
  variableName:
    string,
) {
  const value =
    process.env[
      variableName
    ]?.trim();

  if (
    value
  ) {
    return value;
  }

  throw new FinancialConnectionRepositoryError({
    message:
      `Missing required environment variable ${variableName}.`,

    code:
      "configuration-error",

    operation:
      "getSupabaseAdminClient",
  });
}

function requireNonEmptyString(
  value:
    string,
  fieldName:
    string,
  operation:
    string,
) {
  const normalizedValue =
    value?.trim();

  if (
    normalizedValue
  ) {
    return normalizedValue;
  }

  throw new FinancialConnectionRepositoryError({
    message:
      `${fieldName} is required.`,

    code:
      "invalid-input",

    operation,
  });
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function deduplicateStrings(
  values:
    string[],
) {
  return [
    ...new Set(
      values
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ];
}

function mapSupabaseError({
  error,
  operation,
  duplicateMessage,
}: {
  error: {
    code?: string;
    message: string;
    details?: string;
    hint?: string;
  };

  operation:
    string;

  duplicateMessage?:
    string;
}) {
  const errorCode =
    error.code;

  if (
    errorCode ===
    "23505"
  ) {
    return new FinancialConnectionRepositoryError({
      message:
        duplicateMessage ??
        "A duplicate financial connection already exists.",

      code:
        "duplicate-connection",

      operation,

      causeCode:
        errorCode,

      cause:
        error,
    });
  }

  return new FinancialConnectionRepositoryError({
    message:
      error.message ||
      "The database operation failed.",

    code:
      "database-error",

    operation,

    causeCode:
      errorCode,

    cause:
      error,
  });
}

function normalizeRepositoryError(
  error:
    unknown,
  operation:
    string,
  fallbackMessage:
    string,
) {
  if (
    error instanceof
    FinancialConnectionRepositoryError
  ) {
    return error;
  }

  return new FinancialConnectionRepositoryError({
    message:
      fallbackMessage,

    code:
      "unknown",

    operation,

    cause:
      error,
  });
}

/**
 * Clears the cached service-role client.
 *
 * This is intended for automated tests that replace environment variables.
 */
export function resetFinancialConnectionsRepositoryForTesting() {
  if (
    process.env.NODE_ENV !==
    "test"
  ) {
    throw new Error(
      "resetFinancialConnectionsRepositoryForTesting can only be used when NODE_ENV is test.",
    );
  }

  cachedSupabaseAdminClient =
    null;
}
