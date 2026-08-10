import type {
  AccountData,
} from "@/components/providers/AccountsProvider";

import type {
  BillData,
} from "@/types/bill";

import type {
  BudgetMonthData,
} from "@/types/budget";

import type {
  TransactionData,
} from "@/types/transaction";

export type CaseBudgetExportVersion =
  "1.0";

export type CaseBudgetExportProfile = {
  id:
    string;

  email:
    string;

  firstName:
    string | null;

  lastName:
    string | null;

  displayName:
    string;
};

export type CaseBudgetExportWorkspace = {
  id:
    string;

  name:
    string;

  type:
    string;

  memberCount:
    number | null;

  isOwner:
    boolean | null;
};

export type CaseBudgetExportMetadata = {
  application:
    "CASE Budget";

  version:
    CaseBudgetExportVersion;

  exportedAt:
    string;

  format:
    "json";
};

export type CaseBudgetExportData = {
  profile:
    CaseBudgetExportProfile | null;

  workspace:
    CaseBudgetExportWorkspace | null;

  budget: {
    selectedMonth:
      string | null;

    months:
      Record<
        string,
        BudgetMonthData
      >;
  };

  accounts:
    AccountData[];

  transactions:
    TransactionData[];

  bills:
    BillData[];

  goals:
    unknown[];

  debts:
    unknown[];

  investments:
    unknown[];

  payCycles:
    unknown[];

  netWorth:
    unknown[];
};

export type CaseBudgetAccountExport = {
  metadata:
    CaseBudgetExportMetadata;

  data:
    CaseBudgetExportData;
};

export type CreateCaseBudgetExportInput = {
  profile:
    CaseBudgetExportProfile | null;

  workspace:
    CaseBudgetExportWorkspace | null;

  selectedBudgetMonth:
    string | null;

  budgetMonths:
    Record<
      string,
      BudgetMonthData
    >;

  accounts:
    AccountData[];

  transactions:
    TransactionData[];

  bills:
    BillData[];

  goals?:
    unknown[];

  debts?:
    unknown[];

  investments?:
    unknown[];

  payCycles?:
    unknown[];

  netWorth?:
    unknown[];
};