import type {
  CaseBudgetAccountSourceDatabaseEnum,
  CaseBudgetAccountTypeDatabaseEnum,
} from "@/types/database";

/**
 * Canonical CASE Budget account classification.
 *
 * This is derived from the financial role of the account rather than
 * stored as a separate PostgreSQL enum in case_budget_accounts.
 */
export type AccountClassification =
  | "asset"
  | "liability";

/**
 * Canonical account connection state exposed to the UI.
 *
 * The persistence layer stores account source/provider fields rather than
 * this exact value, so the provider/service layer maps database records into
 * these states.
 */
export type AccountConnectionStatus =
  | "manual"
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

/**
 * UI/domain-level account types.
 *
 * The database currently stores the canonical PostgreSQL enum:
 *
 * checking
 * savings
 * credit-card
 * cash
 * loan
 * investment
 * other
 *
 * CASE Budget's UI has historically supported additional financial
 * presentation types such as retirement, mortgage, real-estate, and vehicle.
 *
 * Those specialized values should be represented through account_subtype
 * while account_type remains compatible with the database enum.
 */
export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit-card"
  | "investment"
  | "retirement"
  | "mortgage"
  | "loan"
  | "real-estate"
  | "vehicle"
  | "other";

/**
 * Canonical database-backed account source.
 */
export type AccountSource =
  CaseBudgetAccountSourceDatabaseEnum;

/**
 * Canonical CASE Budget account used throughout the application.
 *
 * Supabase is the source of truth.
 */
export type AccountData = {
  id:
    string;

  workspaceId:
    string;

  name:
    string;

  institution?:
    string;

  type:
    AccountType;

  /**
   * Database-compatible base type.
   *
   * Examples:
   *
   * retirement
   *   -> investment
   *
   * mortgage
   *   -> loan
   *
   * real-estate
   *   -> other
   *
   * vehicle
   *   -> other
   */
  databaseType:
    CaseBudgetAccountTypeDatabaseEnum;

  subtype?:
    string;

  classification:
    AccountClassification;

  balance:
    number;

  availableBalance?:
    number;

  creditLimit?:
    number;

  currency:
    string;

  mask?:
    string;

  isIncludedInNetWorth:
    boolean;

  connectionStatus:
    AccountConnectionStatus;

  source:
    AccountSource;

  provider?:
    string;

  providerRecordId?:
    string;

  providerAccountId?:
    string;

  isActive:
    boolean;

  isArchived:
    boolean;

  archivedAt?:
    string;

  note?:
    string;

  sortOrder:
    number;

  balanceLastSyncedAt?:
    string;

  providerLastSyncedAt?:
    string;

  lastSyncedAt?:
    string;

  createdByUserId:
    string;

  updatedByUserId:
    string;

  createdAt:
    string;

  updatedAt:
    string;
};

/**
 * Input accepted when manually creating an account.
 *
 * workspace_id and audit user IDs are intentionally omitted.
 * They are resolved from trusted server-side authentication state.
 */
export type CreateAccountData = {
  name:
    string;

  institution?:
    string;

  type:
    AccountType;

  classification:
    AccountClassification;

  balance:
    number;

  availableBalance?:
    number;

  creditLimit?:
    number;

  currency?:
    string;

  mask?:
    string;

  isIncludedInNetWorth?:
    boolean;

  note?:
    string;

  sortOrder?:
    number;
};

/**
 * Input accepted when updating an existing account.
 *
 * Provider-managed source identifiers are intentionally excluded from the
 * standard manual account editor.
 */
export type UpdateAccountData = {
  name?:
    string;

  institution?:
    string | null;

  type?:
    AccountType;

  classification?:
    AccountClassification;

  balance?:
    number;

  availableBalance?:
    number | null;

  creditLimit?:
    number | null;

  currency?:
    string;

  mask?:
    string | null;

  isIncludedInNetWorth?:
    boolean;

  note?:
    string | null;

  sortOrder?:
    number;

  isActive?:
    boolean;
};

/**
 * Input for changing account archival state.
 *
 * Account deletion in the application should generally mean archival so
 * financial history remains intact.
 */
export type ArchiveAccountInput = {
  accountId:
    string;

  archived?:
    boolean;
};

/**
 * Small reusable account lookup/filter contract.
 */
export type AccountFilters = {
  search?:
    string;

  classification?:
    AccountClassification | "all";

  type?:
    AccountType | "all";

  connectionStatus?:
    AccountConnectionStatus | "all";

  includeArchived?:
    boolean;

  includeInactive?:
    boolean;

  includedInNetWorthOnly?:
    boolean;
};

/**
 * Aggregate account/net-worth totals.
 */
export type AccountSummary = {
  totalAssets:
    number;

  totalLiabilities:
    number;

  netWorth:
    number;

  activeAccountCount:
    number;

  archivedAccountCount:
    number;

  connectedAccountCount:
    number;

  manualAccountCount:
    number;

  includedInNetWorthCount:
    number;

  totalCount:
    number;
};

/**
 * Maps a domain/UI account type to the database account enum.
 *
 * Specialized UI types are persisted through account_subtype while the
 * database account_type remains relationally stable.
 */
export function accountTypeToDatabaseType(
  type:
    AccountType,
): CaseBudgetAccountTypeDatabaseEnum {
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

    case "investment":
    case "retirement":
      return "investment";

    case "loan":
    case "mortgage":
      return "loan";

    case "real-estate":
    case "vehicle":
    case "other":
    default:
      return "other";
  }
}

/**
 * Returns the subtype persisted alongside the canonical database type.
 */
export function accountTypeToSubtype(
  type:
    AccountType,
): string | null {
  switch (
    type
  ) {
    case "retirement":
      return "retirement";

    case "mortgage":
      return "mortgage";

    case "real-estate":
      return "real-estate";

    case "vehicle":
      return "vehicle";

    default:
      return null;
  }
}

/**
 * Reconstructs the UI/domain type from database type + subtype.
 */
export function databaseTypeToAccountType({
  accountType,
  accountSubtype,
}: {
  accountType:
    CaseBudgetAccountTypeDatabaseEnum;

  accountSubtype:
    string | null;
}): AccountType {
  const normalizedSubtype =
    accountSubtype
      ?.trim()
      .toLowerCase() ??
    null;

  switch (
    accountType
  ) {
    case "checking":
      return "checking";

    case "savings":
      return "savings";

    case "cash":
      return "cash";

    case "credit-card":
      return "credit-card";

    case "investment":
      return normalizedSubtype ===
        "retirement"
        ? "retirement"
        : "investment";

    case "loan":
      return normalizedSubtype ===
        "mortgage"
        ? "mortgage"
        : "loan";

    case "other": {
      switch (
        normalizedSubtype
      ) {
        case "real-estate":
          return "real-estate";

        case "vehicle":
          return "vehicle";

        default:
          return "other";
      }
    }
  }
}

/**
 * Determines whether an account should be treated as an asset or liability.
 *
 * This preserves the current CASE Budget financial presentation model while
 * keeping classification derivable from the canonical account type.
 */
export function getDefaultAccountClassification(
  type:
    AccountType,
): AccountClassification {
  switch (
    type
  ) {
    case "credit-card":
    case "loan":
    case "mortgage":
      return "liability";

    case "checking":
    case "savings":
    case "cash":
    case "investment":
    case "retirement":
    case "real-estate":
    case "vehicle":
    case "other":
    default:
      return "asset";
  }
}

/**
 * Converts canonical database source/provider state into the connection
 * state consumed by the CASE Budget UI.
 */
export function getAccountConnectionStatus({
  source,
  provider,
  providerRecordId,
  isActive,
}: {
  source:
    AccountSource;

  provider:
    string | null;

  providerRecordId:
    string | null;

  isActive:
    boolean;
}): AccountConnectionStatus {
  if (
    source ===
    "manual"
  ) {
    return "manual";
  }

  if (
    !isActive
  ) {
    return "disconnected";
  }

  if (
    source ===
      "plaid" &&
    provider ===
      "plaid" &&
    providerRecordId
  ) {
    return "connected";
  }

  if (
    source ===
    "plaid"
  ) {
    return "pending";
  }

  return "connected";
}