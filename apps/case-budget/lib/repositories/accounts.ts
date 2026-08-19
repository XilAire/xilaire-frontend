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

type AccountConnectionStatus =
  | "manual"
  | "connected"
  | "syncing"
  | "error"
  | "disconnected"
  | "reauthentication-required";

type CaseBudgetAccountType =
  | "checking"
  | "savings"
  | "credit-card"
  | "cash"
  | "loan"
  | "investment"
  | "other";

type CaseBudgetAccountRow = {
  id:
    string;

  workspace_id:
    string;

  created_by_user_id:
    string;

  updated_by_user_id:
    string;

  name:
    string;

  account_type:
    CaseBudgetAccountType;

  account_subtype:
    string | null;

  institution_name:
    string | null;

  mask:
    string | null;

  source:
    "manual" | "plaid" | "system";

  provider:
    string | null;

  provider_record_id:
    string | null;

  provider_account_id:
    string | null;

  current_balance:
    number | string;

  available_balance:
    number | string | null;

  credit_limit:
    number | string | null;

  currency_code:
    string;

  include_in_net_worth:
    boolean;

  is_active:
    boolean;

  is_archived:
    boolean;

  archived_at:
    string | null;

  archived_by_user_id:
    string | null;

  sort_order:
    number;

  note:
    string | null;

  balance_last_synced_at:
    string | null;

  provider_last_synced_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type PlaidItemAccountRow = {
  id:
    string;

  plaid_item_id:
    string;

  connection_id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  provider_account_id:
    string;

  account_name:
    string | null;

  account_mask:
    string | null;

  account_type:
    string | null;

  account_subtype:
    string | null;

  is_selected:
    boolean;

  is_active:
    boolean;

  created_at:
    string;

  updated_at:
    string;
};

type FinancialConnectionRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  provider:
    string;

  provider_institution_id:
    string | null;

  institution_name:
    string;

  status:
    string;
};

type CaseBudgetAccountInsertRow = Omit<
  CaseBudgetAccountRow,
  | "id"
  | "created_at"
  | "updated_at"
>;

type CaseBudgetAccountUpdateRow = Partial<
  Omit<
    CaseBudgetAccountRow,
    | "id"
    | "workspace_id"
    | "created_by_user_id"
    | "source"
    | "provider"
    | "provider_record_id"
    | "provider_account_id"
    | "created_at"
  >
>;

type ProviderContext = {
  connection:
    FinancialConnectionRow;

  linkByProviderAccountId:
    Map<
      string,
      PlaidItemAccountRow
    >;

  linkById:
    Map<
      string,
      PlaidItemAccountRow
    >;
};

const CASE_BUDGET_ACCOUNTS_TABLE =
  "case_budget_accounts";

const PLAID_ITEM_ACCOUNTS_TABLE =
  "plaid_item_accounts";

const FINANCIAL_CONNECTIONS_TABLE =
  "financial_connections";

const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME =
  "SUPABASE_SERVICE_ROLE_KEY_CASE_BUDGET";

let cachedSupabaseAdminClient:
  SupabaseClient | null = null;

/**
 * Server-only account repository implementing PlaidAccountSyncStore.
 *
 * Canonical account records are stored in public.case_budget_accounts.
 *
 * Plaid ownership and connection scoping are resolved through
 * public.plaid_item_accounts:
 *
 * case_budget_accounts.provider_record_id
 *   -> plaid_item_accounts.id
 *
 * case_budget_accounts.provider_account_id
 *   -> Plaid provider account_id
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
 * Returns canonical CASE Budget Plaid accounts for one owned connection.
 *
 * The connection is first validated against financial_connections, and the
 * allowed provider-record IDs are then loaded from plaid_item_accounts.
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

    const providerContext =
      await loadProviderContext({
        supabase,
        scope:
          normalizedScope,
        operation,
      });

    const providerRecordIds = [
      ...providerContext
        .linkById
        .keys(),
    ];

    if (
      providerRecordIds.length ===
      0
    ) {
      return [];
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_ACCOUNTS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          normalizedScope.workspaceId,
        )
        .eq(
          "source",
          "plaid",
        )
        .eq(
          "provider",
          "plaid",
        )
        .in(
          "provider_record_id",
          providerRecordIds,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        )
        .returns<
          CaseBudgetAccountRow[]
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
      (
        row,
      ) =>
        mapAccountRow({
          row,
          scope:
            normalizedScope,
          providerContext,
          operation,
        }),
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to load Plaid-backed CASE Budget accounts.",
    );
  }
}

/**
 * Creates one canonical Plaid-backed CASE Budget account.
 *
 * A matching plaid_item_accounts record must already exist for the owned
 * connection. Its UUID is persisted as provider_record_id.
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

  try {
    const supabase =
      getSupabaseAdminClient();

    const providerContext =
      await loadProviderContext({
        supabase,
        scope:
          normalizedInput,
        operation,
      });

    const providerRecord =
      providerContext
        .linkByProviderAccountId
        .get(
          normalizedInput.providerAccountId,
        );

    if (
      !providerRecord
    ) {
      throw new AccountRepositoryError({
        message:
          "The selected Plaid provider account is not associated with this connection.",

        code:
          "not-found",

        operation,
      });
    }

    const accountType =
      mapStoredTypeToDatabaseType(
        normalizedInput.type,
      );

    const accountSubtype =
      resolveDatabaseSubtype({
        type:
          normalizedInput.type,

        providerSubtype:
          normalizedInput.providerSubtype,
      });

    const insertRow:
      CaseBudgetAccountInsertRow = {
        workspace_id:
          normalizedInput.workspaceId,

        created_by_user_id:
          normalizedInput.userId,

        updated_by_user_id:
          normalizedInput.userId,

        name:
          normalizedInput.name,

        account_type:
          accountType,

        account_subtype:
          accountSubtype,

        institution_name:
          normalizedInput.institutionName ??
          providerContext.connection.institution_name ??
          null,

        mask:
          normalizedInput.mask ??
          providerRecord.account_mask ??
          null,

        source:
          "plaid",

        provider:
          "plaid",

        provider_record_id:
          providerRecord.id,

        provider_account_id:
          normalizedInput.providerAccountId,

        current_balance:
          normalizedInput.balance,

        available_balance:
          normalizedInput.availableBalance ??
          null,

        credit_limit:
          normalizedInput.limit ??
          null,

        currency_code:
          normalizedInput.currency,

        include_in_net_worth:
          true,

        is_active:
          true,

        is_archived:
          false,

        archived_at:
          null,

        archived_by_user_id:
          null,

        sort_order:
          0,

        note:
          null,

        balance_last_synced_at:
          normalizedInput.lastSyncedAt,

        provider_last_synced_at:
          normalizedInput.lastSyncedAt,
      };

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_ACCOUNTS_TABLE,
        )
        .insert(
          insertRow,
        )
        .select(
          "*",
        )
        .single<
          CaseBudgetAccountRow
        >();

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
          "The Plaid account was created but no canonical account record was returned.",

        code:
          "database-error",

        operation,
      });
    }

    return mapAccountRow({
      row:
        data,
      scope:
        normalizedInput,
      providerContext,
      operation,
    });
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to create the Plaid-backed CASE Budget account.",
    );
  }
}

/**
 * Updates one canonical Plaid-backed account.
 *
 * Provider identity fields remain immutable. This method only updates
 * provider-managed presentation and balance fields after validating the
 * account's provider-record ownership through plaid_item_accounts.
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

  try {
    const supabase =
      getSupabaseAdminClient();

    const providerContext =
      await loadProviderContext({
        supabase,
        scope:
          normalizedInput,
        operation,
      });

    const existingRow =
      await getRequiredCanonicalPlaidAccountRow({
        supabase,
        accountId:
          normalizedInput.accountId,
        scope:
          normalizedInput,
        providerContext,
        operation,
      });

    const providerRecordId =
      requireRowValue(
        existingRow.provider_record_id,
        "provider_record_id",
        operation,
      );

    const providerRecord =
      providerContext
        .linkById
        .get(
          providerRecordId,
        );

    if (
      !providerRecord
    ) {
      throw new AccountRepositoryError({
        message:
          "The Plaid account provider record does not belong to this connection.",

        code:
          "ownership-mismatch",

        operation,
      });
    }

    if (
      providerRecord.provider_account_id !==
      requireRowValue(
        existingRow.provider_account_id,
        "provider_account_id",
        operation,
      )
    ) {
      throw new AccountRepositoryError({
        message:
          "The stored Plaid account identifiers are inconsistent.",

        code:
          "database-error",

        operation,
      });
    }

    const updateRow:
      CaseBudgetAccountUpdateRow = {
        updated_by_user_id:
          normalizedInput.userId,

        name:
          normalizedInput.name,

        account_type:
          mapStoredTypeToDatabaseType(
            normalizedInput.type,
          ),

        account_subtype:
          resolveDatabaseSubtype({
            type:
              normalizedInput.type,

            providerSubtype:
              normalizedInput.providerSubtype,
          }),

        institution_name:
          normalizedInput.institutionName ??
          providerContext.connection.institution_name ??
          null,

        mask:
          normalizedInput.mask ??
          providerRecord.account_mask ??
          null,

        current_balance:
          normalizedInput.balance,

        available_balance:
          normalizedInput.availableBalance ??
          null,

        credit_limit:
          normalizedInput.limit ??
          null,

        currency_code:
          normalizedInput.currency,

        /*
         * Preserve a user's explicit archive state. Provider synchronization
         * may reactivate a non-archived provider account, but must not restore
         * an account the user intentionally archived.
         */
        is_active:
          existingRow.is_archived
            ? false
            : true,

        balance_last_synced_at:
          normalizedInput.lastSyncedAt,

        provider_last_synced_at:
          normalizedInput.lastSyncedAt,

        updated_at:
          normalizedInput.lastSyncedAt,
      };

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_ACCOUNTS_TABLE,
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
          "source",
          "plaid",
        )
        .eq(
          "provider",
          "plaid",
        )
        .eq(
          "provider_record_id",
          providerRecord.id,
        )
        .eq(
          "provider_account_id",
          providerRecord.provider_account_id,
        )
        .select(
          "*",
        )
        .maybeSingle<
          CaseBudgetAccountRow
        >();

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
          "The Plaid account could not be found or is not owned by this connection.",

        code:
          "not-found",

        operation,
      });
    }

    return mapAccountRow({
      row:
        data,
      scope:
        normalizedInput,
      providerContext,
      operation,
    });
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to update the Plaid-backed CASE Budget account.",
    );
  }
}

/**
 * Marks one canonical Plaid-backed account inactive while preserving all
 * historical account data.
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

  try {
    const supabase =
      getSupabaseAdminClient();

    const providerContext =
      await loadProviderContext({
        supabase,
        scope:
          normalizedInput,
        operation,
      });

    const existingRow =
      await getRequiredCanonicalPlaidAccountRow({
        supabase,
        accountId:
          normalizedInput.accountId,
        scope:
          normalizedInput,
        providerContext,
        operation,
      });

    const providerRecordId =
      requireRowValue(
        existingRow.provider_record_id,
        "provider_record_id",
        operation,
      );

    const providerRecord =
      providerContext
        .linkById
        .get(
          providerRecordId,
        );

    if (
      !providerRecord
    ) {
      throw new AccountRepositoryError({
        message:
          "The Plaid account provider record does not belong to this connection.",

        code:
          "ownership-mismatch",

        operation,
      });
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_ACCOUNTS_TABLE,
        )
        .update({
          updated_by_user_id:
            normalizedInput.userId,

          is_active:
            false,

          provider_last_synced_at:
            normalizedInput.deactivatedAt,

          updated_at:
            normalizedInput.deactivatedAt,
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
          "source",
          "plaid",
        )
        .eq(
          "provider",
          "plaid",
        )
        .eq(
          "provider_record_id",
          providerRecord.id,
        )
        .select(
          "*",
        )
        .maybeSingle<
          CaseBudgetAccountRow
        >();

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

    return mapAccountRow({
      row:
        data,
      scope:
        normalizedInput,
      providerContext,
      operation,
    });
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to deactivate the Plaid-backed CASE Budget account.",
    );
  }
}

/**
 * Returns one canonical Plaid account by CASE Budget account ID after
 * enforcing workspace, user, and connection ownership.
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

    const providerContext =
      await loadProviderContext({
        supabase,
        scope:
          normalizedScope,
        operation,
      });

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_ACCOUNTS_TABLE,
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
          "source",
          "plaid",
        )
        .eq(
          "provider",
          "plaid",
        )
        .maybeSingle<
          CaseBudgetAccountRow
        >();

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
      return null;
    }

    const providerRecordId =
      normalizeOptionalText(
        data.provider_record_id,
      );

    if (
      !providerRecordId ||
      !providerContext
        .linkById
        .has(
          providerRecordId,
        )
    ) {
      return null;
    }

    return mapAccountRow({
      row:
        data,
      scope:
        normalizedScope,
      providerContext,
      operation,
    });
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid-backed CASE Budget account.",
    );
  }
}

/**
 * Returns one canonical Plaid account by external Plaid account_id.
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

    const providerContext =
      await loadProviderContext({
        supabase,
        scope:
          normalizedScope,
        operation,
      });

    const providerRecord =
      providerContext
        .linkByProviderAccountId
        .get(
          normalizedProviderAccountId,
        );

    if (
      !providerRecord
    ) {
      return null;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_ACCOUNTS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          normalizedScope.workspaceId,
        )
        .eq(
          "source",
          "plaid",
        )
        .eq(
          "provider",
          "plaid",
        )
        .eq(
          "provider_record_id",
          providerRecord.id,
        )
        .eq(
          "provider_account_id",
          normalizedProviderAccountId,
        )
        .maybeSingle<
          CaseBudgetAccountRow
        >();

    if (
      error
    ) {
      throw mapSupabaseError({
        error,
        operation,
      });
    }

    return data
      ? mapAccountRow({
          row:
            data,
          scope:
            normalizedScope,
          providerContext,
          operation,
        })
      : null;
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to retrieve the Plaid-backed CASE Budget account.",
    );
  }
}

/**
 * Applies the connection's effective availability state to canonical Plaid
 * accounts without introducing a duplicate connection_status column.
 *
 * The canonical CASE Budget account model derives connection state from
 * source/provider/is_active. Therefore only explicit connected/disconnected
 * transitions alter is_active here. Other connection-level states remain on
 * financial_connections.
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

    const providerContext =
      await loadProviderContext({
        supabase,
        scope:
          normalizedScope,
        operation,
      });

    const providerRecordIds = [
      ...providerContext
        .linkById
        .keys(),
    ];

    if (
      providerRecordIds.length ===
      0
    ) {
      return [];
    }

    if (
      status !==
        "connected" &&
      status !==
        "disconnected"
    ) {
      return listPlaidAccountsByConnection(
        normalizedScope,
      );
    }

    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_ACCOUNTS_TABLE,
        )
        .update({
          updated_by_user_id:
            normalizedScope.userId,

          is_active:
            status ===
            "connected",

          provider_last_synced_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "workspace_id",
          normalizedScope.workspaceId,
        )
        .eq(
          "source",
          "plaid",
        )
        .eq(
          "provider",
          "plaid",
        )
        .in(
          "provider_record_id",
          providerRecordIds,
        )
        .select(
          "*",
        )
        .returns<
          CaseBudgetAccountRow[]
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
      (
        row,
      ) =>
        mapAccountRow({
          row,
          scope:
            normalizedScope,
          providerContext,
          operation,
        }),
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError(
      error,
      operation,
      "Unable to update Plaid account availability.",
    );
  }
}

async function loadProviderContext({
  supabase,
  scope,
  operation,
}: {
  supabase:
    SupabaseClient;

  scope:
    PlaidAccountStoreScope;

  operation:
    string;
}): Promise<ProviderContext> {
  const {
    data:
      connectionData,
    error:
      connectionError,
  } =
    await supabase
      .from(
        FINANCIAL_CONNECTIONS_TABLE,
      )
      .select(
        "id,workspace_id,user_id,provider,provider_institution_id,institution_name,status",
      )
      .eq(
        "id",
        scope.connectionId,
      )
      .eq(
        "workspace_id",
        scope.workspaceId,
      )
      .eq(
        "user_id",
        scope.userId,
      )
      .eq(
        "provider",
        "plaid",
      )
      .maybeSingle<
        FinancialConnectionRow
      >();

  if (
    connectionError
  ) {
    throw mapSupabaseError({
      error:
        connectionError,
      operation,
    });
  }

  if (
    !connectionData
  ) {
    throw new AccountRepositoryError({
      message:
        "The Plaid financial connection could not be found or is not owned by this user and workspace.",

      code:
        "ownership-mismatch",

      operation,
    });
  }

  const {
    data:
      linkData,
    error:
      linkError,
  } =
    await supabase
      .from(
        PLAID_ITEM_ACCOUNTS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "connection_id",
        scope.connectionId,
      )
      .eq(
        "workspace_id",
        scope.workspaceId,
      )
      .eq(
        "user_id",
        scope.userId,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      )
      .returns<
        PlaidItemAccountRow[]
      >();

  if (
    linkError
  ) {
    throw mapSupabaseError({
      error:
        linkError,
      operation,
    });
  }

  const links =
    linkData ??
    [];

  return {
    connection:
      connectionData,

    linkByProviderAccountId:
      new Map(
        links.map(
          (
            row,
          ) => [
            row.provider_account_id,
            row,
          ],
        ),
      ),

    linkById:
      new Map(
        links.map(
          (
            row,
          ) => [
            row.id,
            row,
          ],
        ),
      ),
  };
}

async function getRequiredCanonicalPlaidAccountRow({
  supabase,
  accountId,
  scope,
  providerContext,
  operation,
}: {
  supabase:
    SupabaseClient;

  accountId:
    string;

  scope:
    PlaidAccountStoreScope;

  providerContext:
    ProviderContext;

  operation:
    string;
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        CASE_BUDGET_ACCOUNTS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "id",
        accountId,
      )
      .eq(
        "workspace_id",
        scope.workspaceId,
      )
      .eq(
        "source",
        "plaid",
      )
      .eq(
        "provider",
        "plaid",
      )
      .maybeSingle<
        CaseBudgetAccountRow
      >();

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
        "The Plaid-backed CASE Budget account could not be found.",

      code:
        "not-found",

      operation,
    });
  }

  const providerRecordId =
    normalizeOptionalText(
      data.provider_record_id,
    );

  if (
    !providerRecordId ||
    !providerContext
      .linkById
      .has(
        providerRecordId,
      )
  ) {
    throw new AccountRepositoryError({
      message:
        "The Plaid-backed CASE Budget account does not belong to this connection.",

      code:
        "ownership-mismatch",

      operation,
    });
  }

  return data;
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
      normalizeStoredAccountType(
        input.type,
        operation,
      ),

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
      normalizeStoredAccountType(
        input.type,
        operation,
      ),

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

function mapAccountRow({
  row,
  scope,
  providerContext,
  operation,
}: {
  row:
    CaseBudgetAccountRow;

  scope:
    PlaidAccountStoreScope;

  providerContext:
    ProviderContext;

  operation:
    string;
}): PlaidStoredAccount {
  const providerRecordId =
    requireRowValue(
      row.provider_record_id,
      "provider_record_id",
      operation,
    );

  const providerAccountId =
    requireRowValue(
      row.provider_account_id,
      "provider_account_id",
      operation,
    );

  const providerRecord =
    providerContext
      .linkById
      .get(
        providerRecordId,
      );

  if (
    !providerRecord
  ) {
    throw new AccountRepositoryError({
      message:
        "The stored CASE Budget account provider record is not part of this Plaid connection.",

      code:
        "ownership-mismatch",

      operation,
    });
  }

  if (
    providerRecord.provider_account_id !==
    providerAccountId
  ) {
    throw new AccountRepositoryError({
      message:
        "The stored CASE Budget account provider identifiers are inconsistent.",

      code:
        "database-error",

      operation,
    });
  }

  const type =
    mapDatabaseTypeToStoredType({
      accountType:
        row.account_type,

      accountSubtype:
        row.account_subtype,

      providerRecord,
    });

  const lastSyncedAt =
    getLatestIsoDate(
      row.balance_last_synced_at,
      row.provider_last_synced_at,
      row.updated_at,
    ) ??
    row.updated_at;

  return {
    id:
      row.id,

    workspaceId:
      row.workspace_id,

    userId:
      scope.userId,

    connectionId:
      scope.connectionId,

    provider:
      "plaid",

    providerAccountId,

    providerInstitutionId:
      providerContext
        .connection
        .provider_institution_id ??
      undefined,

    institutionName:
      row.institution_name ??
      providerContext
        .connection
        .institution_name ??
      undefined,

    name:
      row.name,

    officialName:
      undefined,

    mask:
      row.mask ??
      undefined,

    type,

    providerType:
      providerRecord.account_type ??
      mapStoredTypeToProviderType(
        type,
      ),

    providerSubtype:
      providerRecord.account_subtype ??
      row.account_subtype ??
      undefined,

    balance:
      parseDatabaseNumber(
        row.current_balance,
        "current_balance",
        operation,
      ),

    availableBalance:
      parseOptionalDatabaseNumber(
        row.available_balance,
        "available_balance",
        operation,
      ),

    limit:
      parseOptionalDatabaseNumber(
        row.credit_limit,
        "credit_limit",
        operation,
      ),

    currency:
      normalizeCurrency(
        row.currency_code,
        operation,
      ),

    isDebt:
      type ===
        "credit-card" ||
      type ===
        "loan" ||
      type ===
        "mortgage",

    isActive:
      row.is_active &&
      !row.is_archived,

    lastSyncedAt,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,

    metadata: {
      providerRecordId,

      providerAccountId,

      connectionId:
        scope.connectionId,

      plaidItemDatabaseId:
        providerRecord.plaid_item_id,

      selected:
        providerRecord.is_selected,

      providerRecordActive:
        providerRecord.is_active,
    },
  };
}

function mapStoredTypeToDatabaseType(
  type:
    PlaidStoredAccountType,
): CaseBudgetAccountType {
  switch (
    type
  ) {
    case "checking":
      return "checking";

    case "savings":
      return "savings";

    case "cash":
      return "cash";

    case "credit-card":
      return "credit-card";

    case "loan":
    case "mortgage":
      return "loan";

    case "investment":
    case "retirement":
      return "investment";

    case "other":
    default:
      return "other";
  }
}

function mapDatabaseTypeToStoredType({
  accountType,
  accountSubtype,
  providerRecord,
}: {
  accountType:
    CaseBudgetAccountType;

  accountSubtype:
    string | null;

  providerRecord:
    PlaidItemAccountRow;
}): PlaidStoredAccountType {
  const normalizedSubtype =
    (
      accountSubtype ??
      providerRecord.account_subtype ??
      ""
    )
      .trim()
      .toLowerCase();

  if (
    accountType ===
      "loan" &&
    normalizedSubtype ===
      "mortgage"
  ) {
    return "mortgage";
  }

  if (
    accountType ===
      "investment" &&
    normalizedSubtype ===
      "retirement"
  ) {
    return "retirement";
  }

  return accountType;
}

function resolveDatabaseSubtype({
  type,
  providerSubtype,
}: {
  type:
    PlaidStoredAccountType;

  providerSubtype:
    string | undefined;
}) {
  if (
    type ===
    "mortgage"
  ) {
    return "mortgage";
  }

  if (
    type ===
    "retirement"
  ) {
    return "retirement";
  }

  return providerSubtype ??
    null;
}

function mapStoredTypeToProviderType(
  type:
    PlaidStoredAccountType,
) {
  switch (
    type
  ) {
    case "credit-card":
      return "credit";

    case "loan":
    case "mortgage":
      return "loan";

    case "investment":
    case "retirement":
      return "investment";

    case "checking":
    case "savings":
    case "cash":
      return "depository";

    case "other":
    default:
      return "other";
  }
}

function getLatestIsoDate(
  ...values:
    Array<
      string | null
    >
) {
  let latest:
    string | null =
    null;

  let latestTimestamp =
    Number.NEGATIVE_INFINITY;

  for (
    const value of
      values
  ) {
    if (
      !value
    ) {
      continue;
    }

    const timestamp =
      Date.parse(
        value,
      );

    if (
      Number.isNaN(
        timestamp,
      )
    ) {
      continue;
    }

    if (
      timestamp >
      latestTimestamp
    ) {
      latest =
        value;

      latestTimestamp =
        timestamp;
    }
  }

  return latest;
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

function normalizeStoredAccountType(
  value:
    PlaidStoredAccountType,
  operation:
    string,
): PlaidStoredAccountType {
  switch (
    value
  ) {
    case "checking":
    case "savings":
    case "cash":
    case "credit-card":
    case "loan":
    case "mortgage":
    case "investment":
    case "retirement":
    case "other":
      return value;

    default:
      throw new AccountRepositoryError({
        message:
          "The Plaid account type is not supported.",

        code:
          "invalid-input",

        operation,
      });
  }
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
    !/^[A-Z]{3}$/.test(
      normalizedValue,
    )
  ) {
    throw new AccountRepositoryError({
      message:
        "currency must be a three-letter currency code.",

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
    string | undefined | null,
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
  operation:
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

    operation,
  });
}

function parseOptionalDatabaseNumber(
  value:
    number | string | null,
  fieldName:
    string,
  operation:
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
    operation,
  );
}

function requireRowValue(
  value:
    string | null,
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
    normalizedValue
  ) {
    return normalizedValue;
  }

  throw new AccountRepositoryError({
    message:
      `Stored Plaid account is missing ${fieldName}.`,

    code:
      "database-error",

    operation,
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
