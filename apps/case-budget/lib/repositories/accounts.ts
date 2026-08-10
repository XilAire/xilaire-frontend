import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  PlaidAccountStoreScope,
  PlaidAccountSyncStore,
  PlaidCreateAccountInput,
  PlaidDeactivateAccountInput,
  PlaidStoredAccount,
  PlaidStoredAccountType,
  PlaidUpdateAccountInput,
} from "@/lib/services/plaid/account-sync";

export type AccountRepositoryErrorCode =
  | "configuration-error"
  | "invalid-input"
  | "not-found"
  | "ownership-mismatch"
  | "duplicate-account"
  | "database-error"
  | "unknown";

export class AccountRepositoryError extends Error {
  readonly code:
    AccountRepositoryErrorCode;

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
    message:
      string;

    code:
      AccountRepositoryErrorCode;

    operation:
      string;

    causeCode?:
      string;

    cause?:
      unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "AccountRepositoryError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode;
  }
}

type AccountProvider =
  | "manual"
  | "plaid"
  | "snaptrade";

type AccountConnectionStatus =
  | "manual"
  | "connected"
  | "syncing"
  | "error"
  | "disconnected"
  | "reauthentication-required";

type AccountRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  connection_id:
    string | null;

  provider:
    AccountProvider;

  provider_account_id:
    string | null;

  provider_institution_id:
    string | null;

  institution_name:
    string | null;

  name:
    string;

  official_name:
    string | null;

  mask:
    string | null;

  type:
    PlaidStoredAccountType;

  provider_type:
    string | null;

  provider_subtype:
    string | null;

  balance:
    number | string;

  available_balance:
    number | string | null;

  credit_limit:
    number | string | null;

  currency:
    string;

  is_debt:
    boolean;

  is_active:
    boolean;

  connection_status:
    AccountConnectionStatus;

  last_synced_at:
    string | null;

  deactivated_at:
    string | null;

  metadata:
    Record<
      string,
      string | number | boolean | null
    >;

  created_at:
    string;

  updated_at:
    string;
};

type AccountInsertRow = Omit<
  AccountRow,
  | "id"
  | "created_at"
  | "updated_at"
>;

type AccountUpdateRow = Partial<
  Omit<
    AccountRow,
    | "id"
    | "workspace_id"
    | "user_id"
    | "provider"
    | "provider_account_id"
    | "created_at"
  >
>;

const ACCOUNTS_TABLE =
  "accounts";

const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME =
  "SUPABASE_SERVICE_ROLE_KEY_CASE_BUDGET";

let cachedSupabaseAdminClient:
  SupabaseClient | null = null;

/**
 * Server-only account repository implementing PlaidAccountSyncStore.
 *
 * Imported provider accounts are always scoped by:
 *
 * - workspace_id
 * - user_id
 * - connection_id
 * - provider
 * - provider_account_id
 *
 * Manual accounts are never modified by this repository.
 */
export const plaidAccountSyncStore:
  PlaidAccountSyncStore = {
    listByConnection:
      listPlaidAccountsByConnection,

    create:
      createPlaidAccount,

    update:
      updatePlaidAccount,

    deactivate:
      deactivatePlaidAccount,
  };

/**
 * Returns active and inactive Plaid-backed accounts for one owned connection.
 *
 * Returning inactive accounts allows a later provider response to reactivate
 * them without creating duplicates.
 */
export async function listPlaidAccountsByConnection(
  scope:
    PlaidAccountStoreScope,
): Promise<PlaidStoredAccount[]> {
  const operation =
    "listPlaidAccountsByConnection";

  const normalizedScope =
    normalizeScope(
      scope,
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
          ACCOUNTS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          normalizedScope.workspaceId,
        )
        .eq(
          "user_id",
          normalizedScope.userId,
        )
        .eq(
          "connection_id",
          normalizedScope.connectionId,
        )
        .eq(
          "provider",
          "plaid",
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        )
        .returns<
          AccountRow[]
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
      mapAccountRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to load Plaid-backed accounts.",
    );
  }
}

/**
 * Creates one Plaid-backed account.
 *
 * This method never creates or alters manual accounts.
 */
export async function createPlaidAccount(
  input:
    PlaidCreateAccountInput,
): Promise<PlaidStoredAccount> {
  const operation =
    "createPlaidAccount";

  const normalizedInput =
    normalizeCreateInput(
      input,
      operation,
    );

  const insertRow:
    AccountInsertRow = {
      workspace_id:
        normalizedInput.workspaceId,

      user_id:
        normalizedInput.userId,

      connection_id:
        normalizedInput.connectionId,

      provider:
        "plaid",

      provider_account_id:
        normalizedInput.providerAccountId,

      provider_institution_id:
        normalizedInput.providerInstitutionId ??
        null,

      institution_name:
        normalizedInput.institutionName ??
        null,

      name:
        normalizedInput.name,

      official_name:
        normalizedInput.officialName ??
        null,

      mask:
        normalizedInput.mask ??
        null,

      type:
        normalizedInput.type,

      provider_type:
        normalizedInput.providerType,

      provider_subtype:
        normalizedInput.providerSubtype ??
        null,

      balance:
        normalizedInput.balance,

      available_balance:
        normalizedInput.availableBalance ??
        null,

      credit_limit:
        normalizedInput.limit ??
        null,

      currency:
        normalizedInput.currency,

      is_debt:
        normalizedInput.isDebt,

      is_active:
        true,

      connection_status:
        "connected",

      last_synced_at:
        normalizedInput.lastSyncedAt,

      deactivated_at:
        null,

      metadata:
        normalizedInput.metadata,
    };

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          ACCOUNTS_TABLE,
        )
        .insert(
          insertRow,
        )
        .select(
          "*",
        )
        .single<AccountRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
        duplicateMessage:
          "This Plaid account already exists in CASE Budget.",
      });
    }

    if (
      !data
    ) {
      throw new AccountRepositoryError({
        message:
          "The Plaid account was created but no record was returned.",

        code:
          "database-error",

        operation,
      });
    }

    return mapAccountRow(
      data,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to create the Plaid account.",
    );
  }
}

/**
 * Updates one Plaid-backed account after enforcing provider, user, workspace,
 * and connection ownership.
 */
export async function updatePlaidAccount(
  input:
    PlaidUpdateAccountInput,
): Promise<PlaidStoredAccount> {
  const operation =
    "updatePlaidAccount";

  const normalizedInput =
    normalizeUpdateInput(
      input,
      operation,
    );

  const updateRow:
    AccountUpdateRow = {
      connection_id:
        normalizedInput.connectionId,

      provider_institution_id:
        normalizedInput.providerInstitutionId ??
        null,

      institution_name:
        normalizedInput.institutionName ??
        null,

      name:
        normalizedInput.name,

      official_name:
        normalizedInput.officialName ??
        null,

      mask:
        normalizedInput.mask ??
        null,

      type:
        normalizedInput.type,

      provider_type:
        normalizedInput.providerType,

      provider_subtype:
        normalizedInput.providerSubtype ??
        null,

      balance:
        normalizedInput.balance,

      available_balance:
        normalizedInput.availableBalance ??
        null,

      credit_limit:
        normalizedInput.limit ??
        null,

      currency:
        normalizedInput.currency,

      is_debt:
        normalizedInput.isDebt,

      is_active:
        true,

      connection_status:
        "connected",

      last_synced_at:
        normalizedInput.lastSyncedAt,

      deactivated_at:
        null,

      metadata:
        normalizedInput.metadata,
    };

  try {
    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          ACCOUNTS_TABLE,
        )
        .update(
          updateRow,
        )
        .eq(
          "id",
          normalizedInput.accountId,
        )
        .eq(
          "workspace_id",
          normalizedInput.workspaceId,
        )
        .eq(
          "user_id",
          normalizedInput.userId,
        )
        .eq(
          "connection_id",
          normalizedInput.connectionId,
        )
        .eq(
          "provider",
          "plaid",
        )
        .select(
          "*",
        )
        .maybeSingle<AccountRow>();

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
      throw new AccountRepositoryError({
        message:
          "The Plaid account could not be found or is not owned by this user and workspace.",

        code:
          "not-found",

        operation,
      });
    }

    return mapAccountRow(
      data,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to update the Plaid account.",
    );
  }
}

/**
 * Marks one Plaid-backed account inactive while preserving all historical data.
 */
export async function deactivatePlaidAccount(
  input:
    PlaidDeactivateAccountInput,
): Promise<PlaidStoredAccount> {
  const operation =
    "deactivatePlaidAccount";

  const normalizedInput =
    normalizeDeactivateInput(
      input,
      operation,
    );

  const updateRow:
    AccountUpdateRow = {
      is_active:
        false,

      connection_status:
        "disconnected",

      deactivated_at:
        normalizedInput.deactivatedAt,

      last_synced_at:
        normalizedInput.deactivatedAt,

      metadata: {
        deactivationReason:
          normalizedInput.reason,

        deactivatedAt:
          normalizedInput.deactivatedAt,
      },
    };

  try {
    const existingAccount =
      await getPlaidAccountById({
        accountId:
          normalizedInput.accountId,

        workspaceId:
          normalizedInput.workspaceId,

        userId:
          normalizedInput.userId,

        connectionId:
          normalizedInput.connectionId,
      });

    if (
      !existingAccount
    ) {
      throw new AccountRepositoryError({
        message:
          "The Plaid account could not be found or is not owned by this user and workspace.",

        code:
          "not-found",

        operation,
      });
    }

    const mergedMetadata = {
      ...existingAccount.metadata,

      ...updateRow.metadata,
    };

    const supabase =
      getSupabaseAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          ACCOUNTS_TABLE,
        )
        .update({
          ...updateRow,

          metadata:
            mergedMetadata,
        })
        .eq(
          "id",
          normalizedInput.accountId,
        )
        .eq(
          "workspace_id",
          normalizedInput.workspaceId,
        )
        .eq(
          "user_id",
          normalizedInput.userId,
        )
        .eq(
          "connection_id",
          normalizedInput.connectionId,
        )
        .eq(
          "provider",
          "plaid",
        )
        .select(
          "*",
        )
        .maybeSingle<AccountRow>();

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
      throw new AccountRepositoryError({
        message:
          "The Plaid account could not be deactivated.",

        code:
          "not-found",

        operation,
      });
    }

    return mapAccountRow(
      data,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to deactivate the Plaid account.",
    );
  }
}

/**
 * Returns one Plaid-backed account after ownership enforcement.
 */
export async function getPlaidAccountById({
  accountId,
  workspaceId,
  userId,
  connectionId,
}: {
  accountId:
    string;

  workspaceId:
    string;

  userId:
    string;

  connectionId:
    string;
}): Promise<PlaidStoredAccount | null> {
  const operation =
    "getPlaidAccountById";

  const normalizedAccountId =
    requireNonEmptyString(
      accountId,
      "accountId",
      operation,
    );

  const normalizedScope =
    normalizeScope(
      {
        workspaceId,
        userId,
        connectionId,
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
          ACCOUNTS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "id",
          normalizedAccountId,
        )
        .eq(
          "workspace_id",
          normalizedScope.workspaceId,
        )
        .eq(
          "user_id",
          normalizedScope.userId,
        )
        .eq(
          "connection_id",
          normalizedScope.connectionId,
        )
        .eq(
          "provider",
          "plaid",
        )
        .maybeSingle<AccountRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    return data
      ? mapAccountRow(
          data,
        )
      : null;
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid account.",
    );
  }
}

/**
 * Returns one Plaid-backed account by provider account ID.
 */
export async function getPlaidAccountByProviderAccountId({
  providerAccountId,
  scope,
}: {
  providerAccountId:
    string;

  scope:
    PlaidAccountStoreScope;
}): Promise<PlaidStoredAccount | null> {
  const operation =
    "getPlaidAccountByProviderAccountId";

  const normalizedProviderAccountId =
    requireNonEmptyString(
      providerAccountId,
      "providerAccountId",
      operation,
    );

  const normalizedScope =
    normalizeScope(
      scope,
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
          ACCOUNTS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          normalizedScope.workspaceId,
        )
        .eq(
          "user_id",
          normalizedScope.userId,
        )
        .eq(
          "connection_id",
          normalizedScope.connectionId,
        )
        .eq(
          "provider",
          "plaid",
        )
        .eq(
          "provider_account_id",
          normalizedProviderAccountId,
        )
        .maybeSingle<AccountRow>();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    return data
      ? mapAccountRow(
          data,
        )
      : null;
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid account.",
    );
  }
}

/**
 * Marks all Plaid accounts under one connection with a connection-level status.
 *
 * Manual accounts are excluded by provider filtering.
 */
export async function updatePlaidAccountsConnectionStatus({
  scope,
  status,
}: {
  scope:
    PlaidAccountStoreScope;

  status:
    AccountConnectionStatus;
}) {
  const operation =
    "updatePlaidAccountsConnectionStatus";

  const normalizedScope =
    normalizeScope(
      scope,
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
          ACCOUNTS_TABLE,
        )
        .update({
          connection_status:
            status,
        })
        .eq(
          "workspace_id",
          normalizedScope.workspaceId,
        )
        .eq(
          "user_id",
          normalizedScope.userId,
        )
        .eq(
          "connection_id",
          normalizedScope.connectionId,
        )
        .eq(
          "provider",
          "plaid",
        )
        .select(
          "*",
        )
        .returns<
          AccountRow[]
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
      mapAccountRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to update Plaid account connection statuses.",
    );
  }
}

function normalizeCreateInput(
  input:
    PlaidCreateAccountInput,
  operation:
    string,
) {
  const scope =
    normalizeScope(
      {
        workspaceId:
          input.workspaceId,

        userId:
          input.userId,

        connectionId:
          input.connectionId,
      },
      operation,
    );

  return {
    ...scope,

    providerAccountId:
      requireNonEmptyString(
        input.providerAccountId,
        "providerAccountId",
        operation,
      ),

    providerInstitutionId:
      normalizeOptionalText(
        input.providerInstitutionId,
      ),

    institutionName:
      normalizeOptionalText(
        input.institutionName,
      ),

    name:
      requireNonEmptyString(
        input.name,
        "name",
        operation,
      ),

    officialName:
      normalizeOptionalText(
        input.officialName,
      ),

    mask:
      normalizeOptionalText(
        input.mask,
      ),

    type:
      input.type,

    providerType:
      requireNonEmptyString(
        input.providerType,
        "providerType",
        operation,
      ),

    providerSubtype:
      normalizeOptionalText(
        input.providerSubtype,
      ),

    balance:
      requireFiniteNumber(
        input.balance,
        "balance",
        operation,
      ),

    availableBalance:
      normalizeOptionalFiniteNumber(
        input.availableBalance,
        "availableBalance",
        operation,
      ),

    limit:
      normalizeOptionalFiniteNumber(
        input.limit,
        "limit",
        operation,
      ),

    currency:
      normalizeCurrency(
        input.currency,
        operation,
      ),

    isDebt:
      Boolean(
        input.isDebt,
      ),

    lastSyncedAt:
      normalizeRequiredIsoDate(
        input.lastSyncedAt,
        "lastSyncedAt",
        operation,
      ),

    metadata:
      normalizeMetadata(
        input.metadata,
      ),
  };
}

function normalizeUpdateInput(
  input:
    PlaidUpdateAccountInput,
  operation:
    string,
) {
  const createShape =
    normalizeCreateInput(
      {
        workspaceId:
          input.workspaceId,

        userId:
          input.userId,

        connectionId:
          input.connectionId,

        provider:
          "plaid",

        providerAccountId:
          "placeholder",

        providerInstitutionId:
          input.providerInstitutionId,

        institutionName:
          input.institutionName,

        name:
          input.name,

        officialName:
          input.officialName,

        mask:
          input.mask,

        type:
          input.type,

        providerType:
          input.providerType,

        providerSubtype:
          input.providerSubtype,

        balance:
          input.balance,

        availableBalance:
          input.availableBalance,

        limit:
          input.limit,

        currency:
          input.currency,

        isDebt:
          input.isDebt,

        isActive:
          true,

        lastSyncedAt:
          input.lastSyncedAt,

        metadata:
          input.metadata,
      },
      operation,
    );

  const {
    providerAccountId:
      _providerAccountId,
    ...normalized
  } =
    createShape;

  return {
    ...normalized,

    accountId:
      requireNonEmptyString(
        input.accountId,
        "accountId",
        operation,
      ),
  };
}

function normalizeDeactivateInput(
  input:
    PlaidDeactivateAccountInput,
  operation:
    string,
) {
  const scope =
    normalizeScope(
      {
        workspaceId:
          input.workspaceId,

        userId:
          input.userId,

        connectionId:
          input.connectionId,
      },
      operation,
    );

  return {
    ...scope,

    accountId:
      requireNonEmptyString(
        input.accountId,
        "accountId",
        operation,
      ),

    deactivatedAt:
      normalizeRequiredIsoDate(
        input.deactivatedAt,
        "deactivatedAt",
        operation,
      ),

    reason:
      input.reason,
  };
}

function normalizeScope(
  scope:
    PlaidAccountStoreScope,
  operation:
    string,
): PlaidAccountStoreScope {
  return {
    workspaceId:
      requireNonEmptyString(
        scope.workspaceId,
        "workspaceId",
        operation,
      ),

    userId:
      requireNonEmptyString(
        scope.userId,
        "userId",
        operation,
      ),

    connectionId:
      requireNonEmptyString(
        scope.connectionId,
        "connectionId",
        operation,
      ),
  };
}

function mapAccountRow(
  row:
    AccountRow,
): PlaidStoredAccount {
  return {
    id:
      row.id,

    workspaceId:
      row.workspace_id,

    userId:
      row.user_id,

    connectionId:
      requireRowValue(
        row.connection_id,
        "connection_id",
      ),

    provider:
      "plaid",

    providerAccountId:
      requireRowValue(
        row.provider_account_id,
        "provider_account_id",
      ),

    providerInstitutionId:
      row.provider_institution_id ??
      undefined,

    institutionName:
      row.institution_name ??
      undefined,

    name:
      row.name,

    officialName:
      row.official_name ??
      undefined,

    mask:
      row.mask ??
      undefined,

    type:
      row.type,

    providerType:
      row.provider_type ??
      row.type,

    providerSubtype:
      row.provider_subtype ??
      undefined,

    balance:
      parseDatabaseNumber(
        row.balance,
        "balance",
      ),

    availableBalance:
      parseOptionalDatabaseNumber(
        row.available_balance,
        "available_balance",
      ),

    limit:
      parseOptionalDatabaseNumber(
        row.credit_limit,
        "credit_limit",
      ),

    currency:
      row.currency,

    isDebt:
      row.is_debt,

    isActive:
      row.is_active,

    lastSyncedAt:
      row.last_synced_at ??
      row.updated_at,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,

    metadata:
      row.metadata ??
      {},
  };
}

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
              "case-budget-accounts-repository",
          },
        },
      },
    );

  return cachedSupabaseAdminClient;
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

  throw new AccountRepositoryError({
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

  throw new AccountRepositoryError({
    message:
      `${fieldName} is required.`,

    code:
      "invalid-input",

    operation,
  });
}

function requireFiniteNumber(
  value:
    number,
  fieldName:
    string,
  operation:
    string,
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  throw new AccountRepositoryError({
    message:
      `${fieldName} must be a finite number.`,

    code:
      "invalid-input",

    operation,
  });
}

function normalizeOptionalFiniteNumber(
  value:
    number | undefined,
  fieldName:
    string,
  operation:
    string,
) {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  return requireFiniteNumber(
    value,
    fieldName,
    operation,
  );
}

function normalizeCurrency(
  value:
    string,
  operation:
    string,
) {
  const normalizedValue =
    requireNonEmptyString(
      value,
      "currency",
      operation,
    ).toUpperCase();

  if (
    normalizedValue.length >
    12
  ) {
    throw new AccountRepositoryError({
      message:
        "currency must be 12 characters or fewer.",

      code:
        "invalid-input",

      operation,
    });
  }

  return normalizedValue;
}

function normalizeRequiredIsoDate(
  value:
    string,
  fieldName:
    string,
  operation:
    string,
) {
  const normalizedValue =
    requireNonEmptyString(
      value,
      fieldName,
      operation,
    );

  const date =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new AccountRepositoryError({
      message:
        `${fieldName} must be a valid date.`,

      code:
        "invalid-input",

      operation,
    });
  }

  return date.toISOString();
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

function normalizeMetadata(
  metadata:
    Record<
      string,
      string | number | boolean | null
    >,
) {
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

function parseDatabaseNumber(
  value:
    number | string,
  fieldName:
    string,
) {
  const parsedValue =
    typeof value ===
      "number"
      ? value
      : Number(
          value,
        );

  if (
    Number.isFinite(
      parsedValue,
    )
  ) {
    return parsedValue;
  }

  throw new AccountRepositoryError({
    message:
      `Stored ${fieldName} is not a valid number.`,

    code:
      "database-error",

    operation:
      "mapAccountRow",
  });
}

function parseOptionalDatabaseNumber(
  value:
    number | string | null,
  fieldName:
    string,
) {
  if (
    value ===
    null
  ) {
    return undefined;
  }

  return parseDatabaseNumber(
    value,
    fieldName,
  );
}

function requireRowValue(
  value:
    string | null,
  fieldName:
    string,
) {
  if (
    value
  ) {
    return value;
  }

  throw new AccountRepositoryError({
    message:
      `Stored Plaid account is missing ${fieldName}.`,

    code:
      "database-error",

    operation:
      "mapAccountRow",
  });
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
  if (
    error.code ===
    "23505"
  ) {
    return new AccountRepositoryError({
      message:
        duplicateMessage ??
        "A duplicate provider account already exists.",

      code:
        "duplicate-account",

      operation,

      causeCode:
        error.code,

      cause:
        error,
    });
  }

  return new AccountRepositoryError({
    message:
      error.message ||
      "The database operation failed.",

    code:
      "database-error",

    operation,

    causeCode:
      error.code,

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
    AccountRepositoryError
  ) {
    return error;
  }

  return new AccountRepositoryError({
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
 * Clears the cached Supabase service-role client.
 *
 * Intended only for automated tests that replace process.env values.
 */
export function resetAccountsRepositoryForTesting() {
  if (
    process.env.NODE_ENV !==
    "test"
  ) {
    throw new Error(
      "resetAccountsRepositoryForTesting can only be used when NODE_ENV is test.",
    );
  }

  cachedSupabaseAdminClient =
    null;
}
