export type BudgetIncomeStatus =
  | "planned"
  | "partial"
  | "received";

export type BudgetIncomeSource = {
  id: string;
  name: string;
  amount: number;
  receivedAmount: number;
  status: BudgetIncomeStatus;
};

export type BudgetCategoryData = {
  id: string;
  name: string;

  /**
   * Canonical planned_amount persisted on case_budget_budget_items.
   */
  assignedAmount: number;

  /**
   * Canonical activity_amount persisted on case_budget_budget_items.
   *
   * Transaction actions recalculate this value server-side from the
   * non-deleted expense transaction ledger.
   */
  spentAmount: number;

  /**
   * Canonical rollover_amount persisted on case_budget_budget_items.
   */
  rolloverAmount: number;

  /**
   * Canonical available_amount persisted on case_budget_budget_items.
   *
   * The server maintains this as:
   *
   *   assignedAmount + rolloverAmount - spentAmount
   *
   * UI components should display this value directly instead of deriving
   * remaining/available money in the browser.
   */
  availableAmount: number;
};

export type BudgetCategoryGroupData = {
  id: string;
  name: string;
  description?: string;
  categories: BudgetCategoryData[];
};

export type BudgetMonthData = {
  monthKey: string;
  incomeSources: BudgetIncomeSource[];
  budgetGroups: BudgetCategoryGroupData[];
};

export type BudgetMonthsByKey = Record<
  string,
  BudgetMonthData
>;

export type CreateBudgetCategoryData = {
  name: string;
  assignedAmount: number;
};

export type CreateBudgetGroupData = {
  name: string;
  description?: string;
};

export type BudgetMonthCreationMethod =
  | "blank"
  | "copy-previous";