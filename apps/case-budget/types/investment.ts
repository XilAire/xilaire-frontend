/**
 * Canonical CASE Budget investment domain types.
 *
 * These types are shared by:
 *
 * - investment server actions
 * - investment services
 * - InvestmentsProvider
 * - investment UI components
 *
 * Persistent investment account, holding, and activity data is backed
 * by Supabase. These domain types intentionally use application-facing
 * camelCase names rather than database snake_case column names.
 */

export type InvestmentAccountType =
  | "brokerage"
  | "retirement"
  | "ira"
  | "roth-ira"
  | "401k"
  | "403b"
  | "529"
  | "hsa"
  | "crypto"
  | "other";

export type InvestmentConnectionStatus =
  | "manual"
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

export type InvestmentHoldingType =
  | "stock"
  | "etf"
  | "mutual-fund"
  | "bond"
  | "option"
  | "crypto"
  | "cash"
  | "real-estate"
  | "commodity"
  | "other";

export type InvestmentActivityType =
  | "contribution"
  | "withdrawal"
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "fee"
  | "transfer"
  | "adjustment";

/**
 * Canonical application-facing investment account.
 *
 * Persistent source:
 * public.investment_accounts
 */
export type InvestmentAccountData = {
  id: string;

  name: string;

  institution?: string;

  type: InvestmentAccountType;

  linkedAccountId?: string;

  currency: string;

  cashBalance: number;

  isIncludedInNetWorth: boolean;

  connectionStatus:
    InvestmentConnectionStatus;

  lastSyncedAt?: string;

  notes?: string;

  createdAt: string;

  updatedAt: string;
};

/**
 * Canonical application-facing investment holding.
 *
 * Persistent source:
 * public.investment_holdings
 */
export type InvestmentHoldingData = {
  id: string;

  investmentAccountId: string;

  symbol?: string;

  name: string;

  type: InvestmentHoldingType;

  quantity: number;

  averageCost: number;

  currentPrice: number;

  marketValue: number;

  costBasis: number;

  unrealizedGain: number;

  unrealizedGainPercentage: number;

  annualDividendIncome?: number;

  lastPriceUpdatedAt?: string;

  notes?: string;

  createdAt: string;

  updatedAt: string;
};

/**
 * Canonical application-facing investment activity.
 *
 * Persistent source:
 * public.investment_activities
 */
export type InvestmentActivityData = {
  id: string;

  investmentAccountId: string;

  holdingId?: string;

  type: InvestmentActivityType;

  date: string;

  amount: number;

  quantity?: number;

  pricePerUnit?: number;

  fees?: number;

  description?: string;

  createdAt: string;

  updatedAt: string;
};

/**
 * Canonical application-facing investment performance snapshot.
 *
 * Persistent source:
 * public.investment_performance_snapshots
 *
 * The database stores the canonical daily facts:
 *
 * - snapshot_date
 * - portfolio_value
 * - cost_basis
 * - cash_value
 *
 * dailyGain and dailyGainPercentage are deliberately derived from
 * consecutive snapshots and are not persisted redundantly.
 *
 * workspaceId and createdBy are deliberately omitted from this
 * application-facing type. Workspace scope comes from trusted server
 * state, while audit ownership remains a persistence concern.
 */
export type InvestmentPerformanceSnapshot = {
  id: string;

  date: string;

  portfolioValue: number;

  costBasis: number;

  cashValue: number;

  dailyGain: number;

  dailyGainPercentage: number;

  createdAt: string;

  updatedAt: string;
};

/**
 * Data accepted when creating or replacing a canonical daily investment
 * performance snapshot.
 *
 * workspaceId is deliberately absent. The active workspace must be
 * resolved from trusted authenticated server state and must never be
 * supplied by the browser.
 */
export type CreateInvestmentPerformanceSnapshotData = {
  date: string;

  portfolioValue: number;

  costBasis: number;

  cashValue: number;
};

/**
 * Mutable canonical fields for an existing performance snapshot.
 *
 * Derived daily-gain fields and immutable identity/audit fields are
 * intentionally excluded.
 */
export type UpdateInvestmentPerformanceSnapshotData =
  Partial<{
    date: string;

    portfolioValue: number;

    costBasis: number;

    cashValue: number;
  }>;

/**
 * Data accepted when creating an investment account.
 *
 * workspaceId is deliberately absent. The active workspace must be
 * resolved from trusted authenticated server state and must never be
 * supplied by the browser.
 */
export type CreateInvestmentAccountData = {
  name: string;

  institution?: string;

  type: InvestmentAccountType;

  linkedAccountId?: string;

  currency?: string;

  cashBalance?: number;

  isIncludedInNetWorth?: boolean;

  connectionStatus?:
    InvestmentConnectionStatus;

  lastSyncedAt?: string;

  notes?: string;
};

export type UpdateInvestmentAccountData =
  Partial<
    Omit<
      InvestmentAccountData,
      "id" | "createdAt"
    >
  >;

/**
 * Data accepted when creating an investment holding.
 *
 * investmentAccountId identifies the parent account. Workspace ownership
 * must still be validated server-side before persistence.
 */
export type CreateInvestmentHoldingData = {
  investmentAccountId: string;

  symbol?: string;

  name: string;

  type: InvestmentHoldingType;

  quantity: number;

  averageCost: number;

  currentPrice?: number;

  annualDividendIncome?: number;

  lastPriceUpdatedAt?: string;

  notes?: string;
};

export type UpdateInvestmentHoldingData =
  Partial<
    Omit<
      InvestmentHoldingData,
      | "id"
      | "investmentAccountId"
      | "marketValue"
      | "costBasis"
      | "unrealizedGain"
      | "unrealizedGainPercentage"
      | "createdAt"
    >
  >;

/**
 * Data accepted when creating an investment activity.
 *
 * investmentAccountId identifies the parent investment account.
 * holdingId is optional because some account-level activities do not
 * belong to a specific holding.
 */
export type CreateInvestmentActivityData = {
  investmentAccountId: string;

  holdingId?: string;

  type: InvestmentActivityType;

  date: string;

  amount: number;

  quantity?: number;

  pricePerUnit?: number;

  fees?: number;

  description?: string;
};

export type UpdateInvestmentActivityData =
  Partial<
    Omit<
      InvestmentActivityData,
      | "id"
      | "investmentAccountId"
      | "holdingId"
      | "createdAt"
    >
  >;

/**
 * Derived investment account totals.
 *
 * This is an application/domain calculation and is not a separate
 * persistence model.
 */
export type InvestmentAccountSummary = {
  investmentAccountId: string;

  cashBalance: number;

  holdingsMarketValue: number;

  totalMarketValue: number;

  totalCostBasis: number;

  unrealizedGain: number;

  unrealizedGainPercentage: number;

  annualDividendIncome: number;

  holdingCount: number;
};